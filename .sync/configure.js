#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const root = process.cwd();
const cfgPath = path.join(root, ".sync", "config.json");
const tplPath = path.join(root, ".sync", "config.template.json");
const isInit = process.argv.includes("--init");

if (!fs.existsSync(tplPath) && !fs.existsSync(cfgPath)) process.exit(0);

const parseJson = (txt, fallback) => {
  try {
    return JSON.parse(txt);
  } catch (_) {
    return fallback;
  }
};

const template = fs.existsSync(tplPath)
  ? parseJson(fs.readFileSync(tplPath, "utf8"), { targetRepo: "{{SYNC_TARGET}}", entries: [] })
  : { targetRepo: "{{SYNC_TARGET}}", entries: [] };

const current = fs.existsSync(cfgPath)
  ? parseJson(fs.readFileSync(cfgPath, "utf8"), template)
  : template;

const base = {
  targetRepo: (current.targetRepo || "{{SYNC_TARGET}}").trim(),
  entries: Array.isArray(current.entries) ? current.entries : [],
};

const isTargetConfigured = (value) => Boolean(value && !value.includes("{{SYNC_TARGET}}"));

if (isInit && isTargetConfigured(base.targetRepo)) {
  // Deja configure: ne pas re-questionner a chaque npm install.
  process.exit(0);
}

const needsTarget = !base.targetRepo || base.targetRepo.includes("{{SYNC_TARGET}}");
if (!process.stdin.isTTY) {
  if (needsTarget) {
    console.log("[sync-config] Lance: npm run sync:configure");
  }
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));

async function ensureTarget(cfg) {
  const def = cfg.targetRepo && !cfg.targetRepo.includes("{{SYNC_TARGET}}") ? cfg.targetRepo : "";
  const answer = await ask(`Repo cible (chemin relatif)${def ? ` [${def}]` : ""}: `);
  const value = (answer || def).replace(/[/\\]+$/, "");
  if (!value) return null;
  cfg.targetRepo = value;
  return cfg;
}

function printEntries(entries) {
  if (!entries.length) {
    console.log("  (aucun fichier)");
    return;
  }
  entries.forEach((e, i) => {
    console.log(`  ${i + 1}. ${e.from} -> ${e.to}`);
  });
}

function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
  fs.writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`);
}

async function addEntry(cfg) {
  const from = await ask("  Source (dans ce repo): ");
  const to = await ask("  Destination (dans repo cible): ");
  if (from && to) {
    cfg.entries.push({ from, to });
  }
}

async function removeEntry(cfg) {
  if (!cfg.entries.length) return;
  const idx = Number(await ask("  Numero a supprimer: ")) - 1;
  if (idx >= 0 && idx < cfg.entries.length) {
    cfg.entries.splice(idx, 1);
  }
}

async function openMenu(cfg) {
  while (true) {
    console.log("\nConfiguration sync:");
    console.log(`  Cible: ${cfg.targetRepo || "(non definie)"}`);
    console.log("  Fichiers:");
    printEntries(cfg.entries);
    const action = (await ask("Action: [t]arget, [a]jouter, [s]upprimer, [q]uitter : ")).toLowerCase();
    if (action === "q" || action === "") return;
    if (action === "t") {
      const next = await ensureTarget(cfg);
      if (next) cfg = next;
      continue;
    }
    if (action === "a") {
      await addEntry(cfg);
      continue;
    }
    if (action === "s") {
      await removeEntry(cfg);
      continue;
    }
  }
}

(async () => {
  let cfg = { ...base, entries: [...base.entries] };

  if (needsTarget) {
    cfg = await ensureTarget(cfg);
    if (!cfg) {
      console.log("[sync-config] configure annulee.");
      rl.close();
      process.exit(0);
    }
  }

  if (!isInit) {
    await openMenu(cfg);
  }

  saveConfig(cfg);
  rl.close();
  console.log("[sync-config] config ecrite dans .sync/config.json");
})();
