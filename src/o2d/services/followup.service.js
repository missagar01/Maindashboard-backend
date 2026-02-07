const { pgQuery } = require("../../../config/pg.js");
const { generateCacheKey, withCache, delCached, DEFAULT_TTL } = require("../utils/cacheHelper.js");

const FOLLOWUPS_CACHE_KEY = generateCacheKey("followups");

/**
 * Get all followups
 */
async function getAllFollowups(username, role) {
    const userRole = (role || "").toString().toLowerCase();
    const isAdmin = userRole === "admin" || userRole === "all access";

    // Use user-specific cache key for non-admins to avoid data leakage
    const cacheKey = isAdmin ? FOLLOWUPS_CACHE_KEY : `${FOLLOWUPS_CACHE_KEY}_${username}`;

    return withCache(cacheKey, DEFAULT_TTL.TIMELINE, async () => {
        try {
            let query = `
                SELECT 
                    followup_id, 
                    client_name, 
                    sales_person, 
                    actual_order, 
                    actual_order_date, 
                    date_of_calling, 
                    next_calling_date 
                FROM client_followups 
            `;
            const values = [];

            if (!isAdmin && username) {
                query += ` WHERE LOWER(TRIM(sales_person)) = LOWER($1) `;
                values.push(username);
            }

            query += ` ORDER BY date_of_calling DESC, followup_id DESC `;

            const result = await pgQuery(query, values);
            return result.rows;
        } catch (err) {
            console.error("Error fetching followups:", err);
            throw err;
        }
    });
}

/**
 * Create a new followup
 */
async function createFollowup(followupData) {
    try {
        const {
            client_name,
            sales_person,
            actual_order,
            actual_order_date,
            date_of_calling,
            next_calling_date
        } = followupData;

        const query = `
            INSERT INTO client_followups (
                client_name, sales_person, actual_order, 
                actual_order_date, date_of_calling, next_calling_date
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const values = [
            client_name,
            sales_person,
            actual_order ? parseFloat(actual_order) : 0,
            actual_order_date || null,
            date_of_calling || new Date(),
            next_calling_date || null
        ];

        const result = await pgQuery(query, values);

        // Invalidate cache
        await delCached(FOLLOWUPS_CACHE_KEY);
        if (sales_person) {
            await delCached(`${FOLLOWUPS_CACHE_KEY}_${sales_person}`);
        }

        return result.rows[0];
    } catch (err) {
        console.error("Error creating followup:", err);
        throw err;
    }
}

/**
 * Get followup by ID
 */
async function getFollowupById(followupId) {
    try {
        const query = `SELECT followup_id, client_name, sales_person, actual_order, actual_order_date, date_of_calling, next_calling_date FROM client_followups WHERE followup_id = $1`;
        const result = await pgQuery(query, [followupId]);
        return result.rows[0] || null;
    } catch (err) {
        console.error("Error fetching followup by ID:", err);
        throw err;
    }
}

/**
 * Update a followup
 */


async function updateFollowup(followupId, followupData) {
    try {
        const {
            client_name,
            sales_person,
            actual_order,
            actual_order_date,
            date_of_calling,
            next_calling_date
        } = followupData;

        const query = `
            UPDATE client_followups 
            SET client_name = $1, 
                sales_person = $2, 
                actual_order = $3, 
                actual_order_date = $4, 
                date_of_calling = $5, 
                next_calling_date = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE followup_id = $7
            RETURNING *
        `;

        const values = [
            client_name,
            sales_person,
            actual_order ? parseFloat(actual_order) : 0,
            actual_order_date,
            date_of_calling,
            next_calling_date,
            followupId
        ];

        const result = await pgQuery(query, values);

        // Invalidate cache
        await delCached(FOLLOWUPS_CACHE_KEY);
        if (sales_person) {
            await delCached(`${FOLLOWUPS_CACHE_KEY}_${sales_person}`);
        }

        return result.rows[0];
    } catch (err) {
        console.error("Error updating followup:", err);
        throw err;
    }
}

/**
 * Delete a followup
 */
async function deleteFollowup(followupId) {
    try {
        const query = `DELETE FROM client_followups WHERE followup_id = $1 RETURNING *`;
        const result = await pgQuery(query, [followupId]);

        // Invalidate cache
        await delCached(FOLLOWUPS_CACHE_KEY);

        return result.rows[0];
    } catch (err) {
        console.error("Error deleting followup:", err);
        throw err;
    }
}

/**
 * Get Sales Performance Report
 */
async function getSalesPerformanceReport(startDate, endDate) {
    const cacheKey = generateCacheKey(`followups_performance_${startDate || 'default'}_${endDate || 'default'}`);
    return withCache(cacheKey, DEFAULT_TTL.TIMELINE, async () => {
        try {
            const values = [];
            let dateFilter = "1=1";

            if (startDate && endDate) {
                dateFilter = `date_of_calling::date BETWEEN $1 AND $2`;
                values.push(startDate, endDate);
            }

            const query = `
                WITH filtered AS (
                  SELECT
                    COALESCE(NULLIF(TRIM(sales_person), ''), 'Unknown') AS sales_person,
                    actual_order,
                    date_of_calling::date AS date_of_calling
                  FROM client_followups
                  WHERE ${dateFilter}
                )
                SELECT
                  CASE WHEN GROUPING(sales_person) = 1 THEN 'Total' ELSE sales_person END AS "salesPerson",
                  COUNT(*)::int AS "noOfCallings",
                  COUNT(*) FILTER (WHERE actual_order IS NOT NULL AND actual_order > 0)::int AS "orderClients",
                  ROUND(
                    (
                      COUNT(*) FILTER (WHERE actual_order IS NOT NULL AND actual_order > 0)::numeric
                      / NULLIF(COUNT(*)::numeric, 0)
                    ) * 100
                  , 2) AS "conversionRatio",
                  COALESCE(SUM(actual_order) FILTER (WHERE actual_order IS NOT NULL AND actual_order > 0), 0)::numeric(15,2) AS "totalRsSale",
                  ROUND(
                    COALESCE(AVG(actual_order) FILTER (WHERE actual_order IS NOT NULL AND actual_order > 0), 0)
                  , 2) AS "avgRsSale"
                FROM filtered
                GROUP BY ROLLUP (sales_person)
                ORDER BY
                  CASE WHEN GROUPING(sales_person) = 1 THEN 1 ELSE 0 END,
                  "noOfCallings" DESC;
            `;

            // console.log("Executing Query:", query.substring(0, 100) + "...", "Values:", values);
            const result = await pgQuery(query, values);
            return result.rows;
        } catch (err) {
            console.error("❌ Error fetching sales performance report:", err);
            throw err;
        }
    });
}

/**
 * Get Followup Stats (Total Followups & Orders Booked)
 */
async function getFollowupStats(startDate, endDate) {
    const cacheKey = generateCacheKey(`followups_stats_${startDate || 'default'}_${endDate || 'default'}`);
    return withCache(cacheKey, DEFAULT_TTL.TIMELINE, async () => {
        try {
            const values = [];
            let dateFilter = "1=1";

            if (startDate && endDate) {
                dateFilter = `date_of_calling::date BETWEEN $1 AND $2`;
                values.push(startDate, endDate);
            }


            const query = `
                SELECT
                    COUNT(*)::int AS "totalFollowUps",
                    COUNT(*) FILTER (
                        WHERE actual_order_date IS NOT NULL 
                        AND actual_order IS NOT NULL 
                        AND actual_order > 0
                    )::int AS "ordersBooked"
                FROM client_followups
                WHERE ${dateFilter}
            `;
            const result = await pgQuery(query, values);
            return result.rows[0];
        } catch (err) {
            console.error("❌ Error fetching followup stats:", err);
            throw err;
        }
    });
}

module.exports = {
    getAllFollowups,
    createFollowup,
    getFollowupById,
    updateFollowup,
    deleteFollowup,
    getSalesPerformanceReport,
    getFollowupStats
};
