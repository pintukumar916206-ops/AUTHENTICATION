import jwt from "jsonwebtoken";

export function getAuthToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  if (req.cookies?.token) return req.cookies.token;
  if (typeof req.query?.token === "string") return req.query.token;
  return null;
}

export function verifyAuthToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function requireAuth(req, res, next) {
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required." });
  }

  try {
    const payload = verifyAuthToken(token);
    req.user = { id: payload.id, email: payload.email, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "TOKEN_INVALID", message: "Session expired. Please log in again." });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "FORBIDDEN", message: "Admin access required." });
  }
  next();
}
