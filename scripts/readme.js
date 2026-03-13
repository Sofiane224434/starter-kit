// scripts/readme.js — Met à jour les sections AUTO du README
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const README_FILE = path.join(ROOT, 'README.md');
const WATCH_MODE = process.argv.includes('--watch');
const CHECK_MODE = process.argv.includes('--check');
const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', 'conception', '.cache']);

function normalizePath(filePath = '') {
    return String(filePath).replace(/\\/g, '/');
}

function isIgnoredPath(relativePath = '') {
    const normalized = normalizePath(relativePath);
    if (!normalized) return false;
    if (normalized === 'README.md') return true;
    if (normalized === 'scripts/.translate-cache.json') return true;
    const parts = normalized.split('/');
    return parts.some((part) => IGNORE.has(part));
}

// --- Génération de l'arbre de fichiers ---
function generateTree(dir, prefix = '', depth = 0) {
    if (depth > 2) return '';
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
            .filter(e => !IGNORE.has(e.name) && !e.name.startsWith('.'));
    } catch { return ''; }

    let out = '';
    entries.forEach((entry, i) => {
        const last = i === entries.length - 1;
        out += `${prefix}${last ? '└── ' : '├── '}${entry.name}${entry.isDirectory() ? '/' : ''}\n`;
        if (entry.isDirectory()) {
            out += generateTree(path.join(dir, entry.name), prefix + (last ? '    ' : '│   '), depth + 1);
        }
    });
    return out;
}

// --- Génération du tableau des scripts ---
function generateScripts() {
    const sources = [
        { label: 'Racine', file: 'package.json' },
        { label: 'Backend (`cd backend`)', file: 'backend/package.json' },
        { label: 'Frontend (`cd frontend`)', file: 'frontend/package.json' },
    ];
    let md = '';
    for (const { label, file } of sources) {
        const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
        const scripts = Object.entries(pkg.scripts || {}).filter(([k]) => k !== 'test');
        if (!scripts.length) continue;
        md += `### ${label}\n\n| Commande | Rôle |\n|----------|------|\n`;
        for (const [cmd, run] of scripts) {
            const short = run.length > 60 ? run.slice(0, 60) + '…' : run;
            md += `| \`npm run ${cmd}\` | \`${short}\` |\n`;
        }
        md += '\n';
    }
    return md.trimEnd();
}

// --- Génération du tableau des technologies ---
function generateTech() {
    const v = (pkg, name) => (pkg.dependencies?.[name] || pkg.devDependencies?.[name] || '-').replace(/^\^|~/, '');
    const be = JSON.parse(fs.readFileSync(path.join(ROOT, 'backend/package.json'), 'utf8'));
    const fe = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend/package.json'), 'utf8'));
    const root = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

    const row = (name, ver) => `| ${name} | ${ver} |\n`;
    let md = '**Backend**\n\n| Technologie | Version |\n|-------------|----------|\n';
    md += row('Node.js', '22+');
    for (const dep of ['express', 'mysql2', 'jsonwebtoken', 'bcrypt', 'zod', '@getbrevo/brevo'])
        md += row(dep, v(be, dep));

    md += '\n**Frontend**\n\n| Technologie | Version |\n|-------------|----------|\n';
    for (const dep of ['react', 'vite', 'tailwindcss', 'react-router-dom', 'i18next', 'zod'])
        md += row(dep, v(fe, dep));

    md += '\n**Outils Racine**\n\n| Outil | Version |\n|-------|----------|\n';
    for (const dep of ['concurrently', 'deepl-node'])
        md += row(dep, v(root, dep));

    return md.trimEnd();
}

// --- Remplacement des sections AUTO dans le README ---
function updateSection(content, name, generated) {
    const s = `<!-- AUTO:${name} -->`;
    const e = `<!-- /AUTO:${name} -->`;
    return content.replace(new RegExp(`${s}[\\s\\S]*?${e}`), `${s}\n${generated}\n${e}`);
}

function buildReadmeContent() {
    let content = fs.readFileSync(README_FILE, 'utf8');
    content = updateSection(content, 'structure', `\`\`\`\nstarter-kit/\n${generateTree(ROOT)}\`\`\``);
    content = updateSection(content, 'scripts', generateScripts());
    content = updateSection(content, 'technologies', generateTech());
    return content;
}

function run({ checkOnly = false, silentIfNoChange = false } = {}) {
    const current = fs.readFileSync(README_FILE, 'utf8');
    const next = buildReadmeContent();
    const changed = next !== current;

    if (checkOnly) {
        if (changed) {
            console.error('README non a jour. Lance: npm run readme');
        } else {
            console.log('README deja a jour');
        }
        return changed;
    }

    if (changed) {
        fs.writeFileSync(README_FILE, next, 'utf8');
        console.log('README.md mis a jour');
    } else if (!silentIfNoChange) {
        console.log('README.md deja a jour');
    }

    return changed;
}

function startWatch() {
    run({ silentIfNoChange: true });
    const watchTargets = ['backend', 'frontend', 'shared', 'scripts', 'package.json', 'backend/package.json', 'frontend/package.json'];
    console.log('Mode watch actif: rappel README a chaque modification');

    let timeoutId = null;
    const onChange = (relativePath = '') => {
        if (isIgnoredPath(relativePath)) return;
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            const changedFile = normalizePath(relativePath) || 'fichier inconnu';
            console.log(`[README reminder] Changement detecte dans ${changedFile}. Verifie le README.`);
            run({ silentIfNoChange: true });
        }, 250);
    };

    for (const target of watchTargets) {
        const absoluteTarget = path.join(ROOT, target);
        if (!fs.existsSync(absoluteTarget)) continue;

        const stat = fs.statSync(absoluteTarget);
        if (stat.isDirectory()) {
            fs.watch(absoluteTarget, { recursive: true }, (_eventType, fileName) => {
                if (!fileName) {
                    onChange('fichier inconnu');
                    return;
                }
                const relativePath = path.relative(ROOT, path.join(absoluteTarget, String(fileName)));
                onChange(relativePath);
            });
            continue;
        }

        fs.watch(absoluteTarget, () => {
            onChange(path.relative(ROOT, absoluteTarget));
        });
    }
}

if (WATCH_MODE) {
    startWatch();
} else if (CHECK_MODE) {
    const changed = run({ checkOnly: true });
    if (changed) process.exit(1);
} else {
    run();
}
