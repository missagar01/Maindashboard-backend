const db = require('../config/db');

const Analytics = {
    getOperationalSummary: async () => {
        // 1. Calculate Delayed Activities
        const delayedRes = await db.query(`
            SELECT COUNT(*) as delayed_count 
            FROM activities 
            WHERE due_date < CURRENT_DATE 
            AND activity_id IN (
                SELECT activity_id 
                FROM daily_progress 
                GROUP BY activity_id 
                HAVING SUM(quantity_completed) < (SELECT planned_quantity FROM activities a WHERE a.activity_id = daily_progress.activity_id)
            )
        `);

        // 2. Total Labor Strength (Last 24 hours)
        const laborRes = await db.query(`
            SELECT SUM(labour_count) as total_labor 
            FROM daily_progress 
            WHERE progress_date = CURRENT_DATE
        `);

        // 3. Project Progress Summary
        const progressRes = await db.query(`
            SELECT 
                p.project_name,
                COUNT(a.activity_id) as total_tasks,
                SUM(CASE WHEN a.due_date < CURRENT_DATE THEN 1 ELSE 0 END) as delayed_tasks
            FROM projects p
            LEFT JOIN project_structure ps ON p.project_id = ps.project_id
            LEFT JOIN activities a ON ps.structure_id = a.structure_id
            GROUP BY p.project_id, p.project_name
        `);

        // 4. Critical Stock Alerts
        const stockRes = await db.query(`
            SELECT material_name, current_stock, unit 
            FROM materials 
            WHERE current_stock < 100
        `);

        return {
            delayed_count: parseInt(delayedRes.rows[0].delayed_count || 0),
            total_labor: parseInt(laborRes.rows[0].total_labor || 0),
            project_stats: progressRes.rows,
            critical_stock: stockRes.rows
        };
    }
};

module.exports = Analytics;
