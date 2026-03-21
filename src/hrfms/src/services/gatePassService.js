const gatePassModel = require('../models/gatePassModel');
const { getGatePassImageUrl, normalizeGatePassImageUrl } = require('../utils/gatePassUpload');

class GatePassService {
  serializeGatePass(gatePass, baseUrl) {
    if (!gatePass || typeof gatePass !== 'object') {
      return gatePass;
    }

    return {
      ...gatePass,
      employee_photo: normalizeGatePassImageUrl(gatePass.employee_photo, baseUrl)
    };
  }

  serializeGatePassList(gatePasses, baseUrl) {
    if (!Array.isArray(gatePasses)) {
      return [];
    }

    return gatePasses.map((item) => this.serializeGatePass(item, baseUrl));
  }

  async getAllGatePasses(options = {}) {
    const { scope = 'all', user = null } = options;

    try {
      const gatePasses = await gatePassModel.findAll();

      if (String(scope || '').toLowerCase() !== 'mine') {
        return gatePasses;
      }

      const userIdentity = this.getUserIdentity(user);
      return gatePasses.filter((item) => this.belongsToUser(item, userIdentity));
    } catch (error) {
      throw new Error(`Failed to fetch gate passes: ${error.message}`);
    }
  }

  async getGatePassById(id) {
    const gatePass = await gatePassModel.findById(id);
    if (!gatePass) {
      throw this.createNotFoundError('Gate pass not found');
    }
    return gatePass;
  }

  async createGatePass(data, file, baseUrl) {
    try {
      const normalized = this.prepareNewGatePassData(data, file, baseUrl);
      if (!normalized.department || typeof normalized.department !== 'string') {
        throw this.createValidationError('department is required');
      }
      if (!normalized.employee_photo || typeof normalized.employee_photo !== 'string') {
        throw this.createValidationError('employee_photo is required');
      }
      this.validateGatePassData(normalized);
      return await gatePassModel.create(normalized);
    } catch (error) {
      if (!error.statusCode) {
        error.message = `Failed to create gate pass: ${error.message}`;
      }
      throw error;
    }
  }

  async updateGatePass(id, data, file, baseUrl) {
    const existingGatePass = await gatePassModel.findById(id);
    if (!existingGatePass) {
      throw this.createNotFoundError('Gate pass not found');
    }

    const normalized = this.prepareUpdateGatePassData(data, file, baseUrl);
    const merged = { ...existingGatePass, ...normalized };
    this.validateGatePassData(merged);

    return gatePassModel.update(id, normalized);
  }

  async deleteGatePass(id) {
    const existingGatePass = await gatePassModel.findById(id);
    if (!existingGatePass) {
      throw this.createNotFoundError('Gate pass not found');
    }

    return gatePassModel.delete(id);
  }

  prepareNewGatePassData(data, file, baseUrl) {
    const normalized = this.normalizeGatePassData(data, { file, baseUrl });
    if (normalized.hod_approval === null || normalized.hod_approval === undefined) {
      normalized.hod_approval = false;
    }
    if (normalized.gate_pass_closed === null || normalized.gate_pass_closed === undefined) {
      normalized.gate_pass_closed = false;
    }
    if (!normalized.status) {
      normalized.status = 'PENDING';
    }
    return normalized;
  }

  prepareUpdateGatePassData(data, file, baseUrl) {
    return this.normalizeGatePassData(data, { forUpdate: true, file, baseUrl });
  }

  normalizeGatePassData(data, options = {}) {
    const { forUpdate = false, file = null, baseUrl = '' } = options;
    const source = data && typeof data === 'object' ? data : {};
    const fields = [
      'name',
      'mobile_number',
      'department',
      'employee_photo',
      'employee_address',
      'purpose_of_visit',
      'reason',
      'date_of_leave',
      'time_of_entry',
      'hod_approval',
      'status',
      'gate_pass_closed'
    ];

    const normalized = {};

    fields.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(source, field)) {
        if (!forUpdate) {
          normalized[field] = null;
        }
        return;
      }

      let value = source[field];

      if (typeof value === 'string') {
        value = value.trim();
        if (value === '') {
          value = null;
        }
      }

      if (field === 'hod_approval' || field === 'gate_pass_closed') {
        value = this.normalizeBoolean(value, field);
      }

      if (field === 'status' && typeof value === 'string') {
        value = value.toUpperCase();
      }

      normalized[field] = value;
    });

    if (file && file.filename) {
      normalized.employee_photo = getGatePassImageUrl(file.filename, baseUrl);
    } else if (normalized.employee_photo) {
      normalized.employee_photo = normalizeGatePassImageUrl(normalized.employee_photo, baseUrl);
    }

    return normalized;
  }

  normalizeBoolean(value, field) {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'y'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no', 'n'].includes(normalized)) {
        return false;
      }
    }

    throw this.createValidationError(`${field} must be a boolean`);
  }

  validateGatePassData(data) {
    if (!data.name || typeof data.name !== 'string') {
      throw this.createValidationError('name is required');
    }

    if (data.name.length > 100) {
      throw this.createValidationError('name must not exceed 100 characters');
    }

    if (!data.mobile_number || typeof data.mobile_number !== 'string') {
      throw this.createValidationError('mobile_number is required');
    }

    if (data.mobile_number.length > 15) {
      throw this.createValidationError('mobile_number must not exceed 15 characters');
    }

    if (!data.department || typeof data.department !== 'string') {
      throw this.createValidationError('department is required');
    }

    if (data.department.length > 150) {
      throw this.createValidationError('department must not exceed 150 characters');
    }

    if (!data.date_of_leave || !this.isValidDateString(data.date_of_leave)) {
      throw this.createValidationError('date_of_leave must be a valid date in YYYY-MM-DD format');
    }

    if (!data.time_of_entry || !this.isValidTimeString(data.time_of_entry)) {
      throw this.createValidationError('time_of_entry must be a valid time in HH:MM or HH:MM:SS format');
    }

    if (data.status && !['PENDING', 'APPROVED', 'REJECTED'].includes(data.status)) {
      throw this.createValidationError('status must be one of PENDING, APPROVED, REJECTED');
    }
  }

  isValidDateString(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime());
  }

  isValidTimeString(value) {
    return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
  }

  getUserIdentity(user) {
    return {
      mobile: this.normalizePhone(
        user?.number ||
        user?.mobile ||
        user?.phone ||
        user?.mobilenumber ||
        ''
      ),
      name: this.normalizeTextKey(
        user?.user_name ||
        user?.employee_name ||
        user?.username ||
        user?.Name ||
        ''
      ),
      department: this.normalizeTextKey(user?.department || user?.Department || '')
    };
  }

  belongsToUser(gatePass, userIdentity) {
    if (!gatePass || !userIdentity) {
      return false;
    }

    const gatePassMobile = this.normalizePhone(gatePass.mobile_number);
    const gatePassName = this.normalizeTextKey(gatePass.name);
    const gatePassDepartment = this.normalizeTextKey(gatePass.department);

    if (userIdentity.mobile && gatePassMobile && gatePassMobile === userIdentity.mobile) {
      return true;
    }

    return Boolean(
      userIdentity.name &&
      userIdentity.department &&
      gatePassName === userIdentity.name &&
      gatePassDepartment === userIdentity.department
    );
  }

  normalizeTextKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  normalizePhone(value) {
    return String(value || '').replace(/\D+/g, '');
  }

  createValidationError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
  }

  createNotFoundError(message) {
    const error = new Error(message);
    error.statusCode = 404;
    return error;
  }
}

module.exports = new GatePassService();
