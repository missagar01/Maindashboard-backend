const router = require("./router.cjs");

module.exports = router;

if (require.main === module) {
    console.error(
        "The project backend is merged into the main backend. Start backend/server.js instead of backend/src/project/server.js."
    );
    process.exit(1);
}
