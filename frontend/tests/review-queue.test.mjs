import assert from "node:assert/strict";
import test from "node:test";
import { reviewQueue, triggerFired } from "../src/lib/workspace.ts";

const at = Date.parse("2026-10-03T10:00:00Z");

test('individual metric thresholds do not inherit another threshold result',()=>{
  const c=company({metrics:[{id:'renewal',value:70},{id:'runway',value:18}],triggers:[{id:'T1',metric_id:'renewal',operator:'lt',threshold:80},{id:'T2',metric_id:'runway',operator:'lt',threshold:12}]});
  assert.equal(triggerFired(c,'T1'),true);assert.equal(triggerFired(c,'T2'),false);assert.equal(triggerFired(c,'unknown'),false);
});
test('reviewed observation removes event interruption but retains overdue condition obligation',()=>{
  const condition={id:'T1',title:'Review renewal',status:'Active',owner:'Partner',due_date:'2026-10-04',rationale:'Material to renewal assumption'};
  const c=company({conditions:[condition],condition_states:{T1:'Review required'}});
  assert.equal(reviewQueue([c],at)[0].type,'Decision review');
  assert.equal(reviewQueue([{...c,condition_states:{T1:'Reviewed observation'}}],at).length,0);
  assert.equal(reviewQueue([{...c,conditions:[{...condition,due_date:'2026-10-03'}],condition_states:{T1:'Reviewed observation'}}],at)[0].type,'Decision review');
});

test("risk mitigation removes only its review obligation, preserving evidence and diligence work", () => {
  const c=company({risks:[{id:'R1',title:'Sales cycle',owner:'Risk owner',due_date:'2026-10-03'},{id:'R2',title:'Later check',due_date:'2026-10-04'},{id:'R3',title:'Already mitigated',due_date:'2026-10-01',status:'Mitigated'}],claims:[{id:'C1',state:'Conflicted'}],diligence_tasks:[{id:'T1',title:'Customer reference',status:'Open',due_date:'2026-10-03',owner:'Analyst'}]});
  const queue=reviewQueue([c],at);const risk=queue.find(x=>x.type==='Risk review');
  assert.equal(queue.filter(x=>x.type==='Risk review').length,1);assert.equal(risk.owner,'Risk owner');assert.equal(risk.href,'/companies/example?tab=Diligence&risk=R1');
  const after=reviewQueue([{...c,risks:c.risks.map(r=>({...r,status:'Mitigated'}))}],at);
  assert.deepEqual(after.map(x=>x.type).sort(),['Diligence due','Evidence conflict']);
});
const company = (changes = {}) => ({
  id: "example",
  name: "Example",
  owner: "Analyst",
  ai_runs: [],
  claims: [],
  triggers: [],
  metrics: [],
  decisions: [],
  screening: null,
  screening_created_at: null,
  portfolio: false,
  in_pipeline: true,
  watchlisted: false,
  signal_at: "2026-10-02T10:00:00Z",
  ...changes,
});

test("due diligence stays independent of claim conflicts and completed work leaves the queue",()=>{
  const c=company({claims:[{state:"Conflicted"}],diligence_tasks:[{id:"task-1",title:"Reconcile cohorts",status:"Blocked",due_date:"2026-10-02",owner:"Reviewer"},{id:"complete",status:"Complete",due_date:"2026-10-01"},{id:"future",status:"Open",due_date:"2026-10-04"}]});
  const queue=reviewQueue([c],at);
  assert.equal(queue.filter(i=>i.type==="Diligence due").length,1);
  assert.equal(queue.filter(i=>i.type==="Evidence conflict").length,1);
  const item=queue.find(i=>i.type==="Diligence due");assert.match(item.href,/work=task-1/);assert.equal(item.owner,"Reviewer");
});

test("an older pending draft remains reachable when a newer run is approved", () => {
  const c = company({
    ai_runs: [
      {
        id: "pending",
        status: "Draft",
        task: "Challenge this claim",
        created_at: "2026-10-02T12:00:00Z",
      },
      {
        id: "reviewed",
        status: "Approved",
        task: "Explain what changed",
        created_at: "2026-10-03T09:00:00Z",
      },
    ],
    claims: [{ state: "Conflicted" }],
  });
  const items = reviewQueue([c], at);
  assert.equal(items.filter((i) => i.type === "AI draft").length, 1);
  assert.equal(items.filter((i) => i.type === "Evidence conflict").length, 1);
  assert.match(items.find((i) => i.type === "AI draft").href, /draft=pending/);
});

test("portfolio membership alone does not generate an alert", () => {
  const c = company({
    portfolio: true,
    metrics: [{ id: "runway", value: 14 }],
    triggers: [{ metric_id: "runway", operator: "lt", threshold: 12 }],
  });
  assert.equal(reviewQueue([c], at).length, 0);
  assert.equal(
    reviewQueue([{ ...c, metrics: [{ id: "runway", value: 10 }] }], at)[0].type,
    "Portfolio alert",
  );
});

test("a decided screening brief stays out of the queue until a new screen is generated", () => {
  const c = company({
    screening: "Cited brief",
    screening_created_at: "2026-10-02T10:00:00Z",
    decisions: [{ at: "2026-10-02T11:00:00Z" }],
  });
  assert.equal(reviewQueue([c], at).length, 0);
  const refreshed = reviewQueue(
    [{ ...c, screening_created_at: "2026-10-03T09:00:00Z" }],
    at,
  );
  assert.equal(refreshed[0].type, "Screening ready");
  assert.equal(refreshed[0].state, "Needs review");
});

test("legacy screens with recorded decisions are not repeatedly assigned for review", () => {
  assert.equal(
    reviewQueue(
      [
        company({
          screening: "Older brief",
          decisions: [{ at: "2026-10-02T10:00:00Z" }],
        }),
      ],
      at,
    ).length,
    0,
  );
});

test("old, future-dated and already watchlisted founder signals do not appear as new", () => {
  const c = company({ in_pipeline: false });
  assert.equal(reviewQueue([c], at)[0].type, "Founder signal");
  assert.equal(reviewQueue([{ ...c, watchlisted: true }], at).length, 0);
  assert.equal(
    reviewQueue([{ ...c, signal_at: "2026-08-01T10:00:00Z" }], at).length,
    0,
  );
  assert.equal(
    reviewQueue([{ ...c, signal_at: "2026-10-04T10:00:00Z" }], at).length,
    0,
  );
});
