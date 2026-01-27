const { getConnection } = require("../config/db.js");
const oracledb = require("oracledb");
const { generateCacheKey, withCache, DEFAULT_TTL } = require("../utils/cacheHelper.js");



async function getPendingOrders() {
    return withCache(generateCacheKey('pending_orders'), DEFAULT_TTL.PENDING, async () => {
        let connection;
        try {
            connection = await getConnection();
            const query = `
      select lhs_utility.get_name('emp_code',t.emp_code) as sales_person,
             lhs_utility.get_name('acc_code',t.acc_code) as customer_name,
             t.vrno,
             t.vrdate,
             t.item_name,
             t.remark,
             case when t.dept_code = 'PR' then 'PRIORITY' else null end as priority,
             t.rate,
             t.qtyorder - NVL(t.qtyexecute,0) as balance_qty
      from view_order_engine t
      where t.entity_code='SR'
            and t.tcode='E'
            and t.div_code='PM'
            and t.qtyorder - NVL(t.qtyexecute,0) > 0
            and t.closeddate is null
      order by t.vrdate asc, t.vrno asc
    `;
            const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
            return result.rows;
        } catch (err) {
            console.error("Error fetching pending orders:", err);
            throw err;
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error("Error closing connection:", err);
                }
            }
        }
    });
}




async function getCompletedOrders() {
    return withCache(generateCacheKey('completed_orders'), DEFAULT_TTL.HISTORY, async () => {
        let connection;
        try {
            connection = await getConnection();
            const query = `
      select lhs_utility.get_name('emp_code',t.emp_code) as sales_person,
             lhs_utility.get_name('acc_code',t.acc_code) as customer_name,
             t.vrno,
             t.vrdate,
             t.item_name,
             t.remark,
             case when t.dept_code = 'PR' then 'PRIORITY' else null end as priority,
             t.rate,
             t.qtyorder,
             t.qtyexecute
      from view_order_engine t
      where t.entity_code='SR'
            and t.tcode='E'
            and t.div_code='PM'
            and t.qtyorder = NVL(t.qtyexecute,0)
      order by t.vrdate asc, t.vrno asc
    `;
            const result = await connection.execute(query, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
            return result.rows;
        } catch (err) {
            console.error("Error fetching completed orders:", err);
            throw err;
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error("Error closing connection:", err);
                }
            }
        }
    });
}

module.exports = { getPendingOrders, getCompletedOrders };
