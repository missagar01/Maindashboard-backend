const redis = require('./config/redis.js');
const dotenv = require('dotenv');
dotenv.config();

async function redisTest() {
    try {
        console.log("🚀 Starting Redis Speed Test...");
        const start = Date.now();
        await redis.setEx('test_key', 60, JSON.stringify({ data: 'test' }));
        console.log(`⏱️ redis.setEx took: ${Date.now() - start}ms`);

        const start2 = Date.now();
        await redis.get('test_key');
        console.log(`⏱️ redis.get took: ${Date.now() - start2}ms`);

        process.exit(0);
    } catch (err) {
        console.error("❌ Redis test failed:", err);
        process.exit(1);
    }
}

redisTest();



