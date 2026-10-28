const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function text(value, max, field, { required = false, trim = true } = {}) {
  if (typeof value !== "string") throw new Error(`${field} must be text.`);
  const result = trim ? value.trim() : value;
  if (required && !result) throw new Error(`${field} is required.`);
  if (result.length > max) throw new Error(`${field} must be ${max} characters or fewer.`);
  return result;
}
function optionalText(value, max, field) {
  if (value === undefined || value === null || value === "") return "";
  return text(value, max, field);
}
function email(value, field = "Email") {
  const result = text(value, 254, field, { required: true }).toLowerCase();
  if (!EMAIL_RE.test(result)) throw new Error(`${field} must be a valid email address.`);
  return result;
}
function url(value, field) {
  const result = optionalText(value, 500, field);
  if (!result) return null;
  let parsed;
  try { parsed = new URL(result); } catch { throw new Error(`${field} must be a valid URL.`); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error(`${field} must start with http:// or https://.`);
  return parsed.href;
}
function slug(value) {
  const result = text(value, 50, "Portfolio URL slug", { required: true }).toLowerCase();
  if (!SLUG_RE.test(result)) throw new Error("Slug must use lowercase letters, numbers, and single hyphens only.");
  return result;
}
function boolean(value, field) {
  if (typeof value !== "boolean") throw new Error(`${field} must be true or false.`);
  return value;
}
function stringArray(value, field, maxItems = 12, maxLength = 50) {
  if (value === undefined || value === null || value === "") return [];
  const input = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : null;
  if (!input) throw new Error(`${field} must be a list.`);
  const result = [...new Set(input.map(item => {
    if (typeof item !== "string") throw new Error(`${field} items must be text.`);
    return item.trim();
  }).filter(Boolean))];
  if (result.length > maxItems) throw new Error(`${field} can contain at most ${maxItems} items.`);
  if (result.some(item => item.length > maxLength)) throw new Error(`Each ${field} item must be ${maxLength} characters or fewer.`);
  return result;
}
module.exports = { text, optionalText, email, url, slug, boolean, stringArray };
