const { getPgPool, pgQuery } = require("../../../config/pg.js");

const pool = getPgPool();

module.exports = {
  query: (text, params) => pgQuery(text, params),
  pool,
};
