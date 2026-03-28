const db = require("../config/db");

const queryValue = async (sql, params = [], fallbackRows = []) => {
  try {
    return await db.query(sql, params);
  } catch (err) {
    console.error("[project.analytics] Query failed:", err.message);
    return { rows: fallbackRows };
  }
};

const tableExists = async (tableName) => {
  const result = await queryValue(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS exists
    `,
    [tableName],
    [{ exists: false }]
  );

  return Boolean(result.rows?.[0]?.exists);
};

const columnExists = async (tableName, columnName) => {
  const result = await queryValue(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS exists
    `,
    [tableName, columnName],
    [{ exists: false }]
  );

  return Boolean(result.rows?.[0]?.exists);
};

const toNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const normalizeProjectStats = (rows) =>
  (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    total_tasks: toNumber(row.total_tasks),
    delayed_tasks: toNumber(row.delayed_tasks),
  }));

const Analytics = {
  getOperationalSummary: async () => {
    const [
      hasActivitiesTable,
      hasDailyProgressTable,
      hasMaterialsTable,
      hasProjectsTable,
      hasProjectStructureTable,
      hasDueDateColumn,
      hasMinThresholdColumn,
    ] = await Promise.all([
      tableExists("activities"),
      tableExists("daily_progress"),
      tableExists("materials"),
      tableExists("projects"),
      tableExists("project_structure"),
      columnExists("activities", "due_date"),
      columnExists("materials", "min_threshold"),
    ]);

    const delayedRes =
      hasActivitiesTable && hasDailyProgressTable && hasDueDateColumn
        ? await queryValue(
            `
              SELECT COUNT(*)::int AS delayed_count
              FROM activities a
              LEFT JOIN (
                SELECT activity_id, COALESCE(SUM(quantity_completed), 0) AS completed_quantity
                FROM daily_progress
                GROUP BY activity_id
              ) dp ON dp.activity_id = a.activity_id
              WHERE a.due_date IS NOT NULL
                AND a.due_date < CURRENT_DATE
                AND COALESCE(dp.completed_quantity, 0) < COALESCE(a.planned_quantity, 0)
            `,
            [],
            [{ delayed_count: 0 }]
          )
        : { rows: [{ delayed_count: 0 }] };

    const laborRes =
      hasDailyProgressTable
        ? await queryValue(
            `
              SELECT COALESCE(SUM(labour_count), 0)::int AS total_labor
              FROM daily_progress
              WHERE progress_date = CURRENT_DATE
            `,
            [],
            [{ total_labor: 0 }]
          )
        : { rows: [{ total_labor: 0 }] };

    const progressRes =
      hasProjectsTable && hasProjectStructureTable && hasActivitiesTable
        ? await queryValue(
            `
              SELECT
                p.project_name,
                COUNT(a.activity_id)::int AS total_tasks,
                ${
                  hasDailyProgressTable && hasDueDateColumn
                    ? `
                      COALESCE(
                        SUM(
                          CASE
                            WHEN a.due_date IS NOT NULL
                              AND a.due_date < CURRENT_DATE
                              AND COALESCE(dp.completed_quantity, 0) < COALESCE(a.planned_quantity, 0)
                            THEN 1
                            ELSE 0
                          END
                        ),
                        0
                      )::int AS delayed_tasks
                    `
                    : `0::int AS delayed_tasks`
                }
              FROM projects p
              LEFT JOIN project_structure ps ON p.project_id = ps.project_id
              LEFT JOIN activities a ON ps.structure_id = a.structure_id
              ${
                hasDailyProgressTable
                  ? `
                    LEFT JOIN (
                      SELECT activity_id, COALESCE(SUM(quantity_completed), 0) AS completed_quantity
                      FROM daily_progress
                      GROUP BY activity_id
                    ) dp ON dp.activity_id = a.activity_id
                  `
                  : ""
              }
              GROUP BY p.project_id, p.project_name
              ORDER BY p.project_name ASC
            `,
            [],
            []
          )
        : { rows: [] };

    const stockRes =
      hasMaterialsTable
        ? await queryValue(
            `
              SELECT material_name, current_stock, unit
              FROM materials
              WHERE current_stock < ${
                hasMinThresholdColumn ? "COALESCE(min_threshold, 100)" : "100"
              }
              ORDER BY current_stock ASC, material_name ASC
            `,
            [],
            []
          )
        : { rows: [] };

    return {
      delayed_count: toNumber(delayedRes.rows?.[0]?.delayed_count),
      total_labor: toNumber(laborRes.rows?.[0]?.total_labor),
      project_stats: normalizeProjectStats(progressRes.rows),
      critical_stock: Array.isArray(stockRes.rows) ? stockRes.rows : [],
    };
  },
};

module.exports = Analytics;
