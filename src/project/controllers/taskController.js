const Task = require('../models/taskModel');

exports.getActivities = async (req, res) => {
    try {
        const activities = await Task.findAll();
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getActivitiesByStructure = async (req, res) => {
    try {
        const activities = await Task.findByStructureId(req.params.structureId);
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createActivity = async (req, res) => {
    const { structure_id, activity_name, planned_quantity, unit } = req.body;
    try {
        const activity = await Task.create(structure_id, activity_name, planned_quantity, unit);
        res.json({ activity_id: activity.activity_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getProgress = async (req, res) => {
    try {
        const progress = await Task.findProgressByActivityId(req.params.activityId);
        res.json(progress);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addProgress = async (req, res) => {
    const { activity_id, progress_date, quantity_completed, labour_count, remarks } = req.body;
    try {
        const progress = await Task.addProgress(activity_id, progress_date, quantity_completed, labour_count, remarks);
        res.json({ progress_id: progress.progress_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
