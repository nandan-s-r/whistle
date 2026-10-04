import { Library } from "@/components/workspace/Collections";
import { Suspense } from "react";
export default function LibraryPage() {
  return <Suspense fallback={<div className="page-content" role="status">Loading your investment playbook…</div>}><Library/></Suspense>;
}
