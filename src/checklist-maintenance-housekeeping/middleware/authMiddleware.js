import jwt from "jsonwebtoken";

// Same multi-fallback secret resolution as the shared login controller
// so tokens from /api/auth/login are accepted here too.
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

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    console.error("authMiddleware: JWT_SECRET is not configured.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res.status(403).json({ error: "Invalid or expired token." });
  }
};

export default authMiddleware;
