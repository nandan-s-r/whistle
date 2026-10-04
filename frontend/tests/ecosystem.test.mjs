import test from 'node:test';
import assert from 'node:assert/strict';
import {repeatedSources,reviewOutcomes,personIdentity} from '../src/lib/ecosystem.ts';
const source=(id,url,excerpt='Short generic description')=>({id,url,excerpt});
test('repeated sources keep content-defining URL parameters and ignore publicity tracking',()=>{
 assert.deepEqual(repeatedSources([source('A','https://example.org/article?id=1'),source('B','https://example.org/article?id=1&utm_source=news'),source('C','https://example.org/article?id=2')]),[{source:'B',original:'A',basis:'Same source URL'}]);
 const excerpt='An extended captured passage with specific claims and dates. '.repeat(4);
 assert.equal(repeatedSources([source('A','https://a.org',excerpt),source('B','https://b.org',excerpt.toUpperCase())])[0].basis,'Same captured excerpt');
 assert.deepEqual(repeatedSources([source('A',null),source('B',null)]),[]);
});
test('review measures retain unresolved work and do not label all completed work useful',()=>{
 const c={ai_runs:[{status:'Approved'},{status:'Rejected'},{status:'Draft'}],diligence_tasks:[{status:'Complete',changed_view:'Unchanged'},{status:'Complete',changed_view:'Weakened'},{status:'Complete'},{status:'Open'}],conditions:[{status:'Active'},{status:'Resolved'}]};
 assert.deepEqual(reviewOutcomes([c]),{drafts:3,pending:1,reviewed:2,approved:1,completed:3,assessed:2,changed:1,unacknowledged:1});
 assert.equal(personIdentity('https://www.linkedin.com/in/same/?trk=source'),'linkedin.com/in/same');assert.equal(personIdentity(null),null);
});
