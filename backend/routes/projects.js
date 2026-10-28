const express = require("express");
const supabase = require("../supabase");
const { requireAuth } = require("../middleware/auth");
const { text, optionalText, url, boolean, stringArray } = require("../utils/validation");

const router = express.Router();
router.use(requireAuth);
function projectInput(body) {
  return {
    title: text(body.title, 120, "Project title", { required: true }),
    description: text(body.description, 2000, "Description", { required: true }),
    technologies: stringArray(body.technologies, "Technologies", 12, 50),
    project_url: url(body.project_url, "Project link"),
    repository_url: url(body.repository_url, "Source code link"),
    is_featured: body.is_featured === undefined ? false : boolean(body.is_featured, "Featured setting"),
    updated_at: new Date().toISOString()
  };
}
router.post("/", async (req, res, next) => {
  try {
    const values = projectInput(req.body);
    const { count, error: countError } = await supabase.from("projects").select("id", { count: "exact", head: true }).eq("user_id", req.userId);
    if (countError) throw countError;
    if ((count || 0) >= 30) return res.status(400).json({ error: "You can add up to 30 projects." });
    const { data, error } = await supabase.from("projects").insert({ ...values, user_id: req.userId }).select("*").single();
    if (error) throw error;
    return res.status(201).json({ project: data });
  } catch (error) {
    if (error.message && /must be|required|valid|characters|at most|items/i.test(error.message)) return res.status(400).json({ error: error.message });
    next(error);
  }
});
router.put("/:id", async (req, res, next) => {
  try {
    const values = projectInput(req.body);
    const { data, error } = await supabase.from("projects").update(values).eq("id", req.params.id).eq("user_id", req.userId).select("*").maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Project not found." });
    return res.json({ project: data });
  } catch (error) {
    if (error.message && /must be|required|valid|characters|at most|items/i.test(error.message)) return res.status(400).json({ error: error.message });
    next(error);
  }
});
router.delete("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("projects").delete().eq("id", req.params.id).eq("user_id", req.userId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Project not found." });
    return res.json({ message: "Project deleted." });
  } catch (error) { next(error); }
});
module.exports = router;
