const { pgQuery } = require("../../../config/pg.js");
const { generateCacheKey, withCache, delCached, DEFAULT_TTL } = require("../utils/cacheHelper.js");

// ==========================================
// CLIENTS CRUD
// ==========================================

const CLIENTS_CACHE_KEY = generateCacheKey("clients");
const MARKETING_USERS_CACHE_KEY = generateCacheKey("marketing_users");

/**
 * Get all clients
 */
async function getClients() {
    return withCache(CLIENTS_CACHE_KEY, DEFAULT_TTL.CUSTOMERS, async () => {
        try {
            // Fetch clients and marketing users in parallel for enriching
            const [clientsRes, usersRes] = await Promise.all([
                pgQuery(`SELECT client_id, client_name, city, contact_person, contact_details, sales_person_id, client_type, status, created_at FROM clients ORDER BY created_at ASC`),
                getMarketingUsers() // This will also be cached
            ]);

            const clients = clientsRes.rows;
            const usersMap = new Map(usersRes.map(u => [u.id, u.user_name]));

            return clients.map(c => ({
                ...c,
                sales_person: usersMap.get(c.sales_person_id) || null
            }));
        } catch (err) {
            console.error("Error fetching clients:", err);
            throw err;
        }
    });
}

/**
 * Get client by ID
 */
async function getClientById(clientId) {
    try {
        const query = `SELECT client_id, client_name, city, contact_person, contact_details, sales_person_id, client_type, status FROM clients WHERE client_id = $1`;
        const result = await pgQuery(query, [clientId]);
        return result.rows[0] || null;
    } catch (err) {
        console.error("Error fetching client by ID:", err);
        throw err;
    }
}

/**
 * Create a new client
 */
async function createClient(clientData) {
    try {
        const {
            client_id,
            client_name,
            city,
            contact_person,
            contact_details,
            sales_person_id,
            client_type,
            status
        } = clientData;

        const query = `
            INSERT INTO clients (
                client_id, client_name, city, contact_person, 
                contact_details, sales_person_id, client_type, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;

        const values = [
            client_id || null,
            client_name,
            city,
            contact_person,
            contact_details,
            sales_person_id ? parseInt(sales_person_id) : null,
            client_type,
            status || 'Active'
        ];

        const result = await pgQuery(query, values);

        // Invalidate cache
        await delCached(CLIENTS_CACHE_KEY);

        return result.rows[0];
    } catch (err) {
        console.error("Error creating client:", err);
        throw err;
    }
}

/**
 * Update a client
 */
async function updateClient(clientId, clientData) {
    try {
        const {
            client_name,
            city,
            contact_person,
            contact_details,
            sales_person_id,
            client_type,
            status
        } = clientData;

        const query = `
            UPDATE clients 
            SET client_name = $1, 
                city = $2, 
                contact_person = $3, 
                contact_details = $4, 
                sales_person_id = $5, 
                client_type = $6, 
                status = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE client_id = $8
            RETURNING *
        `;

        const values = [
            client_name,
            city,
            contact_person,
            contact_details,
            sales_person_id ? parseInt(sales_person_id) : null,
            client_type,
            status,
            clientId
        ];

        const result = await pgQuery(query, values);

        // Invalidate cache
        await delCached(CLIENTS_CACHE_KEY);

        return result.rows[0];
    } catch (err) {
        console.error("Error updating client:", err);
        throw err;
    }
}

/**
 * Delete a client
 */
async function deleteClient(clientId) {
    try {
        const query = `DELETE FROM clients WHERE client_id = $1 RETURNING *`;
        const result = await pgQuery(query, [clientId]);

        // Invalidate cache
        await delCached(CLIENTS_CACHE_KEY);

        return result.rows[0];
    } catch (err) {
        console.error("Error deleting client:", err);
        throw err;
    }
}

/**
 * Get users from MARKETING department
 */
async function getMarketingUsers() {
    return withCache(MARKETING_USERS_CACHE_KEY, DEFAULT_TTL.CUSTOMERS, async () => {
        try {
            const query = `SELECT id, user_name, department FROM users WHERE department = 'MARKETING'`;
            const result = await pgQuery(query);
            return result.rows;
        } catch (err) {
            console.error("Error fetching marketing users:", err);
            throw err;
        }
    });
}

/**
 * Get total count of clients
 */
async function getTotalClientsCount() {
    return withCache(generateCacheKey("clients_count"), DEFAULT_TTL.CUSTOMERS, async () => {
        try {
            const query = `SELECT COUNT(*)::int as total FROM clients`;
            const result = await pgQuery(query);
            return result.rows[0].total;
        } catch (err) {
            console.error("Error fetching clients count:", err);
            throw err;
        }
    });
}

module.exports = {
    getClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient,
    getMarketingUsers,
    getTotalClientsCount
};
