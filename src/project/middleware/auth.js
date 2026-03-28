const jwt = require("jsonwebtoken");

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
    if (typeof authHeader === "string" && authHeader.trim()) {
        const [scheme, value] = authHeader.trim().split(" ");
        if (scheme && /^bearer$/i.test(scheme)) {
            return value ? value.trim() : null;
        }
        return authHeader.trim();
    }

    const legacyToken = req.header("x-auth-token");
    return typeof legacyToken === "string" && legacyToken.trim() ? legacyToken.trim() : null;
}

function normalizeUserPayload(decoded) {
    if (decoded && typeof decoded.user === "object" && decoded.user !== null) {
        return {
            ...decoded.user,
            role: decoded.user.role,
            user_name: decoded.user.user_name || decoded.user.username,
            username: decoded.user.username || decoded.user.user_name,
            id: decoded.user.id || decoded.user.user_id,
        };
    }

    return {
        ...decoded,
        id: decoded?.id || decoded?.user_id || null,
        user_id: decoded?.user_id || decoded?.id || null,
        user_name: decoded?.user_name || decoded?.username || null,
        username: decoded?.username || decoded?.user_name || null,
        role: decoded?.role || decoded?.userType || null,
        name: decoded?.name || null,
    };
}

function auth(req, res, next) {
    const token = getHeaderToken(req);
    if (!token) {
        return res.status(401).json({ msg: "No token, authorization denied" });
    }

    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
        return res.status(500).json({ msg: "JWT secret not configured" });
    }

    try {
        const decoded = jwt.verify(token, jwtSecret);
        req.user = normalizeUserPayload(decoded);
        return next();
    } catch (_err) {
        return res.status(401).json({ msg: "Token is not valid" });
    }
}

auth.manager = function (req, res, next) {
    const userRole = String(req.user?.role || "").toLowerCase();
    const userName = String(req.user?.user_name || req.user?.username || "").toLowerCase();

    if (userRole === "manager" || userRole === "admin" || userName === "admin") {
        return next();
    }

    return res.status(403).json({ msg: "Access denied. Manager or Admin access required." });
};

auth.admin = function (req, res, next) {
    const userRole = String(req.user?.role || "").toLowerCase();
    const userName = String(req.user?.user_name || req.user?.username || "").toLowerCase();

    if (userRole === "admin" || userName === "admin") {
        return next();
    }

    return res.status(403).json({ msg: "Access denied. Admin only." });
};

module.exports = auth;
