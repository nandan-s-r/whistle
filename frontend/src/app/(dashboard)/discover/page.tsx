import Discover from "@/components/workspace/Discover";
import { Suspense } from "react";
export default function DiscoverPage() {
  return <Suspense fallback={<p className="page-content" role="status">Loading discovery…</p>}><Discover/></Suspense>;
}
