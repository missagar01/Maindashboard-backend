// src/controllers/po.controller.js
import * as poService from "../services/po.service.js";
import {
  buildDownloadFilename,
  sendRowsAsExcel,
} from "../utils/excel.helper.js";

const poBaseColumns = [
  { header: "Indent No.", key: "INDENT_NO", width: 20 },
  { header: "Indenter", key: "INDENTER", width: 28 },
  { header: "PO No.", key: "VRNO", width: 16 },
  { header: "S.No", key: "S_NO", width: 8 },
  { header: "Planned Time Stamp", key: "PLANNED_TIMESTAMP", width: 22 },
  { header: "PO Date", key: "VRDATE", width: 16 },
  { header: "Vendor Name", key: "VENDOR_NAME", width: 32 },
  { header: "Item Name", key: "ITEM_NAME", width: 32 },
  { header: "UOM", key: "UM", width: 10 },
  { header: "Ordered Qty", key: "QTYORDER", width: 16 },
  { header: "Executed Qty", key: "QTYEXECUTE", width: 18 },
];

const poPendingDownloadColumns = [
  ...poBaseColumns,
  { header: "Balance Qty", key: "BALANCE_QTY", width: 18 },
];

const poHistoryDownloadColumns = [
  ...poBaseColumns,
  { header: "Balance Qty", key: "BALANCE_QTY", width: 18 },
];

function buildPoFilename(type) {
  return buildDownloadFilename(`po-${type}`);
}

function formatDate(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (err) {
    return "";
  }
}

function formatDateTime(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
  } catch (err) {
    return "";
  }
}

function annotatePoRows(rows = []) {
  return rows.map((row, index) => {
    const orderQty = Number(row.QTYORDER ?? row.qtyorder ?? 0);
    const executeQty = Number(row.QTYEXECUTE ?? row.qtyexecute ?? 0);
    const existingBalance =
      row.BALANCE_QTY ?? row.balance_qty ?? row.balanceqty;
    const balance =
      existingBalance ??
      (Number.isFinite(orderQty) && Number.isFinite(executeQty)
        ? orderQty - executeQty
        : undefined);
    const indenter =
      row.INDENTER ??
      row.indenter ??
      row.indent_remark ??
      row.INDENTER ??
      "";

    // Format dates to match frontend display format
    const plannedTimestamp = formatDateTime(
      row.PLANNED_TIMESTAMP ?? row.planned_timestamp ?? row.PLANNEDTIMESTAMP
    );
    const poDate = formatDate(row.VRDATE ?? row.vrdate ?? row.VR_DATE);

    return {
      ...row,
      S_NO: index + 1,
      BALANCE_QTY: balance,
      INDENTER: indenter,
      PLANNED_TIMESTAMP: plannedTimestamp,
      VRDATE: poDate,
    };
  });
}

export async function getPoPending(req, res) {
  try {
    // backend pagination removed – full list
    const { rows, total } = await poService.getPoPending();

    return res.json({
      success: true,
      total,
      data: rows,
    });
  } catch (err) {
    console.error("getPoPending error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error" });
  }
}

export async function getPoHistory(req, res) {
  try {
    const { rows, total } = await poService.getPoHistory();

    return res.json({
      success: true,
      total,
      data: rows,
    });
  } catch (err) {
    console.error("getPoHistory error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error" });
  }
}

export async function downloadPoPending(req, res) {
  try {
    const { rows = [] } = await poService.getPoPending();
    const preparedRows = annotatePoRows(rows);
    await sendRowsAsExcel(res, {
      rows: preparedRows,
      columns: poPendingDownloadColumns,
      sheetName: "Pending PO",
      fileName: buildPoFilename("pending"),
    });
  } catch (err) {
    console.error("downloadPoPending error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error" });
  }
}

export async function downloadPoHistory(req, res) {
  try {
    const { rows = [] } = await poService.getPoHistory();
    const preparedRows = annotatePoRows(rows);
    await sendRowsAsExcel(res, {
      rows: preparedRows,
      columns: poHistoryDownloadColumns,
      sheetName: "PO History",
      fileName: buildPoFilename("history"),
    });
  } catch (err) {
    console.error("downloadPoHistory error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error" });
  }
}
