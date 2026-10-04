import Link from "next/link";

export default function TodayNavigation({ page }: { page: "today" | "reviews" }) {
  return <nav className="today-sections" aria-label="Today sections">
    <Link href="/" aria-current={page === "today" ? "page" : undefined}>Daily overview</Link>
    <Link href="/reviews" aria-current={page === "reviews" ? "page" : undefined}>Reviews</Link>
  </nav>;
}
