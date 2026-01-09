const https = require("https");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load environment variables explicitly (for AWS/server environments)
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error("⚠️ Error loading .env file:", result.error);
  }
}

/* ---------------- UTILS ---------------- */

const formatTimestamp = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return "";

  const pad = (n) => String(n).padStart(2, "0");

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}
${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const getGroupIds = (key) => {
  const value = process.env[key];
  if (!value) return [];
  return value.split(",").map(v => v.trim()).filter(Boolean);
};

// Convert image URL to proper format for WhatsApp
// Replaces localhost with public URL (BASE_URL from .env)
// Images are now accessible at /uploads/... (served directly from main app)
const formatImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return '';
  
  try {
    // Extract path from URL (works with both localhost and proper URLs)
    let path = '';
    try {
      const urlObj = new URL(imageUrl);
      path = urlObj.pathname;
    } catch (urlError) {
      // If URL parsing fails, try to extract path manually
      const pathMatch = imageUrl.match(/\/uploads\/[^\s"']+/);
      if (pathMatch) {
        path = pathMatch[0];
      } else {
        return imageUrl; // Return original if can't parse
      }
    }
    
    // If URL contains localhost, replace with public URL from BASE_URL
    if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) {
      const baseUrl = process.env.BASE_URL || process.env.API_BASE_URL || process.env.PUBLIC_URL;
      if (baseUrl) {
        // Ensure baseUrl doesn't end with / and path starts with /
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        
        // Images are accessible at /uploads/... (served directly from main app)
        // No need to add /api/batchcode prefix anymore
        const finalUrl = `${cleanBaseUrl}${cleanPath}`;
        return finalUrl;
      }
      // If no BASE_URL but localhost, return original
      // User should set BASE_URL in .env for proper image URLs in WhatsApp
      return imageUrl;
    }
    
    // Return as is if already a proper URL (not localhost)
    return imageUrl;
  } catch (error) {
    // If any error, return original URL
    return imageUrl;
  }
};

/* ---------------- MAYTAPI CONFIG ---------------- */

// Get MAYTAPI credentials from environment (with fallback to dotenv parsed values)
const getEnvVar = (key) => {
  // First try process.env (may already be loaded)
  if (process.env[key]) {
    return process.env[key];
  }
  // If not found, try loading .env again and get from parsed result
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const result = dotenv.config({ path: envPath });
      if (result.parsed && result.parsed[key]) {
        // Also set in process.env for future use
        process.env[key] = result.parsed[key];
        return result.parsed[key];
      }
    }
  } catch (error) {
    console.error(`⚠️ Error loading ${key} from .env:`, error.message);
  }
  return undefined;
};

const MAYTAPI_PRODUCT_ID = getEnvVar("MAYTAPI_PRODUCT_ID");
const MAYTAPI_PHONE_ID   = getEnvVar("MAYTAPI_PHONE_ID");
const MAYTAPI_TOKEN      = getEnvVar("MAYTAPI_TOKEN");

// Debug logging (only show first few characters for security)
if (MAYTAPI_PRODUCT_ID && MAYTAPI_PHONE_ID && MAYTAPI_TOKEN) {
  console.log("✅ MAYTAPI credentials loaded:");
  console.log(`   PRODUCT_ID: ${MAYTAPI_PRODUCT_ID.substring(0, 8)}...`);
  console.log(`   PHONE_ID: ${MAYTAPI_PHONE_ID}`);
  console.log(`   TOKEN: ${MAYTAPI_TOKEN.substring(0, 8)}...`);
} else {
  console.error("❌ MAYTAPI ENV MISSING");
  console.error("Required:");
  console.error("MAYTAPI_PRODUCT_ID, MAYTAPI_PHONE_ID, MAYTAPI_TOKEN");
  console.error(`Current values:`, {
    PRODUCT_ID: MAYTAPI_PRODUCT_ID ? "✅ Set" : "❌ Missing",
    PHONE_ID: MAYTAPI_PHONE_ID ? "✅ Set" : "❌ Missing",
    TOKEN: MAYTAPI_TOKEN ? "✅ Set" : "❌ Missing"
  });
}

/* ---------------- SEND WHATSAPP ---------------- */

const sendWhatsAppMessage = async (groupIds, message) => {
  if (!MAYTAPI_PRODUCT_ID || !MAYTAPI_PHONE_ID || !MAYTAPI_TOKEN) return;
  if (!groupIds || groupIds.length === 0) return;

  const apiPath = `/api/${MAYTAPI_PRODUCT_ID}/${MAYTAPI_PHONE_ID}/sendMessage?token=${encodeURIComponent(MAYTAPI_TOKEN)}`;

  const sendToGroup = (groupId) =>
    new Promise((resolve) => {
      const body = JSON.stringify({
        to_number: groupId,
        type: "text",
        message: message
      });

      const options = {
        hostname: "api.maytapi.com",
        port: 443,
        path: apiPath,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        }
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✅ WhatsApp sent → ${groupId}`);
          } else {
            console.error(`❌ Failed → ${groupId}`, data);
          }
          resolve();
        });
      });

      req.on("error", err => {
        console.error(`❌ Network error → ${groupId}`, err.message);
        resolve();
      });

      req.write(body);
      req.end();
    });

  await Promise.all(groupIds.map(sendToGroup));
};

// Format SMS Register message
const formatSmsRegisterMessage = (smsData) => {
  const timestamp = formatTimestamp(smsData.sample_timestamp);
  const uniqueCode = smsData.unique_code || '';
  
  let message = `SMS Register Fields\n`;
  message += `Timestamp : ${timestamp}\n\n`;
  message += `UniqueCode : ${uniqueCode}\n\n`;
  message += `Sequence Number : ${smsData.sequence_number || ''}\n\n`;
  message += `Laddle Number : ${smsData.laddle_number || ''}\n\n`;
  message += `SMS Head : ${smsData.sms_head || ''}\n\n`;
  message += `Furnace Number : ${smsData.furnace_number || ''}\n\n`;
  message += `Melter Name : ${smsData.melter_name || ''}\n\n`;
  message += `Shift Incharge : ${smsData.shift_incharge || ''}\n\n`;
  message += `Temprature : ${smsData.temperature || ''}\n\n`;
  message += `Remarks : ${smsData.remarks || ''}\n\n`;
  message += `Picture : ${formatImageUrl(smsData.picture) || ''}\n\n`;
  message += `Click in this link to generate hot coil,`;
  
  return message;
};

// Format ReCoiler message
const formatReCoilerMessage = (reCoilerData, hotCoilData) => {
  let message = `*New Recoiler Batch Code Generated\n`;
  message += `नया रेकॉइलेर बैच कोड बनाया गया है*\n\n`;
  
  if (hotCoilData) {
    message += `Hot Coil Register Fields\n\n`;
    message += `Timestamp : ${formatTimestamp(hotCoilData.sample_timestamp)}\n`;
    message += `SMS Short Code : ${hotCoilData.sms_short_code || ''}\n`;
    message += `Size : ${hotCoilData.size || ''}\n`;
    message += `Mill Incharge : ${hotCoilData.mill_incharge || ''}\n`;
    message += `Quality Supervisor : ${hotCoilData.quality_supervisor || ''}\n`;
    message += `Picture : ${formatImageUrl(hotCoilData.picture) || ''}\n`;
    message += `Electrical DC Operator : ${hotCoilData.electrical_dc_operator || ''}\n`;
    message += `Remarks : ${hotCoilData.remarks || ''}\n`;
    message += `Strrand1 Temperature : ${hotCoilData.strand1_temperature || 'Close '}\n`;
    message += `Strand2 Temperature : ${hotCoilData.strand2_temperature || ''}\n\n`;
  }
  
  message += `Recoiler Register Fields\n`;
  message += `Timestamp : ${formatTimestamp(reCoilerData.sample_timestamp)}\n`;
  message += `Recoiler Code : ${reCoilerData.unique_code || ''}\n`;
  message += `Hot Coiler Short Code : ${reCoilerData.hot_coiler_short_code || ''}\n`;
  message += `Size : ${reCoilerData.size || ''}\n`;
  message += `Supervisor : ${reCoilerData.supervisor || ''}\n`;
  message += `Incharge : ${reCoilerData.incharge || ''}\n`;
  message += `Contractor : ${reCoilerData.contractor || ''}\n`;
  message += `Machine Number : ${reCoilerData.machine_number || ''}\n`;
  message += `Welder Name : ${reCoilerData.welder_name || ''}\n`;
 
  
  return message;
};

// Format Hot Coil message
const formatHotCoilMessage = (hotCoilData, smsData) => {
  let message = `*New Hot Coil Batch Code Generated\n`;
  message += `नया हॉट कोईल बैच कोड बनाया गया है*\n\n`;
  
  if (smsData) {
    message += `SMS Register Fields\n\n`;
    message += `Timestamp : ${formatTimestamp(smsData.sample_timestamp)}\n`;
    message += `Sequence Number : ${smsData.sequence_number || ''}\n`;
    message += `Laddle Number : ${smsData.laddle_number || ''}\n`;
    message += `SMS Head : ${smsData.sms_head || ''}\n`;
    message += `Furnace Number : ${smsData.furnace_number || ''}\n`;
    message += `Remarks : ${smsData.remarks || ''}\n`;
    message += `Picture : ${formatImageUrl(smsData.picture) || ''}\n`;
    message += `Shift Incharge : ${smsData.shift_incharge || ''}\n`;
    message += `Temprature : ${smsData.temperature || ''}\n`;
    message += `UniqueCode : ${smsData.unique_code || ''}\n\n`;
  }
  
  message += `Hot Coil Register Fields\n\n`;
  message += `Timestamp : ${formatTimestamp(hotCoilData.sample_timestamp)}\n`;
  message += `UniqueCode : ${hotCoilData.unique_code || ''}\n`;
  message += `SMS Short Code : ${hotCoilData.sms_short_code || ''}\n`;
  message += `Submission Type: ${hotCoilData.submission_type || 'Hot Coil'}\n`;
  message += `Size : ${hotCoilData.size || ''}\n`;
  message += `Mill Incharge : ${hotCoilData.mill_incharge || ''}\n`;
  message += `Quality Supervisor : ${hotCoilData.quality_supervisor || ''}\n`;
  message += `Picture : ${formatImageUrl(hotCoilData.picture) || ''}\n`;
  message += `Electrical DC Operator : ${hotCoilData.electrical_dc_operator || ''}\n`;
  message += `Shift Supervisor: ${hotCoilData.shift_supervisor || ''}\n`;
  message += `Remarks : ${hotCoilData.remarks || ''}\n`;
  message += `Strrand1 Temperature : ${hotCoilData.strand1_temperature || ''}\n`;
  message += `Strand2 Temperature : ${hotCoilData.strand2_temperature || ''}\n`;
 
  
  return message;
};

// Format Pipe Mill message
const formatPipeMillMessage = (pipeMillData, reCoilerData) => {
  let message = `*New Pipe Mill Batch Code Generated\n`;
  message += `नया पाइप मिल बैच कोड बनाया गया है\n`;
  message += `Recoiler Register Field*\n\n`;
  
  if (reCoilerData) {
    message += `"Timestamp : ${formatTimestamp(reCoilerData.sample_timestamp)}\n`;
    message += `Hot Coiler Short Code : ${reCoilerData.hot_coiler_short_code || ''}\n`;
    message += `Size : ${reCoilerData.size || ''}\n`;
    message += `Supervisor : ${reCoilerData.supervisor || ''}\n`;
    message += `Incharge : ${reCoilerData.incharge || ''}\n`;
    message += `Contractor : ${reCoilerData.contractor || ''}\n`;
    message += `Machine Number : ${reCoilerData.machine_number || ''}\n`;
    message += `Welder Name : ${reCoilerData.welder_name || ''}\n`;
    message += `UniqueCode : ${reCoilerData.unique_code || ''}\n\n`;
  }
  
  message += `Pipe Mill Register Field\n\n`;
  message += `"Timestamp : ${formatTimestamp(pipeMillData.sample_timestamp)}\n`;
  message += `UniqueCode : ${pipeMillData.unique_code || ''}\n`;
  message += `Recoiler Short Code : ${pipeMillData.recoiler_short_code || ''}\n`;
  message += `Mill Number : ${pipeMillData.mill_number || ''}\n`;
  message += `Section : ${pipeMillData.section || ''}\n`;
  message += `Item Type : ${pipeMillData.item_type || ''}\n`;
  message += `Quality Supervisor : ${pipeMillData.quality_supervisor || ''}\n`;
  message += `Mill Incharge : ${pipeMillData.mill_incharge || ''}\n`;
  message += `Forman Name : ${pipeMillData.forman_name || ''}\n`;
  message += `Fitter Name : ${pipeMillData.fitter_name || ''}\n`;
  message += `Shift : ${pipeMillData.shift || ''}\n`;
  message += `Size : ${pipeMillData.size || ''}\n`;
  message += `Thickness : ${pipeMillData.thickness || ''}\n`;
  message += `Remarks : ${pipeMillData.remarks || ''}\n`;
  message += `Picture : ${formatImageUrl(pipeMillData.picture) || ''}\n`;
  
  
  return message;
};

// Format QC Lab Samples message
const formatQcLabMessage = (qcData) => {
  let message = `Timestamp: ${formatTimestamp(qcData.sample_timestamp)}\n`;
  message += `Code: ${qcData.unique_code || ''}\n`;
  message += `Final P%: ${qcData.final_p || ''}\n`;
  message += `Final C%: ${qcData.final_c || ''}\n`;
  message += `Sampled Sequence: ${qcData.sequence_code || ''}\n`;
  message += `Sample Tested by: ${qcData.tested_by || ''}\n`;
  message += `Remarks: ${qcData.remarks || ''}\n`;
  message += `Test Report Picture: ${formatImageUrl(qcData.report_picture) || ''}\n`;
  message += `Sampled Furnace Number: ${qcData.furnace_number || ''}\n`;
  message += `Final S%: ${qcData.final_s || ''}\n`;
  message += `Shift: ${qcData.shift_type || ''}\n`;
  message += `Sampled Laddle Number: ${qcData.laddle_number || ''}\n`;
  message += `Final MN%: ${qcData.final_mn || ''}\n`;
  message += `SMS Batch Code: ${qcData.sms_batch_code || ''}\n\n`;
  
  
  return message;
};

// Format Tundish Checklist message
const formatTundishMessage = (tundishData) => {
  const timestamp = formatTimestamp(tundishData.sample_timestamp);
  const datePart = timestamp.split(' ')[0];
  const timePart = timestamp.split(' ')[1] || '';
  
  let message = `🧾 TUNDISH MAKING CHECKLIST REPORT  \n`;
  message += `(टनडिश बनाने वाला चेकलिस्ट रिपोर्ट)\n\n`;
  message += `📅 Date: ${datePart}\n`;
  message += `⏱ Time: ${timePart}\n`;
  message += `🕒 Timestamp: ${timestamp}\n`;
  message += `🆔 Tundish Code: ${tundishData.unique_code || ''}\n\n`;
  message += `━━━━━━━━━━━━━━━\n`;
  message += `🧩 TUNDISH DETAILS  \n`;
  message += `(टनडिश विवरण)\n`;
  message += `━━━━━━━━━━━━━━━\n`;
  message += `🔹 Tundish Number: ${tundishData.tundish_number || ''}\n`;
  message += `👷 Tundish Mason: ${tundishData.tundish_mession_name || ''}\n\n`;
  message += `✅ Tundish Checklist:  \n`;
  message += `1️⃣ Nozzle Plate Checking: ${tundishData.nozzle_plate_check === 'Done' ? 'Done/(हो गया)' : 'Not Done/(नहीं हुआ)'}\n`;
  message += `2️⃣ Well Block Checking: ${tundishData.well_block_check === 'Done' ? 'Done/(हो गया)' : 'Not Done/(नहीं हुआ)'}\n`;
  message += `3️⃣ Board Proper Setting: ${tundishData.board_proper_set === 'Done' ? 'Done/(हो गया)' : 'Not Done/(नहीं हुआ)'}\n`;
  message += `4️⃣ Board Sand Filling: ${tundishData.board_sand_filling === 'Done' ? 'Done/(हो गया)' : 'Not Done/(नहीं हुआ)'}\n`;
  message += `5️⃣ Refractory Slag Cleaning: ${tundishData.refractory_slag_cleaning === 'Done' ? 'Done/(हो गया)' : 'Not Done/(नहीं हुआ)'}\n\n`;
  message += `🚚 Tundish Handed Over To Production:  \n`;
  message += `- Proper Check (Well Block / Board etc.): ${tundishData.handover_proper_check === 'Yes' ? 'Yes/(हाँ)' : 'No/(नहीं)'}\n`;
  message += `- Nozzle Installed: ${tundishData.handover_nozzle_installed === 'Yes' ? 'Yes/(हाँ)' : 'No/(नहीं)'}\n`;
  message += `- Masala Inserted in Nozzle: ${tundishData.handover_masala_inserted === 'Yes' ? 'Yes/(हाँ)' : 'No/(नहीं)'}\n\n`;
  message += `👷‍♂️ Operators:  \n`;
  message += `- Stand 1 Mould Operator: ${tundishData.stand1_mould_operator || '0'}\n`;
  message += `- Stand 2 Mould Operator: ${tundishData.stand2_mould_operator || '0'}\n`;
  message += `- Timber Man: ${tundishData.timber_man_name || '0'}\n`;
  message += `- Laddle Operator: ${tundishData.laddle_operator_name || '0'}\n`;
  message += `- Shift Incharge: ${tundishData.shift_incharge_name || '0'}\n`;
  message += `- Foreman: ${tundishData.forman_name || '0'}\n`;
  message += `- Remarks: ${tundishData.remarks || '0'}\n\n`;
  message += `━━━━━━━━━━━━━━━\n`;
  message += `✅ _Report Verified and Submitted Successfully`;
  
  return message;
};

// Format Laddle Checklist message
const formatLaddleMessage = (laddleData) => {
  const timestamp = formatTimestamp(laddleData.sample_timestamp);
  const datePart = laddleData.sample_date ? formatTimestamp(new Date(laddleData.sample_date)).split(' ')[0] : timestamp.split(' ')[0];
  
  const getStatus = (value) => {
    if (value === 'Done' || value === true) return 'Done / (हो गया)';
    if (value === 'Not Done' || value === false) return 'Not Done / (नहीं हुआ)';
    return value || 'Not Done / (नहीं हुआ)';
  };
  
  let message = `🕒 Laddle Making Checklist Report  \n`;
  message += `(लेडल मेंटेनेंस पूर्णता रिपोर्ट)\n\n`;
  message += `📅 Date: ${datePart}\n`;
  message += `⏱ Timestamp: ${timestamp}\n`;
  message += `🧾 Laddle Number: ${laddleData.laddle_number || ''}\n`;
  message += `🎟️Laddle Code : ${laddleData.unique_code || ''}\n\n`;
  message += `✅ Checklist Summary:  \n`;
  message += `1️⃣ Slag cleaning (Top Area): ${getStatus(laddleData.slag_cleaning_top)}\n`;
  message += `2️⃣ Slag remove (Bottom Area): ${getStatus(laddleData.slag_cleaning_bottom)}\n`;
  message += `3️⃣ Nozzle proper lancing: ${getStatus(laddleData.nozzle_proper_lancing)}\n`;
  message += `4️⃣ Pursing plag cleaning: ${getStatus(laddleData.pursing_plug_cleaning)}\n`;
  message += `5️⃣ Sly gate plate/machine/frame check: ${getStatus(laddleData.sly_gate_check)}\n`;
  message += `6️⃣ Nozzle check & cleaning: ${getStatus(laddleData.nozzle_check_cleaning)}\n`;
  message += `7️⃣ Sly gate operate (80 pressure ×3): ${getStatus(laddleData.sly_gate_operate)}\n`;
  message += `8️⃣ NFC proper heat: ${getStatus(laddleData.nfc_proper_heat)}\n`;
  message += `9️⃣ NFC filling in nozzle: ${getStatus(laddleData.nfc_filling_nozzle)}\n\n`;
  message += `🧩 Plate Life: ${laddleData.plate_life || ''}\n\n`;
  message += `👷‍♂️ Team Details:  \n`;
  message += `- Timber Man: ${laddleData.timber_man_name || ''}\n`;
  message += `- Laddle Man: ${laddleData.laddle_man_name || ''}\n`;
  message += `- Foreman: ${laddleData.laddle_foreman_name || ''}\n`;
  message += `- Supervisor (Controller): ${laddleData.supervisor_name || ''}\n\n`;
  message += `🔰 Verified and submitted successfully.`;
  
  return message;
};

// Export functions
module.exports = {
  sendSmsRegisterNotification: async (smsData) => {
    const groupIds = getGroupIds('WHATSAPP_GROUP_IDS_SMS_REGISTER');
    const message = formatSmsRegisterMessage(smsData);
    await sendWhatsAppMessage(groupIds, message);
  },
  
  sendReCoilerNotification: async (reCoilerData, hotCoilData) => {
    const groupIds = getGroupIds('WHATSAPP_GROUP_IDS_RECOILER');
    const message = formatReCoilerMessage(reCoilerData, hotCoilData);
    await sendWhatsAppMessage(groupIds, message);
  },
  
  sendHotCoilNotification: async (hotCoilData, smsData) => {
    const groupIds = getGroupIds('WHATSAPP_GROUP_IDS_HOT_COIL');
    const message = formatHotCoilMessage(hotCoilData, smsData);
    await sendWhatsAppMessage(groupIds, message);
  },
  
  sendPipeMillNotification: async (pipeMillData, reCoilerData) => {
    const groupIds = getGroupIds('WHATSAPP_GROUP_IDS_PIPE_MILL');
    const message = formatPipeMillMessage(pipeMillData, reCoilerData);
    await sendWhatsAppMessage(groupIds, message);
  },
  
  sendQcLabNotification: async (qcData) => {
    const groupIds = getGroupIds('WHATSAPP_GROUP_IDS_QC_LAB');
    const message = formatQcLabMessage(qcData);
    await sendWhatsAppMessage(groupIds, message);
  },
  
  sendTundishNotification: async (tundishData) => {
    const groupIds = getGroupIds('WHATSAPP_GROUP_IDS_TUNDISH');
    const message = formatTundishMessage(tundishData);
    await sendWhatsAppMessage(groupIds, message);
  },
  
  sendLaddleNotification: async (laddleData) => {
    const groupIds = getGroupIds('WHATSAPP_GROUP_IDS_LADDLE');
    const message = formatLaddleMessage(laddleData);
    await sendWhatsAppMessage(groupIds, message);
  }
};

