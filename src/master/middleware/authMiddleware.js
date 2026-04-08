import jwt from "jsonwebtoken";
import pool from "../config/db.js";

function getJwtSecret() {
    return (
        process.env.JWT_SECRET ||
        process.env.JWT_SCREAT ||
        process.env.JWT_SECREAT ||
        process.env.jwt_secret ||
        process.env.jwt_screat ||
        process.env.jwt_secreat ||
        null
    );
}

function getHeaderToken(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || typeof authHeader !== "string") return null;

    const [scheme, value] = authHeader.split(" ");
    if (scheme?.toLowerCase() === "bearer") {
        return value ? value.trim() : null;
    }

    return authHeader.trim() || null;
}

function getCookieToken(req) {
    if (req.cookies?.authToken) return req.cookies.authToken;

    const rawCookie = req.headers.cookie;
    if (!rawCookie || typeof rawCookie !== "string") return null;

    const authCookie = rawCookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("authToken="));

    if (!authCookie) return null;

    const token = authCookie.split("=")[1];
    if (!token) return null;

    try {
        return decodeURIComponent(token);
    } catch {
        return token;
    }
}

function isDatabaseConnectivityError(error) {
    if (!error) return false;

    const message = String(error.message || error).toLowerCase();
    const code = String(error.code || "").toUpperCase();

    return (
        ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN", "ECONNRESET"].includes(code) ||
        message.includes("getaddrinfo enotfound") ||
        message.includes("could not translate host name") ||
        message.includes("connection terminated") ||
        message.includes("connection timeout") ||
        message.includes("timeout expired") ||
        message.includes("failed to connect")
    );
}

function buildUserFromToken(decoded) {
    return {
        id: decoded.id,
        user_name: decoded.user_name || decoded.username || "",
        role: decoded.role || "user",
        email_id: decoded.email_id || "",
        user_access: decoded.user_access || "",
        user_access1: decoded.user_access1 || "",
        page_access: decoded.page_access || "",
        system_access: decoded.system_access || "",
        verify_access: decoded.verify_access || "",
        verify_access_dept: decoded.verify_access_dept || "",
        employee_id: decoded.employee_id || "",
        department: decoded.department || "",
        designation: decoded.designation || "",
        division: decoded.division || "",
        auth_fallback: true,
    };
}

export const protect = async (req, res, next) => {
    // Use Authorization header first so shared login token always wins.
    const token = getHeaderToken(req) || getCookieToken(req);

    if (!token) {
        const error = new Error("Not authorized, no token");
        error.statusCode = 401;
        return next(error);
    }

    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
        const error = new Error("JWT secret not configured");
        error.statusCode = 500;
        return next(error);
    }

    let decoded;
    try {
        decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
        console.error("Auth Middleware Token Error:", error);
        error.statusCode = 401;
        error.message = "Not authorized, token failed";
        return next(error);
    }

    try {
        // Get user from the token
        const query = `
            SELECT id, user_name, role, email_id, user_access, user_access1, page_access, system_access, verify_access, verify_access_dept, employee_id
            FROM users 
            WHERE id = $1
        `;
        const { rows } = await pool.query(query, [decoded.id]);

        if (rows.length === 0) {
            const error = new Error("Not authorized, user not found");
            error.statusCode = 401;
            return next(error);
        }

        req.user = rows[0];
        return next();
    } catch (error) {
        console.error("Auth Middleware DB Error:", error);

        if (decoded?.id && isDatabaseConnectivityError(error)) {
            req.user = buildUserFromToken(decoded);
            return next();
        }

        error.statusCode = error.statusCode || 500;
        error.message = "Authorization check failed";
        return next(error);
    }
};

/**
 * Authorize roles
 * @param  {...string} roles 
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        const userRole = String(req.user?.role || "").toLowerCase();
        const userName = String(req.user?.user_name || "").toLowerCase();

        // Map 'admin' username to admin role
        const isAdmin = userRole === "admin" || userName === "admin";

        if (isAdmin) {
            return next();
        }

        const allowedRoles = roles.map((role) => String(role).toLowerCase());
        if (!allowedRoles.includes(userRole)) {
            const error = new Error(`Role ${userRole} is not authorized to access this resource`);
            error.statusCode = 403;
            return next(error);
        }

        next();
    };
};
