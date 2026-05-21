var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  app: () => app
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_cookie_parser = __toESM(require("cookie-parser"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_config = require("dotenv/config");
var import_firebase_admin = __toESM(require("firebase-admin"), 1);
var import_auth = require("firebase-admin/auth");
var import_nodemailer = __toESM(require("nodemailer"), 1);
if (!import_firebase_admin.default.apps.length) {
  const firebaseConfigPath = import_path.default.join(process.cwd(), "firebase-applet-config.json");
  let projectId = "celtic-biplane-j8gvj";
  try {
    const config = JSON.parse(import_fs.default.readFileSync(firebaseConfigPath, "utf8"));
    projectId = config.projectId;
  } catch (e) {
    console.warn("Could not read project ID from firebase-applet-config.json, using default");
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      import_firebase_admin.default.initializeApp({
        credential: import_firebase_admin.default.credential.cert(serviceAccount),
        projectId
      });
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT, trying default credentials", e);
      import_firebase_admin.default.initializeApp({ projectId });
    }
  } else {
    try {
      import_firebase_admin.default.initializeApp({ projectId });
    } catch (e) {
      console.warn("Failed to initialize firebase-admin with default credentials", e);
    }
  }
}
function getFirebaseAuth() {
  try {
    return (0, import_auth.getAuth)();
  } catch (e) {
    console.error("Firebase auth not initialized.", e);
    return null;
  }
}
var app = (0, import_express.default)();
var PORT = process.env.PORT || 3e3;
app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});
app.use(import_express.default.json());
app.use(import_express.default.urlencoded({ extended: true }));
app.use((0, import_cookie_parser.default)());
var accessConfigStr = (process.env.ACCESS_CONFIG || "").trim();
var accessConfig = {};
if (accessConfigStr) {
  if (accessConfigStr.startsWith("{")) {
    try {
      accessConfig = JSON.parse(accessConfigStr);
      const normalizedConfig = {};
      for (const key in accessConfig) {
        normalizedConfig[key.toLowerCase().trim()] = accessConfig[key];
      }
      accessConfig = normalizedConfig;
    } catch (e) {
      console.warn("ACCESS_CONFIG starts with { but failed to parse as JSON.");
    }
  } else {
    const emails = accessConfigStr.split(",").map((e) => e.trim().toLowerCase()).filter((e) => e);
    emails.forEach((email) => {
      accessConfig[email] = { "rootPerson": "1", "hiddenProfiles": [] };
    });
  }
}
var devEmails = ["www.johnsel771994@gmail.com", "johnsel771994@gmail.com"];
devEmails.forEach((email) => {
  if (!accessConfig[email]) {
    accessConfig[email] = { "rootPerson": "1", "hiddenProfiles": [] };
  }
});
var authMiddleware = async (req, res, next) => {
  const normalizedPath = req.path.replace(/\/$/, "");
  if (normalizedPath === "/login" || normalizedPath === "/auth-verify" || normalizedPath === "/robots.txt" || normalizedPath === "/api/firebase-config" || normalizedPath === "/sw.js" || normalizedPath.startsWith("/assets") || normalizedPath.startsWith("/css") || normalizedPath.startsWith("/scripts") || normalizedPath.startsWith("/node_modules") || normalizedPath.startsWith("/@")) {
    return next();
  }
  const email = req.cookies.auth_email ? req.cookies.auth_email.toLowerCase().trim() : null;
  if (!email || !accessConfig[email]) {
    if (req.path.startsWith("/api/") || req.path.startsWith("/data/") || req.path.startsWith("/assets/")) {
      console.log(`[Auth] Blocked API/Asset access to ${req.path} - No valid email or not in accessConfig`);
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!req.path.startsWith("/login")) {
      return res.redirect("/login");
    }
  }
  req.userConfig = accessConfig[email];
  next();
};
app.post("/auth-verify", async (req, res) => {
  const { token: idToken } = req.body;
  console.log("[Auth] Login attempt with ID token");
  try {
    const authInstance = getFirebaseAuth();
    if (!authInstance) {
      return res.status(500).json({ error: "\u0412\u043D\u0443\u0442\u0440\u0456\u0448\u043D\u044F \u043F\u043E\u043C\u0438\u043B\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 (Firebase \u043D\u0435 \u0456\u043D\u0456\u0446\u0456\u0430\u043B\u0456\u0437\u043E\u0432\u0430\u043D\u043E)." });
    }
    const decodedToken = await authInstance.verifyIdToken(idToken);
    const email = decodedToken.email ? decodedToken.email.toLowerCase().trim() : "";
    console.log(`[Auth] Token verified for email: ${email}`);
    if (email && accessConfig[email]) {
      console.log(`[Auth] Access granted for ${email}`);
      res.cookie("auth_email", email, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1e3,
        secure: true,
        sameSite: "strict"
      });
      res.json({ success: true });
    } else {
      console.warn(`[Auth] Access denied for ${email}. Not in accessConfig keys:`, Object.keys(accessConfig));
      res.status(401).json({ error: `\u0412\u0430\u0448\u0430 \u043F\u043E\u0448\u0442\u0430 (${email}) \u043D\u0435 \u043C\u0430\u0454 \u0434\u043E\u0441\u0442\u0443\u043F\u0443. \u0417\u0432\u0435\u0440\u043D\u0456\u0442\u044C\u0441\u044F \u0434\u043E \u0430\u0434\u043C\u0456\u043D\u0456\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430.` });
    }
  } catch (error) {
    console.error("[Auth] Error verifying ID token:", error);
    res.status(401).json({ error: "\u041D\u0435\u0432\u0430\u043B\u0456\u0434\u043D\u0438\u0439 \u0442\u043E\u043A\u0435\u043D \u0430\u0431\u043E \u043F\u043E\u043C\u0438\u043B\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0456\u0457" });
  }
});
app.post("/api/logout", (req, res) => {
  res.clearCookie("auth_email");
  res.json({ success: true });
});
app.get("/api/config", authMiddleware, (req, res) => {
  res.json(req.userConfig);
});
app.post("/api/invite", authMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    console.log(`[Invite] Request to invite: ${email}`);
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("[Invite] SMTP environment variables missing. Only simulating email send.");
      return res.json({ success: true, mock: true, message: "\u041B\u0438\u0441\u0442 \u0456\u043C\u0456\u0442\u043E\u0432\u0430\u043D\u043E. \u0414\u043B\u044F \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u0457 \u0432\u0456\u0434\u043F\u0440\u0430\u0432\u043A\u0438 \u0434\u043E\u0434\u0430\u0439\u0442\u0435 SMTP \u043D\u0430\u043B\u0430\u0448\u0442\u0443\u0432\u0430\u043D\u043D\u044F." });
    }
    const transporter = import_nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;
    if (!accessConfig[email.toLowerCase().trim()]) {
      accessConfig[email.toLowerCase().trim()] = { "rootPerson": "1", "hiddenProfiles": [] };
      console.log(`[Invite] Added ${email} to accessConfig dynamically.`);
    }
    await transporter.sendMail({
      from: `"\u0410\u0440\u0445\u0456\u0432 \u0413\u0435\u043D\u0435\u0430\u043B\u043E\u0433\u0456\u0457" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: "\u0417\u0430\u043F\u0440\u043E\u0448\u0435\u043D\u043D\u044F \u0434\u043E \u0440\u043E\u0434\u0438\u043D\u043D\u043E\u0433\u043E \u0430\u0440\u0445\u0456\u0432\u0443",
      html: `
          <h3>\u0412\u0456\u0442\u0430\u0454\u043C\u043E!</h3>
          <p>\u0412\u0430\u0441 \u0437\u0430\u043F\u0440\u043E\u0448\u0435\u043D\u043E \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u043D\u0443\u0442\u0438 \u0440\u043E\u0434\u0438\u043D\u043D\u0438\u0439 \u0430\u0440\u0445\u0456\u0432.</p>
          <p>\u041F\u0435\u0440\u0435\u0439\u0434\u0456\u0442\u044C \u0437\u0430 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F\u043C, \u0449\u043E\u0431 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0443\u0432\u0430\u0442\u0438\u0441\u044F:</p>
          <a href="${appUrl}" style="display:inline-block;padding:10px 20px;background:#007BFF;color:#fff;text-decoration:none;border-radius:5px;">\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0430\u0440\u0445\u0456\u0432</a>
          <br><br>
          <p><small>\u0410\u0431\u043E \u0441\u043A\u043E\u043F\u0456\u044E\u0439\u0442\u0435 \u0446\u0435 \u043F\u043E\u0441\u0438\u043B\u0430\u043D\u043D\u044F: ${appUrl}</small></p>
        `
    });
    res.json({ success: true });
  } catch (e) {
    console.error("[Invite] Failed to send email:", e);
    res.status(500).json({ error: `Failed to send email: ${e.message || String(e)}` });
  }
});
app.post("/api/sync-data", authMiddleware, async (req, res) => {
  console.log("[Data Sync] Triggered via UI by:", req.cookies.auth_email);
  const { exec } = await import("child_process");
  exec("node scripts/build/sync-data.js && node scripts/build/generate-kinship.js", (err, stdout, stderr) => {
    if (err) {
      console.error("Sync error:", err);
      return res.status(500).json({ error: "Sync failed", details: stderr });
    }
    console.log("[Data Sync] Completed successfully");
    res.json({ success: true, message: "Data synced successfully", log: stdout });
  });
});
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nDisallow: /");
});
app.get("/login", (req, res) => {
  let firebaseClientConfig = {};
  try {
    firebaseClientConfig = JSON.parse(import_fs.default.readFileSync(import_path.default.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
  } catch (e) {
    console.error("Could not read firebase-applet-config.json", e);
  }
  return res.send(`
      <!DOCTYPE html>
      <html lang="uk">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>\u0412\u0445\u0456\u0434 \u2014 \u0410\u0440\u0445\u0456\u0432 \u0413\u0435\u043D\u0435\u0430\u043B\u043E\u0433\u0456\u0457</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #1e293b; }
          .login-box { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
          h2 { margin-top: 0; margin-bottom: 0.5rem; font-size: 1.5rem; font-weight: 700; }
          p { color: #64748b; margin-bottom: 2rem; font-size: 0.95rem; line-height: 1.5; }
          button { width: 100%; padding: 0.875rem; background: white; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 12px; }
          button:hover { background: #f1f5f9; border-color: #cbd5e1; }
          .error { color: #dc2626; font-size: 0.875rem; margin-top: 1rem; display: none; background: #fef2f2; padding: 0.5rem; border-radius: 4px; word-break: break-word; }
          .google-icon { width: 20px; height: 20px; }
          .new-tab-btn { margin-top: 1rem; color: #3b82f6; text-decoration: none; font-size: 0.875rem; display: none; align-items: center; justify-content: center; gap: 4px; font-weight: 500; }
          .new-tab-btn:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="login-box">
          <h2>\u0410\u0440\u0445\u0456\u0432 \u0413\u0435\u043D\u0435\u0430\u043B\u043E\u0433\u0456\u0457</h2>
          <p>\u0426\u0435\u0439 \u0441\u0430\u0439\u0442 \u0454 \u043F\u0440\u0438\u0432\u0430\u0442\u043D\u0438\u043C. \u0414\u043B\u044F \u043F\u0435\u0440\u0435\u0433\u043B\u044F\u0434\u0443 \u0433\u0456\u043B\u043E\u043A \u0440\u043E\u0434\u043E\u0432\u043E\u0433\u043E \u0434\u0435\u0440\u0435\u0432\u0430 \u0443\u0432\u0456\u0439\u0434\u0456\u0442\u044C \u0447\u0435\u0440\u0435\u0437 \u0441\u0432\u0456\u0439 Google-\u0430\u043A\u0430\u0443\u043D\u0442.</p>
          
          <button id="googleLoginBtn">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" class="google-icon">
            \u0423\u0432\u0456\u0439\u0442\u0438 \u0447\u0435\u0440\u0435\u0437 Google
          </button>
          <a href="#" target="_blank" class="new-tab-btn" id="newTabBtn" aria-label="\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0432 \u043D\u043E\u0432\u0456\u0439 \u0432\u043A\u043B\u0430\u0434\u0446\u0456">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            \u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0434\u043E\u0434\u0430\u0442\u043E\u043A \u0443 \u043D\u043E\u0432\u0456\u0439 \u0432\u043A\u043B\u0430\u0434\u0446\u0456
          </a>
          <div id="error" class="error">\u0412\u0430\u0448\u0430 \u043F\u043E\u0448\u0442\u0430 \u043D\u0435 \u043C\u0430\u0454 \u0434\u043E\u0441\u0442\u0443\u043F\u0443 \u0434\u043E \u0446\u0456\u0454\u0457 \u0432\u0435\u0440\u0441\u0456\u0457 \u0441\u0430\u0439\u0442\u0443.</div>
        </div>

        <script type="module">
          // Check if app is running in an iframe
          if (window !== window.parent) {
            const newTabBtn = document.getElementById('newTabBtn');
            newTabBtn.href = window.location.href;
            newTabBtn.style.display = 'flex';
          }

          import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
          import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

          const firebaseConfig = ${JSON.stringify(firebaseClientConfig)};
          const app = initializeApp(firebaseConfig);
          const auth = getAuth(app);
          const provider = new GoogleAuthProvider();

          document.getElementById('googleLoginBtn').addEventListener('click', async () => {
            const errorDiv = document.getElementById('error');
            errorDiv.style.display = 'none';
            try {
              const result = await signInWithPopup(auth, provider);
              const idToken = await result.user.getIdToken();
              
              const res = await fetch('/auth-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: idToken })
              });

              const contentType = res.headers.get("content-type");
              if (res.ok) {
                window.location.href = '/';
              } else if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await res.json();
                errorDiv.textContent = data.error || '\u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u0431\u043E\u0440\u043E\u043D\u0435\u043D\u043E';
                errorDiv.style.display = 'block';
              } else {
                const text = await res.text();
                console.error("Non-JSON response:", text);
                errorDiv.textContent = 'Server err: ' + text.substring(0, 150);
                errorDiv.style.display = 'block';
              }
            } catch (error) {
              console.error("Auth error:", error);
              const errorText = error.code === 'auth/network-request-failed' 
                ? '\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u043C\u0435\u0440\u0435\u0436\u0456/cookies. \u0412\u0456\u0434\u043A\u0440\u0438\u0439\u0442\u0435 \u0434\u043E\u0434\u0430\u0442\u043E\u043A \u0443 \u043D\u043E\u0432\u0456\u0439 \u0432\u043A\u043B\u0430\u0434\u0446\u0456 (\u0456\u043A\u043E\u043D\u043A\u0430 \u0432\u0433\u043E\u0440\u0456 \u043F\u0440\u0430\u0432\u043E\u0440\u0443\u0447), \u0430\u0431\u043E \u0434\u043E\u0437\u0432\u043E\u043B\u044C\u0442\u0435 \u0441\u0442\u043E\u0440\u043E\u043D\u043D\u0456 cookie.' 
                : '\u041F\u043E\u043C\u0438\u043B\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0456\u0457: ' + error.message;
              errorDiv.textContent = errorText;
              errorDiv.style.display = 'block';
            }
          });
        </script>
      </body>
      </html>
    `);
});
app.use(authMiddleware);
var rootDataPath = import_path.default.join(process.cwd(), "data");
app.use("/data", import_express.default.static(rootDataPath));
var rootScriptsPath = import_path.default.join(process.cwd(), "scripts");
app.use("/scripts", import_express.default.static(rootScriptsPath));
var rootCssPath = import_path.default.join(process.cwd(), "css");
app.use("/css", import_express.default.static(rootCssPath));
var rootAssetsPath = import_path.default.join(process.cwd(), "assets");
app.use("/assets", import_express.default.static(rootAssetsPath));
app.get("/sw.js", (req, res) => res.sendFile(import_path.default.join(process.cwd(), "sw.js")));
app.get("/api/debug-csv", async (req, res) => {
  try {
    const csv = import_fs.default.readFileSync("data/db/uk/basic.csv", "utf8");
    const Papa = await import("papaparse");
    const parseConfig = { header: true, skipEmptyLines: true };
    const parsed = Papa.parse(csv, parseConfig);
    res.json(parsed.data[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
if (process.env.NODE_ENV !== "production") {
  (async () => {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use((err, req, res, next) => {
      console.error("Express Error:", err);
      res.status(500).json({ error: "Express Error", message: err.message });
    });
    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  })();
} else {
  const distPath = import_path.default.join(process.cwd(), "dist");
  app.use(import_express.default.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(import_path.default.join(distPath, "index.html"));
  });
  app.use((err, req, res, next) => {
    console.error("Express Error:", err);
    res.status(500).json({ error: "Express Error", message: err.message });
  });
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app
});
