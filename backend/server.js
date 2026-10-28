require("dotenv").config();
const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/auth");
const meRoutes = require("./routes/me");
const projectRoutes = require("./routes/projects");
const skillRoutes = require("./routes/skills");
const publicRoutes = require("./routes/public");

if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
  throw new Error("JWT_SECRET must be set and contain at least 32 bytes. Generate one with: node -e \"console.log(require('node:crypto').randomBytes(48).toString('hex'))\"");
}

const app = express();
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"], connectSrc: ["'self'"], objectSrc: ["'none'"],
      baseUri: ["'self'"], frameAncestors: ["'none'"], formAction: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: "20kb" }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many authentication attempts. Please wait 15 minutes." } });
app.get("/api/health", (req, res) => res.json({ status: "ok", service: "student-portfolio-builder-api" }));
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/public", publicRoutes);
app.use("/api", (req, res) => res.status(404).json({ error: "API endpoint not found." }));

const frontendPath = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendPath));
app.get("*path", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(frontendPath, "index.html"));
});
app.use((err, req, res, next) => {
  // Log diagnostic details only on the server; never return raw database errors.
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err.message || err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: "A server error occurred. Check the backend terminal for details." });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Student Portfolio Builder running at http://localhost:${port}`));
