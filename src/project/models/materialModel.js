const db = require('../config/db');

const Material = {
    findAll: async () => {
        const result = await db.query('SELECT * FROM materials ORDER BY material_name');
        return result.rows;
    },
    
    create: async (material_name, unit, min_threshold) => {
        const result = await db.query(
            'INSERT INTO materials (material_name, unit, min_threshold, current_stock) VALUES ($1, $2, $3, 0) RETURNING material_id',
            [material_name, unit, min_threshold || 10]
        );
        return result.rows[0];
    },
    
    addInward: async (material_id, quantity, inward_date, supplier, remarks) => {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                'INSERT INTO material_inward (material_id, quantity, inward_date, supplier, remarks) VALUES ($1, $2, $3, $4, $5)',
                [material_id, quantity, inward_date, supplier, remarks]
            );
            await client.query(
                'UPDATE materials SET current_stock = current_stock + $1 WHERE material_id = $2',
                [quantity, material_id]
            );
            await client.query('COMMIT');
            return true;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },
    
    addConsumption: async (material_id, activity_id, quantity, consumption_date, remarks) => {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                'INSERT INTO material_consumption (material_id, activity_id, quantity, consumption_date, remarks) VALUES ($1, $2, $3, $4, $5)',
                [material_id, activity_id || null, quantity, consumption_date, remarks]
            );
            await client.query(
                'UPDATE materials SET current_stock = current_stock - $1 WHERE material_id = $2',
                [quantity, material_id]
            );
            await client.query('COMMIT');
            return true;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },
    
    getLogs: async () => {
        const result = await db.query(`
            SELECT 'inward' as type, inward_id as id, m.material_name, quantity, inward_date as date, supplier as reference, remarks
            FROM material_inward i
            JOIN materials m ON i.material_id = m.material_id
            UNION ALL
            SELECT 'consumption' as type, consumption_id as id, m.material_name, quantity, consumption_date as date, 
                   COALESCE(act.activity_name, 'General') as reference, remarks
            FROM material_consumption c
            JOIN materials m ON c.material_id = m.material_id
            LEFT JOIN activities act ON c.activity_id = act.activity_id
            ORDER BY date DESC, id DESC
            LIMIT 50
        `);
        return result.rows;
    }
};

module.exports = Material;
