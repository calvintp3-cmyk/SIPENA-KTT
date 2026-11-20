// tools/ui-codemod/codemod.mjs
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const waveArg = args.find((a) => a.startsWith('--wave='));
const wave = waveArg ? waveArg.split('=')[1] : 'all';

function getAllFiles(dir, exts = ['.vue', '.ts', '.css']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(file))) {
      results.push(fullPath.replace(/\\/g, '/'));
    }
  }
  return results;
}

function getWaveFiles(w) {
  if (w === '1') {
    return [
      'app/app.vue',
      'app/layouts/default.vue',
      'app/pages/index.vue',
      'app/pages/linimasa.vue',
      'app/pages/login.vue',
      ...getAllFiles('app/components/shared'),
      ...getAllFiles('app/components/public'),
    ];
  }
  if (w === '2') {
    return [
      'app/pages/admin/index.vue',
      'app/pages/admin/review.vue',
      'app/pages/admin/articles.vue',
      'app/pages/admin/synthesis.vue',
      'app/pages/admin/trends.vue',
      'app/pages/admin/portals.vue',
      'app/pages/admin/keywords.vue',
      'app/pages/admin/taxonomy.vue',
      'app/pages/admin/kbli.vue',
      'app/pages/admin/scrapers.vue',
      'app/pages/admin/users.vue',
    ];
  }
  if (w === '3') {
    return getAllFiles('app/components/admin');
  }
  return [
    ...getWaveFiles('1'),
    ...getWaveFiles('2'),
    ...getWaveFiles('3'),
  ];
}

// Replacement Rules
const RULES = [
  // 1. Text ink tokens
  { regex: /text-\[#737B76\]/g, replacement: 'text-ink-muted', label: 'text-[#737B76] -> text-ink-muted' },
  { regex: /text-\[#4A524E\]/g, replacement: 'text-ink-secondary', label: 'text-[#4A524E] -> text-ink-secondary' },
  { regex: /text-\[#141917\]/g, replacement: 'text-ink-primary', label: 'text-[#141917] -> text-ink-primary' },

  // 2. Surface & canvas tokens
  { regex: /bg-\[#ECEAE2\]/g, replacement: 'bg-surface-subtle', label: 'bg-[#ECEAE2] -> bg-surface-subtle' },
  { regex: /bg-\[#F0EFE9\]/g, replacement: 'bg-surface-recessed', label: 'bg-[#F0EFE9] -> bg-surface-recessed' },
  { regex: /bg-\[#F6F5F1\]/g, replacement: 'bg-canvas', label: 'bg-[#F6F5F1] -> bg-canvas' },

  // 3. Brand primary (#0B3D2E and merged #0F4C3A)
  { regex: /text-\[#0B3D2E\]/g, replacement: 'text-brand-primary', label: 'text-[#0B3D2E] -> text-brand-primary' },
  { regex: /text-\[#0F4C3A\]/g, replacement: 'text-brand-primary', label: 'text-[#0F4C3A] -> text-brand-primary' },
  { regex: /bg-\[#0B3D2E\]/g, replacement: 'bg-brand-primary', label: 'bg-[#0B3D2E] -> bg-brand-primary' },
  { regex: /bg-\[#0F4C3A\]/g, replacement: 'bg-brand-primary', label: 'bg-[#0F4C3A] -> bg-brand-primary' },
  { regex: /border-\[#0B3D2E\]/g, replacement: 'border-brand-primary', label: 'border-[#0B3D2E] -> border-brand-primary' },
  { regex: /ring-\[#0B3D2E\]/g, replacement: 'ring-brand-primary', label: 'ring-[#0B3D2E] -> ring-brand-primary' },

  // 4. Brand tint & border (#E3F0EA and merged #E7F3EE; #BBD8CB and merged #C3DFD3)
  { regex: /bg-\[#E3F0EA\]/g, replacement: 'bg-brand-tint', label: 'bg-[#E3F0EA] -> bg-brand-tint' },
  { regex: /bg-\[#E7F3EE\]/g, replacement: 'bg-brand-tint', label: 'bg-[#E7F3EE] -> bg-brand-tint' },
  { regex: /border-\[#BBD8CB\]/g, replacement: 'border-brand-border', label: 'border-[#BBD8CB] -> border-brand-border' },
  { regex: /border-\[#C3DFD3\]/g, replacement: 'border-brand-border', label: 'border-[#C3DFD3] -> border-brand-border' },

  // 5. Terracotta: fill vs text separation
  { regex: /text-\[#C8553D\]/g, replacement: 'text-terracotta-ink', label: 'text-[#C8553D] -> text-terracotta-ink' },
  { regex: /bg-\[#C8553D\]/g, replacement: 'bg-terracotta', label: 'bg-[#C8553D] -> bg-terracotta' },
  { regex: /border-\[#C8553D\]/g, replacement: 'border-terracotta', label: 'border-[#C8553D] -> border-terracotta' },
  { regex: /bg-\[#FBECE8\]/g, replacement: 'bg-terracotta-surface', label: 'bg-[#FBECE8] -> bg-terracotta-surface' },
  { regex: /bg-\[#FDF2EF\]/g, replacement: 'bg-terracotta-surface', label: 'bg-[#FDF2EF] -> bg-terracotta-surface' },
  { regex: /border-\[#F2C9BE\]/g, replacement: 'border-terracotta-border', label: 'border-[#F2C9BE] -> border-terracotta-border' },

  // 6. Ochre: fill vs text separation
  { regex: /text-\[#B45309\]/g, replacement: 'text-ochre-ink', label: 'text-[#B45309] -> text-ochre-ink' },
  { regex: /bg-\[#B45309\]/g, replacement: 'bg-ochre', label: 'bg-[#B45309] -> bg-ochre' },
  { regex: /border-\[#B45309\]/g, replacement: 'border-ochre', label: 'border-[#B45309] -> border-ochre' },
  { regex: /bg-\[#FEF7E6\]/g, replacement: 'bg-ochre-surface', label: 'bg-[#FEF7E6] -> bg-ochre-surface' },
  { regex: /border-\[#F3D89C\]/g, replacement: 'border-ochre-border', label: 'border-[#F3D89C] -> border-ochre-border' },

  // 7. Hairline borders
  { regex: /border-\[#141917\]\/\[?0\.08\]?/g, replacement: 'border-border-hairline', label: 'border-[#141917]/0.08 -> border-border-hairline' },
  { regex: /border-\[#141917\]\/\[?0\.09\]?/g, replacement: 'border-border-hairline', label: 'border-[#141917]/0.09 -> border-border-hairline' },
  { regex: /border-\[#141917\]\/10/g, replacement: 'border-border-hairline', label: 'border-[#141917]/10 -> border-border-hairline' },
  { regex: /border-\[#141917\]\/\[?0\.12\]?/g, replacement: 'border-border-control', label: 'border-[#141917]/0.12 -> border-border-control' },
];

function runCodemod() {
  const files = getWaveFiles(wave);
  console.log(`[codemod] Running for Wave ${wave} (${files.length} files, isDryRun=${isDryRun})...\n`);

  const ruleCounts = {};
  for (const r of RULES) {
    ruleCounts[r.label] = 0;
  }

  let totalReplacements = 0;
  const unmappedMatches = new Map();

  for (const relPath of files) {
    const fullPath = path.resolve(relPath);
    if (!fs.existsSync(fullPath)) continue;

    let content = fs.readFileSync(fullPath, 'utf8');
    let fileModified = false;

    for (const rule of RULES) {
      const matches = content.match(rule.regex);
      if (matches) {
        const count = matches.length;
        ruleCounts[rule.label] += count;
        totalReplacements += count;
        fileModified = true;
        if (!isDryRun) {
          content = content.replace(rule.regex, rule.replacement);
        }
      }
    }

    if (!isDryRun && fileModified) {
      fs.writeFileSync(fullPath, content, 'utf8');
    }

    // Scan for unmapped literal hex codes (e.g. text-[#...], bg-[#...]) on the transformed content
    const testContent = isDryRun
      ? RULES.reduce((acc, rule) => acc.replace(rule.regex, rule.replacement), content)
      : content;
    const hexPattern = /(text|bg|border|ring)-\[#([0-9a-fA-F]{3,8})\]/g;
    let hexMatch;
    while ((hexMatch = hexPattern.exec(testContent)) !== null) {
      const fullMatch = hexMatch[0];
      unmappedMatches.set(fullMatch, (unmappedMatches.get(fullMatch) || 0) + 1);
    }
  }

  console.log('--- REPLACEMENT COUNTS ---');
  console.table(
    Object.entries(ruleCounts)
      .filter(([, count]) => count > 0)
      .map(([rule, count]) => ({ Rule: rule, Count: count })),
  );

  console.log(`\nTotal replacements in Wave ${wave}: ${totalReplacements}`);

  if (unmappedMatches.size > 0) {
    console.log('\n--- UNMAPPED PATTERNS (Dilaporkan "tidak dipetakan") ---');
    console.table(
      Array.from(unmappedMatches.entries()).map(([pattern, count]) => ({
        Pattern: pattern,
        Count: count,
      })),
    );
  } else {
    console.log('\nAll targeted hex codes cleanly mapped!');
  }

  return { ruleCounts, totalReplacements, unmappedMatches };
}

runCodemod();
