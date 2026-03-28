const Material = require('../models/materialModel');

exports.getMaterials = async (req, res) => {
    try {
        const materials = await Material.findAll();
        res.json(materials);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createMaterial = async (req, res) => {
    const { material_name, unit, min_threshold } = req.body;
    try {
        const material = await Material.create(material_name, unit, min_threshold);
        res.json({ success: true, material_id: material.material_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.recordInward = async (req, res) => {
    const { material_id, quantity, inward_date, supplier, remarks } = req.body;
    try {
        await Material.addInward(material_id, quantity, inward_date, supplier, remarks);
        res.json({ success: true, message: 'Material inward recorded successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.recordConsumption = async (req, res) => {
    const { material_id, activity_id, quantity, consumption_date, remarks } = req.body;
    try {
        await Material.addConsumption(material_id, activity_id, quantity, consumption_date, remarks);
        res.json({ success: true, message: 'Material consumption recorded successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getLogs = async (req, res) => {
    try {
        const logs = await Material.getLogs();
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
