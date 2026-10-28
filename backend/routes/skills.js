const express = require("express");
const supabase = require("../supabase");
const { requireAuth } = require("../middleware/auth");
const { text } = require("../utils/validation");

const router = express.Router();
router.use(requireAuth);
const allowedCategories = ["Technical", "Soft skill", "Tools", "Languages"];
router.post("/", async (req, res, next) => {
  try {
    const name = text(req.body.name, 60, "Skill name", { required: true });
    const category = req.body.category === undefined ? "Technical" : req.body.category;
    if (!allowedCategories.includes(category)) return res.status(400).json({ error: "Choose a valid skill category." });
    const { data: existing, error: lookupError } = await supabase.from("skills").select("id").eq("user_id", req.userId).ilike("name", name).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return res.status(409).json({ error: "You have already added that skill." });
    const { data, error } = await supabase.from("skills").insert({ user_id: req.userId, name, category }).select("*").single();
    if (error?.code === "23505") return res.status(409).json({ error: "You have already added that skill." });
    if (error) throw error;
    return res.status(201).json({ skill: data });
  } catch (error) {
    if (error.message && /must be|required|characters/i.test(error.message)) return res.status(400).json({ error: error.message });
    next(error);
  }
});
router.delete("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("skills").delete().eq("id", req.params.id).eq("user_id", req.userId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Skill not found." });
    return res.json({ message: "Skill removed." });
  } catch (error) { next(error); }
});
module.exports = router;
