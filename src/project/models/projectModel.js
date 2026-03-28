const db = require('../config/db');

const Project = {
    findAll: async () => {
        const result = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
        return result.rows;
    },
    
    create: async (project_name, location, client_name, start_date, expected_end_date) => {
        const result = await db.query(
            'INSERT INTO projects (project_name, location, client_name, start_date, expected_end_date) VALUES ($1, $2, $3, $4, $5) RETURNING project_id',
            [project_name, location, client_name, start_date, expected_end_date]
        );
        return result.rows[0];
    }
};

module.exports = Project;
