import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export async function sendInvitationEmail(params: {
  to: string
  inviterName: string
  organizationName: string
  role: string
  token: string
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping invitation email")
    return
  }

  const acceptUrl = `${process.env.NEXTAUTH_URL}/invite/${params.token}`

  await resend.emails.send({
    from: "Grimoire <onboarding@resend.dev>",
    to: params.to,
    subject: `You've been invited to ${params.organizationName} on Grimoire`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="margin-bottom: 16px;">You're invited!</h2>
        <p>${params.inviterName} has invited you to join <strong>${params.organizationName}</strong> as a <strong>${params.role}</strong> on Grimoire.</p>
        <a href="${acceptUrl}" style="display: inline-block; margin-top: 24px; padding: 12px 24px; background: linear-gradient(135deg, #7c3aed, #db2777); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Accept Invitation</a>
        <p style="margin-top: 24px; color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
      </div>
    `,
  })
}
