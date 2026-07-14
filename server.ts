import express from "express";
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
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
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
  res.send(`
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
        <p>Цей сайт працює в приватному режимі.<br>Доступ надається лише авторизованим користувачам.</p>
        <form id="loginForm">
          <input type="text" id="emailOrPhone" placeholder="Email або номер телефону" required />
          <button type="submit">Отримати доступ</button>
        </form>
        
        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ddd;" />
        <button id="googleLoginBtn" type="button" style="background: white; color: #757575; border: 1px solid #ddd; box-shadow: 0 1px 2px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; padding: 10px; font-weight: 500;">
          <svg style="width:20px;height:20px;margin-right:10px;" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Увійти через Google
        </button>

        <hr style="margin: 20px 0; border: 0; border-top: 1px dashed #eee;" />
        <button id="testLoginBtn" type="button" style="background: #28a745; color: white; border: none; padding: 10px; font-weight: bold; border-radius: 6px; cursor: pointer; width: 100%;">
          Тестовий вхід
        </button>

        <div id="error" style="color: red; margin-top: 15px; font-weight: bold;"></div>
      </div>
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

        document.getElementById('googleLoginBtn').onclick = async () => {
          try {
            const result = await signInWithPopup(auth, provider);
            const email = result.user.email;
            
            const res = await fetch('/api/auth-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ emailOrPhone: email })
            });
            
            if (res.ok) {
              window.location.href = '/';
            } else {
              document.getElementById('error').innerText = 'Доступ заборонено або вас немає в списку запрошених.';
              auth.signOut();
            }
          } catch (error) {
            console.error(error);
            if (error.code !== "auth/popup-closed-by-user" && error.code !== "auth/cancelled-popup-request") {
              document.getElementById('error').innerText = 'Помилка авторизації через Google.';
            }
          }
        };

        document.getElementById('testLoginBtn').onclick = async () => {
          const res = await fetch('/api/auth-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOrPhone: 'test' })
          });
          if (res.ok) {
            window.location.href = '/';
          }
        };

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
  `);
});

app.post('/api/auth-login', (req, res) => {
  const emailOrPhone = req.body.emailOrPhone || '';
  if (emailOrPhone) {
    res.cookie('auth_email', emailOrPhone.toLowerCase().trim(), { httpOnly: true, path: '/', sameSite: 'none', secure: true });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

app.post('/api/invite', async (req, res) => {
  const emailOrPhone = req.body.email || req.body.phone;
  if (!emailOrPhone) return res.status(400).json({ error: 'Missing email or phone' });
  
  const val = emailOrPhone.toLowerCase().trim().replace(/\s/g, '');
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


app.delete('/api/shares/:id', async (req, res) => {
  try {
    await fdb.collection('shares').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});

app.get('/api/shares', async (req, res) => {
  try {
    const snap = await fdb.collection('shares').get();
    const shares = snap.docs.map(doc => ({ id: doc.id, email: doc.data().value, ...doc.data() }));
    res.json(shares);
  } catch(e) {
    res.json([]);
  }
});

app.get('/api/config', async (req, res) => {
  const cookie = (req.headers.cookie || '').split(';').find(c => c.trim().startsWith('auth_email='));
  if (cookie) {
    const emailOrPhone = decodeURIComponent(cookie.split('=')[1]);
    const val = emailOrPhone.toLowerCase().trim().replace(/\s/g, '');
    
    if (val === 'www.johnsel771994@gmail.com' || val === 'test') {
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
  console.log(`Server running on port ${PORT}`);
});
