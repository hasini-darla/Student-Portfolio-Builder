const express = require("express");
const supabase = require("../supabase");

const router = express.Router();
router.get("/:slug", async (req, res, next) => {
  try {
    const { data: record, error: profileError } = await supabase.from("profiles")
      .select("user_id,full_name,slug,headline,bio,education,contact_email,linkedin_url,is_published")
      .eq("slug", req.params.slug).eq("is_published", true).maybeSingle();
    if (profileError) throw profileError;
    if (!record) return res.status(404).json({ error: "Published portfolio not found." });

    const { user_id: userId, ...profile } = record;
    const [skillResult, projectResult] = await Promise.all([
      supabase.from("skills").select("id,name,category").eq("user_id", userId).order("created_at", { ascending: true }),
      supabase.from("projects").select("id,title,description,technologies,project_url,repository_url,is_featured").eq("user_id", userId).order("is_featured", { ascending: false }).order("created_at", { ascending: false })
    ]);
    if (skillResult.error) throw skillResult.error;
    if (projectResult.error) throw projectResult.error;
    return res.json({ profile, skills: skillResult.data, projects: projectResult.data });
  } catch (error) { next(error); }
});
module.exports = router;
