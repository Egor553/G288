import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import app from "./api/index.js";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Polling logic moved below PORT definition

const PORT = Number(process.env.PORT) || 3000;

async function pollTelegram() {
  if (!BOT_TOKEN) {
    console.log("⚠️ TELEGRAM_BOT_TOKEN not found for polling");
    return;
  }

  console.log("🤖 Starting Telegram Long Polling...");
  let lastUpdateId = 0;

  while (true) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
      const data: any = await response.json();

      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          
          await fetch(`http://127.0.0.1:${PORT}/api/webhook`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(update)
          });
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function startServer() {
  const isProd = process.env.NODE_ENV === "production" || process.env.VITE_USER_NODE_ENV === "production";

  if (!isProd) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) return res.status(404).json({ error: "API route not found" });
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`Environment: ${isProd ? 'production' : 'development'}`);
    
    // Запускаем поллинг, если мы в продакшене или есть токен
    if (isProd && BOT_TOKEN) {
      pollTelegram();
    }
  });
}

startServer().catch(err => console.error(err));


