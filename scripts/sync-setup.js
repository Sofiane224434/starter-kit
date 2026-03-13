#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const root = process.cwd();
const cfgPath = path.join(root, ".sync-config.json");
const tplPath = path.join(root, ".sync-config.template.json");

// Si .sync-config.json existe et n'a pas de placeholder, rien à faire
if (fs.existsSync(cfgPath)) {
  const existing = fs.readFileSync(cfgPath, "utf8");
  if (!existing.includes("{{SYNC_TARGET}}")) process.exit(0);
}

// Si ni config ni template, rien à faire
if (!fs.existsSync(cfgPath) && !fs.existsSync(tplPath)) process.exit(0);

const raw = fs.existsSync(cfgPath)
  ? fs.readFileSync(cfgPath, "utf8")
  : fs.readFileSync(tplPath, "utf8");

// Pas de terminal interactif (CI, install silencieux, etc.)
if (!process.stdin.isTTY) {
  console.log("[sync-setup] Lance 'npm run sync:configure' pour lier ce repo à un autre.");
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("\n[sync-setup] Ce repo n'est pas encore lié à un repo de synchronisation.");
rl.question("  Chemin relatif du repo cible (ex: ../mon-repo-contexte) : ", (answer) => {
  rl.close();
  const target = answer.trim().replace(/[/\\]+$/, "");
  if (!target) {
    console.log("[sync-setup] Ignoré. Lance 'npm run sync:configure' quand tu es prêt.");
    process.exit(0);
  }
  const updated = raw.split("{{SYNC_TARGET}}").join(target);
  fs.writeFileSync(cfgPath, updated);
  console.log(`[sync-setup] .sync-config.json configuré → ${target}`);
});
