import { Suspense } from "react";
import Reviews from "@/components/workspace/Reviews";

export default function ReviewsPage() {
  return <Suspense fallback={<p role="status">Opening reviews…</p>}><Reviews/></Suspense>;
}
