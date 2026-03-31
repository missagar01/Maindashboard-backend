import { pool, maintenancePool } from "../config/db.js";

const PAGE_SIZE = 50;

/**
 * Gets the date range from the 1st of the current month to today.
 */
const getCurrentMonthRange = () => {
    const now = new Date();
    const fistDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const formatDate = (date) => {
        const d = new Date(date);
        const month = '' + (d.getMonth() + 1);
        const day = '' + d.getDate();
        const year = d.getFullYear();

        return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
    };

    return {
        startDate: formatDate(fistDay),
        endDate: formatDate(now)
    };
};

/**
 * Optimized Department Task Fetcher
 * Moves pagination and sorting to the database level (LIMIT/OFFSET).
 */
export const getDepartmentTasks = async (req, res) => {
    try {
        const { username, type = 'pending', page = 1, source = 'checklist' } = req.query;
        const pageNum = parseInt(page) || 1;
        const skip = (pageNum - 1) * PAGE_SIZE;


        if (!username) return res.status(400).json({ error: "Username is required." });

        // 1. Fetch User Access
        const userQuery = `SELECT verify_access, verify_access_dept, department, division FROM users WHERE user_name = $1 LIMIT 1`;
        const { rows: userRows } = await pool.query(userQuery, [username]);

        if (userRows.length === 0) return res.status(404).json({ error: "User not found." });

        const user = userRows[0];
        const role = (user.verify_access || "").toLowerCase();

        if (role !== "hod" && role !== "manager") {
            return res.json({ success: false, data: [], totalCount: 0, counts: { checklist: 0, maintenance: 0, housekeeping: 0 } });
        }

        const { startDate, endDate } = getCurrentMonthRange();
        const isManager = role === "manager";

        let filterClause = "";
        let filterParams = [];

        if (isManager) {
            const departments = (user.verify_access_dept || user.department || "").split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
            if (departments.length === 0) return res.json({ success: false, data: [], totalCount: 0, counts: { checklist: 0, maintenance: 0, housekeeping: 0 } });
            filterClause = `LOWER(department) = ANY($1::text[])`;
            filterParams = [departments];
        } else {
            const division = (user.division || "").trim().toLowerCase();
            if (!division) return res.json({ success: false, data: [], totalCount: 0, counts: { checklist: 0, maintenance: 0, housekeeping: 0 } });
            filterClause = `LOWER(division) = $1`;
            filterParams = [division];
        }

        const pendingF = "submission_date IS NULL AND DATE(task_start_date) <= CURRENT_DATE";
        const compF = `submission_date IS NOT NULL AND submission_date::date BETWEEN '${startDate}' AND '${endDate}'`;
        const activeFilter = type === 'pending' ? pendingF : compF;

        // Custom filter for Maintenance
        const maintActiveFilter = type === 'pending' 
            ? "actual_date IS NULL AND DATE(task_start_date) <= CURRENT_DATE"
            : `actual_date IS NOT NULL AND actual_date::date BETWEEN '${startDate}' AND '${endDate}'`;
        const maintFilterClause = isManager 
            ? 'LOWER(COALESCE(doer_department, machine_department)) = ANY($1::text[])' 
            : 'LOWER(division) = $1';

        // 2. RUN COUNT QUERIES (Fast)
        const countQueries = [
            pool.query(`SELECT COUNT(*) FROM checklist WHERE ${filterClause} AND ${activeFilter}`, filterParams),
            maintenancePool.query(`SELECT COUNT(*) FROM maintenance_task_assign WHERE ${maintFilterClause} AND ${maintActiveFilter}`, filterParams),
            pool.query(`SELECT COUNT(*) FROM assign_task WHERE ${filterClause} AND ${activeFilter}`, filterParams)
        ];

        const [cRes, mRes, hRes] = await Promise.all(countQueries);
        const totalCounts = {
            checklist: parseInt(cRes.rows[0].count),
            maintenance: parseInt(mRes.rows[0].count),
            housekeeping: parseInt(hRes.rows[0].count)
        };

        // 3. RUN DATA QUERY (Only for the active source)
        let dataSql = "";
        let dbPool = pool;

        if (source === 'maintenance') {
            dbPool = maintenancePool;
            dataSql = `
                SELECT 'maintenance' as "sourceSystem", task_no as task_id, task_no, description as task_description, doer_name,
                       COALESCE(doer_department, machine_department) as department, machine_name, machine_area as location,
                       division, task_start_date, actual_date as submission_date, task_status as status,
                       frequency, priority, need_sound_test as sound_status, temperature as temperature_status, NULL as remarks
                FROM maintenance_task_assign
                WHERE ${maintFilterClause} AND ${maintActiveFilter}
                ORDER BY task_start_date DESC, task_no DESC
                LIMIT ${PAGE_SIZE} OFFSET ${skip}
            `;
        } else if (source === 'housekeeping') {
            dataSql = `
                SELECT 'housekeeping' as "sourceSystem", id as task_id, task_description, name, department, division,
                       task_start_date, submission_date, status, frequency, 'Medium' as priority,
                       attachment, remark, hod
                FROM assign_task
                WHERE ${filterClause} AND ${activeFilter}
                ORDER BY task_start_date DESC, id DESC
                LIMIT ${PAGE_SIZE} OFFSET ${skip}
            `;
        } else {
            dataSql = `
                SELECT 'checklist' as "sourceSystem", task_id, task_description, name, department, division,
                       task_start_date, submission_date, status, frequency, 'Medium' as priority,
                       admin_done as attachment, remark, NULL as image
                FROM checklist
                WHERE ${filterClause} AND ${activeFilter}
                ORDER BY task_start_date DESC, task_id DESC
                LIMIT ${PAGE_SIZE} OFFSET ${skip}
            `;
        }

        const { rows: paginatedTasks } = await dbPool.query(dataSql, filterParams);


        res.json({
            success: true,
            data: paginatedTasks,
            totalCount: totalCounts[source] || 0,
            counts: totalCounts,
            page: pageNum,
            pageSize: PAGE_SIZE
        });

    } catch (err) {
        console.error("❌ Error fetching department tasks:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
