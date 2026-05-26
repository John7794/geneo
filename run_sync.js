fetch('http://localhost:3000/api/sync-data', {
  method: 'POST',
  headers: {
    'Cookie': 'auth_email=www.johnsel771994@gmail.com',
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(console.log).catch(console.error);
