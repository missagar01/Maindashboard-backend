const gatePassService = require('../services/gatePassService');

class GatePassController {
  normalizeBody(body) {
    if (body && typeof body === 'object') {
      return body;
    }

    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch (_error) {
        return null;
      }
    }

    return null;
  }

  async getAllGatePasses(req, res, next) {
    try {
      const gatePasses = await gatePassService.getAllGatePasses({
        scope: req.query?.scope,
        user: req.user
      });
      const serializedGatePasses = gatePassService.serializeGatePassList(gatePasses);
      res.status(200).json({
        success: true,
        data: serializedGatePasses,
        count: serializedGatePasses.length
      });
    } catch (error) {
      next(error);
    }
  }

  async getGatePassById(req, res, next) {
    try {
      const { id } = req.params;
      const gatePass = await gatePassService.getGatePassById(id);
      res.status(200).json({
        success: true,
        data: gatePassService.serializeGatePass(gatePass)
      });
    } catch (error) {
      if (error.message === 'Gate pass not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  async createGatePass(req, res, next) {
    try {
      const payload = this.normalizeBody(req.body) || {};

      const gatePass = await gatePassService.createGatePass(payload);
      res.status(201).json({
        success: true,
        message: 'Gate pass created successfully',
        data: gatePassService.serializeGatePass(gatePass)
      });
    } catch (error) {
      next(error);
    }
  }

  async updateGatePass(req, res, next) {
    try {
      const { id } = req.params;
      const payload = this.normalizeBody(req.body) || {};
      if (Object.keys(payload).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Request body is empty or invalid'
        });
      }

      const gatePass = await gatePassService.updateGatePass(id, payload);
      res.status(200).json({
        success: true,
        message: 'Gate pass updated successfully',
        data: gatePassService.serializeGatePass(gatePass)
      });
    } catch (error) {
      if (error.message === 'Gate pass not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }

  async deleteGatePass(req, res, next) {
    try {
      const { id } = req.params;
      await gatePassService.deleteGatePass(id);
      res.status(200).json({
        success: true,
        message: 'Gate pass deleted successfully'
      });
    } catch (error) {
      if (error.message === 'Gate pass not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }
}

module.exports = new GatePassController();
