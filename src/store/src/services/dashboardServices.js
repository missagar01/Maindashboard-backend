import pool from "../config/postgres.js";
import { getOrSetCache, deleteCache, cacheKeys, DEFAULT_TTL } from "./redisCache.js";
import * as storeIndentService from "./storeIndent.service.js";
import * as poService from "./po.service.js";
import * as repairGatePassService from "./repairGatePass.service.js";
import * as returnableService from "./returnable.service.js";

// -------------------- UTILS --------------------
function isMissingTableError(error) {
  return String(error?.message || "").includes("does not exist");
}

function buildEmptyDashboardPayload() {
  return {
    tasks: [],
    pendingCount: 0,
    completedCount: 0,
    totalRepairCost: 0,
    departmentStatus: [],
    paymentTypeDistribution: [],
    vendorWiseCosts: [],
  };
}

export async function invalidateRepairDashboardCache() {
  await deleteCache(cacheKeys.dashboardRepair());
}

// -------------------- MAIN FUNCTION --------------------
export async function fetchDashboardMetricsSnapshot() {
  return getOrSetCache(
    cacheKeys.dashboardRepair() + "_v7", // [FIX] Append _v7 to instantly bust cache and display your feedback!
    async () => {
      try {
        // [RESTORED] Original Google Fetch EXACTLY as provided, running efficiently in background
        const googleFetchPromise = process.env.GOOGLE_FEEDBACK_STORE
          ? fetch(process.env.GOOGLE_FEEDBACK_STORE)
            .then((res) => res.json())
            .catch((err) => {
              console.error("Failed to fetch Google Forms feedback:", err.message || err);
              return null;
            })
          : Promise.resolve(null);

        // [OPTIMIZATION] Database parallelism speeds up response significantly
        const postgresPromise = Promise.all([
          pool.query(`
            SELECT id, status, department, total_bill_amount, vendor_name, payment_type
            FROM repair_system
            ORDER BY id DESC
            LIMIT 100
          `),
          pool.query(`
            SELECT
              COUNT(*) AS total_count,
              COUNT(*) FILTER (WHERE status = 'done') AS completed_count,
              COUNT(*) FILTER (WHERE status IS NULL OR status <> 'done') AS pending_count,
              COALESCE(SUM(total_bill_amount), 0) AS total_repair_cost
            FROM repair_system
          `),
          pool.query(`
            SELECT department, COUNT(*) AS count
            FROM repair_system
            GROUP BY department
            ORDER BY department ASC
          `),
          pool.query(`
            SELECT payment_type AS type, SUM(total_bill_amount) AS amount
            FROM repair_system
            GROUP BY payment_type
          `),
          pool.query(`
            SELECT vendor_name AS vendor, SUM(total_bill_amount) AS cost
            FROM repair_system
            GROUP BY vendor_name
            ORDER BY cost DESC
            LIMIT 5
          `)
        ]);

        const oraclePromise = Promise.allSettled([
          storeIndentService.getDashboardMetrics(),
          storeIndentService.getPending(),
          storeIndentService.getHistory(),
          poService.getPoPending(),
          poService.getPoHistory(),
          repairGatePassService.getPendingRepairGatePass(),
          repairGatePassService.getReceivedRepairGatePass(),
          returnableService.getReturnableDetails()
        ]);

        const [postgresData, oracleData] = await Promise.all([
          postgresPromise,
          oraclePromise
        ]);

        const [
          tasksResult,
          statsResult,
          deptWiseResult,
          paymentResult,
          vendorResult
        ] = postgresData;

        const [
          indentSummary,
          pendingIndents,
          historyIndents,
          poPendingData,
          poHistoryData,
          repairPending,
          repairHistory,
          returnableDetails
        ] = oracleData.map(res => (res.status === "fulfilled" ? res.value : null));


        // [RESTORED] Resolving Google Sheet Feedback Data EXACTLY as originally worked!
        let vendorFeedbacks = [];
        try {
          const json = await googleFetchPromise;
          if (json && json.success && json.data && json.data.length > 1) {
            const headers = json.data[0];
            let dataRows = json.data.slice(1).map((row) => {
              const obj = {};
              headers.forEach((h, i) => {
                obj[h] = row[i];
              });
              return obj;
            });

            // Filter out completely empty rows (checking where Timestamp exists)
            vendorFeedbacks = dataRows.filter((fb) => fb.Timestamp && String(fb.Timestamp).trim() !== "");

            // Sort by Timestamp descending (latest first)
            vendorFeedbacks.sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());
          }
        } catch (err) {
          console.error("Failed to parse Google Forms feedback:", err.message || err);
        }

        const stats = statsResult.rows?.[0] || {};

        return {
          tasks: tasksResult.rows || [],
          pendingCount: Number(stats.pending_count || 0),
          completedCount: Number(stats.completed_count || 0),
          totalRepairCost: Number(stats.total_repair_cost || 0),
          departmentStatus: deptWiseResult.rows || [],
          paymentTypeDistribution: paymentResult.rows || [],
          vendorWiseCosts: vendorResult.rows || [],

          summary: indentSummary || {},
          pendingIndents: pendingIndents || [],
          historyIndents: historyIndents || [],
          poPending: poPendingData?.rows || [],
          poHistory: poHistoryData?.rows || [],
          repairPending: repairPending || [],
          repairHistory: repairHistory || [],
          returnableDetails: returnableDetails || [],
          feedbacks: vendorFeedbacks,
        };
      } catch (error) {
        console.error("Error in fetchDashboardMetricsSnapshot:", error.message || error);
        if (isMissingTableError(error)) {
          return buildEmptyDashboardPayload();
        }
        throw error;
      }
    },
    DEFAULT_TTL.DASHBOARD
  );
}