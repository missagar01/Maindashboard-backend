const { Router } = require("express");
const clientController = require("../controllers/client.controller.js");

const router = Router();

// Client routes
router.get("/", clientController.getAllClients);
router.get("/marketing-users", clientController.getMarketingUsers);
router.get("/count", clientController.getTotalClientsCount);
router.get("/:id", clientController.getClient);
router.post("/", clientController.createClient);
router.put("/:id", clientController.updateClient);
router.delete("/:id", clientController.deleteClient);

module.exports = router;



