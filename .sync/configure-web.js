#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

const root = process.cwd();
const syncDir = path.join(root, ".sync");
const cfgPath = path.join(syncDir, "config.json");
const tplPath = path.join(syncDir, "config.template.json");
const uiPath = path.join(syncDir, "configure-ui.html");

const parseJson = (txt, fallback) => {
  try {
    return JSON.parse(txt);
  } catch (_) {
    return fallback;
  }
};

function readConfig() {
  const fallback = { targetRepo: "", entries: [] };
  const source = fs.existsSync(cfgPath)
    ? parseJson(fs.readFileSync(cfgPath, "utf8"), fallback)
    : fs.existsSync(tplPath)
      ? parseJson(fs.readFileSync(tplPath, "utf8"), fallback)
      : fallback;

  const targetRepo = typeof source.targetRepo === "string" ? source.targetRepo.trim() : "";
  const entries = Array.isArray(source.entries)
    ? source.entries
      .filter((item) => item && typeof item.from === "string" && typeof item.to === "string")
      .map((item) => ({ from: item.from.trim(), to: item.to.trim() }))
      .filter((item) => item.from && item.to)
    : [];

  return {
    targetRepo: targetRepo.includes("{{SYNC_TARGET}}") ? "" : targetRepo,
    entries,
  };
}

function writeConfig(config) {
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  fs.writeFileSync(cfgPath, `${JSON.stringify(config, null, 2)}\n`);
}

function sanitizeConfig(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Payload invalide");
  }

  const targetRepo = String(input.targetRepo || "").trim().replace(/[/\\]+$/, "");
  if (!targetRepo) {
    throw new Error("targetRepo est requis");
  }

  const rawEntries = Array.isArray(input.entries) ? input.entries : [];
  const entries = rawEntries
    .map((item) => ({
      from: String(item?.from || "").trim(),
      to: String(item?.to || "").trim(),
    }))
    .filter((item) => item.from && item.to);

  if (!entries.length) {
    throw new Error("Ajoute au moins un fichier a synchroniser");
  }

  return { targetRepo, entries };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1024 * 1024) {
        reject(new Error("Payload trop volumineux"));
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sendJson(res, code, payload) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function openBrowser(url) {
  const opts = { detached: true, stdio: "ignore" };
  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], opts).unref();
    return;
  }
  if (process.platform === "darwin") {
    spawn("open", [url], opts).unref();
    return;
  }
  spawn("xdg-open", [url], opts).unref();
}

if (!fs.existsSync(uiPath)) {
  console.error("[sync-ui] Interface introuvable: .sync/configure-ui.html");
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");

  if (req.method === "GET" && url.pathname === "/api/config") {
    sendJson(res, 200, readConfig());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/config") {
    try {
      const body = await readBody(req);
      const parsed = parseJson(body, null);
      const config = sanitizeConfig(parsed);
      writeConfig(config);
      sendJson(res, 200, { ok: true });
    } catch (e) {
      sendJson(res, 400, { ok: false, error: e.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/close") {
    sendJson(res, 200, { ok: true });
    setTimeout(() => server.close(() => process.exit(0)), 120);
    return;
  }

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(uiPath, "utf8"));
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found" });
});

server.listen(0, "127.0.0.1", () => {
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const url = `http://127.0.0.1:${port}`;
  console.log(`[sync-ui] Interface disponible: ${url}`);
  console.log("[sync-ui] Ctrl+C pour fermer (ou bouton Fermer dans la page).");
  openBrowser(url);
});
