require('dotenv').config();
const { fetchCustomerFeedbackFromGoogleSheet } = require("./src/o2d/services/customerFeedback.service.js");

async function test() {
    console.log("Starting test...");
    try {
        const data = await fetchCustomerFeedbackFromGoogleSheet({ sheetName: "Form Responses 1" });
        console.log("✅ Success!");
        console.log("Data sample:", JSON.stringify(data).substring(0, 100));
    } catch (error) {
        console.error("❌ Failed!");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        if (error.cause) {
            console.error("Error Cause:", error.cause.message || error.cause);
        }
        console.error("Stack trace:", error.stack);
    }
}

test();
