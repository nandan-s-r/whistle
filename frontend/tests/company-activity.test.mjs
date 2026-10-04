import test from 'node:test';
import assert from 'node:assert/strict';
import { companyActivity } from '../src/lib/companyActivity.ts';
test('last response is explicit founder activity, independent of source capture or analyst notes', () => {
  const result = companyActivity({interactions: [
    {kind:'Founder response',at:'2026-09-01T12:00:00Z'},
    {kind:'Analyst note',at:'2026-10-04T12:00:00Z'},
    {kind:'Founder response',at:'2026-09-09T12:00:00Z'},
    {kind:'Outbound contact',at:'2026-09-05T12:00:00Z'},
    {kind:'Founder response',at:'invalid'},
  ], sources:[{captured_at:'2026-10-01T12:00:00Z'}], observations:[{period_to:'2026-08-31'}]});
  assert.deepEqual(result, {response:'2026-09-09T12:00:00Z', contact:'2026-09-05T12:00:00Z', source:'2026-10-01T12:00:00Z', period:'2026-08-31'});
});
test('missing observations and no response remain unknown', () => {
  assert.deepEqual(companyActivity({interactions:[],sources:[]}), {response:null,contact:null,source:null,period:null});
});
