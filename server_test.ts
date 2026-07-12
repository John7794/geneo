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

  // Initialize Firebase Admin configuration
  let adminConfig: any = { projectId: "geneo-b8e63" };
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      // if Vercel passed it surrounded by single quotes
      if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1);
      const serviceAccount = JSON.parse(raw);
      
      // Sometimes newlines in private_key get double escaped
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      adminConfig.credential = admin.credential.cert(serviceAccount);
      console.log("Using provided FIREBASE_SERVICE_ACCOUNT for credentials.");
    } catch (e: any) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT. Falling back to default.", e.message);

  }

  admin.initializeApp(adminConfig);
  import { getFirestore } from 'firebase-admin/firestore';
  const fdb = getFirestore(admin.app(), 'ai-studio-63d48ced-44ea-42e9-9cf6-e86ae5746ff1');

  // Function to save individual file to Firestore with compression
  async function saveFileToFirestore(filePath: string, content: string): Promise<void> {
    try {
      const cleanPath = filePath.replace(/\\/g, '/'); // normalize slashes
      const compressed = zlib.gzipSync(Buffer.from(content, 'utf8'));
      const base64 = compressed.toString('base64');
      
      const docId = cleanPath.replace(/\//g, '___');
      await fdb.collection('db_files').doc(docId).set({
        content: base64,
        compressed: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
  );
      console.log(`[Firestore DB] Saved compressed ${cleanPath} to Firestore`);
    } catch (e) {
      console.error(`[Firestore DB] Failed to save ${filePath} to Firestore:`, e);

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
        const cleanPath = doc.id.replace(/___/g, '/'); // e.g., "db/metadata.json" or "db/uk/basic.csv"
        const data = doc.data();
        if (data && data.content) {
          let textContent = "";
          if (data.compressed) {
            const buffer = Buffer.from(data.content, 'base64');
            const decompressed = zlib.gunzipSync(buffer);
            textContent = decompressed.toString('utf8');
       else {
            textContent = data.content;
      
          
          const fullLocalPath = path.join('/tmp/data', cleanPath);
          fs.mkdirSync(path.dirname(fullLocalPath), { recursive: true });
          fs.writeFileSync(fullLocalPath, textContent, 'utf8');
          count++;
    
  
      console.log(`[Firestore DB] Restored ${count} files from Firestore to /tmp/data`);
    } catch (e) {
      console.error("[Firestore DB] Failed to restore files from Firestore:", e);

  }

  // Upload all dynamic files under tmp to Firestore
  async function saveAllTmpFilesToFirestore(): Promise<void> {
    const filesToSave: string[] = [];

    // 1. kinshipIndex.json
    if (fs.existsSync('/tmp/data/kinshipIndex.json')) {
      filesToSave.push('kinshipIndex.json');

    // 2. db/metadata.json
    if (fs.existsSync('/tmp/data/db/metadata.json')) {
      filesToSave.push('db/metadata.json');

    // 3. db/uk/*.csv
    if (fs.existsSync('/tmp/data/db/uk')) {
      const csvFiles = fs.readdirSync('/tmp/data/db/uk');
      csvFiles.forEach(f => {
        filesToSave.push(`db/uk/${f}`);
  );


    console.log(`[Firestore DB] Uploading ${filesToSave.length} files to Firestore...`);
    for (const file of filesToSave) {
      const localPath = path.join('/tmp/data', file);
      if (fs.existsSync(localPath)) {
        const content = fs.readFileSync(localPath, 'utf8');
        await saveFileToFirestore(file, content);
  

    console.log("[Firestore DB] All files synced to Firestore successfully.");
  }

  let bootPromise: Promise<void> | null = null;
  // Bootstrapping sequence
  function ensureBootstrapData() {
    if (!bootPromise) {
      bootPromise = (async () => {
        try {
          console.log("[Data Boot] Initializing database folders...");
          
          // 1. Copy default packaged data files to /tmp/data (acting as seed data)
          const packagedDataPath = path.join(process.cwd(), 'data');
          if (fs.existsSync(packagedDataPath)) {
            fs.cpSync(packagedDataPath, '/tmp/data', { recursive: true });
            console.log("[Data Boot] Copy seed data from package folder to /tmp/data");
      
          
          // 2. Load latest versions from Firestore over seed data
          await restoreFilesFromFirestore();
          
          // 3. Enforce DATA_DIR environment variable so background sync runs there
          process.env.DATA_DIR = '/tmp/data';
          console.log("[Data Boot] Configured process.env.DATA_DIR to:", process.env.DATA_DIR);
    } catch (e) {
          console.error("[Data Boot] Failed bootstrapping:", e);
    
  )();

    return bootPromise;
  }
  
  // Kick off early
  ensureBootstrapData();

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
  ;


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
       ;
    
        if (bestShare) return bestShare;
    } catch (e) {
      console.error("[Auth] Error reading Firestore shares", e);


    return null;
  }

  // Auth Middleware
  const authMiddleware = async (req: any, res: any, next: any) => {
    await ensureBootstrapData();
    
    const normalizedPath = req.path.replace(/\/$/, ""); // Remove trailing slash
    
    // Quick re-validation on page loads (not API or data loads) to keep multiple Vercel instances in sync
    if (normalizedPath === "" || normalizedPath === "/index.html") {
      try {
        const metaDoc = await fdb.collection('db_files').doc('db/metadata.json').get();
        if (metaDoc.exists) {
          const remoteData = metaDoc.data();
          const remoteTime = remoteData?.updatedAt?.toMillis() || 0;
          let localTime = 0;
          const localMetaPath = '/tmp/data/db/metadata.json';
          if (fs.existsSync(localMetaPath)) {
            const stat = fs.statSync(localMetaPath);
            localTime = stat.mtimeMs;
      
          // If remote is newer (fuzzy by 5 seconds due to clock differences), reload
          if (remoteTime > localTime + 5000) {
            console.log("[Data Sync] Remote data is significantly newer. Reloading in this container...");
            bootPromise = null; 
            await ensureBootstrapData();
    } catch (e) {
        // ignore
  

    
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


    const email = req.cookies.auth_email ? req.cookies.auth_email.toLowerCase().trim() : null;
    
    if (!email) {
      if (req.path.startsWith('/api/') || req.path.startsWith('/data/') || req.path.startsWith('/assets/')) {
         return res.status(401).json({ error: "Unauthorized" });
  
      if (!req.path.startsWith('/login')) {
         return res.redirect('/login');
  


    const userConfig = await getUserAccess(email);
    if (!userConfig) {
      if (req.path.startsWith('/api/') || req.path.startsWith('/data/')) {
         return res.status(401).json({ error: "Unauthorized access" });
  
      return res.redirect('/login');

    
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
    );
        res.json({ success: true, email, config: userConfig });
   else {
        console.warn(`[Auth] Access denied for ${email}.`);
        res.status(401).json({ error: `Ваша пошта (${email}) не має доступу. Зверніться до адміністратора.` });
    } catch (error) {
      console.error("[Auth] Error verifying token:", error);
      res.status(401).json({ error: "Помилка сервера авторизації (Невірний токен)" });

  });

  app.post('/auth-email', async (req, res) => {
    const { email } = req.body;
    console.log(`[Auth] Login attempt with simple email: ${email}`);
    try {
      if (!email) {
        return res.status(400).json({ error: "Вкажіть email" });
  
      
      const cleanEmail = email.toLowerCase().trim();
      const userConfig = await getUserAccess(cleanEmail);

      if (userConfig) {
        console.log(`[Auth] Access granted (simple) for ${cleanEmail}`);
        res.cookie('auth_email', cleanEmail, { 
          httpOnly: true, 
          maxAge: 30 * 24 * 60 * 60 * 1000, 
          secure: true, 
          sameSite: 'strict' 
    );
        res.json({ success: true, email: cleanEmail, config: userConfig });
   else {
        console.warn(`[Auth] Access denied (simple) for ${cleanEmail}.`);
        res.status(401).json({ error: `Ваша пошта (${cleanEmail}) не має доступу. Зверніться до адміністратора.` });
    } catch (error) {
      console.error("[Auth] Error in simple email auth:", error);
      res.status(500).json({ error: "Внутрішня помилка сервера" });

  });

  app.post('/api/logout', (req, res) => {
    res.clearCookie('auth_email');
    res.json({ success: true });
  });

  app.get('/api/debug-firestore', async (req, res) => {
    try {
      const snap = await fdb.collection('db_files').get();
      const files = snap.docs.map(doc => ({ id: doc.id, updatedAt: doc.data().updatedAt }));
      res.json({ files });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/config', authMiddleware, (req, res) => {
    res.json((req as any).userConfig);
  });

  app.post('/api/invite', authMiddleware, async (req, res) => {
    try {
      const { email, hiddenProfiles, rootPersons, canShare, canSync } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
  

      // Check if user is allowed to invite others
      if (!req.userConfig?.canShare) {
        //return res.status(403).json({ error: "You don't have permission to share" });
  

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
      console.log("[Invite] Saving to Firestore...");
      await fdb.collection('shares').add(newShare);
      console.log("[Invite] Saved successfully.");

      // Optional: Check if SMTP config exists, if not just log
      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("[Invite] SMTP environment variables missing. Only simulating email send.");
        return res.json({ success: true, mock: true, message: "Запрошення збережено. Лист імітовано." });
  

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
    ,
  );

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
  );

      res.json({ success: true });
    } catch (e: any) {
      console.error("[Invite] Failed to send email / save config:", e);
      res.status(500).json({ error: `Failed: ${e.message || String(e)}` });

  });

  app.get('/api/shares', authMiddleware, async (req, res) => {
    if (!req.userConfig?.canShare) {
       //return res.status(403).json({ error: "Only admins can view shares" });

    try {
      const sharesSnap = await fdb.collection('shares').get();
      const shares = sharesSnap.docs.map(doc => ({
         id: doc.id,
         ...doc.data()
  ));
      res.json(shares);
    } catch (e) {
      console.error("[Invite] Error loading shares:", e);
      res.status(500).json({ error: "Failed to load shares" });

  });

  app.delete('/api/shares/:id', authMiddleware, async (req, res) => {
    if (!req.userConfig?.canShare) {
       //return res.status(403).json({ error: "Only admins can delete shares" });

    try {
      await fdb.collection('shares').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (e) {
      console.error("[Invite] Error deleting share:", e);
      res.status(500).json({ error: "Failed to delete share" });

  });

  app.get('/api/sync-data', async (req, res) => {
    console.log("[Data Sync] Triggered via UI by:", req.cookies.auth_email);
    
    //if (!req.userConfig?.canSync && !req.userConfig?.isMainAdmin) {
      //return res.status(403).json({ error: 'You do not have permission to sync data' });


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
    } catch (fallbackErr) {
        console.error("Fallback upload also failed:", fallbackErr);
  
      
      return res.status(500).json({ error: 'Sync failed', details: errMsg });

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
          .google-btn { margin-bottom: 1rem; }
          .divider { margin: 1.5rem 0; color: #94a3b8; font-size: 0.875rem; position: relative; }
          .divider::before, .divider::after { content: ""; position: absolute; top: 50%; width: 40%; height: 1px; background: #e2e8f0; }
          .divider::before { left: 0; }
          .divider::after { right: 0; }
          input { width: 100%; padding: 0.875rem; margin-bottom: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 1rem; box-sizing: border-box; }
          input:focus { outline: none; border-color: #3b82f6; ring: 2px solid #3b82f6; }
          .primary-btn { background: #0f172a; color: white; border: none; }
          .primary-btn:hover { background: #334155; }
          .links { margin-top: 1rem; font-size: 0.875rem; display: flex; justify-content: space-between; }
          .links a { color: #3b82f6; text-decoration: none; cursor: pointer; }
          .links a:hover { text-decoration: underline; }
          .error { color: #dc2626; font-size: 0.875rem; margin-top: 1rem; display: none; background: #fef2f2; padding: 0.5rem; border-radius: 4px; word-break: break-word; }
        </style>
        <script type="module">
          import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
          import { getAuth, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
          
          const firebaseConfig = {
            projectId: "geneo-b8e63",
            appId: "1:241221120342:web:9575c2edf16c29ac81a6f7",
            apiKey: "AIzaSyASdK-k9JaA4FcjVkMuga6uigstkhxznVY",
            authDomain: "geneo-b8e63.firebaseapp.com"
      ;
          
          const app = initializeApp(firebaseConfig);
          const auth = getAuth(app);
          const provider = new GoogleAuthProvider();

          async function handleAuthResult(result) {
            const idToken = await result.user.getIdToken();
            const res = await fetch('/auth-verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: idToken })
        );

            if (res.ok) {
              window.location.href = '/';
         else {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || 'Доступ заборонено (ваш email не знайдено в списку гостей)');
        
      

          function showError(msg) {
            const errorDiv = document.getElementById('error');
            if (msg.includes('auth/unauthorized-domain')) {
               msg = "Домен не авторизовано у Firebase! Зайдіть у Firebase Console -> Authentication -> Settings -> Authorized domains і додайте ваш домен.";
         else if (msg.includes('auth/invalid-credential')) {
               msg = "Неправильний email або пароль.";
         else if (msg.includes('auth/email-already-in-use')) {
               msg = "Такий акаунт вже існує. Увійдіть замість реєстрації.";
         else if (msg.includes('auth/weak-password')) {
               msg = "Пароль занадто слабкий (мінімум 6 символів).";
        
            errorDiv.textContent = 'Помилка: ' + msg;
            errorDiv.style.display = 'block';
      

          document.getElementById('loginBtn').addEventListener('click', async () => {
             document.getElementById('error').style.display = 'none';
             try {
               const result = await signInWithPopup(auth, provider);
               await handleAuthResult(result);
    } catch (error) {
               console.error("Auth error:", error);
               showError(error.message);
               auth.signOut();
         
      );

          document.getElementById('emailForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            document.getElementById('error').style.display = 'none';
            const email = document.getElementById('email').value.trim();
            
             try {
                const res = await fetch('/auth-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email })
            );

                if (res.ok) {
                  window.location.href = '/';
             else {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.error || 'Доступ заборонено (ваш email не знайдено в списку гостей)');
    } catch (error) {
                console.error("Auth error:", error);
                showError(error.message);
         
      );
        </script>
      </head>
      <body>
        <div class="login-box">
          <h2>Архів Генеалогії</h2>
          <p>Цей сайт є приватним. Увійдіть через будь-яку пошту, котрій надано доступ.</p>
          
          <button id="loginBtn" class="google-btn">
            <svg style="width: 18px; margin-right: 8px;" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Увійти через Google
          </button>
          
          <div class="divider">або вкажіть просто пошту</div>
          
          <form id="emailForm" data-mode="login">
            <input type="email" id="email" placeholder="Email (напр. user@yahoo.com)" required />
            <button type="submit" id="emailSubmitBtn" class="primary-btn">Увійти</button>
          </form>

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
  
  if (process.env.NODE_ENV !== "production") {
    // Intercept missing hashed assets explicitly to force a hard reload for users with stale cached index.html
    app.get('/assets/index-*.js', (req, res, next) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'no-store, no-cache');
      res.send(`console.warn('Stale asset requested. Forcing reload...'); setTimeout(() => window.location.reload(true), 500);`);
);

    const rootScriptsPath = path.join(process.cwd(), 'scripts');
    app.use('/scripts', express.static(rootScriptsPath));

    const rootCssPath = path.join(process.cwd(), 'css');
    app.use('/css', express.static(rootCssPath));

    const rootAssetsPath = path.join(process.cwd(), 'assets');
    app.use('/assets', express.static(rootAssetsPath));
  }

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
  );
      app.use(vite.middlewares);
      
      // Global Error Handler
      app.use((err: any, req: any, res: any, next: any) => {
        console.error("Express Error:", err);
        res.status(500).json({ error: "Express Error", message: err.message });
  );

      if (!process.env.VERCEL) {
        app.listen(PORT as number, "0.0.0.0", () => {
          console.log(`Server running on http://localhost:${PORT}`);
    );
  
)();
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Serve static files with caching for assets, but no-cache for index.html
    app.use(express.static(distPath, {
      setHeaders: (res, rootPath) => {
        if (rootPath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
     else {
          // Cache other assets for a long time
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
  
));
    
    // Intercept missing hashed assets explicitly to force a hard reload for users with stale cached index.html
    app.get('/assets/index-*.js', (req, res) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'no-store, no-cache');
      res.send(`console.warn('Stale asset requested. Forcing reload...'); setTimeout(() => window.location.reload(true), 500);`);
);

    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
);
    
    // Global Error Handler
    app.use((err: any, req: any, res: any, next: any) => {
      console.error("Express Error:", err);
      res.status(500).json({ error: "Express Error", message: err.message });
);

    if (!process.env.VERCEL) {
      app.listen(PORT as number, "0.0.0.0", () => {
        console.log(`Server running on http://localhost:${PORT}`);
  );

  }
