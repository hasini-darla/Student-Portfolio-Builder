const express = require("express");
const supabase = require("../supabase");
const { requireAuth } = require("../middleware/auth");
const { text, optionalText, email, url, slug, boolean } = require("../utils/validation");

const router = express.Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const [userResult, profileResult, projectResult, skillResult] = await Promise.all([
      supabase.from("app_users").select("id,email,created_at").eq("id", req.userId).single(),
      supabase.from("profiles").select("*").eq("user_id", req.userId).single(),
      supabase.from("projects").select("*").eq("user_id", req.userId).order("created_at", { ascending: false }),
      supabase.from("skills").select("*").eq("user_id", req.userId).order("created_at", { ascending: false })
    ]);
    for (const result of [userResult, profileResult, projectResult, skillResult]) if (result.error) throw result.error;
    return res.json({ user: userResult.data, profile: profileResult.data, projects: projectResult.data, skills: skillResult.data });
  } catch (error) { next(error); }
});

router.put("/profile", async (req, res, next) => {
  try {
    const body = req.body;
    const update = {
      full_name: text(body.full_name, 100, "Full name", { required: true }),
      slug: slug(body.slug),
      headline: optionalText(body.headline, 140, "Headline"),
      bio: optionalText(body.bio, 1500, "About you"),
      education: optionalText(body.education, 180, "Education"),
      contact_email: body.contact_email ? email(body.contact_email, "Contact email") : null,
      linkedin_url: url(body.linkedin_url, "LinkedIn URL"),
      is_published: boolean(body.is_published, "Publish setting"),
      updated_at: new Date().toISOString()
    };
    const { data: current, error: currentError } = await supabase.from("profiles").select("id").eq("user_id", req.userId).single();
    if (currentError) throw currentError;
    const { data, error } = await supabase.from("profiles").update(update).eq("user_id", req.userId).select("*").single();
    if (error?.code === "23505") return res.status(409).json({ error: "That portfolio URL is already in use. Choose another slug." });
    if (error) throw error;
    return res.json({ profile: data });
  } catch (error) {
    if (error.message && /must be|required|valid|slug|characters|true or false/i.test(error.message)) return res.status(400).json({ error: error.message });
    next(error);
  }
});
module.exports = router;
