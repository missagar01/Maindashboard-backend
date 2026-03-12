import axios from "axios";
import pool from "../config/db.js";

function getAttendanceConfig() {
    const baseUrl =
        process.env.DEVICE_API_URL ||
        process.env.ATTENDANCE_API_URL ||
        process.env.ATTENDENCE_API_URL ||
        null;

    const apiKey =
        process.env.API_KEY ||
        process.env.ATTENDANCE_API_KEY ||
        process.env.ATTENDENCE_API_KEY ||
        null;

    const deviceSerials = String(
        process.env.DEVICE_SERIALS ||
        process.env.ATTENDANCE_DEVICE_SERIALS ||
        process.env.ATTENDENCE_DEVICE_SERIALS ||
        ""
    )
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    return { baseUrl, apiKey, deviceSerials };
}

function isValidDateString(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function getLocalDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    const parts = formatter.formatToParts(date).reduce((acc, part) => {
        if (part.type !== "literal") {
            acc[part.type] = part.value;
        }
        return acc;
    }, {});

    return {
        year: parts.year,
        month: parts.month,
        day: parts.day,
    };
}

function getLocalDateString(date = new Date()) {
    const { year, month, day } = getLocalDateParts(date);
    return `${year}-${month}-${day}`;
}

function getMonthStartString(date = new Date()) {
    const { year, month } = getLocalDateParts(date);
    return `${year}-${month}-01`;
}

function normalizeEmployeeCode(value) {
    const text = String(value ?? "").trim().toUpperCase();
    if (!text) return "";
    if (/^\d+$/.test(text)) return String(Number(text));

    const prefixed = text.match(/^([A-Z]+)0*(\d+)$/);
    if (prefixed) return `${prefixed[1]}${Number(prefixed[2])}`;

    return text;
}

function normalizeLogDate(value) {
    const source = String(value ?? "").trim();
    if (!source) return "";

    const datePart = source.includes("T")
        ? source.split("T")[0]
        : (source.includes(" ") ? source.split(" ")[0] : source);

    if (datePart.includes("/")) {
        const [d, m, y] = datePart.split("/");
        if (d && m && y) return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    if (datePart.includes("-")) {
        const parts = datePart.split("-");
        if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
    }

    return datePart;
}

function buildDeviceDirectionMap(deviceSerials) {
    const directionMap = new Map();
    if (!deviceSerials.length) return directionMap;

    if (deviceSerials[0]) directionMap.set(deviceSerials[0], "in");
    if (deviceSerials[1]) directionMap.set(deviceSerials[1], "out");

    return directionMap;
}

function normalizePunchDirection(log, deviceDirectionMap = new Map()) {
    if (!log || typeof log !== "object") return "";

    const serialNumber = String(log.SerialNumber ?? log.DeviceSerialNo ?? "").trim();
    const serialDirection = serialNumber ? deviceDirectionMap.get(serialNumber) || "" : "";

    const rawDirection = [
        log.PunchDirection,
        log.InOut,
        log.InOutMode,
        log.IOType,
        log.Direction,
        log.PunchType,
        log.LogType,
        log.CheckType,
    ].find((value) => value !== undefined && value !== null && String(value).trim() !== "");

    if (rawDirection === undefined) return serialDirection;

    const text = String(rawDirection).trim().toLowerCase();
    if (!text) return serialDirection;
    if (text.includes("in")) return "in";
    if (text.includes("out")) return "out";

    if (/^\d+$/.test(text)) {
        const code = Number(text);
        if (code === 0 || code === 1) return "in";
        if (code === 2 || code === 3) return "out";
    }

    return serialDirection;
}

function extractDeviceLogs(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== "object") return [];

    const possibleArrays = [
        payload.data,
        payload.Data,
        payload.logs,
        payload.Logs,
        payload.result,
        payload.Result,
    ];

    for (const value of possibleArrays) {
        if (Array.isArray(value)) return value;
    }

    return [];
}

async function fetchLogsForSerial(baseUrl, apiKey, serialNumber, fromDate, toDate) {
    try {
        const response = await axios.get(baseUrl, {
            timeout: 15000,
            params: {
                ...(apiKey ? { APIKey: apiKey } : {}),
                ...(serialNumber ? { SerialNumber: serialNumber } : {}),
                FromDate: fromDate,
                ToDate: toDate,
            },
        });

        return extractDeviceLogs(response.data);
    } catch (error) {
        console.warn(
            `Attendance API unavailable${serialNumber ? ` for device ${serialNumber}` : ""}:`,
            error.message
        );
        return [];
    }
}

export const fetchAttendanceSummary = async ({ fromDate, toDate } = {}) => {
    const today = isValidDateString(toDate) ? toDate : getLocalDateString();
    const firstDayOfMonth = isValidDateString(fromDate) ? fromDate : getMonthStartString();

    const { baseUrl, apiKey, deviceSerials } = getAttendanceConfig();

    // Attendance integration is optional. Return an empty list if not configured.
    if (!baseUrl) return [];

    const serialsToQuery = deviceSerials.length ? deviceSerials : [null];
    const deviceDirectionMap = buildDeviceDirectionMap(deviceSerials);
    const logsPerDevice = await Promise.all(
        serialsToQuery.map((serialNumber) =>
            fetchLogsForSerial(baseUrl, apiKey, serialNumber, firstDayOfMonth, today)
        )
    );
    const logs = logsPerDevice.flat();

    const { rows } = await pool.query(
        `SELECT employee_id FROM users WHERE employee_id IS NOT NULL`
    );

    const employeeLookup = new Map();
    const responseMap = new Map();

    for (const row of rows) {
        const rawEmployeeId = String(row.employee_id ?? "").trim();
        const normalizedEmployeeId = normalizeEmployeeCode(rawEmployeeId);

        if (!rawEmployeeId || !normalizedEmployeeId) continue;
        if (!employeeLookup.has(normalizedEmployeeId)) {
            employeeLookup.set(normalizedEmployeeId, rawEmployeeId);
        }

        if (!responseMap.has(rawEmployeeId)) {
            responseMap.set(rawEmployeeId, {
                employee_id: rawEmployeeId,
                status: "OUT",
                monthly_attendance: 0,
            });
        }
    }

    if (!responseMap.size) return [];

    const grouped = new Map();

    for (const log of logs) {
        if (!log?.EmployeeCode || !log?.LogDate) continue;

        const normalizedEmployeeId = normalizeEmployeeCode(log.EmployeeCode);
        const employeeId = employeeLookup.get(normalizedEmployeeId);
        if (!employeeId) continue;

        const dayKey = normalizeLogDate(log.LogDate);
        if (dayKey < firstDayOfMonth || dayKey > today) continue;

        if (normalizePunchDirection(log, deviceDirectionMap) !== "in") continue;

        if (!grouped.has(employeeId)) grouped.set(employeeId, new Set());
        grouped.get(employeeId).add(dayKey);
    }

    for (const [employeeId, daySet] of grouped.entries()) {
        const summary = responseMap.get(employeeId);
        if (!summary) continue;

        summary.status = daySet.has(today) ? "IN" : "OUT";
        summary.monthly_attendance = daySet.size;
    }

    return Array.from(responseMap.values());
};
