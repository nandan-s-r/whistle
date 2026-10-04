import Link from "next/link";
import Image from "next/image";

export function ScopeMark({ size = 60 }: { size?: number }) {
  return <Image src="/brand/whistle-logo.png" width={size} height={size} className="whistle-mark" alt="" aria-hidden="true" unoptimized />;
}

export function ScopeBrand({ label = "Whistle home" }: { label?: string }) {
  return <Link href="/" className="scope-brand" aria-label={label} title="Go to homepage">
    <span className="brand-symbol"><ScopeMark/></span>
    <span className="brand-wordmark">Whistle<span className="brand-os">Investment research</span></span>
  </Link>;
}
