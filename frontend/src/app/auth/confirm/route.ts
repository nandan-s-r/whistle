import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const response = NextResponse.redirect(new URL("/", request.url));
  response.headers.set("Cache-Control", "private, no-store");
  if (!url || !key)
    return NextResponse.redirect(
      new URL("/login?confirmation=failed", request.url),
    );
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers) {
        cookies.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });
  const code = request.nextUrl.searchParams.get("code");
  const hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const result = code
    ? await client.auth.exchangeCodeForSession(code)
    : hash && type === "email"
      ? await client.auth.verifyOtp({ token_hash: hash, type })
      : null;
  if (!result || result.error)
    return NextResponse.redirect(
      new URL("/login?confirmation=failed", request.url),
    );
  return response;
}
