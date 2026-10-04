import type { Company } from "./workspace";

function latest(values: string[]) {
  return values.filter(value => Number.isFinite(Date.parse(value))).sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}
export function companyActivity(company: Company) {
  return {
    response: latest(company.interactions.filter(item => item.kind === "Founder response").map(item => item.at)),
    contact: latest(company.interactions.filter(item => item.kind === "Outbound contact").map(item => item.at)),
    source: latest(company.sources.map(item => item.captured_at)),
    period: latest((company.observations ?? []).map(item => item.period_to)),
  };
}
