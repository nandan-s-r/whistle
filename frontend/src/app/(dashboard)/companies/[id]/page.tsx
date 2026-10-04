import { Suspense } from "react";
import CompanyWorkspace from "@/components/workspace/CompanyWorkspace";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading company context…</p>}>
      <CompanyWorkspace />
    </Suspense>
  );
}
