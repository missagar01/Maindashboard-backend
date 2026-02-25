const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DEFAULT_SHEET_NAME = "Form Responses 1";
const MAX_ATTEMPTS = 4; // Stay under proxy timeouts (approx 20-25s total)
const REQUEST_TIMEOUT_MS = 20000;
const CACHE_FILE = path.join(process.cwd(), 'customer_feedback_cache.json');

const DEFAULT_ENDPOINTS = [
  process.env.GOOGLE_FEEDBACK_WEBAPP_URL,
].filter(Boolean);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Load data from local cache if it exists
 */
function getCachedData() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const content = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("⚠️ Failed to read feedback cache:", err.message);
  }
  return null;
}

/**
 * Save data to local cache
 */
function updateCache(data) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      ...data,
      cachedAt: new Date().toISOString()
    }, null, 2));
  } catch (err) {
    console.error("⚠️ Failed to update feedback cache:", err.message);
  }
}

/**
 * Robust fetch for Google Apps Script. 
 * Handles the "Running..." splash screen by retrying.
 * Falls back to local cache if Google is too slow.
 */
async function fetchCustomerFeedbackFromGoogleSheet(options = {}) {
  const sheetName = options.sheetName || DEFAULT_SHEET_NAME;
  const rawEndpoints = Array.from(new Set([...(options.endpoints || []), ...DEFAULT_ENDPOINTS].filter(Boolean)));

  if (rawEndpoints.length === 0) {
    const cached = getCachedData();
    if (cached) return cached;
    throw new Error("No Google Apps Script URL configured in .env");
  }

  let lastError = null;
  let lastSnippet = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    for (const baseEndpoint of rawEndpoints) {
      const url = new URL(baseEndpoint);
      url.searchParams.set("sheet", sheetName);
      url.searchParams.set("action", "fetch");

      // Cache bust only on later attempts to avoid triggering cold starts unnecessarily
      if (attempt > 2) {
        url.searchParams.set("_t", Date.now().toString());
      }

      try {
        console.log(`📡 [Attempt ${attempt}/${MAX_ATTEMPTS}] Fetching: ${url.origin}...`);

        const response = await axios.get(url.toString(), {
          timeout: REQUEST_TIMEOUT_MS,
          maxRedirects: 10,
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
          }
        });

        const data = response.data;
        const text = typeof data === 'string' ? data : JSON.stringify(data);
        lastSnippet = text.slice(0, 500);

        // Success condition
        if (data && data.success === true && Array.isArray(data.data)) {
          console.log(`✅ [Attempt ${attempt}] Live data retrieved.`);
          updateCache(data);
          return { ...data, sourceUrl: url.toString() };
        }

        // Detection: Google Splash Screen
        if (text.includes("Google Apps Script is running") ||
          text.includes("warming up") ||
          (text.includes("<html") && text.includes("Google"))) {
          console.warn(`⏳ [Attempt ${attempt}] Google script is warming up...`);
          throw new Error("Google Script Warming Up");
        }

        if (data && data.error) throw new Error(data.error);
        throw new Error("Invalid response format");

      } catch (error) {
        lastError = error;
        const errorMsg = error.response ? `HTTP ${error.response.status}` : error.message;
        console.warn(`⚠️ [Attempt ${attempt}] ${errorMsg}`);
      }
    }

    if (attempt < MAX_ATTEMPTS) {
      // Delay increases with each attempt: 2s, 4s, 6s
      await sleep(attempt * 2000);
    }
  }

  // FALLBACK TO CACHE
  console.log("🔦 All live attempts failed. Falling back to local cache...");
  const cached = getCachedData();
  if (cached) {
    return {
      ...cached,
      isStale: true,
      errorSnippet: lastSnippet.substring(0, 50)
    };
  }

  throw new Error(`Failed live and no cache. Last: ${lastSnippet.substring(0, 100)}...`);
}

module.exports = { fetchCustomerFeedbackFromGoogleSheet };
