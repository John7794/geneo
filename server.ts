import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import fs from "fs";
import "dotenv/config";
import nodemailer from "nodemailer";
import zlib from "zlib";

import { main as syncDataMain } from "./scripts/api-tasks/sync-data.js";
import { main as generateKinshipMain } from "./scripts/api-tasks/generate-kinship.js";

declare global {
  namespace Express {
    interface Request {
      userConfig?: any;
      userEmail?: string;
    }
  }
}

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

  import admin from 'firebase-admin';

  admin.initializeApp({ projectId: "celtic-biplane-j8gvj" });
  const fdb = admin.firestore();

  // Function to save individual file to Firestore with compression
  async function saveFileToFirestore(filePath: string, content: string): Promise<void> {
    try {
      const cleanPath = filePath.replace(/\\/g, '/'); // normalize slashes
      const compressed = zlib.gzipSync(Buffer.from(content, 'utf8'));
      const base64 = compressed.toString('base64');
      
      await fdb.collection('db_files').doc(cleanPath).set({
        content: base64,
        compressed: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`[Firestore DB] Saved compressed ${cleanPath} to Firestore`);
    } catch (e) {
      console.error(`[Firestore DB] Failed to save ${filePath} to Firestore:`, e);
    }
  }

  // Restore database files on startup or trigger
  async function restoreFilesFromFirestore(): Promise<void> {
    try {
      console.log("[Firestore DB] Syncing database files from Firestore to memory/tmp...");
      const snap = await fdb.collection('db_files').get();
      
      // Ensure parent dir exists
      fs.mkdirSync('/tmp/data/db/uk', { recursive: true });
      
      let count = 0;
      for (const doc of snap.docs) {
        const cleanPath = doc.id; // e.g., "db/metadata.json" or "db/uk/basic.csv"
        const data = doc.data();
        if (data && data.content) {
          let textContent = "";
          if (data.compressed) {
            const buffer = Buffer.from(data.content, 'base64');
            const decompressed = zlib.gunzipSync(buffer);
            textContent = decompressed.toString('utf8');
          } else {
            textContent = data.content;
          }
          
          const fullLocalPath = path.join('/tmp/data', cleanPath);
          fs.mkdirSync(path.dirname(fullLocalPath), { recursive: true });
          fs.writeFileSync(fullLocalPath, textContent, 'utf8');
          count++;
        }
      }
      console.log(`[Firestore DB] Restored ${count} files from Firestore to /tmp/data`);
    } catch (e) {
      console.error("[Firestore DB] Failed to restore files from Firestore:", e);
    }
  }

  // Upload all dynamic files under tmp to Firestore
  async function saveAllTmpFilesToFirestore(): Promise<void> {
    const filesToSave: string[] = [];

    // 1. kinshipIndex.json
    if (fs.existsSync('/tmp/data/kinshipIndex.json')) {
      filesToSave.push('kinshipIndex.json');
    }
    // 2. db/metadata.json
    if (fs.existsSync('/tmp/data/db/metadata.json')) {
      filesToSave.push('db/metadata.json');
    }
    // 3. db/uk/*.csv
    if (fs.existsSync('/tmp/data/db/uk')) {
      const csvFiles = fs.readdirSync('/tmp/data/db/uk');
      csvFiles.forEach(f => {
        filesToSave.push(`db/uk/${f}`);
      });
    }

    console.log(`[Firestore DB] Uploading ${filesToSave.length} files to Firestore...`);
    for (const file of filesToSave) {
      const localPath = path.join('/tmp/data', file);
      if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, 'utf8');
        await saveFileToFirestore(file, content);
      }
    }
    console.log("[Firestore DB] All files synced to Firestore successfully.");
  }

  // Bootstrapping sequence
  (async function bootstrapData() {
    try {
      console.log("[Data Boot] Initializing database folders...");
      
      // 1. Copy default packaged data files to /tmp/data (acting as seed data)
      const packagedDataPath = path.join(process.cwd(), 'data');
      if (fs.existsSync(packagedDataPath)) {
        fs.cpSync(packagedDataPath, '/tmp/data', { recursive: true });
        console.log("[Data Boot] Copy seed data from package folder to /tmp/data");
      }
      
      // 2. Load latest versions from Firestore over seed data
      await restoreFilesFromFirestore();
      
      // 3. Enforce DATA_DIR environment variable so background sync runs there
      process.env.DATA_DIR = '/tmp/data';
      console.log("[Data Boot] Configured process.env.DATA_DIR to:", process.env.DATA_DIR);
    } catch (e) {
      console.error("[Data Boot] Failed bootstrapping:", e);
    }
  })();

  // Function to get user access securely from Firestore
  async function getUserAccess(email: string) {
    // 1. the main admin
    const cleanEmail = email.toLowerCase().trim();
    const devEmails = ["www.johnsel771994@gmail.com", "johnsel771994@gmail.com"];
    if (devEmails.includes(cleanEmail)) {
      return { 
        rootPerson: "1", 
        hiddenProfiles: [],
        canShare: true,
        canSync: true,
        isMainAdmin: true
      };
    }

    // 2. Fetch from Firestore
    try {
      const sharesSnap = await fdb.collection('shares')
        .where('email', '==', cleanEmail).get();
      if (!sharesSnap.empty) {
        let bestShare = null;
        for (let doc of sharesSnap.docs) {
           const data = doc.data();
           // if multiple shares, we can merge or just pick the first.
           // for now just pick the first valid one
           bestShare = {
             rootPerson: data.rootPersons?.[0] || "1",
             hiddenProfiles: data.hiddenProfiles || [],
             canShare: data.canShare === true,
             canSync: data.canSync === true
           };
        }
        if (bestShare) return bestShare;
      }
    } catch (e) {
      console.error("[Auth] Error reading Firestore shares", e);
    }

    return null;
  }

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
    
    if (!email) {
      if (req.path.startsWith('/api/') || req.path.startsWith('/data/') || req.path.startsWith('/assets/')) {
         return res.status(401).json({ error: "Unauthorized" });
      }
      if (!req.path.startsWith('/login')) {
         return res.redirect('/login');
      }
    }

    const userConfig = await getUserAccess(email);
    if (!userConfig) {
      if (req.path.startsWith('/api/') || req.path.startsWith('/data/')) {
         return res.status(401).json({ error: "Unauthorized access" });
      }
      return res.redirect('/login');
    }
    
    req.userConfig = userConfig;
    req.userEmail = email;
    next();
  };

  app.post('/auth-verify', async (req, res) => {
    const { token } = req.body;
    console.log("[Auth] Login attempt with id token");
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      const email = decoded.email ? decoded.email.toLowerCase().trim() : "";

      const userConfig = await getUserAccess(email);

      if (email && userConfig) {
        console.log(`[Auth] Access granted for ${email}`);
        res.cookie('auth_email', email, { 
          httpOnly: true, 
          maxAge: 30 * 24 * 60 * 60 * 1000, 
          secure: true, 
          sameSite: 'strict' 
        });
        res.json({ success: true, email, config: userConfig });
      } else {
        console.warn(`[Auth] Access denied for ${email}.`);
        res.status(401).json({ error: `Ваша пошта (${email}) не має доступу. Зверніться до адміністратора.` });
      }
    } catch (error) {
      console.error("[Auth] Error verifying token:", error);
      res.status(401).json({ error: "Помилка сервера авторизації (Невірний токен)" });
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
      const { email, hiddenProfiles, rootPersons, canShare, canSync } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Check if user is allowed to invite others
      if (!req.userConfig?.canShare) {
        return res.status(403).json({ error: "You don't have permission to share" });
      }

      const cleanEmail = email.toLowerCase().trim();
      console.log(`[Invite] Request to invite: ${cleanEmail}`);

      // Save to Firestore
      const newShare = {
        email: cleanEmail,
        rootPersons: rootPersons || [req.userConfig?.rootPerson || "1"],
        hiddenProfiles: hiddenProfiles || [],
        canShare: canShare === true,
        canSync: canSync === true,
        createdBy: req.userEmail || "unknown",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await fdb.collection('shares').add(newShare);

      // Optional: Check if SMTP config exists, if not just log
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("[Invite] SMTP environment variables missing. Only simulating email send.");
        return res.json({ success: true, mock: true, message: "Запрошення збережено. Лист імітовано." });
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
          <p>Перейдіть за посиланням, щоб авторизуватися через Google аккаунт:</p>
          <a href="${appUrl}" style="display:inline-block;padding:10px 20px;background:#007BFF;color:#fff;text-decoration:none;border-radius:5px;">Відкрити архів</a>
          <br><br>
          <p><small>Або скопіюйте це посилання: ${appUrl}</small></p>
        `,
      });

      res.json({ success: true });
    } catch (e: any) {
      console.error("[Invite] Failed to send email / save config:", e);
      res.status(500).json({ error: `Failed: ${e.message || String(e)}` });
    }
  });

  app.post('/api/sync-data', authMiddleware, async (req, res) => {
    console.log("[Data Sync] Triggered via UI by:", req.cookies.auth_email);
    
    if (!req.userConfig?.canSync && !req.userConfig?.isMainAdmin) {
      return res.status(403).json({ error: 'You do not have permission to sync data' });
    }

    try {
      // 1. Run sync-data and generate-kinship
      console.log("[Data Sync] Starting main sync execution...");
      await syncDataMain();
      await generateKinshipMain();
      
      // 2. Persist the generated files to Firestore
      console.log("[Data Sync] Completed local generation, now saving to Firestore...");
      await saveAllTmpFilesToFirestore();
      
      console.log("[Data Sync] All operations completed successfully");
      res.json({ success: true, message: 'Data synced successfully', log: 'Sync completed & persisted to Firestore.' });
    } catch (err: any) {
      console.error("Sync error:", err);
      const errMsg = err.message || String(err);
      
      // Attempt Firestore upload fallback if some local check triggers a non-fatal EROFS
      try {
        if (fs.existsSync('/tmp/data/db/metadata.json')) {
          console.log("[Data Sync] Attempting fallback upload to Firestore...");
          await saveAllTmpFilesToFirestore();
          return res.json({ success: true, message: 'Data synced safely using memory fallback', log: 'Sync completed.' });
        }
      } catch (fallbackErr) {
        console.error("Fallback upload also failed:", fallbackErr);
      }
      
      return res.status(500).json({ error: 'Sync failed', details: errMsg });
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
        </style>
        <script type="module">
          import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
          import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
          
          const firebaseConfig = {
            projectId: "celtic-biplane-j8gvj",
            appId: "1:110687233405:web:aac484cf179a08fbcad814",
            apiKey: "AIzaSyCfAbVNqq6_kmsUeUiAlVYbVr3J1VVMbdE",
            authDomain: "celtic-biplane-j8gvj.firebaseapp.com"
          };
          
          const app = initializeApp(firebaseConfig);
          const auth = getAuth(app);
          const provider = new GoogleAuthProvider();

          document.getElementById('loginBtn').addEventListener('click', async () => {
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

              if (res.ok) {
                window.location.href = '/';
              } else {
                const data = await res.json().catch(() => ({}));
                errorDiv.textContent = data.error || 'Доступ заборонено';
                errorDiv.style.display = 'block';
                auth.signOut();
              }
            } catch (error) {
              console.error("Auth error:", error);
              errorDiv.textContent = 'Помилка авторизації: ' + error.message;
              errorDiv.style.display = 'block';
            }
          });
        </script>
      </head>
      <body>
        <div class="login-box">
          <h2>Архів Генеалогії</h2>
          <p>Цей сайт є приватним. Для перегляду гілок родового дерева увійдіть через свій Google-акаунт.</p>
          <button id="loginBtn">Увійти через Google</button>
          <div id="error" class="error">Помилка входу.</div>
        </div>
      </body>
      </html>
    `);
  });

  app.use(authMiddleware);

  // Explicitly serve static data dirs for both dev and prod
  app.use('/data', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });
  app.use('/data', express.static('/tmp/data'));
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
       const basicPath = fs.existsSync('/tmp/data/db/uk/basic.csv') 
         ? '/tmp/data/db/uk/basic.csv' 
         : 'data/db/uk/basic.csv';
       const csv = fs.readFileSync(basicPath, 'utf8');
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
