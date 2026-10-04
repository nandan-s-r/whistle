import assert from 'node:assert/strict';
import test from 'node:test';
import {responseErrorMessage,workspaceFetch} from '../src/lib/workspace.ts';
test('validation errors name the field and downloads have a readable fallback',()=>{
 assert.equal(responseErrorMessage({detail:[{loc:['query','model_version'],msg:'Input should be a valid integer'}]}),'model version: Input should be a valid integer');
 assert.equal(responseErrorMessage({detail:'Research changed. Refresh first.'}),'Research changed. Refresh first.');
 assert.equal(responseErrorMessage({detail:{problem:'unstructured'}},'Download unavailable. Please retry.'),'Download unavailable. Please retry.');
});
test('timeouts and network failures are understandable without discarding abort semantics',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>{throw new DOMException('raw transport detail','TimeoutError');};
  await assert.rejects(workspaceFetch('/example','synthetic-test-only'),/This request took too long/);
  globalThis.fetch=async()=>{throw new TypeError('raw network detail');};
  await assert.rejects(workspaceFetch('/example','synthetic-test-only'),/Cannot reach the workspace/);
  globalThis.fetch=async()=>{throw new DOMException('Aborted','AbortError');};
  await assert.rejects(workspaceFetch('/example','synthetic-test-only'),e=>e.name==='AbortError');
 }finally{globalThis.fetch=original;}
});
