const sizeMasterService = require('../services/sizeMaster.service');

/**
 * Controller to get all size master data
 */
const getSizeMasterData = async (req, res) => {
    try {
        const data = await sizeMasterService.getSizeMasterData();
        res.json({
            success: true,
            data: data,
            count: data.length
        });
    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to get size master data by ID
 */
const getSizeMasterById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await sizeMasterService.getSizeMasterById(id);

        if (!data) {
            return res.status(404).json({
                success: false,
                message: 'Size master record not found'
            });
        }

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to create a new enquiry (supports both single and bulk)
 */
const createEnquiry = async (req, res) => {
    console.log(`[Enquiry API] Body Type: ${typeof req.body}, IsArray: ${Array.isArray(req.body)}`);

    try {
        const rawBody = req.body;

        if (!rawBody) {
            return res.status(400).json({
                success: false,
                message: 'No enquiry data received'
            });
        }

        // Always work with an array for consistency
        const items = Array.isArray(rawBody) ? rawBody : [rawBody];

        if (items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Enquiry list is empty'
            });
        }

        const errors = [];
        const validatedItems = items.map((item, index) => {
            const { item_type, size, thickness, enquiry_date, customer, quantity } = item;

            const missing = [];
            if (!item_type) missing.push('item_type');
            if (!size) missing.push('size');
            if (!thickness) missing.push('thickness');
            if (!enquiry_date) missing.push('enquiry_date');
            if (!customer) missing.push('customer');

            if (missing.length > 0) {
                errors.push(`Item #${index + 1}: Missing [${missing.join(', ')}]`);
            }

            // Clean quantity (ensure it's a number or null)
            let cleanQuantity = null;
            if (quantity !== undefined && quantity !== null && String(quantity).trim() !== "") {
                const num = parseFloat(quantity);
                if (isNaN(num) || num < 0) {
                    errors.push(`Item #${index + 1}: Quantity must be a non-negative number`);
                } else {
                    cleanQuantity = num;
                }
            }

            return { item_type, size, thickness, enquiry_date, customer, quantity: cleanQuantity };
        });

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'One or more items failed validation',
                errors: errors
            });
        }

        const data = await sizeMasterService.createEnquiry(validatedItems);

        return res.status(201).json({
            success: true,
            message: `Successfully syncronized ${validatedItems.length} enquiry items.`,
            data: data
        });

    } catch (error) {
        console.error("Critical Controller Error (createEnquiry):", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Controller to get current month enquiry report
 */
const getCurrentMonthEnquiryReport = async (req, res) => {
    try {
        const { month } = req.query;
        const data = await sizeMasterService.getCurrentMonthEnquiryReport(month);
        res.json({
            success: true,
            data: data,
            count: data.length
        });
    } catch (error) {
        console.error("Controller Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getSizeMasterData,
    getSizeMasterById,
    createEnquiry,
    getCurrentMonthEnquiryReport
};
