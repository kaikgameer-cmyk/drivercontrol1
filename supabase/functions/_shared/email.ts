import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendAppEmail({ to, subject, html }: SendEmailParams) {
  const isTestMode = Deno.env.get("RESEND_TEST_MODE") === "true";
  const replyTo = Deno.env.get("RESEND_REPLY_TO_EMAIL") || undefined;
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");

  if (!fromEmail) {
    console.error("[EMAIL] RESEND_FROM_EMAIL não configurado");
    throw new Error("RESEND_FROM_EMAIL is required");
  }

  // Em modo de teste, envia sempre para o reply-to (email de controle)
  const finalTo = isTestMode && replyTo ? replyTo : to;

  console.log("[EMAIL] Sending email:", {
    from: fromEmail,
    to: finalTo,
    originalTo: to,
    subject,
    testMode: isTestMode,
    replyTo,
  });

  try {
    const result = await resend.emails.send({
      from: `Driver Control Suporte <${fromEmail}>`,
      to: [finalTo],
      subject,
      html,
      reply_to: replyTo,
    });

    console.log("[EMAIL] Sent successfully", {
      to: finalTo,
      subject,
      id: (result as any)?.id,
    });

    return result;
  } catch (error: any) {
    console.error("[EMAIL] Failed to send:", {
      to: finalTo,
      subject,
      error: error?.message || String(error),
    });
    throw error;
  }
}

export function getAppBaseUrl(): string {
  return Deno.env.get("APP_BASE_URL") || "https://drivercontrol.com.br";
}
