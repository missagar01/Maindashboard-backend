import { getVendorRegistrations } from "../services/vendorRegistration.service.js";

export async function fetchVendorRegistrations(req, res) {
  try {
    const bypassCache = String(
      req.query?.refresh ?? req.query?.bypassCache ?? "false"
    ).toLowerCase() === "true";

    const result = await getVendorRegistrations({ bypassCache });

    return res.json({
      success: true,
      data: result.data,
      meta: {
        total: result.data.length,
        source: result.source,
        fetchedAt: result.fetchedAt,
      },
    });
  } catch (error) {
    console.error("Vendor registration fetch failed:", error);
    const statusCode = /not configured/i.test(error.message) ? 500 : 502;
    return res.status(statusCode).json({
      success: false,
      message: "Failed to fetch vendor registrations",
      error: error.message,
    });
  }
}
