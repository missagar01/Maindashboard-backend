const pool = require("../config/db.js");

const getDropdownValues = async () => {
  try {
    // Fetch distinct dropdown values (basic)
    const leadSourceQ = await pool.query(`SELECT DISTINCT lead_source FROM dropdown`);
    const enquiryApproachQ = await pool.query(`SELECT DISTINCT enquiry_approach FROM dropdown`);
    const scNameQ = await pool.query(`SELECT DISTINCT sales_coordinator_name FROM dropdown`);
    const itemNameQ = await pool.query(`SELECT DISTINCT item_name FROM dropdown`);
    const receiverNameQ = await pool.query(`SELECT DISTINCT enquiry_receiver_name FROM dropdown`);
    const spNameQ = await pool.query(`SELECT DISTINCT sp_name FROM dropdown`);

    // ⭐ ONLY DIRECT COMPANY DATA
    const directCompaniesFull = await pool.query(`
      SELECT 
        direct_company_name,
        direct_client_name,
        direct_client_contact_no,
        direct_state,
        direct_billing_address
      FROM dropdown
      WHERE direct_company_name IS NOT NULL
    `);

    let directCompanyDetails = {};
    let directCompanyNames = [];

    directCompaniesFull.rows.forEach(row => {
      directCompanyNames.push(row.direct_company_name);

      directCompanyDetails[row.direct_company_name] = {
        contactPerson: row.direct_client_name || "",
        phone: row.direct_client_contact_no || "",
        state: row.direct_state || "",
        billingAddress: row.direct_billing_address || ""
      };
    });

    const locationsQ = await pool.query(`SELECT DISTINCT location FROM dropdown WHERE location IS NOT NULL AND location <> ''`).catch(() => ({ rows: [] }));

    return {
      leadSources: leadSourceQ.rows.map(r => r.lead_source).filter(Boolean),
      enquiryApproaches: enquiryApproachQ.rows.map(r => r.enquiry_approach).filter(Boolean),
      scNames: scNameQ.rows.map(r => r.sales_coordinator_name).filter(Boolean),
      itemNames: itemNameQ.rows.map(r => r.item_name).filter(Boolean),
      locations: locationsQ.rows.map(r => r.location).filter(Boolean),

      // ⭐ ONLY DIRECT COMPANIES
      directCompanyNames,
      directCompanyDetails,

      receiverNames: receiverNameQ.rows.map(r => r.enquiry_receiver_name).filter(Boolean),
      spNames: spNameQ.rows.map(r => r.sp_name).filter(Boolean)
    };

  } catch (error) {
    console.error("❌ Dropdown SQL Error:", error.message);
    throw error;
  }
};

module.exports = {
  getDropdownValues
};
