/**
 * Audit JSX component tags vs imports in .jsx files.
 * Run: node scripts/audit-jsx-imports.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../src');

const HTML_TAGS = new Set([
  'a','abbr','address','area','article','aside','audio','b','base','bdi','bdo','blockquote','body','br','button',
  'canvas','caption','cite','code','col','colgroup','data','datalist','dd','del','details','dfn','dialog','div',
  'dl','dt','em','embed','fieldset','figcaption','figure','footer','form','h1','h2','h3','h4','h5','h6','head',
  'header','hgroup','hr','html','i','iframe','img','input','ins','kbd','label','legend','li','link','main','map',
  'mark','menu','meta','meter','nav','noscript','object','ol','optgroup','option','output','p','param','picture',
  'pre','progress','q','rp','rt','ruby','s','samp','script','section','select','slot','small','source','span',
  'strong','style','sub','summary','sup','svg','table','tbody','td','template','textarea','tfoot','th','thead',
  'time','title','tr','track','u','ul','var','video','wbr',
]);

const GLOBALS = new Set([
  'Fragment','Suspense','StrictMode','Navigate','Link','NavLink','Outlet','Route','Routes','BrowserRouter',
  'MemoryRouter','RouterProvider','createBrowserRouter',
]);

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, files);
    else if (full.endsWith('.jsx')) files.push(full);
  }
  return files;
}

function parseImports(content) {
  const names = new Set();
  const importRe = /import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]+)\})?\s*from\s+['"][^'"]+['"]/g;
  let m;
  while ((m = importRe.exec(content)) !== null) {
    if (m[1]) names.add(m[1]);
    if (m[2]) {
      m[2].split(',').forEach((part) => {
        const n = part.trim().split(/\s+as\s+/).pop().trim();
        if (n) names.add(n);
      });
    }
  }
  return names;
}

function parseLocalFunctions(content) {
  const names = new Set();
  const fnRe = /(?:export\s+)?(?:default\s+)?function\s+([A-Z][A-Za-z0-9_]*)/g;
  let m;
  while ((m = fnRe.exec(content)) !== null) names.add(m[1]);
  const constRe = /(?:export\s+)?const\s+([A-Z][A-Za-z0-9_]*)\s*=/g;
  while ((m = constRe.exec(content)) !== null) names.add(m[1]);
  return names;
}

function parseJsxTags(content) {
  const tags = new Set();
  const tagRe = /<([A-Z][A-Za-z0-9_]*)/g;
  let m;
  while ((m = tagRe.exec(content)) !== null) tags.add(m[1]);
  return tags;
}

const issues = [];

for (const file of walk(SRC)) {
  const content = fs.readFileSync(file, 'utf8');
  const imports = parseImports(content);
  const local = parseLocalFunctions(content);
  const allowed = new Set([...imports, ...local, ...GLOBALS]);
  const tags = parseJsxTags(content);
  for (const tag of tags) {
    if (HTML_TAGS.has(tag.toLowerCase()) && tag === tag.toLowerCase()) continue;
    if (!allowed.has(tag)) {
      issues.push({ file: path.relative(SRC, file), tag });
    }
  }
}

if (!issues.length) {
  console.log('No missing JSX component imports detected.');
  process.exit(0);
}

console.log('Potential undefined JSX components:');
for (const { file, tag } of issues) {
  console.log(`  ${file}: <${tag} />`);
}
process.exit(1);
