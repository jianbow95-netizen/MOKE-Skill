import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { handle } from '../worker/server.js';
globalThis.crypto ??= webcrypto;
class Bucket {
 objects=new Map(); seq=0;
 async get(k){const x=this.objects.get(k);if(!x)return null;return{...x,body:x.bytes,json:async()=>JSON.parse(new TextDecoder().decode(x.bytes)),arrayBuffer:async()=>x.bytes.buffer.slice(x.bytes.byteOffset,x.bytes.byteOffset+x.bytes.byteLength)}}
 async head(k){return this.objects.get(k)||null}
 async put(k,v,opts={}){const old=this.objects.get(k);if(opts.onlyIf?.etagMatches&&old?.etag!==opts.onlyIf.etagMatches)return null;if(opts.onlyIf?.etagDoesNotMatch==='*'&&old)return null;const bytes=typeof v==='string'?new TextEncoder().encode(v):new Uint8Array(v);const x={etag:String(++this.seq),bytes,size:bytes.length,httpMetadata:opts.httpMetadata||{},customMetadata:opts.customMetadata||{}};this.objects.set(k,x);return x}
}
const env={BUCKET:new Bucket()},origin='https://canvas.test';
async function req(path,body,headers={}){return handle(new Request(origin+path,{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':'owner',...(body?{'Content-Type':'application/json','Origin':origin}:{}),...headers},body:body?JSON.stringify(body):undefined}),env,'test')}
async function api(body){const r=await req('/api/mutate',body);assert.equal(r.status,200,await r.clone().text());return r.json()}
async function mcp(name,args={}){return(await(await req('/mcp',{jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})).json()).result}
assert.equal((await handle(new Request(origin+'/api/board'),env,'test')).status,401);
assert.equal((await req('/api/mutate',{op:'note',prompt:'note',title:'note'},{Origin:'https://evil.test'})).status,403);
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR8sAAAAASUVORK5CYII=';
let b=await api({op:'upload',name:'参考图.png',base64:png,x:20,y:30});const ref=b.nodes[0];
assert.equal((await mcp('canvas_read_asset',{asset_id:ref.asset})).content[0].data,png);
assert.equal((await mcp('canvas_create_task',{task_id:'mcp_test',title:'测试',prompt:'白色陶瓷杯',ratio:'1:1'})).isError,undefined);await api({op:'delete',ids:['mcp_test']});
const input={op:'generate',id:'test_task',title:'产品摄影',prompt:'将图1背景换为白色，产品不变',ratio:'16:9',refs:[ref.asset],x:400,y:20};
await api(input);await api(input);b=await(await req('/api/board')).json();assert.equal(b.nodes.filter(n=>n.id==='test_task').length,1);
const claims=await Promise.all([mcp('canvas_claim_task',{task_id:'test_task'}),mcp('canvas_claim_task',{task_id:'test_task'})]);assert.equal(claims.filter(c=>!c.isError).length,1);const lease=claims.find(c=>!c.isError).structuredContent.lease_token;
assert.equal((await mcp('canvas_complete_image',{task_id:'test_task',lease_token:'wrong',base64:png})).isError,true);
await api({op:'positions',patches:[{id:'test_task',x:700,y:55,w:350}]});
const done=await mcp('canvas_complete_image',{task_id:'test_task',lease_token:lease,base64:png});assert.equal(done.structuredContent.status,'done');
b=await(await req('/api/board')).json();assert.equal(b.nodes.find(n=>n.id==='test_task').x,700);assert.equal(b.nodes.find(n=>n.id==='test_task').status,'done');assert.equal(b.nodes.some(n=>n.leaseToken),false);
assert.equal((await mcp('canvas_complete_image',{task_id:'test_task',lease_token:lease,base64:png})).isError,true);
await api({...input,id:'cancelled_task'});const cancelLease=(await mcp('canvas_claim_task',{task_id:'cancelled_task'})).structuredContent.lease_token;await api({op:'delete',ids:['cancelled_task']});assert.equal((await mcp('canvas_complete_image',{task_id:'cancelled_task',lease_token:cancelLease,base64:png})).isError,true);
const exported=await(await req('/api/export')).json();assert.equal(exported.assets.length,2);assert.equal(exported.nodes.some(n=>n.leaseToken),false);await api({op:'import',project:exported});
assert.equal((await req('/api/mutate',{op:'upload',name:'bad',base64:btoa('<svg></svg>')})).status,400);
assert.equal((await req('/api/mutate',{...input,id:'missing',refs:['missing']})).status,400);
const html=await readFile('page.html','utf8'),script=html.match(/<script>([\s\S]*)<\/script>/)[1];new Function(script);assert(!script.includes('innerHTML'));
console.log('PASS: auth, CSRF, image validation, reference read, idempotency, competing claims, real-image completion, cancellation, position preservation, export/import, browser JS syntax');
