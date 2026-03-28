const db = require('../config/db');

const WorkArea = {
    findByProjectId: async (projectId) => {
        const result = await db.query('SELECT * FROM project_structure WHERE project_id = $1', [projectId]);
        return result.rows;
    },
    
    create: async (project_id, parent_id, level_type, name) => {
        const result = await db.query(
            'INSERT INTO project_structure (project_id, parent_id, level_type, name) VALUES ($1, $2, $3, $4) RETURNING structure_id', 
            [project_id, parent_id, level_type, name]
        );
        return result.rows[0];
    }
};

module.exports = WorkArea;
