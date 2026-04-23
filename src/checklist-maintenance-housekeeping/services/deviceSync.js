import axios from "axios";
import { pool, maintenancePool } from "../config/db.js";
import { pool as housekeepingPool } from "../config/housekeppingdb.js";

const LOG_DEVICE_SYNC = process.env.LOG_DEVICE_SYNC === "true";
const DEVICE_API_URL = process.env.DEVICE_API_URL;
const DEVICE_API_KEY = process.env.API_KEY;
const DEVICE_API_TIMEOUT_MS = Number(process.env.DEVICE_API_TIMEOUT_MS || 10_000);
const DEVICE_SERIALS = String(process.env.DEVICE_SERIALS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const logSync = (...args) => {
  if (LOG_DEVICE_SYNC) console.log(...args);
};


const formatDateString = (date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const normalizeEmployeeCode = (value) => {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) return "";
  if (/^\d+$/.test(text)) return String(Number(text));

  const prefixed = text.match(/^([A-Z]+)0*(\d+)$/);
  if (prefixed) return `${prefixed[1]}${Number(prefixed[2])}`;

  return text;
};

const getAdjacentDate = (dateStr, offsetDays) => {
  const base = new Date(dateStr);
  base.setDate(base.getDate() + offsetDays);
  return formatDateString(base);
};

// Return a Date object set to today at specific hour (in local/server time)
const getSubmissionTime = (hour) => {
  // Check if we need to force IST offset logic if server is UTC.
  // For now, mirroring server.js logic:
  // We want to store a TIMESTAMP that represents HH:00 IST.
  // If the DB expects timestamp without timezone, passing a JS Date usually converts to UTC.
  // To be safe, we construct a date that *looks* like the target time.
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
};

/**
 * Fetch all active employee IDs from the database to determine absentees.
 */
const getAllActiveEmployeeIds = async () => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT employee_id 
      FROM users 
      WHERE employee_id IS NOT NULL 
        AND TRIM(employee_id) <> ''
    `);
    return [
      ...new Set(
        rows
          .map((r) => normalizeEmployeeCode(r.employee_id))
          .filter(Boolean)
      ),
    ];
  } catch (error) {
    console.error("❌ Error fetching active employees:", error);
    return [];
  }
};


/** ✅ Throttle / single-flight */
let lastSyncAt = 0;
let inFlight = null;
const MIN_GAP_MS = Number(process.env.DEVICE_SYNC_MIN_GAP_MS || 55 * 1000);

const shouldSkipSync = () => {
  const now = Date.now();
  if (inFlight) return true;
  if (now - lastSyncAt < MIN_GAP_MS) return true;
  return false;
};

const fetchLogsForSerial = async (serialNumber, fromDate, toDate) => {
  const response = await axios.get(DEVICE_API_URL, {
    timeout: DEVICE_API_TIMEOUT_MS,
    params: {
      APIKey: DEVICE_API_KEY,
      SerialNumber: serialNumber,
      FromDate: fromDate,
      ToDate: toDate,
    },
  });

  if (!Array.isArray(response.data)) {
    throw new Error(`Device API returned invalid payload for serial ${serialNumber}`);
  }

  logSync(`DEVICE SYNC: Serial ${serialNumber} fetched ${response.data.length} logs`);
  return response.data;
};

const fetchDeviceLogs = async (fromDate, toDate) => {
  if (!DEVICE_API_URL || !DEVICE_API_KEY) {
    throw new Error("Device API configuration is incomplete");
  }

  if (!DEVICE_SERIALS.length) {
    throw new Error("DEVICE_SERIALS is empty");
  }

  const results = await Promise.allSettled(
    DEVICE_SERIALS.map((serialNumber) =>
      fetchLogsForSerial(serialNumber, fromDate, toDate)
    )
  );

  const failedSerials = results
    .map((result, index) => ({ result, serialNumber: DEVICE_SERIALS[index] }))
    .filter(({ result }) => result.status === "rejected");

  if (failedSerials.length > 0) {
    const details = failedSerials
      .map(
        ({ serialNumber, result }) =>
          `${serialNumber}: ${result.reason?.message || "Unknown error"}`
      )
      .join(" | ");

    throw new Error(`Device API fetch failed. ${details}`);
  }

  return results.flatMap((result) => result.value);
};

const batchMarkTasksAsNotDone = async (employeeIds, targetDate, submissionTime) => {
  if (!employeeIds?.length) return { checklistUpdated: 0, maintenanceUpdated: 0, housekeepingUpdated: 0 };

  const normalizedEmployeeIds = [
    ...new Set(
      employeeIds
        .map((id) => normalizeEmployeeCode(id))
        .filter((v) => v.length > 0)
    ),
  ];

  if (!normalizedEmployeeIds.length)
    return { checklistUpdated: 0, maintenanceUpdated: 0, housekeepingUpdated: 0 };

  const { rows } = await pool.query(
    `
      SELECT DISTINCT employee_id, user_name
      FROM users
      WHERE employee_id IS NOT NULL
        AND TRIM(employee_id) <> ''
        AND user_name IS NOT NULL
        AND TRIM(user_name) <> ''
    `
  );

  const employeeIdSet = new Set(normalizedEmployeeIds);

  const normalizedNames = [
    ...new Set(
      rows
        .filter((r) => employeeIdSet.has(normalizeEmployeeCode(r.employee_id)))
        .map((r) => r.user_name?.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];

  if (!normalizedNames.length)
    return { checklistUpdated: 0, maintenanceUpdated: 0, housekeepingUpdated: 0 };

  // 1. Update Checklist
  const checklistUpdateResult = await pool.query(
    `
      UPDATE checklist
      SET
        status = 'no',
        user_status_checklist = 'No',
        submission_date = $3
      WHERE LOWER(name) = ANY($1::text[])
        AND task_start_date::date = $2::date
        AND submission_date IS NULL
        AND status IS NULL
    `,
    [normalizedNames, targetDate, submissionTime]
  );

  // 2. Update Maintenance Tasks
  const maintenanceUpdateResult = await maintenancePool.query(
    `
      UPDATE maintenance_task_assign
      SET
        task_status = 'No',
        actual_date = $3
      WHERE LOWER(doer_name) = ANY($1::text[])
        AND task_start_date::date = $2::date
        AND actual_date IS NULL
        AND task_status IS NULL
    `,
    [normalizedNames, targetDate, submissionTime]
  );

  // 3. Update Housekeeping Tasks
  const housekeepingUpdateResult = await housekeepingPool.query(
    `
      UPDATE assign_task
      SET
        status = 'no',
        attachment = 'confirmed',
        submission_date = $3,
        delay = EXTRACT(DAY FROM ($3 - task_start_date))
      WHERE (LOWER(name) = ANY($1::text[]) OR LOWER(doer_name2) = ANY($1::text[]))
        AND task_start_date::date = $2::date
        AND submission_date IS NULL
    `,
    [normalizedNames, targetDate, submissionTime]
  );

  logSync(
    `BATCH SYNC: Updated for date ${targetDate} | Checklist: ${checklistUpdateResult.rowCount} | Maintenance: ${maintenanceUpdateResult.rowCount} | Housekeeping: ${housekeepingUpdateResult.rowCount}`
  );

  return {
    checklistUpdated: checklistUpdateResult.rowCount,
    maintenanceUpdated: maintenanceUpdateResult.rowCount,
    housekeepingUpdated: housekeepingUpdateResult.rowCount,
  };
};


/**
 * 🧹 Blanket Overdue Update
 * Marks ALL tasks (Checklist & Maintenance) as "No" if they were missed.
 * This ensures triggers work in production even if biometric logs are missing.
 */
export const markAllOverdueTasksAsNotDone = async (dateStr = null) => {
  let yesterdayStr = dateStr;

  if (!yesterdayStr) {
    // Falls back to local IST calculation if no date provided
    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    now.setHours(0, 0, 0, 0); // Start of Today
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterdayStr = formatDateString(yesterday);
  }

  const submissionTime = new Date(); // Current system time for completion timestamp

  try {
    // 1. Update Checklist (Target Specific Date)
    const checklistResult = await pool.query(
      `
        UPDATE checklist
        SET
          status = 'no',
          user_status_checklist = 'No',
          submission_date = $2
        WHERE task_start_date::date = $1::date
          AND submission_date IS NULL
          AND status IS NULL
      `,
      [yesterdayStr, submissionTime]
    );

    // 2. Update Maintenance Tasks (Target Specific Date)
    const maintenanceResult = await maintenancePool.query(
      `
        UPDATE maintenance_task_assign
        SET
          task_status = 'No',
          actual_date = $2
        WHERE task_start_date::date = $1::date
          AND actual_date IS NULL
          AND task_status IS NULL
      `,
      [yesterdayStr, submissionTime]
    );

    logSync(`🧹 CLEANUP: Target Date ${yesterdayStr} | Checklist: ${checklistResult.rowCount} | Maintenance: ${maintenanceResult.rowCount}`);



    return {
      checklistUpdated: checklistResult.rowCount,
      maintenanceUpdated: maintenanceResult.rowCount
    };
  } catch (error) {
    console.error("❌ Error in markAllOverdueTasksAsNotDone:", error);
    throw error;
  }
};


const processLogs = async (allLogs, today, startHour) => {
  // startHour determined the mode.
  // 11  -> Mode A (Yesterday Evening Shift)
  // 23  -> Mode B (Today Morning Shift & Absentees)

  const yesterday = getAdjacentDate(today, -1);
  const submissionTime = getSubmissionTime(startHour);

  // empCode -> punches array
  const empActivity = new Map();

  for (const log of allLogs) {
    const punch = String(log?.PunchDirection || "").trim().toLowerCase();
    if (punch !== "in") continue;

    const emp = normalizeEmployeeCode(log?.EmployeeCode);
    const dt = new Date(log?.LogDate);
    if (!emp || Number.isNaN(dt.getTime())) continue;

    if (!empActivity.has(emp)) empActivity.set(emp, []);

    empActivity.get(emp).push({
      dateStr: formatDateString(dt),
      hour: dt.getHours(),
      minute: dt.getMinutes()
    });
  }

  const usersToUpdate = new Set();
  let targetDate = today;
  let modeName = "";

  if (startHour === 11) {
    // === Condition: Evening Shift Yesterday (6 PM - 10 PM) ===
    // "if got the IN punches between evening 6 pm to 10 pm then set their pending tasks not done at next day morning 11 am."
    targetDate = yesterday;
    modeName = "11 AM Trigger (Yesterday Evening Shift)";

    for (const [emp, punches] of empActivity.entries()) {
      for (const p of punches) {
        if (p.dateStr === yesterday) {
          // Check 6 PM (18:00) to 10 PM (22:00)
          if (p.hour >= 18 && p.hour <= 22) {
            usersToUpdate.add(emp);
            break;
          }
        }
      }
    }
  } else if (startHour === 23) {
    // === 11 PM Trigger (Today) ===
    targetDate = today;
    modeName = "11 PM Trigger (Morning Shift + Absentees)";

    const allActiveIds = await getAllActiveEmployeeIds();
    const employeesPunchedToday = new Set();
    const morningPunchersToday = new Set();

    for (const [emp, punches] of empActivity.entries()) {
      for (const p of punches) {
        if (p.dateStr === today) {
          employeesPunchedToday.add(emp);

          // Rule 1: Morning Shift (7:00 AM - 11:50 AM)
          const totalMinutes = p.hour * 60 + p.minute;
          const startLimit = 7 * 60;       // 07:00
          const endLimit = 11 * 60 + 50;   // 11:50
          if (totalMinutes >= startLimit && totalMinutes <= endLimit) {
            morningPunchersToday.add(emp);
          }
        }
      }
    }

    // Combine: Morning Punchers + Absentees
    const absenteesToday = allActiveIds.filter(id => !employeesPunchedToday.has(id));

    morningPunchersToday.forEach(e => usersToUpdate.add(e));
    absenteesToday.forEach(e => usersToUpdate.add(e));

    logSync(`${modeName} | Morning Punchers: ${morningPunchersToday.size} | Absentees: ${absenteesToday.length}`);
  }

  // EXECUTE UPDATE
  const uniqueUsers = Array.from(usersToUpdate);
  const result = await batchMarkTasksAsNotDone(uniqueUsers, targetDate, submissionTime);

  return {
    mode: modeName,
    activeUsers: uniqueUsers.length,
    updated: result
  };
};


// Run Logic
export const refreshDeviceSync = async (today = formatDateString(new Date()), forceHour = undefined) => {
  // ✅ if recent sync already happened, skip heavy calls
  if (shouldSkipSync()) {
    logSync("DEVICE SYNC: skipped (recent/in-flight)");
    return { skipped: true };
  }

  // If forceHour is provided, use it. Otherwise default to current hour (safety)
  const currentHour = forceHour !== undefined ? forceHour : new Date().getHours();

  // Decide date range based on hour
  // If 11 (Morning Run) -> We need logs from Yesterday.
  // If 23 (Night Run)   -> We need logs from Today.
  // To be safe, let's just fetch Yesterday and Today always.

  inFlight = (async () => {
    try {
      const yesterday = getAdjacentDate(today, -1);
      const allLogs = await fetchDeviceLogs(yesterday, today);

      if (currentHour === 23 && allLogs.length === 0) {
        throw new Error("Device API returned no logs for 11 PM sync; skipping to avoid false absentees");
      }

      logSync(`DEVICE SYNC: Fetched logs | Total: ${allLogs.length}`);

      // Pass hour to direct logic
      const result = await processLogs(allLogs, today, currentHour);

      lastSyncAt = Date.now();
      return result;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
};
