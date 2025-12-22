import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendAppEmail, getEmailLayout, getEmailButton, getEmailHighlightCard, getAppBaseUrl } from "../_shared/email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hash token for secure storage
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Generate email HTML for password reset
function getPasswordResetEmailHtml(name: string, setPasswordUrl: string): string {
  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #f8fafc;">
      Acesso ao New Gestão 🔐
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #94a3b8;">
      Olá, <strong style="color: #f8fafc;">${name}</strong>!
    </p>
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #94a3b8;">
      Clique no botão abaixo para definir sua senha e acessar a plataforma.
    </p>
    
    ${getEmailButton('Definir Minha Senha', setPasswordUrl, 'success')}
    
    ${getEmailHighlightCard(`
      <p style="margin: 0; font-size: 14px; color: #94a3b8;">
        <strong style="color: #f8fafc;">⏰ Importante:</strong> 
        Este link expira em 24 horas.
      </p>
    `, 'warning')}
    
    <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b;">
      Se você não solicitou este acesso, pode ignorar este email com segurança.
    </p>
  `;

  return getEmailLayout(content);
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    const { email, skipSubscriptionCheck } = await req.json();

    if (!email) {
      console.error("[RESEND-LINK] Missing email");
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[RESEND-LINK] Processing request for:", email);

    // Find user by email using admin API
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) {
      console.error("[RESEND-LINK] Error listing users:", usersError);
      throw new Error("Erro ao buscar usuário");
    }

    const user = usersData?.users?.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!user) {
      console.log("[RESEND-LINK] User not found:", email);
      // Return success to prevent email enumeration
      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: "Se o email estiver cadastrado, você receberá o link em breve." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[RESEND-LINK] User found:", user.id);

    // Check for active subscription (unless skipped by admin)
    if (!skipSubscriptionCheck) {
      const { data: subscription, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("current_period_end", new Date().toISOString())
        .maybeSingle();

      if (subError) {
        console.error("[RESEND-LINK] Error checking subscription:", subError);
      }

      if (!subscription) {
        console.log("[RESEND-LINK] No active subscription for user:", user.id);
        return new Response(
          JSON.stringify({ 
            error: "Usuário não possui assinatura ativa. Entre em contato com o suporte." 
          }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("[RESEND-LINK] Active subscription found:", subscription.id);
    } else {
      console.log("[RESEND-LINK] Subscription check skipped (admin request)");
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, first_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const userName = profile?.first_name || profile?.name || "Usuário";

    // Generate custom token for password reset
    const rawToken = crypto.randomUUID() + "-" + crypto.randomUUID();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in password_tokens table
    const { error: tokenError } = await supabase
      .from("password_tokens")
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        token_preview: rawToken.substring(0, 8),
        type: "set_password",
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error("[RESEND-LINK] Error storing token:", tokenError);
      throw new Error("Erro ao gerar link de acesso");
    }

    // Build password URL
    const appBaseUrl = getAppBaseUrl();
    const passwordUrl = `${appBaseUrl}/definir-senha?token=${rawToken}`;

    console.log("[RESEND-LINK] Generated password URL");
    console.log("  - App base URL:", appBaseUrl);
    console.log("  - Token preview:", rawToken.substring(0, 8) + "...");

    // Send email
    const emailHtml = getPasswordResetEmailHtml(userName, passwordUrl);
    await sendAppEmail({
      to: email,
      subject: "Acesso ao New Gestão — Definir Senha",
      html: emailHtml,
    });

    console.log("[RESEND-LINK] Email sent successfully to:", email);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: "Link enviado com sucesso!" 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[RESEND-LINK] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar solicitação" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
