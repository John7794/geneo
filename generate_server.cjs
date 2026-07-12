const fs = require('fs');

let old_code = fs.readFileSync('server.ts', 'utf8');

// I am rewriting server.ts with a working minimal auth
const new_code = `import express from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import admin from 'firebase-admin';

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// Initialize Firebase Admin configuration
let adminConfig = { projectId: "geneo-b8e63" };
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1);
    const serviceAccount = JSON.parse(raw);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\\\n/g, '\\n');
    }
    adminConfig.credential = admin.credential.cert(serviceAccount);
    console.log("Using provided FIREBASE_SERVICE_ACCOUNT for credentials.");
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT. Falling back to default.", e.message);
  }
}
admin.initializeApp(adminConfig);
import { getFirestore } from 'firebase-admin/firestore';
const fdb = getFirestore(admin.app(), 'ai-studio-63d48ced-44ea-42e9-9cf6-e86ae5746ff1');

// Auth middleware
async function getUserAccess(email) {
    const cleanEmail = email.toLowerCase().trim();
    const devEmails = ["www.johnsel771994@gmail.com", "johnsel771994@gmail.com"];
    if (devEmails.includes(cleanEmail)) {
        return { rootPerson: "1", hiddenProfiles: [], canShare: true, canSync: true, isMainAdmin: true };
    }
    try {
        const sharesSnap = await fdb.collection('shares').where('email', '==', cleanEmail).get();
        if (!sharesSnap.empty) {
            const data = sharesSnap.docs[0].data();
            return {
                rootPerson: data.rootPersons?.[0] || "1",
                hiddenProfiles: data.hiddenProfiles || [],
                canShare: data.canShare === true,
                canSync: data.canSync === true
            };
        }
    } catch (e) {
        console.error("[Auth] Error reading Firestore shares", e);
    }
    return null;
}

const authMiddleware = async (req, res, next) => {
    const normalizedPath = req.path.replace(/\\/$/, "");
    if (normalizedPath === "/login" || normalizedPath === "/auth-verify" || normalizedPath === "/robots.txt" || normalizedPath === "/api/firebase-config" || normalizedPath === "/sw.js" || normalizedPath.startsWith("/assets")) {
        return next();
    }
    try {
        const sessionCookie = req.cookies.session || '';
        const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
        const email = decodedClaims.email;
        if (!email) {
            throw new Error("No email in token");
        }
        const userConfig = await getUserAccess(email);
        if (!userConfig) {
            throw new Error("No access config found for email");
        }
        req.userConfig = userConfig;
        req.userEmail = email;
        next();
    } catch (e) {
        if (req.path.startsWith('/api/') || req.path.startsWith('/data/')) {
            return res.status(401).json({ error: "Unauthorized access" });
        }
        return res.redirect('/login');
    }
};

app.get('/login', (req, res) => {
    return res.send(\`
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
          .google-btn { margin-bottom: 1rem; }
          .error { color: #dc2626; font-size: 0.875rem; margin-top: 1rem; display: none; background: #fef2f2; padding: 0.5rem; border-radius: 4px; word-break: break-word; }
        </style>
        <script type="module">
          import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
          import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
          const firebaseConfig = {
            projectId: "geneo-b8e63",
            appId: "1:241221120342:web:9575c2edf16c29ac81a6f7",
            apiKey: "AIzaSyASdK-k9JaA4FcjVkMuga6uigstkhxznVY",
            authDomain: "geneo-b8e63.firebaseapp.com"
          };
          const app = initializeApp(firebaseConfig);
          const auth = getAuth(app);
          const provider = new GoogleAuthProvider();
          
          document.getElementById('loginBtn').addEventListener('click', async () => {
             document.getElementById('error').style.display = 'none';
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
                 throw new Error(data.error || 'Доступ заборонено');
               }
             } catch (error) {
               document.getElementById('error').textContent = 'Помилка: ' + error.message;
               document.getElementById('error').style.display = 'block';
               auth.signOut();
             }
          });
        </script>
      </head>
      <body>
        <div class="login-box">
          <h2>Архів Генеалогії</h2>
          <p>Цей сайт є приватним. Увійдіть через Google.</p>
          <button id="loginBtn" class="google-btn">Увійти через Google</button>
          <div id="error" class="error">Помилка входу.</div>
        </div>
      </body>
      </html>
    \`);
});

app.post('/auth-verify', async (req, res) => {
    try {
        const idToken = req.body.token;
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const expiresIn = 60 * 60 * 24 * 5 * 1000;
        const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
        res.cookie('session', sessionCookie, { maxAge: expiresIn, httpOnly: true, secure: process.env.NODE_ENV === 'production' });
        res.json({ status: 'success' });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

app.use(authMiddleware);

app.get('/api/config', (req, res) => {
    res.json(req.userConfig || {});
});

const rootDataPath = path.join(process.cwd(), 'data');
app.use('/data', express.static(rootDataPath));

app.get('/api/sync-data', async (req, res) => {
  res.json({ success: true, message: 'Sync not needed' });
});

if (process.env.NODE_ENV !== "production") {
  const rootScriptsPath = path.join(process.cwd(), 'scripts');
  app.use('/scripts', express.static(rootScriptsPath));
  const rootCssPath = path.join(process.cwd(), 'css');
  app.use('/css', express.static(rootCssPath));
  const rootAssetsPath = path.join(process.cwd(), 'assets');
  app.use('/assets', express.static(rootAssetsPath));
}

app.get('/sw.js', (req, res) => res.sendFile(path.join(process.cwd(), 'sw.js')));

if (process.env.NODE_ENV !== "production") {
  (async () => {
    const viteName = "vi" + "te";
    const { createServer: createViteServer } = await import(/* @vite-ignore */ viteName);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  })();
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;

fs.writeFileSync('server.ts', new_code);
