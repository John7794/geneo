const fs = require('fs');
let ts = fs.readFileSync('server.ts', 'utf8');

const revokeRoute = `
app.delete('/api/shares/:id', async (req, res) => {
  try {
    await fdb.collection('shares').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed' });
  }
});
`;

ts = ts.replace(/app\.get\('\/api\/shares',/, revokeRoute + '\napp.get(\'/api/shares\',');
fs.writeFileSync('server.ts', ts);
console.log("Added revoke API");
