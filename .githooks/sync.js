#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

// repo root = dossier parent de .githooks/
const root = path.resolve(__dirname, "..");
const cfgPath = path.join(root, ".sync-config.json");

if (!fs.existsSync(cfgPath)) process.exit(0);

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
} catch (e) {
  console.error("[sync] .sync-config.json invalide :", e.message);
  process.exit(0);
}

const entries = cfg.sync ?? [];
let synced = 0;

for (const entry of entries) {
  const src = path.resolve(root, entry.from);
  if (!fs.existsSync(src)) continue;

  for (const target of entry.to ?? []) {
    const dest = path.resolve(root, target);
    const destDir = path.dirname(dest);

    // Si le dossier cible n'existe pas (repo pas cloné sur cette machine), on passe
    if (!fs.existsSync(destDir)) continue;

    try {
      fs.copyFileSync(src, dest);
      console.log(`[sync] ${entry.from} → ${target}`);
      synced++;
    } catch (e) {
      console.error(`[sync] erreur : ${e.message}`);
    }
  }
}

if (synced === 0) {
  console.log("[sync] rien à synchroniser");
}
