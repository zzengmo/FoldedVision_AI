import {build as viteBuild} from 'vite';
import {build as bundle} from 'esbuild';
import {mkdir,readFile,readdir,writeFile,cp} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const client=path.join(root,'.runtime/client');
await viteBuild({root,build:{outDir:client,emptyOutDir:true,rollupOptions:{input:{main:path.join(root,'index.html'),portfolio:path.join(root,'portfolio.html')}}}});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
const assets={};
async function walk(dir){for(const f of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,f.name);if(f.isDirectory())await walk(p);else{const body=await readFile(p);assets['/'+path.relative(client,p).replaceAll('\\','/')]={body:body.toString('base64'),type:types[path.extname(p)]||'application/octet-stream'};}}}
await walk(client);
await writeFile(path.join(root,'.runtime/assets.generated.mjs'),'export default '+JSON.stringify(assets)+';\n');
await mkdir(path.join(root,'dist/server'),{recursive:true});
await bundle({entryPoints:[path.join(root,'worker/index.mjs')],outfile:path.join(root,'dist/server/index.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'none'});
await mkdir(path.join(root,'dist/.openai'),{recursive:true});
await cp(path.join(root,'.openai/hosting.json'),path.join(root,'dist/.openai/hosting.json'));
await cp(path.join(root,'drizzle'),path.join(root,'dist/.openai/drizzle'),{recursive:true});
console.log(`Built inspection workspace: ${Object.keys(assets).length} assets, one Worker, D1 migrations.`);
