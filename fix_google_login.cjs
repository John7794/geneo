const fs = require('fs');
let ts = fs.readFileSync('server.ts', 'utf8');

const regex = /<div class="login-box">[\s\S]*?<\/script>/;
const replacementHtml = `<div class="login-box">
        <h1>Вхід в Архів</h1>
        <p>Сайт закритий. Доступ тільки для обраних.</p>
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
            if (error.code !== "auth/popup-closed-by-user") {
              document.getElementById('error').innerText = 'Помилка авторизації через Google.';
            }
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
      </script>`;

if (regex.test(ts)) {
    ts = ts.replace(regex, replacementHtml);
    fs.writeFileSync('server.ts', ts);
    console.log("Updated server.ts with Google Login!");
} else {
    console.log("Could not find regex match!");
    process.exit(1);
}
