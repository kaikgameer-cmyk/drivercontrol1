/**
 * Edge Function: set-password
 * 
 * Valida tokens de criação/redefinição de senha e atualiza a senha do usuário.
 * 
 * Endpoints:
 * - GET ?token=xxx  -> Valida o token e retorna informações do usuário
 * - POST { token, newPassword } -> Define a nova senha
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("=== SET-PASSWORD FUNCTION ===");
  console.log("Method:", req.method);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // GET: Validate token
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");

      if (!token) {
        console.log("❌ No token provided");
        return new Response(
          JSON.stringify({ error: "Token não fornecido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Validating token...");

      // Find token in database
      const { data: tokenData, error: tokenError } = await supabase
        .from("password_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        console.log("❌ Token not found:", tokenError?.message);
        return new Response(
          JSON.stringify({ error: "Link inválido ou não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      if (now > expiresAt) {
        console.log("❌ Token expired at:", tokenData.expires_at);
        return new Response(
          JSON.stringify({ error: "Este link expirou. Solicite um novo." }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if token was already used
      if (tokenData.used_at) {
        console.log("❌ Token already used at:", tokenData.used_at);
        return new Response(
          JSON.stringify({ error: "Este link já foi utilizado." }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user email
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(tokenData.user_id);

      if (userError || !userData?.user) {
        console.log("❌ User not found:", userError?.message);
        return new Response(
          JSON.stringify({ error: "Usuário não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("✅ Token valid for user:", userData.user.email);

      return new Response(
        JSON.stringify({
          valid: true,
          email: userData.user.email,
          type: tokenData.type,
          userId: tokenData.user_id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Set new password
    if (req.method === "POST") {
      const { token, newPassword } = await req.json();

      if (!token || !newPassword) {
        console.log("❌ Missing token or password");
        return new Response(
          JSON.stringify({ error: "Token e senha são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate password
      if (newPassword.length < 8) {
        console.log("❌ Password too short");
        return new Response(
          JSON.stringify({ error: "Senha deve ter no mínimo 8 caracteres" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (newPassword.length > 128) {
        console.log("❌ Password too long");
        return new Response(
          JSON.stringify({ error: "Senha deve ter no máximo 128 caracteres" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Setting password...");

      // Find and validate token
      const { data: tokenData, error: tokenError } = await supabase
        .from("password_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        console.log("❌ Token not found:", tokenError?.message);
        return new Response(
          JSON.stringify({ error: "Link inválido ou não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      if (now > expiresAt) {
        console.log("❌ Token expired");
        return new Response(
          JSON.stringify({ error: "Este link expirou. Solicite um novo." }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if token was already used
      if (tokenData.used_at) {
        console.log("❌ Token already used");
        return new Response(
          JSON.stringify({ error: "Este link já foi utilizado." }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update user password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        tokenData.user_id,
        { password: newPassword }
      );

      if (updateError) {
        console.error("❌ Error updating password:", updateError);
        return new Response(
          JSON.stringify({ error: "Não foi possível definir a senha. Tente novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark token as used
      const { error: markError } = await supabase
        .from("password_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", tokenData.id);

      if (markError) {
        console.error("⚠️ Error marking token as used:", markError);
        // Continue anyway, password was updated
      }

      // Get user email for response
      const { data: userData } = await supabase.auth.admin.getUserById(tokenData.user_id);

      console.log("✅ Password set successfully for user:", userData?.user?.email);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Senha definida com sucesso!",
          email: userData?.user?.email,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Unexpected error:", error?.message || String(error));
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
