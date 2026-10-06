/**
 * Golden vectors (decisions D23): input → expected estimate / rules result, produced by the TS
 * domain and committed. The future Go pricing must reproduce them exactly; today Go already
 * replays the rules vectors (api/internal/rules) and decodes every estimate with generated types.
 *   pnpm vectors:gen   — rewrite contract/fixtures
 *   pnpm vectors:check — fail if the domain output differs from the committed vectors
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../src/config';
import { estimate } from '../src/domain/estimate';
import { applyRules } from '../src/domain/rules/engine';
import { VECTORS } from '../tests/vectors';

const root = path.resolve(import.meta.dirname, '..');
const check = process.argv.includes('--check');
const cfg = loadConfig();
let dirty = 0;

function write(rel: string, data: unknown) {
  const file = path.join(root, rel);
  const content = JSON.stringify(data, null, 2) + '\n';
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (current === content) return;
  if (check) {
    console.error(`✗ ${rel} differs from the domain output — run pnpm vectors:gen and review the diff`);
    dirty++;
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log(`✓ wrote ${rel}`);
}

for (const [name, input] of Object.entries(VECTORS)) {
  write(`contract/fixtures/pricing/${name}.json`, { name, configVersion: cfg.version, input, expected: estimate(input, cfg) });
  const r = applyRules(input, cfg.rules);
  write(`contract/fixtures/rules/${name}.json`, {
    name,
    rulesVersion: cfg.rules.version,
    input,
    expected: {
      order: r.order,
      fired: r.fired,
      tasks: r.tasks,
      hints: r.hints,
      assumptions: r.assumptions.map((a) => ({ path: a.path, value: a.value })),
    },
  });
}
if (dirty) process.exit(1);
if (check) console.log('✓ vectors are up to date');
