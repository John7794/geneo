export default async function handler(req: any, res: any) {
  try {
    const serverModule = await import('../server');
    if (!serverModule || !serverModule.app) {
      throw new Error("app export is undefined in server module");
    }
    return serverModule.app(req, res);
  } catch (e: any) {
    console.error("Vercel Initialization error:", e);
    res.status(500).json({ 
      error: "Initialization error", 
      message: e.message, 
      stack: e.stack 
    });
  }
}
