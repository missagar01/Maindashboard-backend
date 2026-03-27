import { getConnection } from "../config/db.js";
import oracledb from "oracledb";

export async function getDivisionWiseIndent(fromDate, toDate) {
  const conn = await getConnection();
  try {
    const sql = `
      select lhs_utility.get_name('div_code',t.div_code) as division,
             e.passport_no as employee_code,
             e.emp_name as employee_name,
             t.vrdate as indent_date,
             t.vrno as indent_number,
             upper(t.item_name) as item_name,
             nvl(t.qtyindent,0) as indent_quantity,
             nvl(t.qtyrecd,0) as received,
             (nvl(t.qtyindent,0) - nvl(t.qtyrecd,0)) as pending
      from view_indent_engine t
           left join indent_head a on a.vrno = t.vrno
           left join emp_mast e on e.emp_code = a.createdby
      where t.entity_code='SR'
            and t.cancelledby is null
            and t.vrdate >= TO_DATE(:fromDate, 'YYYY-MM-DD')
            and t.vrdate <= TO_DATE(:toDate, 'YYYY-MM-DD')
      order by t.vrdate desc
    `;
    const result = await conn.execute(sql, { fromDate, toDate }, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows || [];
  } finally {
    await conn.close();
  }
}

export async function getDivisionWisePO(fromDate, toDate) {
  const conn = await getConnection();
  try {
    const sql = `
      select 
             lhs_utility.get_name('div_code',t.div_code) as division,
             upper(lhs_utility.get_name('dept_code',t.dept_code)) as department,
             sum(nvl(t.cramt,0)) as poamount
      from view_order_engine t
      where t.entity_code='SR'
            and t.series='U3'
            and t.item_nature='SI'
            and nvl(t.qtycancelled,0) = 0
            and t.vrdate>= TO_DATE(:fromDate, 'YYYY-MM-DD')
            and t.vrdate<= TO_DATE(:toDate, 'YYYY-MM-DD')
      group by t.div_code, t.dept_code
      order by lhs_utility.get_name('div_code',t.div_code),
            lhs_utility.get_name('dept_code',t.dept_code)
    `;
    const result = await conn.execute(sql, { fromDate, toDate }, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows || [];
  } finally {
    await conn.close();
  }
}

export async function getDivisionWiseGRN(fromDate, toDate) {
  const conn = await getConnection();
  try {
    const sql = `
      select lhs_utility.get_name('div_code',t.div_code) as division,
             lhs_utility.get_name('dept_code',t.dept_code) as department,
             sum(nvl(t.cramt,0)) as grnamount
      from view_itemtran_engine t
      where t.entity_code='SR'
            and t.series='G3'
            and t.item_nature='SI'
            and t.vrdate>= TO_DATE(:fromDate, 'YYYY-MM-DD')
            and t.vrdate<= TO_DATE(:toDate, 'YYYY-MM-DD')
      group by t.div_code, t.dept_code
      order by lhs_utility.get_name('div_code',t.div_code),
             lhs_utility.get_name('dept_code',t.dept_code)
    `;
    const result = await conn.execute(sql, { fromDate, toDate }, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows || [];
  } finally {
    await conn.close();
  }
}

export async function getDivisionWiseIssue(fromDate, toDate) {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT 
          lhs_utility.get_name('div_code', t.div_code) as division,
          upper(lhs_utility.get_name('dept_code',t.dept_code)) as department,
          round(sum(t.valissued),0) as issue_amount
            
      FROM view_itemtran_engine t

      WHERE t.entity_code = 'SR'
        AND t.tcode = 'Q'
        AND t.item_nature = 'SI'
        AND t.vrdate >= TO_DATE(:fromDate, 'YYYY-MM-DD')
        AND t.vrdate <= TO_DATE(:toDate, 'YYYY-MM-DD')
        
      GROUP BY t.div_code, t.dept_code

      ORDER BY 
         t.div_code
    `;
    const result = await conn.execute(sql, { fromDate, toDate }, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows || [];
  } finally {
    await conn.close();
  }
}
