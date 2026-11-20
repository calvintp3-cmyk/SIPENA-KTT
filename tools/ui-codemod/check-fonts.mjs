import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) results.push(...walk(full));
    else if (full.endsWith('.vue')) results.push(full);
  }
  return results;
}

const displayWeights = {};
const monoWeights = {};
const sansWeights = {};

for (const file of walk('app')) {
  const content = fs.readFileSync(file, 'utf8');
  const classMatches = content.match(/class="([^"]+)"/g) || [];
  for (const c of classMatches) {
    const tokens = c.slice(7, -1).split(/\s+/);
    const hasDisplay = tokens.includes('font-display');
    const hasMono = tokens.includes('font-mono');
    const hasSans = tokens.includes('font-sans') || (!hasDisplay && !hasMono);
    const weightToken = tokens.find(t => /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/.test(t));
    const weight = weightToken ? weightToken.replace('font-', '') : '400';

    if (hasDisplay) displayWeights[weight] = (displayWeights[weight] || 0) + 1;
    if (hasMono) monoWeights[weight] = (monoWeights[weight] || 0) + 1;
    if (hasSans) sansWeights[weight] = (sansWeights[weight] || 0) + 1;
  }
}

console.log('Bricolage Grotesque (font-display):', displayWeights);
console.log('JetBrains Mono (font-mono):', monoWeights);
console.log('Manrope (font-sans / body):', sansWeights);
