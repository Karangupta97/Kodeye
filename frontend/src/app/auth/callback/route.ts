import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // ── Upsert Profile Row ────────────────────────────
      // Fetch the authenticated user to extract GitHub metadata
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: user.id,
              github_id: user.user_metadata?.user_name ?? null,
              username: user.user_metadata?.user_name ?? null,
              avatar_url: user.user_metadata?.avatar_url ?? null,
              email: user.email ?? null,
            },
            { onConflict: "id" }
          );

        if (profileError) {
          console.error("Failed to upsert profile:", profileError.message);
          // Don't block login — profile will be synced by DB trigger or next login
        }
      }

      // ── Redirect to Dashboard ─────────────────────────
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // OAuth error — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
