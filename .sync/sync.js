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

if (!fs.existsSync(cfgPath)) {
  console.log("[sync] config manquante (.sync/config.json). Lance: npm run sync:configure");
  process.exit(0);
}

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
} catch (e) {
  console.error("[sync] config invalide:", e.message);
  process.exit(0);
}

const targetRepo = (cfg.targetRepo || "").trim();
const entries = Array.isArray(cfg.entries) ? cfg.entries : [];

if (!targetRepo || targetRepo.includes("{{SYNC_TARGET}}")) {
  console.log("[sync] cible non configuree. Lance: npm run sync:configure");
  process.exit(0);
}

const repoFiles = new Map();
let synced = 0;

for (const entry of entries) {
  const from = (entry.from || "").trim();
  const to = (entry.to || "").trim();
  if (!from || !to) continue;

  const src = path.resolve(root, from);
  const dest = path.resolve(root, targetRepo, to);
  const destDir = path.dirname(dest);

  if (!fs.existsSync(src) || !fs.existsSync(destDir)) continue;

  try {
    fs.copyFileSync(src, dest);
    console.log(`[sync] ${from} -> ${targetRepo}/${to}`);
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
    console.error(`[sync] erreur copie: ${e.message}`);
  }
}

try {
  execSync("git push origin HEAD", { cwd: root, stdio: "inherit", env: noPromptEnv });
} catch (e) {
  console.error(`[sync] push source echoue: ${e.message}`);
}

if (synced === 0) {
  console.log("[sync] rien a synchroniser");
  process.exit(0);
}

for (const [repoRoot, files] of repoFiles) {
  try {
    for (const f of files) {
      try {
        execSync(`git add "${f}"`, { cwd: repoRoot, stdio: "pipe" });
      } catch (_) {
      }
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
    console.log(`[sync] pushed -> ${repoRoot}`);
  } catch (e) {
    console.error(`[sync] commit/push echoue pour ${repoRoot}: ${e.message}`);
  }
}
