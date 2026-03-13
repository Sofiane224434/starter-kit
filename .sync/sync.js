#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

if (process.env.SYNC_IN_PROGRESS === "1") process.exit(0);

const noPromptEnv = {
  ...process.env,
  GCM_INTERACTIVE: "never",
  GIT_TERMINAL_PROMPT: "0",
};

const root = path.resolve(__dirname, "..");
const cfgPath = path.join(root, ".sync", "config.json");

// Lire le chemin du hub depuis package.json
let registryPath = "";
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const syncHub = pkg.syncHub || "";
  if (syncHub) registryPath = path.join(path.resolve(root, syncHub), "projects.json");
} catch (_) {}

if (!registryPath) {
  console.log("[sync] 'syncHub' manquant dans package.json. Lance: npm run sync:connect");
  process.exit(0);
}

if (!fs.existsSync(cfgPath)) {
  console.log("[sync] config manquante (.sync/config.json). Lance: npm run sync:connect");
  process.exit(0);
}

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
} catch (e) {
  console.error("[sync] config invalide:", e.message);
  process.exit(0);
}

const entries = Array.isArray(cfg.entries) ? cfg.entries : [];

if (!entries.length) {
  console.log("[sync] aucun fichier a synchroniser. Configure: npm run sync:center");
  // Push la source quand meme
  try {
    execSync("git push origin HEAD", { cwd: root, stdio: "inherit", env: noPromptEnv });
  } catch (_) {}
  process.exit(0);
}

// Lire tous les projets connectés
let allProjects = [];
try {
  const reg = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  allProjects = (Array.isArray(reg.projects) ? reg.projects : [])
    .map((p) => path.resolve(String(p || "")))
    .filter((p) => p !== root && fs.existsSync(path.join(p, ".git")));
} catch (_) {}

if (!allProjects.length) {
  console.log("[sync] aucun autre projet connecté dans ~/.sync-center/projects.json");
  try {
    execSync("git push origin HEAD", { cwd: root, stdio: "inherit", env: noPromptEnv });
  } catch (_) {}
  process.exit(0);
}

// Copier chaque entrée vers TOUS les autres projets
const repoFiles = new Map();
let synced = 0;

for (const entry of entries) {
  const from = (entry.from || "").trim();
  const to = (entry.to || "").trim();
  if (!from || !to) continue;

  const src = path.resolve(root, from);
  if (!fs.existsSync(src)) continue;

  for (const targetProject of allProjects) {
    const dest = path.resolve(targetProject, to);
    const destDir = path.dirname(dest);

    try {
      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
      console.log(`[sync] ${from} -> ${path.basename(targetProject)}/${to}`);
      synced++;

      if (!repoFiles.has(targetProject)) repoFiles.set(targetProject, []);
      repoFiles.get(targetProject).push(to);
    } catch (e) {
      console.error(`[sync] erreur copie vers ${path.basename(targetProject)}: ${e.message}`);
    }
  }
}

// Push du projet source
try {
  execSync("git push origin HEAD", { cwd: root, stdio: "inherit", env: noPromptEnv });
} catch (e) {
  console.error(`[sync] push source echoue: ${e.message}`);
}

if (synced === 0) {
  console.log("[sync] rien a synchroniser");
  process.exit(0);
}

// Commit + push dans chaque projet cible
for (const [repoRoot, files] of repoFiles) {
  try {
    for (const f of files) {
      try {
        execSync(`git add "${f}"`, { cwd: repoRoot, stdio: "pipe" });
      } catch (_) {}
    }

    const hasStagedChanges = (() => {
      try {
        execSync("git diff --cached --quiet", { cwd: repoRoot });
        return false;
      } catch (_) {
        return true;
      }
    })();

    if (!hasStagedChanges) continue;

    execSync('git commit -m "sync: auto"', {
      cwd: repoRoot,
      env: { ...noPromptEnv, SYNC_IN_PROGRESS: "1" },
      stdio: "inherit",
    });

    execSync("git push origin HEAD", { cwd: repoRoot, stdio: "inherit", env: noPromptEnv });
    console.log(`[sync] pushed -> ${path.basename(repoRoot)}`);
  } catch (e) {
    console.error(`[sync] commit/push echoue pour ${path.basename(repoRoot)}: ${e.message}`);
  }
}
