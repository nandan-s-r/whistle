"use client";
import { usePathname } from "next/navigation";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  return path === "/login" || path === "/signup" ? (
    children
  ) : (
    <div className="auth-stage signup-stage">
      <div className="auth-form-stage">
        <div className="auth-form-container signup-container">{children}</div>
      </div>
    </div>
  );
}
