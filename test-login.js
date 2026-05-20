async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'fake-token' })
    });
    console.log('Status:', res.status, res.headers.get('content-type'));
    const text = await res.text();
    console.log('Body:', text.substring(0, 500));
  } catch (e) {
    console.error('Fetch error:', e);
  }
}
run();
