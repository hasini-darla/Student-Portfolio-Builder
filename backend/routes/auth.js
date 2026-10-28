const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("node:crypto");
const supabase = require("../supabase");
const { text, email } = require("../utils/validation");

const router = express.Router();
function safeUser(user) { return { id: user.id, email: user.email, created_at: user.created_at }; }
function makeToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: process.env.JWT_EXPIRES_IN || "2h" });
}
router.post("/register", async (req, res, next) => {
  try {
    const name = text(req.body.name, 100, "Name", { required: true });
    const userEmail = email(req.body.email);
    if (typeof req.body.password !== "string" || req.body.password.length < 8 || req.body.password.length > 72) {
      return res.status(400).json({ error: "Password must contain between 8 and 72 characters." });
    }
    const { data: existing, error: lookupError } = await supabase.from("app_users").select("id").eq("email", userEmail).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return res.status(409).json({ error: "An account with this email already exists." });

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const { data: user, error: userError } = await supabase.from("app_users")
      .insert({ id: userId, email: userEmail, password_hash: passwordHash }).select("id,email,created_at").single();
    if (userError) {
      if (userError.code === "23505") return res.status(409).json({ error: "An account with this email already exists." });
      throw userError;
    }
    const baseSlug = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "student";
    let uniqueSlug = `${baseSlug}-${userId.slice(0, 6)}`;
    const { error: profileError } = await supabase.from("profiles").insert({ user_id: userId, full_name: name, slug: uniqueSlug, headline: "Student and aspiring builder" });
    if (profileError) {
      await supabase.from("app_users").delete().eq("id", userId);
      throw profileError;
    }
    return res.status(201).json({ token: makeToken(user), user: safeUser(user) });
  } catch (error) {
    if (error.message && /must be|required|valid email/i.test(error.message)) return res.status(400).json({ error: error.message });
    next(error);
  }
});
router.post("/login", async (req, res, next) => {
  try {
    const userEmail = email(req.body.email);
    if (typeof req.body.password !== "string" || !req.body.password) return res.status(400).json({ error: "Password is required." });
    const { data: user, error } = await supabase.from("app_users").select("id,email,password_hash,created_at").eq("email", userEmail).maybeSingle();
    if (error) throw error;
    if (!user || !(await bcrypt.compare(req.body.password, user.password_hash))) return res.status(401).json({ error: "Email or password is incorrect." });
    return res.json({ token: makeToken(user), user: safeUser(user) });
  } catch (error) {
    if (error.message && /must be|required|valid email/i.test(error.message)) return res.status(400).json({ error: error.message });
    next(error);
  }
});
module.exports = router;
