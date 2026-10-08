const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers["x-access-token"];
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Access token missing. Authentication required.",
    });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Invalid token format.",
    });
  }

  try {
    const secretKey = process.env.JWT_SECRET || "your_super_secret_jwt_key";
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid token. Please log in again.",
    });
  }
};

const requireAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && (req.user.role === "org_admin" || req.user.role === "domain_admin")) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "Access forbidden. Admin privileges required.",
    });
  });
};

const requireOrgAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user && req.user.role === "org_admin") {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "Access forbidden. Organisation Admin (Management) permissions required.",
    });
  });
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireOrgAdmin,
};
