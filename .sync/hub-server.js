#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

const centerDir = path.join(os.homedir(), ".sync-center");
const registryPath = path.join(centerDir, "projects.json");
const uiPath = path.join(centerDir, "hub-ui.html");
const currentArgIndex = process.argv.indexOf("--current");
const currentProject = currentArgIndex >= 0 ? path.resolve(process.argv[currentArgIndex + 1] || "") : "";

function parseJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return fallback;
  }
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
      if (data.length > 1024 * 1024) reject(new Error("Payload trop volumineux"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
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

function isCompatibleRepo(repoPath) {
  return fs.existsSync(path.join(repoPath, ".git")) && fs.existsSync(path.join(repoPath, ".sync", "config.template.json"));
}

function readRegistry() {
  const raw = fs.existsSync(registryPath)
    ? parseJson(fs.readFileSync(registryPath, "utf8"), { projects: [] })
    : { projects: [] };

  const values = Array.isArray(raw.projects) ? raw.projects : [];
  const unique = [...new Set(values.map((p) => path.resolve(String(p || ""))))].filter((p) => isCompatibleRepo(p));
  return unique;
}

function readConfig(projectPath) {
  const cfgPath = path.join(projectPath, ".sync", "config.json");
  const tplPath = path.join(projectPath, ".sync", "config.template.json");
  const source = fs.existsSync(cfgPath)
    ? parseJson(fs.readFileSync(cfgPath, "utf8"), { targetRepo: "", entries: [] })
    : parseJson(fs.readFileSync(tplPath, "utf8"), { targetRepo: "", entries: [] });

  const targetRepo = typeof source.targetRepo === "string" ? source.targetRepo.trim() : "";
  const entries = Array.isArray(source.entries) ? source.entries : [];
  const selectedFiles = entries
    .filter((e) => e && typeof e.from === "string")
    .map((e) => e.from.trim())
    .filter(Boolean);

  const targetPath = targetRepo && !targetRepo.includes("{{SYNC_TARGET}}") ? path.resolve(projectPath, targetRepo) : "";
  return { targetPath, selectedFiles };
}

function listFiles(projectPath) {
  const root = path.resolve(projectPath);
  const ignoredDirs = new Set([".git", "node_modules", ".sync", ".idea", ".vscode"]);
  const out = [];

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full).replace(/\\/g, "/");
      if (!rel) continue;

      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) continue;
        walk(full);
        continue;
      }

      if (!entry.isFile()) continue;
      if (rel.startsWith(".sync/")) continue;
      out.push(rel);
      if (out.length >= 4000) return;
    }
  };

  walk(root);
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function sanitizeSave(body, projects) {
  const sourcePath = path.resolve(String(body?.sourcePath || ""));
  const targetPath = path.resolve(String(body?.targetPath || ""));
  const files = Array.isArray(body?.files) ? body.files : [];

  if (!projects.includes(sourcePath)) throw new Error("Source inconnue");
  if (!projects.includes(targetPath)) throw new Error("Cible inconnue");
  if (sourcePath === targetPath) throw new Error("La cible doit être différente de la source");

  const selected = [...new Set(files.map((f) => String(f || "").trim()).filter(Boolean))];
  if (!selected.length) throw new Error("Choisis au moins un fichier");

  const relTarget = path.relative(sourcePath, targetPath).replace(/\\/g, "/");
  return {
    sourcePath,
    config: {
      targetRepo: relTarget,
      entries: selected.map((f) => ({ from: f, to: f })),
    },
  };
}

if (!fs.existsSync(uiPath)) {
  console.error(`[sync-center] Interface introuvable: ${uiPath}`);
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");

  if (req.method === "GET" && url.pathname === "/api/projects") {
    const projects = readRegistry().map((projectPath) => ({
      path: projectPath,
      name: path.basename(projectPath),
    }));
    sendJson(res, 200, { currentProject, projects });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/files") {
    const projectPath = path.resolve(String(url.searchParams.get("projectPath") || ""));
    const projects = readRegistry();
    if (!projects.includes(projectPath)) {
      sendJson(res, 400, { error: "Projet inconnu" });
      return;
    }
    sendJson(res, 200, { files: listFiles(projectPath) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    const sourcePath = path.resolve(String(url.searchParams.get("sourcePath") || ""));
    const projects = readRegistry();
    if (!projects.includes(sourcePath)) {
      sendJson(res, 400, { error: "Projet inconnu" });
      return;
    }
    sendJson(res, 200, readConfig(sourcePath));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/save") {
    try {
      const projects = readRegistry();
      const body = parseJson(await readBody(req), null);
      const payload = sanitizeSave(body, projects);
      const cfgPath = path.join(payload.sourcePath, ".sync", "config.json");
      fs.writeFileSync(cfgPath, `${JSON.stringify(payload.config, null, 2)}\n`);
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
  console.log("[sync-center] Clique Fermer dans la page ou Ctrl+C.");
  openBrowser(url);
});
