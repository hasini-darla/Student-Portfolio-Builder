# STUDENT PORTFOLIO BUILDER

A beginner-friendly full-stack web application that helps students create a professional online portfolio. Students can manage a profile, add skills and projects, and publish a shareable public page.

## 1. Problem and objectives

Students often need one place to present their skills and academic work to peers, clubs, internship coordinators, and recruiters. This application lets a student maintain that information and share it using one URL.

Objectives:
- Build a responsive interface using HTML, CSS, and Vanilla JavaScript.
- Learn REST APIs with Node.js and Express.
- Store application data persistently in Supabase PostgreSQL.
- Implement password hashing, token authentication, validation, and ownership checks.
- Publish a read-only public portfolio without exposing private account data.

## 2. Users and features

- **Student account:** register and log in, update profile and publication setting, manage up to 30 projects, add/remove skills, and copy a public URL.
- **Public visitor:** view only published portfolios without logging in.
- No administrator role is needed for this MVP.

Implemented: profile editor, unique portfolio slug, optional LinkedIn/contact email, project create/edit/delete, skill add/remove, published public portfolio, validation, database persistence, rate-limited authentication endpoints, health check, and responsive layout.

Not included: password reset, email verification, image uploads, resume PDF generation, analytics, social login, admin dashboard, and deployment automation.

## 3. Technology stack

- HTML5, CSS3, Vanilla JavaScript
- Node.js (20 or later) and Express.js
- Supabase PostgreSQL
- npm packages: `@supabase/supabase-js` (database client), `bcryptjs` (password hashing), `jsonwebtoken` (signed access tokens), `dotenv` (environment variables), `helmet` (security headers), `express-rate-limit` (authentication rate limit), `express` (HTTP server).

No frontend framework or paid API is required. A Supabase project is required; use its free plan if available in your region and account.

## 4. Folder structure

```text
student-portfolio-builder/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── routes/
│   │   ├── auth.js
│   │   ├── me.js
│   │   ├── projects.js
│   │   ├── skills.js
│   │   └── public.js
│   ├── middleware/
│   │   └── auth.js
│   ├── utils/
│   │   └── validation.js
│   ├── server.js
│   ├── supabase.js
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   └── .gitignore
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

`backend/package-lock.json` is created by `npm install` and should be committed for reproducible installs.

## 5. Prerequisites

Install:
- [Visual Studio Code](https://code.visualstudio.com/)
- [Node.js LTS](https://nodejs.org/) (includes npm)
- [Git](https://git-scm.com/downloads)
- A [Supabase account](https://supabase.com/)

Verify in a new VS Code terminal:
```bash
node --version
npm --version
git --version
```
Node should be version 20 or later.

## 6. Supabase setup

1. Sign in at https://supabase.com/ and create a new project.
2. Choose a project name, strong database password, and region. Save the database password privately; this app does not need it directly.
3. Wait until the project is ready.
4. Open **SQL Editor** in the Supabase dashboard.
5. Open `database/schema.sql` in VS Code, copy the entire file, paste it into a new SQL Editor query, and run it.
6. Verify the tables exist by opening **Table Editor**. You should see `app_users`, `profiles`, `projects`, and `skills`.
7. To check row-level security, run:
```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('app_users','profiles','projects','skills');
```
Each table should have `rowsecurity = true`.

### Supabase credentials

In the Supabase dashboard, open **Project Settings → API** (the labels may change). Copy:
- Project URL into `SUPABASE_URL`.
- The server-side `service_role` key into `SUPABASE_SERVICE_ROLE_KEY`.

Use only the server-side key in `backend/.env`. Never paste it into frontend code, screenshots, GitHub, or public documentation. If your dashboard shows newer publishable/secret keys, use the server-side secret with service-role-equivalent access and keep it private. The project URL and keys are specific to your project; example values do not connect to a database.

## 7. Environment configuration

From the project root, create `backend/.env` by copying `backend/.env.example`. Fill in your actual Supabase URL and server-side key. Generate a JWT secret in a terminal:
```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```
Paste the generated value into `JWT_SECRET`. Keep `NODE_ENV=development` for local learning and `PORT=3000`.

- `.env` contains your private, real local values and is ignored by Git.
- `.env.example` documents the required variable names with placeholders and is committed.
- `JWT_SECRET` signs login tokens. Changing it logs out existing token holders.
- `JWT_EXPIRES_IN=2h` means a token expires after two hours.

## 8. Install and run

Open the project folder in VS Code. Open **Terminal → New Terminal**.

From the root folder:
```bash
cd backend
npm install
```
This installs the dependencies and creates `backend/package-lock.json`.

Create `backend/.env` as explained above, then start the API:
```bash
npm run dev
```
Expected terminal output:
```text
Student Portfolio Builder running at http://localhost:3000
```
Keep this terminal running. Open http://localhost:3000 in your browser. The frontend is served by Express; do not open `index.html` as a `file://` URL.

Check the health endpoint at http://localhost:3000/api/health. Expected JSON:
```json
{"status":"ok","service":"student-portfolio-builder-api"}
```

To run without automatic restart, use `npm start`. To stop the server, press `Ctrl+C`.

## 9. Architecture and authentication

Browser JavaScript calls the same-origin `/api/...` endpoints using `fetch()`. Express validates request data, verifies JWT bearer tokens for private endpoints, checks record ownership, and uses the Supabase client to read/write PostgreSQL. Supabase is the persistent database; browser memory is not the source of truth.

Registration hashes passwords with bcrypt before storage. Passwords are never returned by the API. Login returns a signed JWT, stored in `sessionStorage` for this learning MVP and sent as an `Authorization: Bearer ...` header. Tokens are cleared when logging out and expire after the configured duration. `sessionStorage` is more limited than persistent local storage but remains accessible to JavaScript; a production deployment should consider secure HttpOnly cookies, CSRF defenses, email verification, and password recovery.

RLS is enabled on every table and denies direct `anon`/`authenticated` browser-role access. The server's service-role key bypasses RLS, so **the Express authorization and ownership checks are essential**. Never expose that key to the browser. This is an educational MVP, not a fully audited production identity system.

## 10. API reference

All successful API responses are JSON. Private endpoints require `Authorization: Bearer <token>`.

| Method | Path | Purpose / body | Access | Typical responses |
|---|---|---|---|---|
| GET | `/api/health` | Health check | Public | `200` |
| POST | `/api/auth/register` | `{ "name", "email", "password" }` | Public; rate limited | `201`, `400`, `409` |
| POST | `/api/auth/login` | `{ "email", "password" }` | Public; rate limited | `200`, `400`, `401` |
| GET | `/api/me` | Get own user, profile, projects, skills | Authenticated | `200`, `401` |
| PUT | `/api/me/profile` | Profile fields: `full_name`, `slug`, `headline`, `bio`, `education`, `contact_email`, `linkedin_url`, `is_published` | Authenticated; own profile only | `200`, `400`, `409`, `401` |
| POST | `/api/projects` | `{ "title", "description", "technologies": ["HTML"], "project_url", "repository_url", "is_featured" }` | Authenticated; own projects | `201`, `400`, `401` |
| PUT | `/api/projects/:id` | Same fields as create | Authenticated; own project only | `200`, `400`, `404`, `401` |
| DELETE | `/api/projects/:id` | Delete own project | Authenticated; own project only | `200`, `404`, `401` |
| POST | `/api/skills` | `{ "name", "category" }`; category is `Technical`, `Soft skill`, `Tools`, or `Languages` | Authenticated; own skills | `201`, `400`, `409`, `401` |
| DELETE | `/api/skills/:id` | Delete own skill | Authenticated; own skill only | `200`, `404`, `401` |
| GET | `/api/public/:slug` | Public profile, skills, and projects for published slug | Public; published profiles only | `200`, `404` |

Validation failures return a JSON `error` message. `401` means the token is absent, invalid, or expired; `404` means the requested owned record or published portfolio was not found; `409` indicates a duplicate email, slug, or skill. Unhandled database/server errors return a generic `500` response; details are logged in the server terminal.

## 11. Try the application

1. Click **Get started** and register with a name, email, and password of at least 8 characters.
2. In **Profile**, update your headline, education, about text, slug, and optional public contact fields.
3. Tick **Publish my portfolio** and click **Save profile**.
4. Open **Projects**, add a project with a title and description, and optionally add technology names separated by commas and valid `https://` links.
5. Open **Skills**, add skills in a category. Duplicate skills are rejected.
6. Use **Copy public link** or **View portfolio**. Open the link in a private/incognito window to verify the public view works without a login.
7. Log out, log back in, and confirm saved data remains because it is stored in PostgreSQL.

Use invented demo content during presentations. Do not put private phone numbers, personal addresses, or sensitive information into a public profile.

## 12. Testing checklist

- [ ] `GET /api/health` returns status `ok`.
- [ ] Register a new account; it enters the dashboard.
- [ ] Register the same email again; API returns `409`.
- [ ] Submit a short password; registration returns `400`.
- [ ] Log in with the correct password; token is issued.
- [ ] Log in with the wrong password; response is `401`.
- [ ] Save profile fields and refresh; values persist.
- [ ] Try a slug already owned by another profile; response is `409`.
- [ ] Publish profile and open public URL in a logged-out/incognito window.
- [ ] Unpublish profile and verify public endpoint returns `404`.
- [ ] Add, edit, and delete a project; verify list updates and refresh persistence.
- [ ] Try a project with missing title/description; response is `400`.
- [ ] Try a `javascript:` project URL; it is rejected.
- [ ] Add a skill, add the same skill again, then remove it; duplicate returns `409`.
- [ ] Call a private endpoint without a token; response is `401`.
- [ ] Attempt to edit/delete another user's project or skill ID; response is `404`, not another user's data.
- [ ] Use a mobile-width browser; navigation and forms remain usable.
- [ ] Stop the backend and reload; a clear server-connection error appears.
- [ ] Restart the backend; saved data remains.

There are no automated integration tests in this MVP. These are manual API/browser tests. Database connectivity is confirmed only when the student runs the application against their own Supabase project.

## 13. Troubleshooting

**`SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set`**  
Make sure the file is named `backend/.env`, not `.env.txt`, and that it contains the exact variable names shown in `.env.example`. Restart the server after editing it.

**`JWT_SECRET must be set and contain at least 32 bytes`**  
Generate a secret with the Node command in Section 7 and place it in `backend/.env`.

**`Invalid API key`, `permission denied`, or database errors**  
Confirm the Supabase URL/key belong to the same project, the SQL schema ran successfully, and the server-side service-role/secret key is copied correctly. Never solve this by putting the key in browser code.

**`EADDRINUSE: address already in use`**  
Another process is using port 3000. Stop the other server or set `PORT=3001` in `backend/.env` and open `http://localhost:3001`.

**`Cannot reach the server`**  
Check that `npm run dev` is still running and use the same port printed in the terminal.

**Slug conflict**  
Portfolio slugs are unique. Choose a different lowercase slug using letters, numbers, and hyphens.

**Frontend appears unstyled or API calls fail**  
Open the application through `http://localhost:3000`, not by double-clicking the HTML file. Check the browser developer console and backend terminal for errors.

**Database tables missing**  
Run the complete `database/schema.sql` in the correct Supabase project's SQL Editor, then verify tables in Table Editor.

## 14. Security notes

- Never commit `.env`, database passwords, JWT secrets, service-role/secret keys, or real student data.
- The server-side key bypasses RLS. Keep it in `backend/.env` and preserve backend ownership checks.
- Passwords are bcrypt-hashed; login endpoints are rate limited.
- The frontend uses `textContent` or HTML-escapes user values before rendering.
- Public portfolio content is intentionally visible to anyone with the URL when published. Unpublish it if you do not want it public.
- Before public deployment, add HTTPS, email verification, password reset, robust monitoring, automated tests, a reviewed token/cookie strategy, and production hosting configuration.

## 15. GitHub upload

Create a new empty repository on https://github.com/ and copy its HTTPS URL. From the **project root** (not `backend/`), run:
```bash
git init
git status
git add .
git status
git commit -m "Build project"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```
Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual repository URL. Before `git add .`, inspect `.gitignore` and ensure real `.env` files and `node_modules/` are excluded. The example file `.env.example` should be included.

If Git reports that `origin` already exists, run `git remote -v` and update it with `git remote set-url origin YOUR_GITHUB_REPOSITORY_URL`. If Git asks you to configure identity, use `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`.

Verify the repository on GitHub contains source code, `database/schema.sql`, `.env.example`, and `README.md`, but no real secrets. **`.gitignore` does not remove a secret already committed.** If a secret was exposed, rotate it immediately in Supabase and clean repository history as appropriate.

## 16. Future improvements

Possible next steps: email verification and password recovery, HttpOnly cookie authentication, profile picture uploads using controlled storage, downloadable résumé, project categories, portfolio themes, automated tests, and deployment to a secure HTTPS host.

## License

Use this educational project for learning and college demonstrations. Review and adapt security controls before production use.
