const { StatusCodes } = require('http-status-codes');
const ApiError = require('../utils/apiError');
const hotCoilRepository = require('../repositories/hotCoil.repository');
const smsRegisterRepository = require('../repositories/smsRegister.repository');

const resolveSmsCode = (payload) => {
  const candidates = [payload?.sms_short_code, payload?.unique_code].filter(
    (val) => typeof val === 'string' && val.trim().length
  );
  return candidates.length ? candidates[0].trim() : null;
};

const normalizePayload = (payload = {}) => {
  // Accept common Postman variations (e.g., "Mill Incharge") by folding to expected snake_case keys.
  const aliases = [
    ['mill_incharge', ['Mill Incharge', 'millIncharge', 'mill incharge']],
    ['quality_supervisor', ['Quality Supervisor', 'qualitySupervisor', 'quality supervisor']],
    ['electrical_dc_operator', ['electrical_dc_operator', 'electrical dc operator', 'Electrical DC Operator']]
  ];

  const normalized = { ...payload };

  aliases.forEach(([target, keys]) => {
    if (normalized[target]) {
      return;
    }
    keys.forEach((key) => {
      if (normalized[key] !== undefined) {
        normalized[target] = normalized[key];
      }
    });
  });

  return normalized;
};

const createHotCoil = async (payload) => {
  const normalizedPayload = normalizePayload(payload);
  const smsShortCode = resolveSmsCode(payload);
  if (!smsShortCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'sms_short_code (or unique_code) is required');
  }

  // Check if code exists in sms_register; warn clients if missing but don't block insert.
  const smsRegisterRows = await smsRegisterRepository.findSmsRegisters({ uniqueCode: smsShortCode });
  const smsRegisterFound = smsRegisterRows.length > 0;

  const unique_code = smsShortCode;

  // Check if unique_code already exists in hot_coil
  const existingEntries = await hotCoilRepository.findHotCoilEntries({ uniqueCode: unique_code });
  if (existingEntries.length > 0) {
    throw new ApiError(StatusCodes.CONFLICT, `Hot coil entry with unique_code "${unique_code}" already exists`);
  }

  // Use the provided SMS code for linkage; unique_code must match sms_short_code per requirements.
  const record = await hotCoilRepository.insertHotCoil({
    ...normalizedPayload,
    sms_short_code: smsShortCode,
    unique_code
  });

  // Attach a hint if the code was not found in sms_register (non-blocking).
  if (!smsRegisterFound) {
    record._warning = `sms_short_code ${smsShortCode} was not found in sms_register`;
  }

  return record;
};

const listHotCoilEntries = async (filters = {}) => hotCoilRepository.findHotCoilEntries(filters);

const getHotCoilByUniqueCode = async (uniqueCode) => {
  const [entry] = await hotCoilRepository.findHotCoilEntries({ uniqueCode });
  return entry ?? null;
};

module.exports = { createHotCoil, listHotCoilEntries, getHotCoilByUniqueCode };






