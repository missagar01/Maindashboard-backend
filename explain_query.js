const { pgQuery } = require('./config/pg.js');
const dotenv = require('dotenv');
dotenv.config();

async function explainQuery() {
    try {
        const query = `
            SELECT 
                c.client_id, c.client_name, c.city, c.contact_person, 
                c.contact_details, c.sales_person_id, c.client_type, c.status,
                u.user_name as sales_person 
            FROM clients c 
            LEFT JOIN users u ON c.sales_person_id = u.id 
            ORDER BY c.created_at ASC
        `;
        const result = await pgQuery(`EXPLAIN ANALYZE ${query}`);
        console.log(result.rows.map(row => row['QUERY PLAN']).join('\n'));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

explainQuery();



