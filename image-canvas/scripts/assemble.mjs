import { readFile, writeFile } from 'node:fs/promises';
const page = await readFile('page.html','utf8');
const server = await readFile('worker/server.js','utf8');
await writeFile('worker/index.js', 'const page = '+JSON.stringify(page)+';\n'+server+'\nexport default { fetch(request,env,ctx) { return handle(request,env,page); } };\n');
