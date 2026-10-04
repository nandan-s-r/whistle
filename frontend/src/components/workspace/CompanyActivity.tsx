"use client";
import { useEffect, useState } from "react";
import { Company, date } from "@/lib/workspace";
import { companyActivity } from "@/lib/companyActivity";

export function CompanyActivity({company}:{company:Company}) {
  const [at,setAt] = useState(()=>Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setAt(Date.now()),60000);return()=>window.clearInterval(timer);},[]);
  const activity = companyActivity(company);
  const pendingReply = activity.contact && (!activity.response || Date.parse(activity.contact) > Date.parse(activity.response));
  const nextMeeting = company.meetings.filter(item=>item.status==="Planned" && Date.parse(item.starts_at)>=at).sort((a,b)=>Date.parse(a.starts_at)-Date.parse(b.starts_at))[0];
  return <div className="company-activity-summary"><small className="table-subtitle">{activity.response ? `Founder reply: ${date(activity.response)}` : "No founder reply recorded"}</small>
    {activity.contact && <small className="table-subtitle">{pendingReply ? "Awaiting reply since" : "Last outbound contact:"} {date(activity.contact)}</small>}
    {nextMeeting && <small className="table-subtitle">Next meeting: {new Date(nextMeeting.starts_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</small>}
  </div>;
}
