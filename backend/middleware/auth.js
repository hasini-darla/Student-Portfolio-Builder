const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: "Please log in to continue." });
  try {
    const payload = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") throw new Error("Invalid token subject");
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Your session is invalid or expired. Please log in again." });
  }
}
module.exports = { requireAuth };
