const followupService = require("../services/followup.service.js");

async function getAllFollowups(req, res) {
    try {
        const followups = await followupService.getAllFollowups();
        res.status(200).json({ success: true, data: followups });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getFollowup(req, res) {
    try {
        const followup = await followupService.getFollowupById(req.params.id);
        if (!followup) {
            return res.status(404).json({ success: false, message: "Followup not found" });
        }
        res.status(200).json({ success: true, data: followup });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function createFollowup(req, res) {
    try {
        const newFollowup = await followupService.createFollowup(req.body);
        res.status(201).json({ success: true, data: newFollowup });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function updateFollowup(req, res) {
    try {
        const updatedFollowup = await followupService.updateFollowup(req.params.id, req.body);
        if (!updatedFollowup) {
            return res.status(404).json({ success: false, message: "Followup not found" });
        }
        res.status(200).json({ success: true, data: updatedFollowup });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function deleteFollowup(req, res) {
    try {
        const deletedFollowup = await followupService.deleteFollowup(req.params.id);
        if (!deletedFollowup) {
            return res.status(404).json({ success: false, message: "Followup not found" });
        }
        res.status(200).json({ success: true, message: "Followup deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getSalesPerformanceReport(req, res) {
    try {
        const { startDate, endDate } = req.query;
        const report = await followupService.getSalesPerformanceReport(startDate, endDate);
        res.status(200).json({ success: true, data: report });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getFollowupStats(req, res) {
    try {
        const { startDate, endDate } = req.query;
        const stats = await followupService.getFollowupStats(startDate, endDate);
        res.status(200).json({ success: true, data: stats });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    getAllFollowups,
    getFollowup,
    createFollowup,
    updateFollowup,
    deleteFollowup,
    getSalesPerformanceReport,
    getFollowupStats
};
