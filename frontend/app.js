const API = "/api";
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
let token = sessionStorage.getItem("spb_token") || "";
let currentUser = null;
let profile = null;
let projects = [];
let skills = [];
let authMode = "register";
let toastTimer;

function escapeText(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3600);
}
function setNotice(message, isError = false) {
  const notice = $("#status-message");
  notice.textContent = message;
  notice.classList.toggle("error", isError);
  notice.classList.remove("hidden");
}
async function request(path, options = {}) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) };
  let response;
  try {
    response = await fetch(`${API}${path}`, { ...options, headers });
  } catch {
    throw new Error("Cannot reach the server. Check that the backend is running.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) {
      logout(false);
    }
    throw new Error(payload.error || "Something went wrong. Please try again.");
  }
  return payload;
}
function showView(view) {
  ["home", "auth", "dashboard", "public"].forEach(name => $(`#${name}-view`).classList.toggle("hidden", name !== view));
  $(".site-footer").classList.toggle("hidden", view === "public");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function updateNav() {
  const signedIn = Boolean(token && currentUser);
  $("#dashboard-link").classList.toggle("hidden", !signedIn);
  $("#nav-login").classList.toggle("hidden", signedIn);
  $("#nav-register").classList.toggle("hidden", signedIn);
  $("#nav-logout").classList.toggle("hidden", !signedIn);
}
function setAuthMode(mode) {
  authMode = mode;
  $("#auth-title").textContent = mode === "register" ? "Create your account" : "Welcome back";
  $("#auth-subtitle").textContent = mode === "register" ? "Build your student portfolio in a few steps." : "Log in to keep building your portfolio.";
  $("#name-field").classList.toggle("hidden", mode !== "register");
  $("#name-field").querySelector("input").required = mode === "register";
  $("#auth-submit").textContent = mode === "register" ? "Create account" : "Log in";
  $("#password-hint").textContent = mode === "register" ? "Use at least 8 characters." : "Enter your account password.";
  $("#switch-auth").innerHTML = mode === "register" ? 'Already registered? <button class="text-button" data-action="show-login">Log in</button>' : 'New here? <button class="text-button" data-action="show-register">Create an account</button>';
}
function getSlug() { return profile?.slug || ""; }
function publicUrl() { return getSlug() ? `${location.origin}/?portfolio=${encodeURIComponent(getSlug())}` : ""; }
function setFormValues(form, values) {
  Object.entries(values).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value ?? "";
  });
}
function formObject(form) {
  const result = {};
  for (const [key, value] of new FormData(form).entries()) result[key] = value;
  $$('input[type="checkbox"]', form).forEach(field => result[field.name] = field.checked);
  return result;
}
async function loadDashboard() {
  const data = await request("/me");
  currentUser = data.user;
  profile = data.profile;
  projects = data.projects;
  skills = data.skills;
  setFormValues($("#profile-form"), {
    full_name: profile.full_name, slug: profile.slug, headline: profile.headline, bio: profile.bio,
    education: profile.education, contact_email: profile.contact_email, linkedin_url: profile.linkedin_url,
    is_published: profile.is_published
  });
  $("#public-url").textContent = profile.is_published ? publicUrl() : "Publish your profile to get a link";
  renderProjects();
  renderSkills();
  updateNav();
}
function renderProjects() {
  const list = $("#projects-list");
  if (!projects.length) {
    list.innerHTML = '<div class="empty-list">No projects yet. Add one project you are proud of.</div>';
    return;
  }
  list.innerHTML = projects.map(project => `<article class="item-card">
    <div><h3>${escapeText(project.title)} ${project.is_featured ? '<span class="status-pill">FEATURED</span>' : ""}</h3>
    <p>${escapeText(project.description)}</p><div class="item-meta">${escapeText(project.technologies || "Technologies not specified")}</div></div>
    <div class="item-actions"><button class="small-button" data-edit-project="${escapeText(project.id)}">Edit</button><button class="small-button danger" data-delete-project="${escapeText(project.id)}">Delete</button></div>
  </article>`).join("");
}
function renderSkills() {
  const list = $("#skills-list");
  if (!skills.length) {
    list.innerHTML = '<div class="empty-list" style="width:100%">No skills yet. Add technologies, tools, or strengths.</div>';
    return;
  }
  list.innerHTML = skills.map(skill => `<div class="skill-chip"><span>${escapeText(skill.name)} <small>${escapeText(skill.category)}</small></span><button type="button" aria-label="Remove ${escapeText(skill.name)}" data-delete-skill="${escapeText(skill.id)}">×</button></div>`).join("");
}
function openTab(tab) {
  $$(".tab").forEach(button => button.classList.toggle("active", button.dataset.tab === tab));
  ["profile", "projects", "skills"].forEach(name => $(`#${name}-panel`).classList.toggle("hidden", name !== tab));
}
function resetProjectForm() {
  $("#project-form").reset();
  $("#project-form").elements.namedItem("id").value = "";
  $("#project-form").classList.add("hidden");
  $("#new-project").classList.remove("hidden");
}
function showDashboard() {
  showView("dashboard");
  $("#status-message").classList.add("hidden");
  openTab("profile");
}
async function enterDashboard() {
  try {
    await loadDashboard();
    showDashboard();
  } catch (error) {
    showToast(error.message);
    if (!token) showView("home");
  }
}
function logout(showMessage = true) {
  token = "";
  currentUser = null;
  profile = null;
  sessionStorage.removeItem("spb_token");
  updateNav();
  showView("home");
  if (showMessage) showToast("You have logged out.");
}
function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch { return ""; }
}
function renderPublic(data) {
  const p = data.profile;
  $("#public-name").textContent = p.full_name;
  $("#public-avatar").textContent = p.full_name.split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
  $("#public-headline").textContent = p.headline || "";
  $("#public-bio").textContent = p.bio || "";
  $("#public-education").textContent = p.education ? `✦ ${p.education}` : "";
  const email = $("#public-email");
  if (p.contact_email) { email.href = `mailto:${p.contact_email}`; email.classList.remove("hidden"); } else email.classList.add("hidden");
  const linkedin = $("#public-linkedin");
  const linkedinUrl = safeExternalUrl(p.linkedin_url || "");
  if (linkedinUrl) { linkedin.href = linkedinUrl; linkedin.classList.remove("hidden"); } else linkedin.classList.add("hidden");
  $("#public-skills").innerHTML = data.skills.length ? data.skills.map(s => `<span>${escapeText(s.name)} · ${escapeText(s.category)}</span>`).join("") : '<p class="muted">Skills have not been added yet.</p>';
  $("#public-projects").innerHTML = data.projects.length ? data.projects.map(project => {
    const projectUrl = safeExternalUrl(project.project_url || "");
    const repoUrl = safeExternalUrl(project.repository_url || "");
    return `<article class="public-project"><p class="eyebrow">${project.is_featured ? "FEATURED PROJECT" : "PROJECT"}</p><h3>${escapeText(project.title)}</h3><p>${escapeText(project.description)}</p><div class="item-meta">${escapeText(project.technologies || "")}</div>${projectUrl ? `<a href="${escapeText(projectUrl)}" target="_blank" rel="noopener noreferrer">View project ↗</a>` : ""}${repoUrl ? `<a href="${escapeText(repoUrl)}" target="_blank" rel="noopener noreferrer">Source code ↗</a>` : ""}</article>`;
  }).join("") : '<div class="empty-list">Projects will appear here when they are added.</div>';
}
async function loadPublicPortfolio(slug) {
  showView("public");
  $("#public-loading").classList.remove("hidden");
  $("#public-content").classList.add("hidden");
  $("#public-error").classList.add("hidden");
  try {
    const data = await request(`/public/${encodeURIComponent(slug)}`);
    renderPublic(data);
    $("#public-loading").classList.add("hidden");
    $("#public-content").classList.remove("hidden");
  } catch {
    $("#public-loading").classList.add("hidden");
    $("#public-error").classList.remove("hidden");
  }
}
document.addEventListener("click", async event => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "show-register" || action === "show-login") {
    setAuthMode(action === "show-register" ? "register" : "login");
    showView("auth");
  } else if (action === "show-home") showView("home");
  const tab = event.target.closest("[data-tab]")?.dataset.tab;
  if (tab) openTab(tab);
  const editId = event.target.closest("[data-edit-project]")?.dataset.editProject;
  if (editId) {
    const project = projects.find(item => item.id === editId);
    if (project) {
      setFormValues($("#project-form"), { ...project, technologies: project.technologies || "" });
      $("#project-form").classList.remove("hidden");
      $("#new-project").classList.add("hidden");
      $("#project-form").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  const deleteProjectId = event.target.closest("[data-delete-project]")?.dataset.deleteProject;
  if (deleteProjectId && confirm("Delete this project? This cannot be undone.")) {
    try { await request(`/projects/${deleteProjectId}`, { method: "DELETE" }); projects = projects.filter(p => p.id !== deleteProjectId); renderProjects(); showToast("Project deleted."); }
    catch (error) { showToast(error.message); }
  }
  const deleteSkillId = event.target.closest("[data-delete-skill]")?.dataset.deleteSkill;
  if (deleteSkillId && confirm("Remove this skill?")) {
    try { await request(`/skills/${deleteSkillId}`, { method: "DELETE" }); skills = skills.filter(s => s.id !== deleteSkillId); renderSkills(); showToast("Skill removed."); }
    catch (error) { showToast(error.message); }
  }
});
$("#nav-login").addEventListener("click", () => { setAuthMode("login"); showView("auth"); });
$("#nav-register").addEventListener("click", () => { setAuthMode("register"); showView("auth"); });
$("#nav-logout").addEventListener("click", () => logout());
$("#auth-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = formObject(event.currentTarget);
  const button = $("#auth-submit");
  button.disabled = true;
  button.textContent = "Please wait…";
  try {
    const result = await request(`/auth/${authMode}`, { method: "POST", body: JSON.stringify({ name: form.name, email: form.email, password: form.password }) });
    token = result.token;
    sessionStorage.setItem("spb_token", token);
    currentUser = result.user;
    await enterDashboard();
    showToast(authMode === "register" ? "Account created. Welcome!" : "Welcome back.");
  } catch (error) { showToast(error.message); }
  finally { button.disabled = false; button.textContent = authMode === "register" ? "Create account" : "Log in"; }
});
$("#profile-form").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const values = formObject(event.currentTarget);
    const result = await request("/me/profile", { method: "PUT", body: JSON.stringify(values) });
    profile = result.profile;
    setFormValues(event.currentTarget, profile);
    $("#public-url").textContent = profile.is_published ? publicUrl() : "Publish your profile to get a link";
    setNotice("Profile saved successfully.");
    showToast("Profile saved.");
  } catch (error) { setNotice(error.message, true); }
});
$("#new-project").addEventListener("click", () => {
  resetProjectForm();
  $("#project-form").classList.remove("hidden");
  $("#new-project").classList.add("hidden");
  $("#project-form").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#cancel-project").addEventListener("click", resetProjectForm);
$("#project-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = formObject(form);
  const id = values.id;
  delete values.id;
  values.technologies = values.technologies.split(",").map(s => s.trim()).filter(Boolean);
  try {
    const result = id
      ? await request(`/projects/${id}`, { method: "PUT", body: JSON.stringify(values) })
      : await request("/projects", { method: "POST", body: JSON.stringify(values) });
    if (id) projects = projects.map(p => p.id === id ? result.project : p);
    else projects.unshift(result.project);
    renderProjects();
    resetProjectForm();
    showToast(id ? "Project updated." : "Project added.");
  } catch (error) { showToast(error.message); }
});
$("#skill-form").addEventListener("submit", async event => {
  event.preventDefault();
  const values = formObject(event.currentTarget);
  try {
    const result = await request("/skills", { method: "POST", body: JSON.stringify(values) });
    skills.unshift(result.skill);
    renderSkills();
    event.currentTarget.reset();
    showToast("Skill added.");
  } catch (error) { showToast(error.message); }
});
$("#copy-portfolio").addEventListener("click", async () => {
  if (!profile?.is_published) return showToast("Save your profile with publishing enabled first.");
  try { await navigator.clipboard.writeText(publicUrl()); showToast("Public portfolio link copied."); }
  catch { showToast(publicUrl()); }
});
$("#view-portfolio").addEventListener("click", () => {
  if (!profile?.is_published) return showToast("Publish your profile first.");
  window.open(publicUrl(), "_blank", "noopener,noreferrer");
});
async function init() {
  const params = new URLSearchParams(location.search);
  const slug = params.get("portfolio");
  if (slug) {
    await loadPublicPortfolio(slug);
    return;
  }
  if (token) {
    try { await loadDashboard(); showDashboard(); }
    catch { logout(false); showView("home"); }
  } else {
    showView("home");
    updateNav();
  }
}
init();
