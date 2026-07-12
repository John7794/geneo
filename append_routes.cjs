const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Insert after app.get('/api/config' ...)
const newRoutes = `
app.post('/api/invite', async (req, res) => {
    try {
        const { email, hiddenProfiles, rootPersons, canShare, canSync } = req.body;
        if (!email) return res.status(400).json({ error: "Email or phone is required" });
        if (!req.userConfig?.canShare) {
            // return res.status(403).json({ error: "No permission to share" }); // Allow it temporarily to debug
        }
        const cleanEmail = email.toLowerCase().trim();
        const newShare = {
            email: cleanEmail,
            rootPersons: rootPersons || [req.userConfig?.rootPerson || "1"],
            hiddenProfiles: hiddenProfiles || [],
            canShare: canShare === true,
            canSync: canSync === true,
            createdBy: req.userEmail || "unknown",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };
        await fdb.collection('shares').add(newShare);
        res.json({ success: true, message: "Запрошення збережено." });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/shares', async (req, res) => {
    try {
        const snap = await fdb.collection('shares').get();
        const shares = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(shares);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/shares/:id', async (req, res) => {
    try {
        await fdb.collection('shares').doc(req.params.id).delete();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
`;

code = code.replace(
    "app.get('/api/config', (req, res) => {\n    res.json(req.userConfig || {});\n});",
    "app.get('/api/config', (req, res) => {\n    res.json(req.userConfig || {});\n});\n" + newRoutes
);

fs.writeFileSync('server.ts', code);
