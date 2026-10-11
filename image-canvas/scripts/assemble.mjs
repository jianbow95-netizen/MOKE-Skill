import { readFile, writeFile } from 'node:fs/promises';
const core=(await readFile('core/canvas.js','utf8')).replace(/^export /gm,'');
const page=(await readFile('page.html','utf8')).replace('/* CORE_FUNCTIONS */',core);
const server=(await readFile('worker/server.js','utf8')).replace(/^import .*from '\.\.\/core\/canvas.js';\n/,'');
await writeFile('worker/index.js','const page = '+JSON.stringify(page)+';\n'+core+'\n'+server+'\nexport default { fetch(request,env,ctx) { return handle(request,env,page); } };\n');
