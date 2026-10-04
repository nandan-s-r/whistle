"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Company, date, responseErrorMessage } from "@/lib/workspace";
import { Icon } from "./Primitives";

export function ReviewPack({ company, memoVersion }: { company: Company; memoVersion?: number }) {
  const { token } = useAuth();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  return <div className="review-pack"><div><strong>Your complete review package</strong><p>Sources, claims, diligence and decisions in one download. A selected memo includes its PDF and editable PowerPoint; a linked financial model includes Excel. Historical versions stay frozen.</p></div>
    <button className="ws-button secondary" disabled={busy} onClick={async()=>{
      if(!token)return;setBusy(true);setError("");
      try {
        const response=await fetch(`/api/workspace/companies/${company.id}/review-pack?revision=${company.revision}${memoVersion?`&memo_version=${memoVersion}`:""}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal:AbortSignal.timeout(30000)});
        if(!response.ok){const body=await response.json().catch(()=>({detail:"Review pack unavailable. Please retry."}));throw new Error(responseErrorMessage(body, "Review pack unavailable. Please retry."));}
        const url=URL.createObjectURL(await response.blob());const anchor=document.createElement("a");anchor.href=url;anchor.download=`${company.id}-review-r${company.revision}.zip`;anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      } catch(e){setError(e instanceof Error?e.message:"Could not download research.");} finally {setBusy(false);}
    }}><Icon name="download" size={16}/>{busy?"Preparing pack…":"Download review pack"}</button>{error && <p role="alert" className="notice error">{error}</p>}
  </div>;
}

export default function MemoReview({ company, version }: { company: Company; version: number }) {
  const { act,busy,data } = useWorkspace();
  const [note,setNote]=useState("");
  const memo=company.memos.find(m=>m.version===version)!;
  const match=memo.research_hash?memo.research_hash===company.research_hash:null;
  const comments=(company.memo_comments??[]).filter(c=>c.memo_version===version);
  const active=(company.diligence_tasks??[]).filter(t=>t.status!=="Complete");
  const conflicts=company.claims.filter(c=>c.state==="Conflicted").length;
  return <section className="work-card memo-review" aria-label="Memo challenge and review">
    <div className="card-heading"><div><span className="eyebrow">REVIEW THIS VERSION</span><h2>Memo challenge & review</h2></div><span className="mini-label">VERSION {version}</span></div>
    <div className={`notice ${match===false?"warning":""}`}>{match===true?"This frozen memo matches the current research snapshot.":match===false?"Research changed after this memo was frozen. Review the changes and create a new version before relying on its recommendation.":"This earlier memo predates snapshot comparison. Review its frozen evidence against the current company record."} Comments are kept beside the memo; its text remains frozen.</div>
    <div className="review-readiness"><Link href={`/companies/${company.id}?tab=Evidence`}>{company.claims.filter(c=>c.state!=="Verified").length} claims need evidence review · {conflicts} conflicts</Link><Link href={`/companies/${company.id}?tab=Diligence`}>{active.length} diligence checks remain open</Link><Link href={`/companies/${company.id}?tab=Model`}>{memo.model_version ? `Linked frozen model v${memo.model_version}` : "Evidence-only Pass · no financial model"}</Link></div>
    {comments.map(c=><article className="memo-comment" key={c.id}><p>{c.note}</p><small>{c.author} · {date(c.at)} · memo v{c.memo_version}</small></article>)}
    {!comments.length && <p className="muted">No review comments yet. Record the strongest counter-case, the weakest evidence or a condition that would reverse the recommendation.</p>}
    <form className="workspace-form" onSubmit={async e=>{e.preventDefault();if(await act(company,{action:"memo_comment",memo_version:version,rationale:note}))setNote("");}}><label>Review comment<textarea aria-label="Review comment" required maxLength={4000} value={note} onChange={e=>setNote(e.target.value)}/></label><button className="ws-button secondary" disabled={busy || company.can_write===false || !["analyst","partner","admin"].includes(data?.role??"")}>Save review comment</button></form>
  </section>;
}
