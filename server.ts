import express from "express";
import path from "path";
import fs from "fs";

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const rootDataPath = path.join(process.cwd(), 'data');
app.use('/data', express.static(rootDataPath));

app.get('/api/sync-data', async (req, res) => {
  res.json({ success: true, message: 'Sync not needed' });
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
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
