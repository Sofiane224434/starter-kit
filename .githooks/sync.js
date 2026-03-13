#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

// Garde-fou : évite la boucle infinie si ce commit vient lui-même d'un sync
if (process.env.SYNC_IN_PROGRESS === "1") process.exit(0);

// Empêche GCM d'ouvrir un popup interactif lors des push en sous-process
const noPromptEnv = {
  ...process.env,
  GCM_INTERACTIVE: "never",
  GIT_TERMINAL_PROMPT: "0",
  // Indique le compte GitHub à utiliser pour éviter le sélecteur de compte
  GIT_CONFIG_COUNT: "1",
  GIT_CONFIG_KEY_0: "credential.username",
  GIT_CONFIG_VALUE_0: "Sofiane224434",
};

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
}

// Push du repo source (toujours, qu'il y ait eu sync ou non)
try {
  execSync("git push origin HEAD", { cwd: root, stdio: "inherit", env: noPromptEnv });
} catch (e) {
  console.error(`[sync] push source échoué : ${e.message}`);
}

if (synced === 0) process.exit(0);

// Commit + push dans chaque repo cible
for (const [repoRoot, files] of repoFiles) {
  try {
    for (const f of files) {
      try {
        execSync(`git add "${f}"`, { cwd: repoRoot, stdio: "pipe" });
      } catch (_) {
        // fichier gitignoré ou inexistant dans ce repo, on passe
      }
    }
    // Rien à committer si les fichiers étaient déjà identiques
    const hasStagedChanges = (() => {
      try { execSync("git diff --cached --quiet", { cwd: repoRoot }); return false; }
      catch (_) { return true; }
    })();
    if (!hasStagedChanges) continue;
    execSync('git commit -m "sync: auto"', {
      cwd: repoRoot,
      env: { ...noPromptEnv, SYNC_IN_PROGRESS: "1" },
      stdio: "inherit",
    });
    execSync("git push origin HEAD", { cwd: repoRoot, stdio: "inherit", env: noPromptEnv });
    console.log(`[sync] pushed → ${repoRoot}`);
  } catch (e) {
    console.error(`[sync] commit/push échoué pour ${repoRoot} : ${e.message}`);
  }
}
