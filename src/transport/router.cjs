const express = require("express");
const axios = require("axios");

const transportRouter = express.Router();

const TRANSPORT_UPSTREAM_BASE_URL =
  process.env.TRANSPORT_API_BASE_URL ||
  "https://triofleet-backend.trieon.in/hita/api";

const createTransportError = (error, fallbackMessage) => {
  if (error?.response) {
    return {
      statusCode: error.response.status || 500,
      payload: error.response.data || {
        message: fallbackMessage,
      },
    };
  }

  return {
    statusCode: 502,
    payload: {
      message: fallbackMessage,
      error: error?.message || "Transport upstream request failed.",
    },
  };
};

const transportRequest = async ({
  method,
  path,
  data,
  params,
  authorization,
}) => {
  const headers = {
    "Content-Type": "application/json",
  };

  if (authorization) {
    headers.Authorization = authorization;
  }

  return axios.request({
    url: `${TRANSPORT_UPSTREAM_BASE_URL}${path}`,
    method,
    data,
    params,
    headers,
    maxBodyLength: Infinity,
    timeout: 30000,
  });
};

transportRouter.post("/auth/login", async (req, res) => {
  try {
    const response = await transportRequest({
      method: "POST",
      path: "/auth/login",
      data: req.body,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    const failure = createTransportError(error, "Transport login failed.");
    res.status(failure.statusCode).json(failure.payload);
  }
});

transportRouter.get("/reports/lr-bilty-register", async (req, res) => {
  try {
    const response = await transportRequest({
      method: "GET",
      path: "/reports/lr-bilty-register",
      params: req.query,
      authorization: req.headers.authorization,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    const failure = createTransportError(
      error,
      "Transport LR bilty register fetch failed."
    );
    res.status(failure.statusCode).json(failure.payload);
  }
});

module.exports = transportRouter;
