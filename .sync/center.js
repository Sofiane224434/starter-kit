#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

const root = process.cwd();
const workspaceRoot = path.resolve(root, "..");
const uiPath = path.join(root, ".sync", "center-ui.html");

function parseJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return fallback;
  }
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

function sendJson(res, code, payload) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
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

function isProjectDir(dirPath) {
  return fs.existsSync(path.join(dirPath, ".git")) && fs.existsSync(path.join(dirPath, ".sync", "config.template.json"));
}

function listProjects() {
  const own = [root];
  const siblings = fs.readdirSync(workspaceRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(workspaceRoot, d.name))
    .filter((d) => d !== root);

  return [...own, ...siblings]
    .filter(isProjectDir)
    .map((projectPath) => {
      const cfgPath = path.join(projectPath, ".sync", "config.json");
      const tplPath = path.join(projectPath, ".sync", "config.template.json");
      const source = fs.existsSync(cfgPath)
        ? parseJson(fs.readFileSync(cfgPath, "utf8"), {})
        : parseJson(fs.readFileSync(tplPath, "utf8"), {});

      const targetRepo = typeof source.targetRepo === "string" ? source.targetRepo : "";
      const entries = Array.isArray(source.entries) ? source.entries : [];

      return {
        name: path.basename(projectPath),
        projectPath,
        relPath: path.relative(workspaceRoot, projectPath).replace(/\\/g, "/"),
        targetRepo: targetRepo.includes("{{SYNC_TARGET}}") ? "" : targetRepo,
        entriesCount: entries.length,
      };
    });
}

function readProjectConfig(projectPath) {
  const cfgPath = path.join(projectPath, ".sync", "config.json");
  const tplPath = path.join(projectPath, ".sync", "config.template.json");

  const source = fs.existsSync(cfgPath)
    ? parseJson(fs.readFileSync(cfgPath, "utf8"), { targetRepo: "", entries: [] })
    : parseJson(fs.readFileSync(tplPath, "utf8"), { targetRepo: "", entries: [] });

  return {
    targetRepo: typeof source.targetRepo === "string" ? source.targetRepo.replace("{{SYNC_TARGET}}", "").trim() : "",
    entries: Array.isArray(source.entries)
      ? source.entries
          .filter((e) => e && typeof e.from === "string" && typeof e.to === "string")
          .map((e) => ({ from: e.from.trim(), to: e.to.trim() }))
          .filter((e) => e.from && e.to)
      : [],
  };
}

function sanitizeConfig(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Config invalide");
  }

  const targetRepo = String(input.targetRepo || "").trim().replace(/[/\\]+$/, "");
  if (!targetRepo) {
    throw new Error("Repo cible requis");
  }

  const entries = Array.isArray(input.entries)
    ? input.entries
        .map((e) => ({
          from: String(e?.from || "").trim(),
          to: String(e?.to || "").trim(),
        }))
        .filter((e) => e.from && e.to)
    : [];

  if (!entries.length) {
    throw new Error("Ajoute au moins un fichier");
  }

  return { targetRepo, entries };
}

function normalizeProjectPath(inputPath) {
  const resolved = path.resolve(inputPath || "");
  const normalizedRoot = path.resolve(workspaceRoot);
  if (!resolved.startsWith(normalizedRoot)) {
    throw new Error("Projet hors workspace");
  }
  if (!isProjectDir(resolved)) {
    throw new Error("Projet non compatible (.sync manquant)");
  }
  return resolved;
}

if (!fs.existsSync(uiPath)) {
  console.error("[sync-center] Interface introuvable: .sync/center-ui.html");
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");

  if (req.method === "GET" && url.pathname === "/api/projects") {
    sendJson(res, 200, { projects: listProjects() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/project-config") {
    try {
      const projectPath = normalizeProjectPath(url.searchParams.get("projectPath"));
      sendJson(res, 200, readProjectConfig(projectPath));
    } catch (e) {
      sendJson(res, 400, { error: e.message });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/project-config") {
    try {
      const body = parseJson(await readBody(req), null);
      const projectPath = normalizeProjectPath(body?.projectPath);
      const config = sanitizeConfig(body?.config);
      const cfgPath = path.join(projectPath, ".sync", "config.json");
      fs.writeFileSync(cfgPath, `${JSON.stringify(config, null, 2)}\n`);
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

  sendJson(res, 404, { error: "Not found" });
});

server.listen(0, "127.0.0.1", () => {
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const url = `http://127.0.0.1:${port}`;
  console.log(`[sync-center] Interface disponible: ${url}`);
  console.log("[sync-center] Ctrl+C pour fermer (ou bouton Fermer dans la page).");
  openBrowser(url);
});
