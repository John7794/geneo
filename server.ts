import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import fs from "fs";
import "dotenv/config";
import nodemailer from "nodemailer";

export const app = express();
const PORT = process.env.PORT || 3000;

// Prevent indexing
app.use((req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

  // Define access rules
  const CONFIG_FILE_PATH = path.join(process.cwd(), 'data', 'access-config.json');

  function loadAccessConfig() {
    let config: Record<string, any> = {};

    // 1. First, try reading from the JSON file
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      try {
        const data = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
        config = JSON.parse(data);
        console.log("[AccessConfig] Loaded config from JSON file success");
      } catch (e) {
        console.error("[AccessConfig] Error reading access-config.json, falling back", e);
      }
    }

    // If config is still empty, load from environment variable
    if (Object.keys(config).length === 0) {
      const accessConfigStr = (process.env.ACCESS_CONFIG || "").trim();
      if (accessConfigStr) {
        if (accessConfigStr.startsWith("{")) {
          try {
            config = JSON.parse(accessConfigStr);
          } catch (e) {
            console.warn("[AccessConfig] ACCESS_CONFIG starts with { but failed to parse as JSON.");
          }
        } else {
          const emails = accessConfigStr.split(',').map((e: string) => e.trim().toLowerCase()).filter((e: string) => e);
          emails.forEach((email: string) => {
            config[email] = { "rootPerson": "1", "hiddenProfiles": [] };
          });
        }
      }
    }

    // Lowercase/normalize keys
    const normalizedConfig: Record<string, any> = {};
    for (const key in config) {
      normalizedConfig[key.toLowerCase().trim()] = config[key];
    }

    // Always ensure dev/owner emails are allowed
    const devEmails = ["www.johnsel771994@gmail.com", "johnsel771994@gmail.com"];
    devEmails.forEach(email => {
      const cleanEmail = email.toLowerCase().trim();
      if (!normalizedConfig[cleanEmail]) {
        normalizedConfig[cleanEmail] = { "rootPerson": "1", "hiddenProfiles": [] };
      }
    });

    return normalizedConfig;
  }

  function saveAccessConfig(config: Record<string, any>) {
    try {
      const dir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf8');
      console.log("[AccessConfig] Saved configuration to access-config.json");
    } catch (e) {
      console.error("[AccessConfig] Failed to save configuration to file:", e);
    }
  }

  let accessConfig = loadAccessConfig();

  // Auth Middleware
  const authMiddleware = async (req: any, res: any, next: any) => {
    const normalizedPath = req.path.replace(/\/$/, ""); // Remove trailing slash
    
    // Allow public access to assets, scripts, css, and sw.js
    if (normalizedPath === "/login" || 
        normalizedPath === "/auth-verify" || 
        normalizedPath === "/robots.txt" ||
        normalizedPath === "/api/firebase-config" || 
        normalizedPath === "/sw.js" ||
        normalizedPath.startsWith("/assets") ||
        normalizedPath.startsWith("/css") ||
        normalizedPath.startsWith("/scripts") ||
        normalizedPath.startsWith("/node_modules") ||
        normalizedPath.startsWith("/@")) {
      return next();
    }

    const email = req.cookies.auth_email ? req.cookies.auth_email.toLowerCase().trim() : null;
    if (!email || !accessConfig[email]) {
      if (req.path.startsWith('/api/') || req.path.startsWith('/data/') || req.path.startsWith('/assets/')) {
         console.log(`[Auth] Blocked API/Asset access to ${req.path} - No valid email or not in accessConfig`);
         return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Redirect to login for page loads built statically
      if (!req.path.startsWith('/login')) {
         return res.redirect('/login');
      }
    }
    
    req.userConfig = accessConfig[email];
    next();
  };

  app.post('/auth-verify', async (req, res) => {
    const { email: emailRaw } = req.body;
    console.log("[Auth] Login attempt with email");
    try {
      const email = emailRaw ? emailRaw.toLowerCase().trim() : "";

      if (email && accessConfig[email]) {
        console.log(`[Auth] Access granted for ${email}`);
        res.cookie('auth_email', email, { 
          httpOnly: true, 
          maxAge: 30 * 24 * 60 * 60 * 1000, 
          secure: true, 
          sameSite: 'strict' 
        });
        res.json({ success: true });
      } else {
        console.warn(`[Auth] Access denied for ${email}. Not in accessConfig keys:`, Object.keys(accessConfig));
        res.status(401).json({ error: `Ваша пошта (${email}) не має доступу. Зверніться до адміністратора.` });
      }
    } catch (error) {
      console.error("[Auth] Error verifying:", error);
      res.status(401).json({ error: "Помилка сервера авторизації" });
    }
  });

  app.post('/api/logout', (req, res) => {
    res.clearCookie('auth_email');
    res.json({ success: true });
  });

  app.get('/api/config', authMiddleware, (req, res) => {
    res.json((req as any).userConfig);
  });

  app.post('/api/invite', authMiddleware, async (req, res) => {
    try {
      const { email, hiddenProfiles } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const cleanEmail = email.toLowerCase().trim();
      console.log(`[Invite] Request to invite: ${cleanEmail} with ${hiddenProfiles?.length || 0} hidden profiles.`);

      // Update in-memory config and persist to json file
      accessConfig[cleanEmail] = { 
        "rootPerson": "1", 
        "hiddenProfiles": hiddenProfiles || [] 
      };
      saveAccessConfig(accessConfig);

      // Optional: Check if SMTP config exists, if not just log
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("[Invite] SMTP environment variables missing. Only simulating email send.");
        return res.json({ success: true, mock: true, message: "Лист імітовано. Для реальної відправки додайте SMTP налаштування." });
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const appUrl = process.env.APP_URL || `${protocol}://${host}`;

      await transporter.sendMail({
        from: `"Архів Генеалогії" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: cleanEmail,
        subject: "Запрошення до родинного архіву",
        html: `
          <h3>Вітаємо!</h3>
          <p>Вас запрошено переглянути родинний архів.</p>
          <p>Перейдіть за посиланням, щоб авторизуватися:</p>
          <a href="${appUrl}" style="display:inline-block;padding:10px 20px;background:#007BFF;color:#fff;text-decoration:none;border-radius:5px;">Відкрити архів</a>
          <br><br>
          <p><small>Або скопіюйте це посилання: ${appUrl}</small></p>
        `,
      });

      res.json({ success: true });
    } catch (e: any) {
      console.error("[Invite] Failed to send email:", e);
      res.status(500).json({ error: `Failed to send email: ${e.message || String(e)}` });
    }
  });

  app.post('/api/sync-data', authMiddleware, async (req, res) => {
    console.log("[Data Sync] Triggered via UI by:", req.cookies.auth_email);
    try {
      const syncModule = await import('./scripts/build/sync-data.js');
      const kinshipModule = await import('./scripts/build/generate-kinship.js');
      
      await syncModule.main();
      await kinshipModule.main();
      
      console.log("[Data Sync] Completed successfully");
      res.json({ success: true, message: 'Data synced successfully', log: 'Sync completed.' });
    } catch (err: any) {
      console.error("Sync error:", err);
      // Fallback for Read-Only environments like Vercel
      if (err.code === 'EROFS') {
        console.warn("[Data Sync] Read-only filesystem detected. Note: generated data cannot be saved to disk.");
        // Still return success so the frontend knows to proceed and reload
        return res.json({ success: true, message: 'Data synced successfully (read-only mode)', log: 'Sync completed memory-only.' });
      }
      return res.status(500).json({ error: 'Sync failed', details: err.message || String(err) });
    }
  });

  // Apply auth middleware to all other routes
  app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.send('User-agent: *\nDisallow: /');
  });

  app.get('/login', (req, res) => {
    return res.send(`
      <!DOCTYPE html>
      <html lang="uk">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Вхід — Архів Генеалогії</title>
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
          <h2>Архів Генеалогії</h2>
          <p>Цей сайт є приватним. Для перегляду гілок родового дерева увійдіть через свій Google-акаунт.</p>
          
          <input type="email" id="emailInput" placeholder="Введіть ваш email" style="width: 100%; padding: 0.875rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 1rem; margin-bottom: 1rem; box-sizing: border-box;">
          <button id="loginBtn">
            Увійти
          </button>
          <div id="error" class="error">Ваша пошта не має доступу до цієї версії сайту.</div>
        </div>

        <script>
          document.getElementById('loginBtn').addEventListener('click', async () => {
            const errorDiv = document.getElementById('error');
            const email = document.getElementById('emailInput').value;
            errorDiv.style.display = 'none';
            
            if (!email) {
              errorDiv.textContent = 'Будь ласка, введіть email';
              errorDiv.style.display = 'block';
              return;
            }

            try {
              const res = await fetch('/auth-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
              });

              const contentType = res.headers.get("content-type");
              if (res.ok) {
                window.location.href = '/';
              } else if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await res.json();
                errorDiv.textContent = data.error || 'Доступ заборонено';
                errorDiv.style.display = 'block';
              } else {
                const text = await res.text();
                console.error("Non-JSON response:", text);
                errorDiv.textContent = 'Server err: ' + text.substring(0, 150);
                errorDiv.style.display = 'block';
              }
            } catch (error) {
              console.error("Auth error:", error);
              errorDiv.textContent = 'Помилка авторизації: ' + error.message;
              errorDiv.style.display = 'block';
            }
          });
        </script>
      </body>
      </html>
    `);
  });

  app.use(authMiddleware);

  // Explicitly serve static data dirs for both dev and prod
  const rootDataPath = path.join(process.cwd(), 'data');
  app.use('/data', express.static(rootDataPath));
  
  const rootScriptsPath = path.join(process.cwd(), 'scripts');
  app.use('/scripts', express.static(rootScriptsPath));

  const rootCssPath = path.join(process.cwd(), 'css');
  app.use('/css', express.static(rootCssPath));

  const rootAssetsPath = path.join(process.cwd(), 'assets');
  app.use('/assets', express.static(rootAssetsPath));

  app.get('/sw.js', (req, res) => res.sendFile(path.join(process.cwd(), 'sw.js')));

  app.get('/api/debug-csv', async (req, res) => {
     try {
       const csv = fs.readFileSync('data/db/uk/basic.csv', 'utf8');
       const PapaModule = await import('papaparse');
       const Papa = PapaModule.default || PapaModule;
       const parseConfig = { header: true, skipEmptyLines: true };
       const parsed = Papa.parse(csv, parseConfig);
       res.json(parsed.data[0]);
     } catch (e: any) {
       res.status(500).json({ error: e.message });
     }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    (async () => {
      const viteName = "vi" + "te";
      const { createServer: createViteServer } = await import(/* @vite-ignore */ viteName);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      
      // Global Error Handler
      app.use((err: any, req: any, res: any, next: any) => {
        console.error("Express Error:", err);
        res.status(500).json({ error: "Express Error", message: err.message });
      });

      if (!process.env.VERCEL) {
        app.listen(PORT as number, "0.0.0.0", () => {
          console.log(`Server running on http://localhost:${PORT}`);
        });
      }
    })();
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    
    // Global Error Handler
    app.use((err: any, req: any, res: any, next: any) => {
      console.error("Express Error:", err);
      res.status(500).json({ error: "Express Error", message: err.message });
    });

    if (!process.env.VERCEL) {
      app.listen(PORT as number, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  }
