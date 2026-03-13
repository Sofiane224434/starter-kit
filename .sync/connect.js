#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = process.cwd();
const openStudio = process.argv.includes("--open");

const centerDir = path.join(os.homedir(), ".sync-center");
const registryPath = path.join(centerDir, "projects.json");
const appServerPath = path.join(centerDir, "hub-server.js");
const appUiPath = path.join(centerDir, "hub-ui.html");

const srcServerPath = path.join(root, ".sync", "hub-server.js");
const srcUiPath = path.join(root, ".sync", "hub-ui.html");

function parseJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (_) {
    return fallback;
  }
}

function isCompatibleRepo(repoPath) {
  return fs.existsSync(path.join(repoPath, ".git")) && fs.existsSync(path.join(repoPath, ".sync", "config.template.json"));
}

if (!isCompatibleRepo(root)) {
  console.error("[sync-connect] Repo incompatible: .sync/config.template.json manquant.");
  process.exit(1);
}

if (!fs.existsSync(srcServerPath) || !fs.existsSync(srcUiPath)) {
  console.error("[sync-connect] Fichiers hub manquants dans .sync/.");
  process.exit(1);
}

fs.mkdirSync(centerDir, { recursive: true });
fs.copyFileSync(srcServerPath, appServerPath);
fs.copyFileSync(srcUiPath, appUiPath);

const registry = fs.existsSync(registryPath)
  ? parseJson(fs.readFileSync(registryPath, "utf8"), { projects: [] })
  : { projects: [] };

const projects = Array.isArray(registry.projects) ? registry.projects : [];
const normalizedRoot = path.resolve(root);
const next = projects.filter((p) => typeof p === "string" && p && p !== normalizedRoot);
next.push(normalizedRoot);

const unique = [...new Set(next.map((p) => path.resolve(p)))].filter((p) => isCompatibleRepo(p));
fs.writeFileSync(registryPath, `${JSON.stringify({ projects: unique }, null, 2)}\n`);

console.log(`[sync-connect] Projet connecté: ${path.basename(normalizedRoot)}`);
console.log(`[sync-connect] Registry: ${registryPath}`);

if (!openStudio) {
  console.log("[sync-connect] Ouvre l'app: npm run sync:configure");
  process.exit(0);
}

const child = spawn("node", [appServerPath, "--current", normalizedRoot], {
  stdio: "inherit",
  cwd: centerDir,
  env: process.env,
});

child.on("exit", (code) => process.exit(code || 0));
