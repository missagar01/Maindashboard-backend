import { fetchAttendanceSummary } from "../services/attendenceService.js";

export const getAttendanceSummary = async (req, res, next) => {
    try {
        const authUser = req.user;
        const isAdmin = authUser.role === "admin" || authUser.user_name === "admin";
        const fromDate = String(req.query.fromDate || "").trim();
        const toDate = String(req.query.toDate || "").trim();

        let data = await fetchAttendanceSummary({ fromDate, toDate });

        if (!isAdmin) {
            // Filter to only show the authenticated user's attendance record
            const empId = String(authUser.employee_id || "").trim();
            data = data.filter(
                (item) => String(item.employee_id || "").trim() === empId
            );

            if (!data.length && empId) {
                data = [{ employee_id: empId, status: "OUT", monthly_attendance: 0 }];
            }
        }

        return res.json({ success: true, data });
    } catch (err) {
        console.error("ATTENDANCE ERROR:", err.message);
        next(err);
    }
};
