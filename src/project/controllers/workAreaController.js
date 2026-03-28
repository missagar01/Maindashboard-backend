const WorkArea = require('../models/workAreaModel');

exports.getWorkAreas = async (req, res) => {
    try {
        const areas = await WorkArea.findByProjectId(req.params.projectId);
        res.json(areas);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createWorkArea = async (req, res) => {
    const { project_id, parent_id, level_type, name } = req.body;
    try {
        const area = await WorkArea.create(project_id, parent_id, level_type, name);
        res.json({ structure_id: area.structure_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
