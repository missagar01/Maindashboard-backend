const db = require('../config/db');

const Task = {
    findAll: async () => {
        const result = await db.query('SELECT * FROM activities ORDER BY activity_name');
        return result.rows;
    },
    
    findByStructureId: async (structureId) => {
        const result = await db.query('SELECT * FROM activities WHERE structure_id = $1', [structureId]);
        return result.rows;
    },
    
    create: async (structure_id, activity_name, planned_quantity, unit) => {
        const result = await db.query(
            `INSERT INTO activities (structure_id, activity_name, planned_quantity, unit) 
             VALUES ($1, $2, $3, $4) RETURNING activity_id`, 
            [structure_id, activity_name, planned_quantity, unit]
        );
        return result.rows[0];
    },
    
    // Daily Progress
    findProgressByActivityId: async (activityId) => {
        const result = await db.query('SELECT * FROM daily_progress WHERE activity_id = $1 ORDER BY progress_date DESC', [activityId]);
        return result.rows;
    },
    
    addProgress: async (activity_id, progress_date, quantity_completed, labour_count, remarks) => {
        const result = await db.query(
            `INSERT INTO daily_progress (activity_id, progress_date, quantity_completed, labour_count, remarks) 
             VALUES ($1, $2, $3, $4, $5) RETURNING progress_id`, 
            [activity_id, progress_date, quantity_completed, labour_count, remarks]
        );
        return result.rows[0];
    }
};

module.exports = Task;
