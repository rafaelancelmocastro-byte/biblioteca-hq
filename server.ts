import "dotenv/config";
import express, { type Request, type Response } from "express";
import path from "node:path";
import fs from "node:fs";

// API Handlers
import healthHandler from "./api/integrations/health.ts";
import comicReadHandler from "./api/storage/comic-read.ts";
import coverUrlsHandler from "./api/storage/cover-urls.ts";
import presignHandler from "./api/storage/presign.ts";
import comicCheckHandler from "./api/comics/check.ts";
import comicCreateHandler from "./api/comics/create.ts";
import comicUpdateHandler from "./api/comics/update.ts";
import comicBulkUpdateHandler from "./api/comics/bulk-update.ts";
import comicDeleteHandler from "./api/comics/delete.ts";
import seriesManageHandler from "./api/series/manage.ts";
import quickSessionHandler from "./api/auth/quick-session.ts";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

function wrapHandler(handler: (req: any, res: any) => Promise<any> | any) {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(`API Error on ${req.method} ${req.path}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Erro interno do servidor." });
      }
    }
  };
}

// Register API Routes
app.all("/api/health", wrapHandler(healthHandler));
app.all("/api/integrations/health", wrapHandler(healthHandler));
app.all("/api/storage/comic-read", wrapHandler(comicReadHandler));
app.all("/api/storage/cover-urls", wrapHandler(coverUrlsHandler));
app.all("/api/storage/presign", wrapHandler(presignHandler));
app.all("/api/storage/presign-read", wrapHandler((req, res) => {
  req.query = { ...req.query, action: "read" };
  return presignHandler(req, res);
}));
app.all("/api/storage/presign-upload", wrapHandler((req, res) => {
  req.query = { ...req.query, action: "upload" };
  return presignHandler(req, res);
}));
app.all("/api/comics/check", wrapHandler(comicCheckHandler));
app.all("/api/comics/create", wrapHandler(comicCreateHandler));
app.all("/api/comics/update", wrapHandler(comicUpdateHandler));
app.all("/api/comics/bulk-update", wrapHandler(comicBulkUpdateHandler));
app.all("/api/comics/delete", wrapHandler(comicDeleteHandler));
app.all("/api/series/manage", wrapHandler(seriesManageHandler));
app.all("/api/series/upsert", wrapHandler((req, res) => {
  req.query = { ...req.query, action: "upsert" };
  return seriesManageHandler(req, res);
}));
app.all("/api/series/delete", wrapHandler((req, res) => {
  req.query = { ...req.query, action: "delete" };
  return seriesManageHandler(req, res);
}));
app.all("/api/auth/quick-session", wrapHandler(quickSessionHandler));

const isProduction = process.env.NODE_ENV === "production";

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== "true",
        watch: process.env.DISABLE_HMR === "true" ? null : {},
      },
      appType: "spa",
    });

    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(process.cwd(), "index.html");
        let template = fs.readFileSync(indexPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
