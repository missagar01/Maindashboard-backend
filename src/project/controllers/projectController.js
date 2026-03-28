const Project = require('../models/projectModel');

exports.getProjects = async (req, res) => {
    try {
        const projects = await Project.findAll();
        res.json(projects);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createProject = async (req, res) => {
    const { project_name, location, client_name, start_date, expected_end_date } = req.body;
    try {
        const project = await Project.create(project_name, location, client_name, start_date, expected_end_date);
        res.status(201).json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
