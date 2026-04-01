import axios from "axios";

const VENDOR_REGISTRATION_API_URL =
  process.env.STORE_VENDOR_REGISTRATION_API_URL ||
  process.env.VENDOR_REGISTRATION_API_URL ||
  null;

const REQUEST_TIMEOUT_MS = Number(
  process.env.STORE_VENDOR_REGISTRATION_TIMEOUT_MS || 15000
);
const CACHE_TTL_MS = Number(
  process.env.STORE_VENDOR_REGISTRATION_CACHE_TTL_MS || 5 * 60 * 1000
);

let cachedPayload = null;
let cacheExpiresAt = 0;
let inFlightRequest = null;

const HEADER_ALIASES = {
  timestamp: ["Timestamp"],
  supplierName: ["Supplier Name"],
  gstNo: ["GST NO", "GST No"],
  correspondenceAddress: ["Correspondence Address"],
  factoryOrFirmName: ["Factory or Firm Name"],
  yearOfEstablishment: ["Year of Establishment"],
  productType: ["Product Type"],
  mobileNumber: ["Mobile Number"],
  email: ["Email"],
  typeOfBusiness: ["Type of Business"],
  clientNames: ["Name of Clients"],
  companyOwnerName: ["Name Of Company Owner", "Name of Company Owner"],
  ownerEmail: ["Email address", "Owner Email", "Email Address"],
  vendorRegistrationNumber: ["Vendor Registration Number"],
  whatsappStatus: ["WhatsAppStatus", "WhatsApp Status"],
};

const normalizeHeader = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const asText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const buildHeaderIndex = (headers = []) => {
  const indexMap = new Map();
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (normalized && !indexMap.has(normalized)) {
      indexMap.set(normalized, index);
    }
  });
  return indexMap;
};

const getValueByHeaders = (row, headerIndex, aliases = []) => {
  for (const alias of aliases) {
    const matchedIndex = headerIndex.get(normalizeHeader(alias));
    if (matchedIndex !== undefined) {
      return row[matchedIndex];
    }
  }
  return null;
};

const normalizeVendorRow = (row, headerIndex, index) => {
  const normalized = {
    id:
      asText(getValueByHeaders(row, headerIndex, HEADER_ALIASES.vendorRegistrationNumber)) ||
      `${asText(getValueByHeaders(row, headerIndex, HEADER_ALIASES.timestamp)) || "row"}-${index + 1}`,
    timestamp: asText(getValueByHeaders(row, headerIndex, HEADER_ALIASES.timestamp)),
    supplierName: asText(getValueByHeaders(row, headerIndex, HEADER_ALIASES.supplierName)),
    gstNo: asText(getValueByHeaders(row, headerIndex, HEADER_ALIASES.gstNo)),
    correspondenceAddress: asText(
      getValueByHeaders(row, headerIndex, HEADER_ALIASES.correspondenceAddress)
    ),
    factoryOrFirmName: asText(
      getValueByHeaders(row, headerIndex, HEADER_ALIASES.factoryOrFirmName)
    ),
    yearOfEstablishment: asText(
      getValueByHeaders(row, headerIndex, HEADER_ALIASES.yearOfEstablishment)
    ),
    productType: asText(getValueByHeaders(row, headerIndex, HEADER_ALIASES.productType)),
    mobileNumber: asText(getValueByHeaders(row, headerIndex, HEADER_ALIASES.mobileNumber)),
    email: asText(getValueByHeaders(row, headerIndex, HEADER_ALIASES.email)),
    typeOfBusiness: asText(
      getValueByHeaders(row, headerIndex, HEADER_ALIASES.typeOfBusiness)
    ),
    clientNames: asText(getValueByHeaders(row, headerIndex, HEADER_ALIASES.clientNames)),
    companyOwnerName: asText(
      getValueByHeaders(row, headerIndex, HEADER_ALIASES.companyOwnerName)
    ),
    ownerEmail: asText(getValueByHeaders(row, headerIndex, HEADER_ALIASES.ownerEmail)),
    vendorRegistrationNumber: asText(
      getValueByHeaders(row, headerIndex, HEADER_ALIASES.vendorRegistrationNumber)
    ),
    whatsappStatus: asText(
      getValueByHeaders(row, headerIndex, HEADER_ALIASES.whatsappStatus)
    ).toUpperCase(),
  };

  const hasContent = Object.entries(normalized).some(
    ([key, value]) => key !== "id" && String(value || "").trim() !== ""
  );

  return hasContent ? normalized : null;
};

const normalizeSheetPayload = (payload) => {
  const sheetData = Array.isArray(payload?.data) ? payload.data : [];
  const [headerRow, ...dataRows] = sheetData.filter(Array.isArray);

  if (!Array.isArray(headerRow) || headerRow.length === 0) {
    throw new Error("Vendor registration sheet response is missing header row");
  }

  const headerIndex = buildHeaderIndex(headerRow);
  const records = dataRows
    .map((row, index) => normalizeVendorRow(row, headerIndex, index))
    .filter(Boolean)
    .sort((left, right) => {
      const leftTs = new Date(left.timestamp || 0).getTime();
      const rightTs = new Date(right.timestamp || 0).getTime();
      return rightTs - leftTs;
    });

  return records;
};

const fetchVendorRegistrationsFromSource = async () => {
  if (!VENDOR_REGISTRATION_API_URL) {
    throw new Error("STORE_VENDOR_REGISTRATION_API_URL is not configured");
  }

  const response = await axios.get(VENDOR_REGISTRATION_API_URL, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    },
  });

  const payload =
    typeof response.data === "string" ? JSON.parse(response.data) : response.data;

  if (!payload || payload.status !== "success" || !Array.isArray(payload.data)) {
    throw new Error("Unexpected vendor registration response format");
  }

  const records = normalizeSheetPayload(payload);
  return {
    data: records,
    fetchedAt: new Date().toISOString(),
    source: "live",
  };
};

export const getVendorRegistrations = async ({ bypassCache = false } = {}) => {
  const now = Date.now();
  if (!bypassCache && cachedPayload && now < cacheExpiresAt) {
    return {
      ...cachedPayload,
      source: "cache",
    };
  }

  if (!bypassCache && inFlightRequest) {
    return inFlightRequest;
  }

  const request = (async () => {
    try {
      const freshPayload = await fetchVendorRegistrationsFromSource();
      cachedPayload = freshPayload;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return freshPayload;
    } catch (error) {
      if (cachedPayload) {
        return {
          ...cachedPayload,
          source: "stale-cache",
        };
      }
      throw error;
    } finally {
      if (inFlightRequest === request) {
        inFlightRequest = null;
      }
    }
  })();

  if (!bypassCache) {
    inFlightRequest = request;
  }

  return request;
};
