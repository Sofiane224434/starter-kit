#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const openStudio = process.argv.includes("--open");

// Lire le chemin du hub depuis package.json
let syncHub = "";
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  syncHub = pkg.syncHub || "";
} catch (e) {
  console.error("[sync-connect] Impossible de lire package.json:", e.message);
  process.exit(1);
}

if (!syncHub) {
  console.error('[sync-connect] Ajoute "syncHub": "<chemin>" dans package.json pour pointer vers le repo sync-studio.');
  process.exit(1);
}

const hubPath = path.resolve(root, syncHub);

if (!fs.existsSync(hubPath)) {
  console.error(`[sync-connect] Hub introuvable: ${hubPath}`);
  console.error("[sync-connect] Clone le repo sync-studio et ajuste le chemin 'syncHub' dans package.json.");
  process.exit(1);
}

const registryPath = path.join(hubPath, "projects.json");

function isCompatibleRepo(repoPath) {
  return fs.existsSync(path.join(repoPath, ".git")) && fs.existsSync(path.join(repoPath, ".sync", "config.template.json"));
}

if (!isCompatibleRepo(root)) {
  console.error("[sync-connect] Repo incompatible: .sync/config.template.json manquant.");
  process.exit(1);
}

// Enregistrer ce projet dans le hub
let registry = { projects: [] };
try {
  registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  if (!Array.isArray(registry.projects)) registry.projects = [];
} catch (_) {}

const normalizedRoot = path.resolve(root);
const alreadyRegistered = registry.projects.map((p) => path.resolve(String(p || ""))).includes(normalizedRoot);

if (!alreadyRegistered) {
  registry.projects.push(normalizedRoot);
  fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
  console.log(`[sync-connect] Projet connecté: ${path.basename(normalizedRoot)}`);
} else {
  console.log(`[sync-connect] Déjà connecté: ${path.basename(normalizedRoot)}`);
}

console.log(`[sync-connect] Hub: ${hubPath}`);

if (!openStudio) {
  console.log("[sync-connect] Lance l'app: npm run sync:center");
  process.exit(0);
}

// Démarrer le serveur hub
const serverPath = path.join(hubPath, "server.js");
if (!fs.existsSync(serverPath)) {
  console.error(`[sync-connect] server.js introuvable dans ${hubPath}`);
  process.exit(1);
}

console.log("[sync-connect] Démarrage Sync Studio...");
const child = spawn(process.execPath, [serverPath, "--current", normalizedRoot], {
  stdio: "inherit",
  cwd: hubPath,
  env: process.env,
});

child.on("exit", (code) => process.exit(code || 0));
