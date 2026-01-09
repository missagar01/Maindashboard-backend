const pipeMillRepository = require('../repositories/pipeMill.repository');

/**
 * Extract mill number from mill_number string
 * Example: "PIPE MILL 01" -> "01", "PIPE MILL 02" -> "02"
 */
const extractMillNumber = (millNumber) => {
  if (!millNumber || typeof millNumber !== 'string') {
    return '';
  }
  
  // Remove "PIPE MILL " prefix (case insensitive) and trim
  const cleaned = millNumber.trim().replace(/^pipe\s+mill\s+/i, '');
  
  // Extract just the number part (e.g., "01", "02", "03")
  const numberMatch = cleaned.match(/(\d+)/);
  if (numberMatch) {
    return numberMatch[1];
  }
  
  // If no number found, return cleaned string as fallback
  return cleaned;
};

/**
 * Generate unique code: Recoiler Short Code + Mill Number
 * Example: "903B" + "01" = "903B01"
 */
const generateUniqueCode = (recoilerShortCode, millNumber) => {
  if (!recoilerShortCode) {
    throw new Error('recoiler_short_code is required to generate unique code');
  }
  
  if (!millNumber) {
    throw new Error('mill_number is required to generate unique code');
  }
  
  const millNum = extractMillNumber(millNumber);
  if (!millNum) {
    throw new Error('Could not extract mill number from mill_number field');
  }
  
  // Format: recoiler_short_code + mill_number
  // Example: "903B" + "01" = "903B01"
  return `${recoilerShortCode}${millNum}`;
};

const createPipeMill = async (payload) => {
  // Generate unique code from recoiler_short_code + mill_number
  const unique_code = generateUniqueCode(payload.recoiler_short_code, payload.mill_number);
  
  try {
    return await pipeMillRepository.insertPipeMill({ ...payload, unique_code });
  } catch (error) {
    if (error?.code === '23505') {
      // If duplicate, throw error with helpful message
      throw new Error(`Unique code "${unique_code}" already exists. This combination of Recoiler Short Code and Mill Number is already used.`);
    }
    throw error;
  }
};

const listPipeMillEntries = async (filters = {}) => pipeMillRepository.findPipeMillEntries(filters);

const getPipeMillByUniqueCode = async (uniqueCode) => {
  const [entry] = await pipeMillRepository.findPipeMillEntries({ uniqueCode });
  return entry ?? null;
};

module.exports = { createPipeMill, listPipeMillEntries, getPipeMillByUniqueCode };
