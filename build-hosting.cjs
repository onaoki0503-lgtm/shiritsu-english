// Copy only public pages and runtime assets. GAS, tests and documents stay in GitHub.
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const output = path.join(root, 'dist');
fs.rmSync(output, {recursive: true, force: true});
fs.mkdirSync(output);
const files = ['index.html', 'sfc.html', 'dashboard.html', 'robots.txt', 'sitemap.xml'];
for (const name of ['arch', 'liquid', 'tracker', 'site-config', 'site-redirect']) files.push(`js/${name}.js`);
function collect(directory, extension) {
  for (const item of fs.readdirSync(path.join(root, directory), {withFileTypes: true})) {
    const relative = `${directory}/${item.name}`;
    if (item.isDirectory()) collect(relative, extension);
    else if (extension.test(item.name)) files.push(relative);
  }
}
collect('css', /\.css$/);
collect('assets', /\.(jpg|jpeg|png|webp|svg|gif|ico)$/i);
for (const relative of files) {
  const destination = path.join(output, relative);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.copyFileSync(path.join(root, relative), destination);
}
fs.writeFileSync(path.join(output, 'README.md'), '# Generated public files\n\nUpdated: 2026-10-24 / AI (Codex). Rebuild with `node build-hosting.cjs`. Excluded from hosting.\n');
console.log(`Prepared ${files.length} public files for tomoni-juku.web.app`);
