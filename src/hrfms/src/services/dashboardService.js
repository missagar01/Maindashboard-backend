const pool = require('../config/db');
const axios = require('axios');
const { getOrSetCache } = require('../utils/cache');
const employeeModel = require('../models/employeeModel');

const API_KEY = process.env.API_KEY;
const DEVICE_SERIALS = process.env.DEVICE_SERIALS ? process.env.DEVICE_SERIALS.split(',') : [];
const DEVICE_API_URL = process.env.DEVICE_API_URL;

const MONTH_WINDOW = 6;
const ATTRITION_PATTERN = 'resign|left|terminated|separate';
const CACHE_TTL = 10; // 10 seconds cache for dashboard

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeEmployeeCode(value) {
  const text = String(value ?? '').trim().toUpperCase();
  if (!text) return '';
  if (/^\d+$/.test(text)) return String(Number(text));

  const prefixed = text.match(/^([A-Z]+)0*(\d+)$/);
  if (prefixed) return `${prefixed[1]}${Number(prefixed[2])}`;

  return text;
}

function normalizeLogDate(value) {
  const source = String(value ?? '').trim();
  if (!source) return '';

  const datePart = source.includes('T')
    ? source.split('T')[0]
    : (source.includes(' ') ? source.split(' ')[0] : source);

  if (datePart.includes('/')) {
    const [d, m, y] = datePart.split('/');
    if (d && m && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  if (datePart.includes('-')) {
    const parts = datePart.split('-');
    if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  return datePart;
}

function extractDeviceLogs(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const possibleArrays = [
    payload.data,
    payload.Data,
    payload.logs,
    payload.Logs,
    payload.result,
    payload.Result
  ];

  for (const value of possibleArrays) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

function normalizePunchDirection(log) {
  if (!log || typeof log !== 'object') return '';

  const rawDirection = [
    log.PunchDirection,
    log.InOut,
    log.InOutMode,
    log.IOType,
    log.Direction,
    log.PunchType,
    log.LogType,
    log.CheckType
  ].find(v => v !== undefined && v !== null && String(v).trim() !== '');

  if (rawDirection === undefined) return '';

  const text = String(rawDirection).trim().toLowerCase();
  if (!text) return '';
  if (text.includes('in')) return 'in';
  if (text.includes('out')) return 'out';

  if (/^\d+$/.test(text)) {
    const code = Number(text);
    if (code === 0 || code === 1) return 'in';
    if (code === 2 || code === 3) return 'out';
  }

  return '';
}

function buildMonthWindow(count) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric'
  });

  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = formatter.format(date);
    months.push({ key, label });
  }
  return months;
}

class DashboardService {
  constructor() {
    this.columnCache = new Map();
  }

  async hasColumn(client, tableName, columnName) {
    const cacheKey = `${tableName}.${columnName}`;
    if (this.columnCache.has(cacheKey)) return this.columnCache.get(cacheKey);

    const result = await client.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2) AS exists`,
      [tableName, columnName]
    );
    const exists = Boolean(result.rows[0]?.exists);
    this.columnCache.set(cacheKey, exists);
    return exists;
  }

  async fetchDeviceLogs(fromDate, toDate) {
    const logPromises = DEVICE_SERIALS.map(serial =>
      axios.get(DEVICE_API_URL, {
        params: { APIKey: API_KEY, SerialNumber: serial, FromDate: fromDate, ToDate: toDate }
      }).then(res => ({
        serial,
        logs: extractDeviceLogs(res.data),
        error: null
      })).catch(err => {
        console.error(`Error fetching logs for device ${serial}:`, err.message);
        return {
          serial,
          logs: [],
          error: err.message || 'Unknown device error'
        };
      })
    );
    const results = await Promise.all(logPromises);
    return {
      logs: results.flatMap(r => r.logs),
      deviceStatus: results.map(r => ({
        serial: r.serial,
        ok: !r.error,
        error: r.error
      }))
    };
  }

  /**
   * ADMIN DASHBOARD STATS
   * Optimized with Redis Caching and Lean SQL Queries
   */
  async getDashboardStats() {
    return getOrSetCache('dashboard:admin:global', CACHE_TTL, async () => {
      const client = await pool.connect();
      try {
        // Parallelize Column Checks
        const checkPromises = [
          this.hasColumn(client, 'users', 'created_at'),
          this.hasColumn(client, 'users', 'leave_date'),
          this.hasColumn(client, 'leave_request', 'created_at'),
          this.hasColumn(client, 'request', 'created_at'),
          this.hasColumn(client, 'ticket_book', 'created_at'),
          this.hasColumn(client, 'resume_request', 'created_at'),
          this.hasColumn(client, 'plant_visitor', 'created_at')
        ];
        const [hEC, hLD, hLC, hRC, hTC, hResC, hVC] = await Promise.all(checkPromises);

        // Attendance API Request
        const dateStr = getLocalDateString();
        const logsPromise = this.fetchDeviceLogs(dateStr, dateStr);

        // Define optimized Queries
        const summaryLeftClause = hLD ? `COUNT(*) FILTER (WHERE status_raw ~* '${ATTRITION_PATTERN}' AND leave_date >= date_trunc('month', CURRENT_DATE))::int` : '0';

        const queries = {
          summary: `
            SELECT
              COUNT(*)::int AS total_employees,
              COUNT(*) FILTER (WHERE status_norm = 'active')::int AS active_employees,
              COUNT(*) FILTER (WHERE status_raw ~* '${ATTRITION_PATTERN}')::int AS resigned_employees,
              ${summaryLeftClause} AS left_this_month
            FROM (
              SELECT
                LOWER(TRIM(COALESCE(status::text, ''))) AS status_norm,
                status::text AS status_raw,
                leave_date
              FROM users
            ) u
          `,
          status: `SELECT COALESCE(NULLIF(TRIM(status::text), ''), 'Unknown') AS status_label, COUNT(*)::int AS count FROM users GROUP BY 1 ORDER BY COUNT(*) DESC, status_label ASC`,
          hiring: hEC ? `SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS hired FROM users WHERE created_at IS NOT NULL AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months' GROUP BY 1 ORDER BY 1` : 'SELECT NULL AS month, 0 AS hired WHERE false',
          designation: `SELECT COALESCE(NULLIF(TRIM(designation::text), ''), 'Unassigned') AS designation, COUNT(*)::int AS employees FROM users GROUP BY 1 ORDER BY employees DESC, designation ASC LIMIT 10`,
          leaves: `
            SELECT
              COUNT(*)::int AS total_leaves,
              COUNT(*) FILTER (WHERE request_status_norm = 'approved' OR approved_by_status_norm = 'approved')::int AS approved_leaves,
              COUNT(*) FILTER (WHERE request_status_norm = 'pending' OR (approved_by_status_raw IS NULL AND request_status_raw IS NULL))::int AS pending_leaves,
              COUNT(*) FILTER (WHERE request_status_norm = 'rejected' OR approved_by_status_norm = 'rejected')::int AS rejected_leaves,
              COUNT(*) FILTER (WHERE hr_approval_norm = 'approved' OR approval_hr_norm = 'approved')::int AS hr_approved
            FROM (
              SELECT
                request_status AS request_status_raw,
                approved_by_status AS approved_by_status_raw,
                LOWER(COALESCE(request_status::text, '')) AS request_status_norm,
                LOWER(COALESCE(approved_by_status::text, '')) AS approved_by_status_norm,
                LOWER(COALESCE(hr_approval::text, '')) AS hr_approval_norm,
                LOWER(COALESCE(approval_hr::text, '')) AS approval_hr_norm
              FROM leave_request
            ) l
          `,
          monthlyLeaves: hLC ? `SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS leaves FROM leave_request WHERE created_at IS NOT NULL AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months' GROUP BY 1 ORDER BY 1` : 'SELECT NULL AS month, 0 AS leaves WHERE false',
          travels: `
            SELECT
              COUNT(*)::int AS total_travels,
              COUNT(*) FILTER (WHERE request_status_norm = 'approved')::int AS approved_travels,
              COUNT(*) FILTER (WHERE request_status_norm = 'pending' OR request_status_raw IS NULL)::int AS pending_travels,
              COUNT(*) FILTER (WHERE request_status_norm = 'rejected')::int AS rejected_travels
            FROM (
              SELECT
                request_status AS request_status_raw,
                LOWER(COALESCE(request_status::text, '')) AS request_status_norm
              FROM request
            ) r
          `,
          monthlyTravels: hRC ? `SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS travels FROM request WHERE created_at IS NOT NULL AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months' GROUP BY 1 ORDER BY 1` : 'SELECT NULL AS month, 0 AS travels WHERE false',
          tickets: `
            SELECT
              COUNT(*)::int AS total_tickets,
              COUNT(*) FILTER (WHERE status_norm = 'booked' OR status_norm = 'completed')::int AS booked_tickets,
              COUNT(*) FILTER (WHERE status_norm = 'pending' OR status_raw IS NULL)::int AS pending_tickets,
              COALESCE(SUM(total_amount), 0)::numeric AS total_amount
            FROM (
              SELECT
                status AS status_raw,
                LOWER(COALESCE(status::text, '')) AS status_norm,
                total_amount
              FROM ticket_book
            ) tk
          `,
          monthlyTickets: hTC ? `SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS tickets, COALESCE(SUM(total_amount), 0)::numeric AS amount FROM ticket_book WHERE created_at IS NOT NULL AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months' GROUP BY 1 ORDER BY 1` : 'SELECT NULL AS month, 0 AS tickets, 0 AS amount WHERE false',
          resumes: `
            SELECT
              COUNT(*)::int AS total_candidates,
              COUNT(*) FILTER (WHERE candidate_status_norm = 'selected')::int AS selected_candidates,
              COUNT(*) FILTER (WHERE candidate_status_norm = 'pending' OR candidate_status_raw IS NULL)::int AS pending_candidates,
              COUNT(*) FILTER (WHERE candidate_status_norm = 'rejected')::int AS rejected_candidates,
              COUNT(*) FILTER (WHERE joined_status_norm = 'joined' OR joined_status_norm = 'yes')::int AS joined_candidates,
              COUNT(*) FILTER (WHERE interviewer_status_raw IS NOT NULL)::int AS interviewed_candidates
            FROM (
              SELECT
                candidate_status AS candidate_status_raw,
                joined_status AS joined_status_raw,
                interviewer_status AS interviewer_status_raw,
                LOWER(COALESCE(candidate_status::text, '')) AS candidate_status_norm,
                LOWER(COALESCE(joined_status::text, '')) AS joined_status_norm
              FROM resume_request
            ) rs
          `,
          monthlyResumes: hResC ? `SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS candidates FROM resume_request WHERE created_at IS NOT NULL AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months' GROUP BY 1 ORDER BY 1` : 'SELECT NULL AS month, 0 AS candidates WHERE false',
          visitors: `
            SELECT
              COUNT(*)::int AS total_visitors,
              COUNT(*) FILTER (WHERE request_status_norm = 'approved')::int AS approved_visitors,
              COUNT(*) FILTER (WHERE request_status_norm = 'pending' OR request_status_raw IS NULL)::int AS pending_visitors,
              COUNT(*) FILTER (WHERE request_status_norm = 'rejected')::int AS rejected_visitors
            FROM (
              SELECT
                request_status AS request_status_raw,
                LOWER(COALESCE(request_status::text, '')) AS request_status_norm
              FROM plant_visitor
            ) pv
          `,
          monthlyVisitors: hVC ? `SELECT TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') AS month, COUNT(*)::int AS visitors FROM plant_visitor WHERE created_at IS NOT NULL AND created_at >= date_trunc('month', CURRENT_DATE) - interval '${MONTH_WINDOW - 1} months' GROUP BY 1 ORDER BY 1` : 'SELECT NULL AS month, 0 AS visitors WHERE false',
          activeEmpIDs: "SELECT employee_id FROM users WHERE LOWER(TRIM(COALESCE(status::text, ''))) = 'active' AND employee_id IS NOT NULL"
        };

        // Execute DB Queries and API Calls IN PARALLEL
        const results = await Promise.all([
          client.query(queries.summary),
          client.query(queries.status),
          client.query(queries.hiring),
          client.query(queries.designation),
          client.query(queries.leaves),
          client.query(queries.monthlyLeaves),
          client.query(queries.travels),
          client.query(queries.monthlyTravels),
          client.query(queries.tickets),
          client.query(queries.monthlyTickets),
          client.query(queries.resumes),
          client.query(queries.monthlyResumes),
          client.query(queries.visitors),
          client.query(queries.monthlyVisitors),
          client.query(queries.activeEmpIDs),
          logsPromise
        ]);

        const [sRes, stRes, hRes, dRes, lRes, mlRes, tRes, mtRes, tkRes, mtkRes, rRes, mrRes, vRes, mvRes, actRes, deviceData] = results;
        const allLogs = Array.isArray(deviceData?.logs) ? deviceData.logs : [];
        const deviceStatus = Array.isArray(deviceData?.deviceStatus) ? deviceData.deviceStatus : [];

        // Attendance Processing
        const activeCodes = actRes.rows
          .map(e => normalizeEmployeeCode(e.employee_id))
          .filter(Boolean);
        const totalActive = activeCodes.length;
        const logsCodes = new Set(
          allLogs
            .filter(l => l && normalizeLogDate(l.LogDate) === dateStr)
            .map(l => normalizeEmployeeCode(l.EmployeeCode))
            .filter(Boolean)
        );
        let presentCount = 0;
        for (const code of activeCodes) {
          if (logsCodes.has(code)) presentCount += 1;
        }
        const todaysLogs = allLogs.filter(l => l && normalizeLogDate(l.LogDate) === dateStr);
        const inCount = todaysLogs.filter(l => normalizePunchDirection(l) === 'in').length;
        const outCount = todaysLogs.filter(l => normalizePunchDirection(l) === 'out').length;
        const hasDeviceError = deviceStatus.some(d => !d.ok);

        const months = buildMonthWindow(MONTH_WINDOW);
        const hiringMap = new Map(hRes.rows.map(r => [r.month, r.hired]));
        const lMap = new Map(mlRes.rows.map(r => [r.month, r.leaves]));
        const tMap = new Map(mtRes.rows.map(r => [r.month, r.travels]));
        const tkMap = new Map(mtkRes.rows.map(r => [r.month, r.tickets]));
        const tkaMap = new Map(mtkRes.rows.map(r => [r.month, parseFloat(r.amount || 0)]));
        const rMap = new Map(mrRes.rows.map(r => [r.month, r.candidates]));
        const vMap = new Map(mvRes.rows.map(r => [r.month, r.visitors]));

        return {
          summary: { totalEmployees: sRes.rows[0].total_employees, activeEmployees: sRes.rows[0].active_employees, resignedEmployees: sRes.rows[0].resigned_employees, leftThisMonth: sRes.rows[0].left_this_month },
          leaveRequests: { total: lRes.rows[0].total_leaves, approved: lRes.rows[0].approved_leaves, pending: lRes.rows[0].pending_leaves, rejected: lRes.rows[0].rejected_leaves, hrApproved: lRes.rows[0].hr_approved },
          travelRequests: { total: tRes.rows[0].total_travels, approved: tRes.rows[0].approved_travels, pending: tRes.rows[0].pending_travels, rejected: tRes.rows[0].rejected_travels },
          tickets: { total: tkRes.rows[0].total_tickets, booked: tkRes.rows[0].booked_tickets, pending: tkRes.rows[0].pending_tickets, totalAmount: parseFloat(tkRes.rows[0].total_amount || 0) },
          resumes: { total: rRes.rows[0].total_candidates, selected: rRes.rows[0].selected_candidates, pending: rRes.rows[0].pending_candidates, rejected: rRes.rows[0].rejected_candidates, joined: rRes.rows[0].joined_candidates, interviewed: rRes.rows[0].interviewed_candidates },
          visitors: { total: vRes.rows[0].total_visitors, approved: vRes.rows[0].approved_visitors, pending: vRes.rows[0].pending_visitors, rejected: vRes.rows[0].rejected_visitors },
          statusDistribution: stRes.rows.map(r => ({ label: r.status_label, value: r.count })),
          monthlyHiringVsAttrition: months.map(m => ({ month: m.label, hired: hiringMap.get(m.key) || 0, left: 0 })),
          monthlyRequestTrends: months.map(m => ({ month: m.label, leaves: lMap.get(m.key) || 0, travels: tMap.get(m.key) || 0, tickets: tkMap.get(m.key) || 0, visitors: vMap.get(m.key) || 0 })),
          monthlyTicketRevenue: months.map(m => ({ month: m.label, amount: tkaMap.get(m.key) || 0 })),
          designationCounts: dRes.rows.map(r => ({ designation: r.designation, employees: r.employees })),
          attendance: {
            present: presentCount,
            absent: totalActive - presentCount,
            totalActive,
            date: dateStr,
            inCount,
            outCount,
            deviceConnected: !hasDeviceError,
            deviceStatus
          }
        };
      } finally {
        client.release();
      }
    });
  }

  /**
   * USER/EMPLOYEE DASHBOARD STATS
   * Optimized with Redis Caching and Bound Queries
   */
  async getEmployeeDashboardStats(userId, employeeId, monthStr) {
    console.log(`[LIVE API HIT] getEmployeeDashboardStats called with: userId=${userId}, employeeId=${employeeId}, monthStr=${monthStr}`);
    const cacheKey = `dashboard:user:${employeeId}:${monthStr || 'current'}`;
    return getOrSetCache(cacheKey, CACHE_TTL, async () => {
      console.log(`[CACHE MISS] Fetching fresh data for ${employeeId}`);
      const client = await pool.connect();
      try {
        let finalUserId = userId;
        if (!finalUserId) {
          const userRes = await client.query('SELECT id FROM users WHERE employee_id = $1', [employeeId]);
          finalUserId = userRes.rows[0]?.id;
        }

        const today = new Date();
        let startDate, endDate;
        if (monthStr && monthStr.includes('-')) {
          const parts = monthStr.split('-');
          startDate = new Date(parts[0], parts[1] - 1, 1);
          endDate = new Date(parts[0], parts[1], 0);
        } else {
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }

        const toS = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const fS = toS(startDate), fE = toS(endDate);

        // Optimized Selects with only required columns
        const [leaveRes, travelRes, ticketRes, visitRes, deviceData] = await Promise.all([
          client.query(`SELECT id, from_date, to_date, reason, request_status, approved_by_status FROM leave_request WHERE (employee_id = $1 OR user_id = $4) AND (from_date <= $3 AND COALESCE(to_date, from_date) >= $2) ORDER BY from_date DESC`, [employeeId, fS, fE, finalUserId]),
          client.query(`SELECT id, from_date, to_date, reason_for_travel, from_city, to_city, request_status FROM request WHERE employee_code = $1 AND from_date BETWEEN $2 AND $3 ORDER BY from_date DESC`, [employeeId, fS, fE]),
          client.query(`SELECT id, travels_name, bill_number, total_amount, status, created_at FROM ticket_book WHERE (request_employee_code = $1 OR booked_employee_code = $1) AND created_at::date BETWEEN $2 AND $3 ORDER BY created_at DESC`, [employeeId, fS, fE]),
          client.query(`SELECT id, person_name, from_date, to_date, reason_for_visit, request_status FROM plant_visitor WHERE employee_code = $1 AND from_date BETWEEN $2 AND $3 ORDER BY from_date DESC`, [employeeId, fS, fE]),
          this.fetchDeviceLogs(fS, fE)
        ]);
        const allLogs = Array.isArray(deviceData?.logs) ? deviceData.logs : [];

        const targetEmployeeCode = normalizeEmployeeCode(employeeId);
        const empLogs = allLogs.filter(
          l => l && normalizeEmployeeCode(l.EmployeeCode) === targetEmployeeCode
        );

        const approvedLeaves = leaveRes.rows.filter(l => 
          (l.request_status || '').toLowerCase() === 'approved' || 
          (l.approved_by_status || '').toLowerCase() === 'approved'
        );

        let present = 0, absent = 0, onLeave = 0;
        const attMap = {};
        const days = endDate.getDate();
        for (let d = 1; d <= days; d++) {
          const dt = new Date(startDate.getFullYear(), startDate.getMonth(), d);
          const ds = toS(dt);

          const isLeave = approvedLeaves.some(l => {
            const normStart = toS(new Date(l.from_date));
            const normEnd = toS(new Date(l.to_date || l.from_date));
            return ds >= normStart && ds <= normEnd;
          });

          if (isLeave) {
            if (dt <= today) {
              attMap[ds] = 'L';
              onLeave++; // Only count leaves that have occurred or are occurring
            } else {
              attMap[ds] = 'AL'; // Approved Leave (Future)
            }
          } else if (dt > today) {
            attMap[ds] = '-';
          } else {
            const has = empLogs.some(l => normalizeLogDate(l.LogDate) === ds);
            attMap[ds] = has ? 'P' : 'A';
            if (has) present++; else absent++;
          }
        }

        return {
          attendance: { present, absent, onLeave, totalWorkingDays: present + absent + onLeave, details: attMap, month: monthStr || startDate.toISOString().slice(0, 7) },
          leaves: leaveRes.rows, travels: travelRes.rows, tickets: ticketRes.rows, visits: visitRes.rows
        };
      } finally {
        client.release();
      }
    });
  }

  /**
   * EMPLOYEE FULL DETAILS (ADMIN VIEW)
   */
  async getEmployeeDetails(employeeId) {
    const cacheKey = `dashboard:details:${employeeId}`;
    return getOrSetCache(cacheKey, CACHE_TTL, async () => {
      const client = await pool.connect();
      try {
        const user = await employeeModel.getByEmployeeId(employeeId);
        if (!user) throw new Error('Employee not found');

        const now = new Date();
        const sD = new Date(now.getFullYear(), now.getMonth(), 1);
        const eD = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const toS = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // Parallel Fetch with lean columns
        const [lRes, tRes, tkRes, vRes, deviceData] = await Promise.all([
          client.query('SELECT id, from_date, to_date, reason, request_status, approved_by_status FROM leave_request WHERE (employee_id = $1 OR user_id = $2) ORDER BY from_date DESC', [employeeId, user.id]),
          client.query('SELECT id, from_date, to_date, reason_for_travel, request_status FROM request WHERE employee_code = $1 ORDER BY from_date DESC', [employeeId]),
          client.query('SELECT id, total_amount, status, created_at FROM ticket_book WHERE request_employee_code = $1 OR booked_employee_code = $1 ORDER BY created_at DESC', [employeeId]),
          client.query('SELECT id, from_date, person_name, reason_for_visit, request_status FROM plant_visitor WHERE employee_code = $1 ORDER BY from_date DESC', [employeeId]),
          this.fetchDeviceLogs(toS(sD), toS(eD))
        ]);
        const allLogs = Array.isArray(deviceData?.logs) ? deviceData.logs : [];

        const targetEmployeeCode = normalizeEmployeeCode(employeeId);
        const empLogs = allLogs.filter(
          l => l && normalizeEmployeeCode(l.EmployeeCode) === targetEmployeeCode
        );

        const approvedLeaves = lRes.rows.filter(l => 
          (l.request_status || '').toLowerCase() === 'approved' || 
          (l.approved_by_status || '').toLowerCase() === 'approved'
        );

        let p = 0, a = 0, onLeave = 0;
        const attMap = {};
        for (let d = 1; d <= eD.getDate(); d++) {
          const dt = new Date(sD.getFullYear(), sD.getMonth(), d);
          const ds = toS(dt);

          const isLeave = approvedLeaves.some(l => {
            const normStart = toS(new Date(l.from_date));
            const normEnd = toS(new Date(l.to_date || l.from_date));
            return ds >= normStart && ds <= normEnd;
          });

          if (isLeave) {
            if (dt <= now) {
               attMap[ds] = 'L';
               onLeave++; // Only count towards summary if it has passed
            } else {
               attMap[ds] = 'AL';
            }
          } else if (dt <= now) {
             const has = empLogs.some(l => normalizeLogDate(l.LogDate) === ds);
             if (has) { p++; attMap[ds] = 'P'; } else { a++; attMap[ds] = 'A'; }
          }
        }

        return {
          profile: user,
          attendanceSummary: { month: new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(now), present: p, absent: a, onLeave, total: p + a + onLeave, details: attMap },
          leaves: lRes.rows, travels: tRes.rows, tickets: tkRes.rows, visits: vRes.rows
        };
      } finally {
        client.release();
      }
    });
  }
}

module.exports = new DashboardService();