#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

// Garde-fou : évite la boucle infinie si ce commit vient lui-même d'un sync
if (process.env.SYNC_IN_PROGRESS === "1") process.exit(0);

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

// repoRoot -> [chemin relatif du fichier copié]
const repoFiles = new Map();
let synced = 0;

for (const entry of entries) {
  const src = path.resolve(root, entry.from);
  if (!fs.existsSync(src)) continue;

  for (const target of entry.to ?? []) {
    const dest = path.resolve(root, target);
    const destDir = path.dirname(dest);

    if (!fs.existsSync(destDir)) continue;

    try {
      fs.copyFileSync(src, dest);
      console.log(`[sync] ${entry.from} → ${target}`);
      synced++;

      let repoRoot;
      try {
        repoRoot = execSync("git rev-parse --show-toplevel", { cwd: destDir }).toString().trim();
      } catch (_) {
        continue;
      }

      if (!repoFiles.has(repoRoot)) repoFiles.set(repoRoot, []);
      const relPath = path.relative(repoRoot, dest).replace(/\\/g, "/");
      repoFiles.get(repoRoot).push(relPath);
    } catch (e) {
      console.error(`[sync] erreur copie : ${e.message}`);
    }
  }
}

if (synced === 0) {
  console.log("[sync] rien à synchroniser");
  process.exit(0);
}

// Push du repo source
try {
  execSync("git push origin HEAD", { cwd: root, stdio: "inherit" });
} catch (e) {
  console.error(`[sync] push source échoué : ${e.message}`);
}

// Commit + push dans chaque repo cible
for (const [repoRoot, files] of repoFiles) {
  try {
    for (const f of files) {
      execSync(`git add "${f}"`, { cwd: repoRoot, stdio: "inherit" });
    }
    // Rien à committer si les fichiers étaient déjà identiques
    const hasStagedChanges = (() => {
      try { execSync("git diff --cached --quiet", { cwd: repoRoot }); return false; }
      catch (_) { return true; }
    })();
    if (!hasStagedChanges) continue;
    execSync('git commit -m "sync: auto"', {
      cwd: repoRoot,
      env: { ...process.env, SYNC_IN_PROGRESS: "1" },
      stdio: "inherit",
    });
    execSync("git push origin HEAD", { cwd: repoRoot, stdio: "inherit" });
    console.log(`[sync] pushed → ${repoRoot}`);
  } catch (e) {
    console.error(`[sync] commit/push échoué pour ${repoRoot} : ${e.message}`);
  }
}
