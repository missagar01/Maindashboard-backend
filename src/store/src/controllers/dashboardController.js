import { fetchDashboardMetricsSnapshot } from "../services/dashboardServices.js";
import * as storeIndentService from "../services/storeIndent.service.js";
import * as poService from "../services/po.service.js";
import * as repairGatePassService from "../services/repairGatePass.service.js";
import * as returnableService from "../services/returnable.service.js";

export const getDashboardMetrics = async (req, res) => {
  try {
    const data = await fetchDashboardMetricsSnapshot();

    console.log(
      `[store dashboard] tasks=${data.tasks.length}, pending=${data.pendingCount}, completed=${data.completedCount}`
    );

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    console.error("Error details:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
      details: error.message,
    });
  }
};




export async function getPendingIndents(req, res) {
  try {
    const rows = await storeIndentService.getPending();

    return res.json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("getPendingIndents error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error" });
  }
}

export async function getHistory(req, res) {
  try {
    const rows = await storeIndentService.getHistory();

    return res.json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("getHistory error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error" });
  }
}

export async function getPoPending(req, res) {
  try {
    const result = await poService.getPoPending();
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("getPoPending error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}

export async function getPoHistory(req, res) {
  try {
    const result = await poService.getPoHistory();
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error("getPoHistory error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}

export async function getRepairPending(req, res) {
  try {
    const rows = await repairGatePassService.getPendingRepairGatePass();
    return res.json({ success: true, total: rows.length, data: rows });
  } catch (err) {
    console.error("getRepairPending error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}

export async function getRepairHistory(req, res) {
  try {
    const rows = await repairGatePassService.getReceivedRepairGatePass();
    return res.json({ success: true, total: rows.length, data: rows });
  } catch (err) {
    console.error("getRepairHistory error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}

export async function getReturnableDetails(req, res) {
  try {
    const rows = await returnableService.getReturnableDetails();
    return res.json({ success: true, total: rows.length, data: rows });
  } catch (err) {
    console.error("getReturnableDetails error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error" });
  }
}
