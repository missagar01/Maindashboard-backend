import { getConnection } from "../config/db.js";
import oracledb from "oracledb";

export async function getDivisionWiseIndent(fromDate, toDate) {
  const conn = await getConnection();
  try {
    const sql = `
      select lhs_utility.get_name('div_code',t.div_code) as division,
             lhs_utility.get_name('cost_code',t.cost_code) as costcenter,
             (select a.passport_no from emp_mast a where a.emp_code = s.createdby) as empcode,
             count(t.vrno) as total
      from indent_head s
           inner join indent_body t on t.vrno = s.vrno
      where s.entity_code='SR'
            and t.cancelledby is null
            and trunc(s.vrdate) >= TO_DATE(:fromDate, 'YYYY-MM-DD')
            and trunc(s.vrdate) <= TO_DATE(:toDate, 'YYYY-MM-DD')
      group by t.div_code, t.cost_code, s.createdby
      order by t.div_code, t.cost_code, s.createdby
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
      select lhs_utility.get_name('div_code',t.div_code) as division,
             lhs_utility.get_name('cost_code',t.cost_code) as costcenter,
             (select b.passport_no from emp_mast b where b.emp_code = (select a.createdby from indent_head a where a.vrno = t.indent_vrno)) as empcode,
             sum(t.cramt) as total
      from view_order_engine t
      where t.entity_code='SR'
            and t.series='U3'
            and trunc(t.vrdate) >= TO_DATE(:fromDate, 'YYYY-MM-DD')
            and trunc(t.vrdate) <= TO_DATE(:toDate, 'YYYY-MM-DD')
      group by t.div_code, t.cost_code, t.indent_vrno
      order by t.div_code, t.cost_code, (select b.passport_no from emp_mast b where b.emp_code = (select a.createdby from indent_head a where a.vrno = t.indent_vrno))
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
             upper(lhs_utility.get_name('cost_code',t.cost_code)) as costcenter,
             (select a.passport_no from emp_mast a where a.emp_code = (select b.createdby from indent_head b where b.vrno = t.indent_vrno)) as empcode,
             sum(t.cramt) as total
      from view_itemtran_engine t
      where t.entity_code='SR'
            and t.tcode='G'
            and t.item_nature='SI'
            and trunc(t.vrdate) >= TO_DATE(:fromDate, 'YYYY-MM-DD')
            and trunc(t.vrdate) <= TO_DATE(:toDate, 'YYYY-MM-DD')
      group by t.div_code, t.cost_code, t.indent_vrno
      order by t.div_code, t.cost_code, (select a.passport_no from emp_mast a where a.emp_code = (select b.createdby from indent_head b where b.vrno = t.indent_vrno))
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
          lhs_utility.get_name('div_code', t.div_code) AS division,
          UPPER(lhs_utility.get_name('cost_code', t.cost_code)) AS costcenter,
          e.passport_no AS empcode,
          SUM(NVL(t.dramt, 0)) AS total
      FROM view_itemtran_engine t
      LEFT JOIN view_itemtran_engine c
             ON c.ref_slno = t.ref_slno
            AND c.entity_code = 'SR'
            AND c.tcode = 'G'
            AND c.item_nature = 'SI'
      LEFT JOIN indent_head b
             ON b.vrno = c.indent_vrno
      LEFT JOIN emp_mast e
             ON e.emp_code = b.createdby
      WHERE t.entity_code = 'SR'
        AND t.tcode = 'Q'
        AND t.item_nature = 'SI'
        AND trunc(t.vrdate) >= TO_DATE(:fromDate, 'YYYY-MM-DD')
        AND trunc(t.vrdate) <= TO_DATE(:toDate, 'YYYY-MM-DD')
      GROUP BY 
          t.div_code, 
          t.cost_code, 
          e.passport_no
      ORDER BY 
          t.div_code, 
          t.cost_code, 
          e.passport_no
    `;
    const result = await conn.execute(sql, { fromDate, toDate }, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });
    return result.rows || [];
  } finally {
    await conn.close();
  }
}
