const fs = require('fs');
let ts = fs.readFileSync('server.ts', 'utf8');

// Insert a /login route right before app.get("*", ...)
const loginRoute = `
app.get('/login', (req, res) => {
  res.send(\`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Login</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="stylesheet" href="/css/base/variables.css" />
      <link rel="stylesheet" href="/css/base/base.css" />
      <style>
        body { display: flex; justify-content: center; align-items: center; height: 100vh; background: var(--color-bg); font-family: inherit; }
        .login-box { background: white; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); width: 100%; max-width: 400px; text-align: center; }
        h1 { margin-top: 0; }
        input, button { width: 100%; padding: 10px; margin-top: 10px; box-sizing: border-box; border-radius: var(--radius-md); border: 1px solid var(--color-border-light); font-size: 16px; }
        button { background: var(--color-primary); color: white; border: none; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="login-box">
        <h1>Вхід</h1>
        <p>Сайт закритий. Доступ тільки для запрошених.</p>
        <form id="loginForm">
          <input type="text" id="emailOrPhone" placeholder="Email або номер телефону" required />
          <button type="submit">Увійти</button>
        </form>
        <div id="error" style="color: red; margin-top: 10px;"></div>
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
            document.getElementById('error').innerText = 'Доступ заборонено або користувача не знайдено.';
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
    res.cookie('auth_email', emailOrPhone.toLowerCase().trim(), { httpOnly: true });
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

let sharedEmails = ['www.johnsel771994@gmail.com'];
let sharedPhones = [];

app.post('/api/invite', (req, res) => {
  const emailOrPhone = req.body.email || req.body.phone;
  if (emailOrPhone.includes('@')) {
    sharedEmails.push(emailOrPhone.toLowerCase().trim());
  } else {
    sharedPhones.push(emailOrPhone.replace(/\\s/g, ''));
  }
  res.json({ success: true });
});

app.get('/api/config', (req, res) => {
  const cookie = (req.headers.cookie || '').split(';').find(c => c.trim().startsWith('auth_email='));
  if (cookie) {
    const emailOrPhone = decodeURIComponent(cookie.split('=')[1]);
    if (emailOrPhone === 'www.johnsel771994@gmail.com' || sharedEmails.includes(emailOrPhone) || sharedPhones.includes(emailOrPhone)) {
      res.json({ 
        canShare: true, 
        canSync: true,
        isMainAdmin: emailOrPhone === 'www.johnsel771994@gmail.com'
      });
      return;
    }
  }
  res.status(401).json({ error: 'Unauthorized' });
});
`;

ts = ts.replace(/app\.get\("\*",/g, loginRoute + '\n  app.get("*",');
fs.writeFileSync('server.ts', ts);
console.log("Mock auth installed");
