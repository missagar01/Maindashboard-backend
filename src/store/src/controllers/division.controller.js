import * as divisionService from "../services/division.service.js";

// Helper to get local date in YYYY-MM-DD
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const getDivisionWiseIssue = async (req, res, next) => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromDate = req.query.fromDate || getLocalDateString(firstDay);
    const toDate = req.query.toDate || getLocalDateString(now);

    const data = await divisionService.getDivisionWiseIssue(fromDate, toDate);
    res.status(200).json({ success: true, data, params: { fromDate, toDate } });
  } catch (error) {
    next(error);
  }
};

export const getDivisionWiseIndent = async (req, res, next) => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromDate = req.query.fromDate || getLocalDateString(firstDay);
    const toDate = req.query.toDate || getLocalDateString(now);

    const data = await divisionService.getDivisionWiseIndent(fromDate, toDate);
    res.status(200).json({ success: true, data, params: { fromDate, toDate } });
  } catch (error) {
    next(error);
  }
};

export const getDivisionWisePO = async (req, res, next) => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromDate = req.query.fromDate || getLocalDateString(firstDay);
    const toDate = req.query.toDate || getLocalDateString(now);

    const data = await divisionService.getDivisionWisePO(fromDate, toDate);
    res.status(200).json({ success: true, data, params: { fromDate, toDate } });
  } catch (error) {
    next(error);
  }
};

export const getDivisionWiseGRN = async (req, res, next) => {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromDate = req.query.fromDate || getLocalDateString(firstDay);
    const toDate = req.query.toDate || getLocalDateString(now);

    const data = await divisionService.getDivisionWiseGRN(fromDate, toDate);
    res.status(200).json({ success: true, data, params: { fromDate, toDate } });
  } catch (error) {
    next(error);
  }
};
