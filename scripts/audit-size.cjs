const fs = require('fs');
const path = require('path');

function getDirStats(dir, filterOut = []) {
  let totalBytes = 0;
  let fileCount = 0;
  const files = [];

  function walk(current) {
    if (!fs.existsSync(current)) return;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const rel = path.relative(process.cwd(), fullPath);
      if (filterOut.some(f => rel === f || rel.startsWith(f + path.sep))) {
        continue;
      }
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          totalBytes += stat.size;
          fileCount++;
          files.push({ path: rel, size: stat.size, ext: path.extname(entry.name).toLowerCase() });
        } catch (e) {}
      }
    }
  }

  walk(dir);
  return { totalBytes, fileCount, files };
}

const all = getDirStats('.');
const git = getDirStats('.git');
const nm = getDirStats('node_modules');
const dist = getDirStats('dist');
const pub = getDirStats('public');
const src = getDirStats('src');
const scribbleRef = getDirStats('scribble-rs-reference');

console.log('----------------------------------------------------');
console.log('📊 ACCURATE REPOSITORY & WORKSPACE SIZE REPORT');
console.log('----------------------------------------------------');
console.log(`Total Workspace on disk:       ${(all.totalBytes / 1024 / 1024).toFixed(2)} MB (${all.fileCount} files)`);
console.log(`node_modules:                  ${(nm.totalBytes / 1024 / 1024).toFixed(2)} MB (${nm.fileCount} files)`);
console.log(`Working Tree without NM:       ${((all.totalBytes - nm.totalBytes) / 1024 / 1024).toFixed(2)} MB`);
console.log(`.git directory:                ${(git.totalBytes / 1024 / 1024).toFixed(2)} MB (${git.fileCount} files)`);
console.log(`dist (build output):           ${(dist.totalBytes / 1024 / 1024).toFixed(2)} MB (${dist.fileCount} files)`);
console.log(`public directory:              ${(pub.totalBytes / 1024 / 1024).toFixed(2)} MB (${pub.fileCount} files)`);
console.log(`src directory:                 ${(src.totalBytes / 1024 / 1024).toFixed(2)} MB (${src.fileCount} files)`);
console.log(`scribble-rs-reference (ref):   ${(scribbleRef.totalBytes / 1024 / 1024).toFixed(2)} MB (${scribbleRef.fileCount} files)`);
console.log('----------------------------------------------------');

// Largest 50 non-node_modules files
const nonNMFiles = all.files.filter(f => !f.path.startsWith('node_modules'));
nonNMFiles.sort((a, b) => b.size - a.size);

console.log('\nTop 25 Largest Tracked / Working Files:');
nonNMFiles.slice(0, 25).forEach((f, idx) => {
  console.log(`${(idx + 1).toString().padStart(2)}. ${(f.size / 1024).toFixed(1).padStart(7)} KB - ${f.path}`);
});

// Dependency audit
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const allCode = getDirStats('src').files.concat(getDirStats('server').files).concat(getDirStats('scripts').files)
  .filter(f => /\.(tsx?|jsx?|html|css|json)$/.test(f.path))
  .map(f => fs.readFileSync(f.path, 'utf8'))
  .join('\n') + '\n' + fs.readFileSync('vite.config.ts', 'utf8');

console.log('\n----------------------------------------------------');
console.log('📦 DEPENDENCY AUDIT IN PACKAGE.JSON:');
console.log('----------------------------------------------------');
for (const dep of Object.keys(pkg.dependencies || {})) {
  const isUsed = allCode.includes(`'${dep}'`) || allCode.includes(`"${dep}"`) || allCode.includes(`'${dep}/`) || allCode.includes(`"${dep}/`);
  console.log(`${dep.padEnd(28)} : ${isUsed ? '✅ ACTIVE' : '⚠️ NOT DIRECTLY IMPORTED'}`);
}
for (const dep of Object.keys(pkg.devDependencies || {})) {
  const isUsed = allCode.includes(`'${dep}'`) || allCode.includes(`"${dep}"`) || allCode.includes(`'${dep}/`) || allCode.includes(`"${dep}/`);
  console.log(`${dep.padEnd(28)} (dev): ${isUsed ? '✅ ACTIVE' : 'ℹ️ BUILD/TOOL'}`);
}
