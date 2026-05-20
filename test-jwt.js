async function run() {
  const header = Buffer.from(JSON.stringify({alg:"RS256",kid:"fake"})).toString('base64url');
  const payload = Buffer.from(JSON.stringify({sub:"123",aud:"celtic-biplane-j8gvj",exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
  const signature = "fakesignature";
  const jwt = `${header}.${payload}.${signature}`;

  try {
    const res = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: jwt })
    });
    console.log('Status:', res.status, res.headers.get('content-type'));
    const text = await res.text();
    console.log('Body:', text.substring(0, 500));
  } catch (e) {
    console.error('Fetch error:', e);
  }
}
run();
