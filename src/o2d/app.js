const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const routes = require("./routes/index.js");

dotenv.config();

const app = express();
app.use(express.json());

// CORS configuration - allow all origins by default, or use CORS_ORIGINS env var
const corsOriginsEnv = process.env.CORS_ORIGINS;
const corsOrigins = corsOriginsEnv
  ? corsOriginsEnv.split(",").map((origin) => origin.trim()).filter(Boolean)
  : ["*"];

const corsOptions = corsOrigins.includes("*")
  ? {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }
  : {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  };

app.use(cors(corsOptions));

// ✅ Register routes
app.use("/", routes);

module.exports = app;
