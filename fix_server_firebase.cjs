const fs = require('fs');
const code = `import express from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

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
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT.", e.message);
  }
}
admin.initializeApp(adminConfig);
const fdb = getFirestore(admin.app(), 'ai-studio-63d48ced-44ea-42e9-9cf6-e86ae5746ff1');

export const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(cookieParser());

const rootDataPath = path.join(process.cwd(), 'data');
app.use('/data', express.static(rootDataPath));

app.get('/api/sync-data', async (req, res) => {
  res.json({ success: true, message: 'Sync not needed' });
});

app.get('/login', (req, res) => {
  res.send(\`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Вхід - Закритий доступ</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { display: flex; justify-content: center; align-items: center; height: 100vh; background: #f0f2f5; font-family: sans-serif; margin: 0; }
        .login-box { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
        h1 { margin-top: 0; color: #333; }
        p { color: #666; margin-bottom: 20px; }
        input, button { width: 100%; padding: 12px; margin-top: 10px; box-sizing: border-box; border-radius: 6px; border: 1px solid #ccc; font-size: 16px; }
        button { background: #007BFF; color: white; border: none; cursor: pointer; font-weight: bold; }
        button:hover { background: #0056b3; }
      </style>
    </head>
    <body>
      <div class="login-box">
        <h1>Вхід в Архів</h1>
        <p>Сайт закритий. Доступ тільки для обраних.</p>
        <form id="loginForm">
          <input type="text" id="emailOrPhone" placeholder="Email або номер телефону" required />
          <button type="submit">Отримати доступ</button>
        </form>
        <div id="error" style="color: red; margin-top: 15px; font-weight: bold;"></div>
      </div>
      <script>
        document.getElementById('loginForm').onsubmit = async (e) => {
          e.preventDefault();
          const val = document.getElementById('emailOrPhone').value;
          const res = await fetch('/api/auth-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOrPhone: val })
          });
          if (res.ok) {
            window.location.href = '/';
          } else {
            document.getElementById('error').innerText = 'Доступ заборонено або вас немає в списку запрошених.';
          }
        };
      </script>
    </body>
    </html>
  \`);
});

app.post('/api/auth-login', (req, res) => {
  const emailOrPhone = req.body.emailOrPhone || '';
  if (emailOrPhone) {
    res.cookie('auth_email', emailOrPhone.toLowerCase().trim(), { httpOnly: true, path: '/' });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.post('/api/invite', async (req, res) => {
  const emailOrPhone = req.body.email || req.body.phone;
  if (!emailOrPhone) return res.status(400).json({ error: 'Missing email or phone' });
  
  const val = emailOrPhone.toLowerCase().trim().replace(/\\s/g, '');
  try {
    await fdb.collection('shares').add({
      value: val,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true });
  } catch (e) {
    console.error("Invite error:", e);
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/shares', async (req, res) => {
  try {
    const snap = await fdb.collection('shares').get();
    const shares = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(shares);
  } catch(e) {
    res.json([]);
  }
});

app.get('/api/config', async (req, res) => {
  const cookie = (req.headers.cookie || '').split(';').find(c => c.trim().startsWith('auth_email='));
  if (cookie) {
    const emailOrPhone = decodeURIComponent(cookie.split('=')[1]);
    const val = emailOrPhone.toLowerCase().trim().replace(/\\s/g, '');
    
    if (val === 'www.johnsel771994@gmail.com') {
      res.json({ canShare: true, canSync: true, isMainAdmin: true });
      return;
    }
    
    try {
      const snap = await fdb.collection('shares').where('value', '==', val).get();
      if (!snap.empty) {
        res.json({ canShare: false, canSync: false, isMainAdmin: false });
        return;
      }
    } catch(e) {}
  }
  res.status(401).json({ error: 'Unauthorized' });
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
    const p = req.path;
    if (p.startsWith("/api") || p.startsWith("/login")) {
       return res.status(404).end();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(3000, "0.0.0.0", () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;

fs.writeFileSync('server.ts', code);
console.log("Rewrote server.ts with Firebase persistence");
