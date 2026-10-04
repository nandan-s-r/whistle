"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useAuth} from '@/context/AuthContext';
import {useWorkspace} from '@/context/WorkspaceContext';
import {workspaceFetch,date} from '@/lib/workspace';

interface Fund {id:string;name:string;role:'Admin'|'Reviewer'|'Viewer'}
interface Member {id:number|string;name:string;email:string;role:string;active:boolean}
interface Detail extends Fund {records:{id:string;name:string;revision:number;can_write:boolean}[];members:Member[];events:{action:string;actor_id:string;at:string;detail:Record<string,unknown>}[]}
export default function FundAccess() {
  const {token}=useAuth();const {data,refresh}=useWorkspace();const [funds,setFunds]=useState<Fund[]>([]);
  const [supported,setSupported]=useState<boolean|null>(null);const [message,setMessage]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [selected,setSelected]=useState<string|null>(null);const [detail,setDetail]=useState<Detail|null>(null);
  const [name,setName]=useState('');const [email,setEmail]=useState('');const [role,setRole]=useState('Viewer');const [record,setRecord]=useState('');const [confirmed,setConfirmed]=useState(false);
  const [grantRecord,setGrantRecord]=useState('');const [grantMember,setGrantMember]=useState('');const [grantRole,setGrantRole]=useState('Viewer');
  useEffect(()=>{if(!token)return;const controller=new AbortController();workspaceFetch<{supported:boolean;funds:Fund[];message?:string}>('/funds',token,{signal:controller.signal}).then(r=>{setFunds(r.funds);setSupported(r.supported);setMessage(r.message??'');}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to load fund access.');});return ()=>controller.abort();},[token]);
  useEffect(()=>{if(!token||!selected)return;const controller=new AbortController();workspaceFetch<Detail>(`/funds/${selected}`,token,{signal:controller.signal}).then(setDetail).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to load this fund.');});return ()=>controller.abort();},[token,selected]);
  const active=detail?.id===selected?detail:null;const admin=active?.role==='Admin';const writable=['analyst','partner','admin'].includes(data?.role??'');
  async function mutate(path:string,payload:Record<string,unknown>) {
    if(!token||busy)return;setBusy(true);setError('');
    try {const out=await workspaceFetch<Fund>('/funds'+path,token,{method:'POST',body:JSON.stringify(payload)});const list=await workspaceFetch<{funds:Fund[]}>('/funds',token);setFunds(list.funds);
      const id=path?selected:out.id;if(id){setSelected(id);setDetail(await workspaceFetch<Detail>(`/funds/${id}`,token));}
      await refresh();setMessage('Saved. Access is checked again on every request. No invitation or notification was sent.');return true;
    }catch(e){setError(e instanceof Error?e.message:'Unable to save fund access.');return false;}finally{setBusy(false);}
  }
  return <div className="fund-access">
    <span className="eyebrow">SHARE WITH INTENT</span><h2>Fund workspaces</h2><p className="document-lede">Keep team research with the fund. Give people access to individual company records.</p>
    <p className="notice">Fund administrators can inspect all fund records. Other members need a deal grant. Treat sensitive meetings and IC discussions as part of a restricted deal; they are not automatically shared with the whole team.</p>
    {error&&<p role="alert" className="auth-error">{error}</p>}{message&&<p role="status" className="notice">{message}</p>}
    {supported===null&&<p role="status">Loading fund access…</p>}
    {supported&&<>
      <form className="workspace-form ecosystem-form" onSubmit={async e=>{e.preventDefault();if(await mutate('',{name}))setName('');}}><label>New fund name<input aria-label="New fund name" required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)}/></label><button className="ws-button primary" disabled={busy||!writable}>Create fund workspace</button></form>
      <label className="memory-search">Select a fund<select aria-label="Select a fund" value={selected??''} onChange={e=>{setSelected(e.target.value||null);setError('');}}><option value="">Choose a fund workspace</option>{funds.map(f=><option key={f.id} value={f.id}>{f.name} · {f.role}</option>)}</select></label>
      {selected&&!active&&<p role="status">Loading this fund…</p>}
      {active&&<><h3>{active.name} · {active.role}</h3>
        <div className="ecosystem-grid">{active.records.map(r=><article key={r.id} className="work-card"><h3>{r.name}</h3><p>{r.can_write?'Reviewer access':'Read-only access'} · revision {r.revision}</p><Link className="source-link" href={`/companies/${r.id}?tab=Overview`}>Open fund record</Link></article>)}</div>
        {!active.records.length&&<p className="notice">No company records are visible to your membership yet.</p>}
        {admin&&<>
          <h3>Members</h3><p className="muted">Use an existing account email. Adding a member gives no automatic deal access. Deactivating a member removes their deal grants and keeps fund research.</p>
          <form className="workspace-form ecosystem-form" onSubmit={async e=>{e.preventDefault();if(await mutate(`/${selected}/members`,{email,role,active:true}))setEmail('');}}><label>Teammate account email<input aria-label="Teammate account email" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Fund role<select aria-label="Fund role" value={role} onChange={e=>setRole(e.target.value)}>{['Viewer','Reviewer','Admin'].map(r=><option key={r}>{r}</option>)}</select></label><button className="ws-button secondary" disabled={busy||!writable}>Save membership</button></form>
          {active.members.map(m=><article className="fund-member" key={m.id}><div><strong>{m.name}</strong><p>{m.email} · {m.role} · {m.active?'Active':'Inactive'}</p></div><button className="ws-button secondary" disabled={busy||!writable} onClick={()=>void mutate(`/${selected}/members`,{email:m.email,role:m.role,active:!m.active})}>{m.active?'Deactivate member':'Reactivate member'}</button></article>)}
          <h3>Publish an organization-owned copy</h3><p className="muted">The copy has its own history and later edits. The personal original remains separate. Review every source, meeting, draft, memo and historical snapshot before sharing. Private file access and background jobs are not transferred.</p>
          <form className="workspace-form ecosystem-form" onSubmit={async e=>{e.preventDefault();const c=data?.companies.find(c=>c.id===record);if(c&&await mutate(`/${selected}/records`,{company_id:c.id,revision:c.revision,disclosure_confirmed:confirmed})){setConfirmed(false);setRecord('');}}}><label>Personal record to publish<select aria-label="Personal record to publish" required value={record} onChange={e=>{setRecord(e.target.value);setConfirmed(false);}}><option value="">Choose a personal record</option>{data?.companies.filter(c=>!c.fund_record).map(c=><option key={c.id} value={c.id}>{c.name} · revision {c.revision}</option>)}</select></label><label className="check-label"><input aria-label="I reviewed the entire record and history for fund disclosure" type="checkbox" required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I reviewed the entire record and history for fund disclosure.</span></label><button className="ws-button primary" disabled={busy||!writable||!confirmed||!record}>Publish fund copy</button></form>
          <h3>Deal permissions</h3><form className="workspace-form ecosystem-form" onSubmit={async e=>{e.preventDefault();await mutate(`/${selected}/records/${grantRecord}/grants`,{member_id:active?.members.find(m=>String(m.id)===grantMember)?.id,role:grantRole});}}><label>Fund record<select aria-label="Fund record" required value={grantRecord} onChange={e=>setGrantRecord(e.target.value)}><option value="">Choose a fund record</option>{active.records.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><label>Active teammate<select aria-label="Active teammate" required value={grantMember} onChange={e=>setGrantMember(e.target.value)}><option value="">Choose a teammate</option>{active.members.filter(m=>m.active).map(m=><option key={m.id} value={String(m.id)}>{m.name} · {m.email}</option>)}</select></label><label>Deal access<select aria-label="Deal access" value={grantRole} onChange={e=>setGrantRole(e.target.value)}>{['Viewer','Reviewer','Remove'].map(r=><option key={r}>{r}</option>)}</select></label><p className="muted">A Viewer membership stays read-only even if its deal grant says Reviewer.</p><button className="ws-button secondary" disabled={busy||!writable}>Save deal access</button></form>
          <details className="work-card"><summary>Recent access changes</summary>{active.events.map((a,i)=><p key={`${a.at}:${i}`}>{a.action.replaceAll('_',' ')} · account {a.actor_id} · {date(a.at)}</p>)}</details>
        </>}
      </>}
    </>}
  </div>;
}
