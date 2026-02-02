const clientService = require("../services/client.service.js");

// ==========================================
// CLIENTS CONTROLLER
// ==========================================

async function getAllClients(req, res) {
    try {
        const clients = await clientService.getClients();
        res.status(200).json({ success: true, data: clients });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getClient(req, res) {
    try {
        const client = await clientService.getClientById(req.params.id);
        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found" });
        }
        res.status(200).json({ success: true, data: client });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function createClient(req, res) {
    try {
        const newClient = await clientService.createClient(req.body);
        res.status(201).json({ success: true, data: newClient });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function updateClient(req, res) {
    try {
        const updatedClient = await clientService.updateClient(req.params.id, req.body);
        if (!updatedClient) {
            return res.status(404).json({ success: false, message: "Client not found" });
        }
        res.status(200).json({ success: true, data: updatedClient });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function deleteClient(req, res) {
    try {
        const deletedClient = await clientService.deleteClient(req.params.id);
        if (!deletedClient) {
            return res.status(404).json({ success: false, message: "Client not found" });
        }
        res.status(200).json({ success: true, message: "Client deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getMarketingUsers(req, res) {
    try {
        const users = await clientService.getMarketingUsers();
        res.status(200).json({ success: true, data: users });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

async function getTotalClientsCount(req, res) {
    try {
        const count = await clientService.getTotalClientsCount();
        res.status(200).json({ success: true, data: count });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

module.exports = {
    getAllClients,
    getClient,
    createClient,
    updateClient,
    deleteClient,
    getMarketingUsers,
    getTotalClientsCount
};



