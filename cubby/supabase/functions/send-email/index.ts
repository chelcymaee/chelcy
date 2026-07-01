// ─── send-email Edge Function ─────────────────────────────────────────────────
//
// Single entry point for all Cubby transactional emails via Resend.
//
// Called in two ways:
//
//   1. Direct HTTP call from another edge function:
//      POST /functions/v1/send-email
//      Header: x-admin-secret: <ADMIN_SECRET>
//      Body: { emailType: 'booking_confirmed', data: { ... } }
//
//   2. Supabase Database Webhook (automatic, no auth header):
//      Body: { type: 'INSERT'|'UPDATE', table: string, record: {...}, old_record: {...} }
//      The function detects the table and fires the right email.
//
// NEVER throws — email failure is logged but user action is never blocked.
//
// Required secrets (supabase secrets set):
//   RESEND_API_KEY       — from resend.com dashboard
//   ADMIN_EMAIL          — e.g. chelcymae1@gmail.com
//   ADMIN_SECRET         — already set (shared with other functions)
//   SUPABASE_URL         — auto-set by Supabase
//   SUPABASE_SERVICE_ROLE_KEY — auto-set by Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY     = Deno.env.get('RESEND_API_KEY') ?? '';
const ADMIN_EMAIL        = Deno.env.get('ADMIN_EMAIL') ?? 'chelcymae1@gmail.com';
const ADMIN_SECRET       = Deno.env.get('ADMIN_SECRET') ?? 'cubby-admin-secret-2025';
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Until domain is verified on Resend, use their shared testing sender.
// Change to 'Cubby <noreply@mycubby.co.za>' once the domain is added to Resend.
const FROM = 'Cubby <onboarding@resend.dev>';

// ─── Resend API ───────────────────────────────────────────────────────────────

async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[send-email] RESEND_API_KEY not set — email skipped:', opts.subject);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[send-email] Resend error:', res.status, err);
  } else {
    console.log('[send-email] Sent:', opts.subject, '→', opts.to);
  }
}

// ─── HTML wrapper ─────────────────────────────────────────────────────────────

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cubby</title>
</head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#FF5C5C;padding:24px 32px;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.5px;">📦 Cubby</p>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">Bag storage, simplified.</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #F3F4F6;background:#FAFAFA;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
                © 2025 Cubby · Cape Town, South Africa<br/>
                <a href="https://mycubby.co.za" style="color:#FF5C5C;text-decoration:none;">mycubby.co.za</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(text: string, href: string): string {
  return `<p style="margin:24px 0 0;">
    <a href="${href}" style="display:inline-block;background:#FF5C5C;color:#FFFFFF;font-size:15px;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;">${text}</a>
  </p>`;
}

function pill(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:14px;color:#6B7280;width:40%;">${label}</td>
    <td style="padding:6px 0;font-size:14px;color:#1A1A1A;font-weight:600;">${value}</td>
  </tr>`;
}

// ─── Email Templates ──────────────────────────────────────────────────────────

function tmpl_booking_confirmed(d: {
  travellerName: string; hostName: string; location: string;
  dropOffDate: string; dropOffTime: string; pickUpDate: string; pickUpTime: string;
  bagCount: number; totalPrice: number; pinCode: string;
}): { subject: string; html: string; text: string } {
  const subject = `Your booking is confirmed — ${d.hostName}`;
  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1A1A1A;">Booking confirmed ✅</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#6B7280;">Hi ${d.travellerName}, your bags are all set.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tbody>
        ${pill('Host', d.hostName)}
        ${pill('Location', d.location)}
        ${pill('Drop-off', `${d.dropOffDate} · ${d.dropOffTime}`)}
        ${pill('Pick-up', `${d.pickUpDate} · ${d.pickUpTime}`)}
        ${pill('Bags', String(d.bagCount))}
        ${pill('Total paid', `R${d.totalPrice}`)}
      </tbody>
    </table>
    <div style="background:#FFF0F0;border-radius:12px;padding:20px;text-align:center;margin-bottom:8px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#FF5C5C;letter-spacing:0.5px;">YOUR DROP-OFF PIN</p>
      <p style="margin:0;font-size:40px;font-weight:800;color:#1A1A1A;letter-spacing:8px;">${d.pinCode}</p>
      <p style="margin:8px 0 0;font-size:12px;color:#6B7280;">Show this to the host when you drop off your bags</p>
    </div>
    <p style="font-size:13px;color:#9CA3AF;margin:16px 0 0;">Questions? Open the Cubby app or reply to this email.</p>
  `);
  const text = `Booking confirmed — ${d.hostName}\n\nHi ${d.travellerName},\n\nYour bags are confirmed at ${d.hostName} (${d.location}).\n\nDrop-off: ${d.dropOffDate} · ${d.dropOffTime}\nPick-up: ${d.pickUpDate} · ${d.pickUpTime}\nBags: ${d.bagCount}\nTotal: R${d.totalPrice}\n\nYour PIN: ${d.pinCode}\n\nShow this to the host when you arrive.\n\n— Cubby`;
  return { subject, html, text };
}

function tmpl_new_booking_request(d: {
  hostName: string; travellerName: string;
  dropOffDate: string; dropOffTime: string; pickUpDate: string; pickUpTime: string;
  bagCount: number; totalPrice: number;
}): { subject: string; html: string; text: string } {
  const subject = `New booking request from ${d.travellerName}`;
  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1A1A1A;">New booking 🎒</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#6B7280;">Hi ${d.hostName}, you have a new confirmed booking.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tbody>
        ${pill('Traveller', d.travellerName)}
        ${pill('Drop-off', `${d.dropOffDate} · ${d.dropOffTime}`)}
        ${pill('Pick-up', `${d.pickUpDate} · ${d.pickUpTime}`)}
        ${pill('Bags', String(d.bagCount))}
        ${pill('You earn', `R${Math.round(d.totalPrice * 0.7)}`)}
      </tbody>
    </table>
    <p style="font-size:13px;color:#6B7280;margin:0;">Open the Cubby app to view booking details and message the traveller.</p>
  `);
  const text = `New booking from ${d.travellerName}\n\nHi ${d.hostName},\n\nYou have a new booking.\n\nTraveller: ${d.travellerName}\nDrop-off: ${d.dropOffDate} · ${d.dropOffTime}\nPick-up: ${d.pickUpDate} · ${d.pickUpTime}\nBags: ${d.bagCount}\nYour earnings: R${Math.round(d.totalPrice * 0.7)}\n\nOpen the Cubby app to view details.\n\n— Cubby`;
  return { subject, html, text };
}

function tmpl_booking_cancelled(d: {
  recipientName: string; hostName: string; location: string;
  dropOffDate: string; dropOffTime: string; bagCount: number;
  cancelledBy: 'traveller' | 'host' | 'system';
}): { subject: string; html: string; text: string } {
  const subject = `Booking cancelled — ${d.hostName}`;
  const byStr = d.cancelledBy === 'traveller' ? 'the traveller' : d.cancelledBy === 'host' ? 'the host' : 'the system';
  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1A1A1A;">Booking cancelled ❌</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#6B7280;">Hi ${d.recipientName}, a booking has been cancelled by ${byStr}.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tbody>
        ${pill('Host', d.hostName)}
        ${pill('Location', d.location)}
        ${pill('Was scheduled', `${d.dropOffDate} · ${d.dropOffTime}`)}
        ${pill('Bags', String(d.bagCount))}
      </tbody>
    </table>
    <p style="font-size:13px;color:#6B7280;margin:0;">If you have questions, open the Cubby app or reply to this email.</p>
  `);
  const text = `Booking cancelled — ${d.hostName}\n\nHi ${d.recipientName},\n\nA booking at ${d.hostName} (${d.location}) has been cancelled by ${byStr}.\n\nScheduled: ${d.dropOffDate} · ${d.dropOffTime}\nBags: ${d.bagCount}\n\n— Cubby`;
  return { subject, html, text };
}

function tmpl_support_received(d: {
  userEmail: string; subject: string; message: string; submittedAt: string;
}): { subject: string; html: string; text: string } {
  const emailSubject = `[Support] ${d.subject}`;
  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1A1A1A;">New support message 💬</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#6B7280;">A user has submitted a support request.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tbody>
        ${pill('From', d.userEmail)}
        ${pill('Subject', d.subject)}
        ${pill('Received', d.submittedAt)}
      </tbody>
    </table>
    <div style="background:#F9FAFB;border-left:4px solid #FF5C5C;padding:16px;border-radius:0 8px 8px 0;margin-bottom:16px;">
      <p style="margin:0;font-size:14px;color:#1A1A1A;line-height:1.6;">${d.message.replace(/\n/g, '<br/>')}</p>
    </div>
    <p style="font-size:13px;color:#6B7280;">Reply to this email to respond, or view in the Cubby admin panel.</p>
  `);
  const text = `New support message\n\nFrom: ${d.userEmail}\nSubject: ${d.subject}\nReceived: ${d.submittedAt}\n\n${d.message}\n\n— Cubby Admin`;
  return { subject: emailSubject, html, text };
}

function tmpl_partner_application(d: {
  name: string; email: string; phone: string; businessName: string;
  businessType: string; location: string; storageCapacity: number; message: string;
  submittedAt: string;
}): { subject: string; html: string; text: string } {
  const subject = `[Partner Application] ${d.businessName || d.name}`;
  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1A1A1A;">New partner application 🤝</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#6B7280;">Someone wants to become a Cubby host.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tbody>
        ${pill('Name', d.name)}
        ${pill('Email', d.email)}
        ${pill('Phone', d.phone || '—')}
        ${pill('Business', d.businessName || '—')}
        ${pill('Type', d.businessType || '—')}
        ${pill('Location', d.location || '—')}
        ${pill('Capacity', d.storageCapacity ? `${d.storageCapacity} bags` : '—')}
        ${pill('Submitted', d.submittedAt)}
      </tbody>
    </table>
    ${d.message ? `<div style="background:#F9FAFB;border-left:4px solid #FF5C5C;padding:16px;border-radius:0 8px 8px 0;margin-bottom:16px;"><p style="margin:0;font-size:14px;color:#1A1A1A;line-height:1.6;">${d.message.replace(/\n/g, '<br/>')}</p></div>` : ''}
    <p style="font-size:13px;color:#6B7280;">Review and approve in the Cubby admin panel.</p>
  `);
  const text = `New partner application\n\nName: ${d.name}\nEmail: ${d.email}\nPhone: ${d.phone}\nBusiness: ${d.businessName}\nType: ${d.businessType}\nLocation: ${d.location}\nCapacity: ${d.storageCapacity} bags\n\n${d.message}\n\n— Cubby Admin`;
  return { subject, html, text };
}

function tmpl_verification_submitted(d: {
  userName: string; userEmail: string; submittedAt: string;
}): { subject: string; html: string; text: string } {
  const subject = `[Verification] ${d.userName} submitted documents`;
  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1A1A1A;">Verification submitted 🪪</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#6B7280;">A traveller has submitted identity documents for review.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tbody>
        ${pill('Name', d.userName)}
        ${pill('Email', d.userEmail)}
        ${pill('Submitted', d.submittedAt)}
      </tbody>
    </table>
    <p style="font-size:13px;color:#6B7280;">Review the documents in the Cubby admin panel and approve or reject.</p>
  `);
  const text = `Verification submitted\n\nName: ${d.userName}\nEmail: ${d.userEmail}\nSubmitted: ${d.submittedAt}\n\nReview in admin panel.\n\n— Cubby Admin`;
  return { subject, html, text };
}

function tmpl_verification_decision(d: {
  userName: string; status: 'approved' | 'rejected';
}): { subject: string; html: string; text: string } {
  const approved = d.status === 'approved';
  const subject = approved
    ? 'Your identity has been verified ✅'
    : 'Verification update — action needed';
  const html = wrap(approved
    ? `
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1A1A1A;">You're verified ✅</h1>
      <p style="margin:0 0 16px;font-size:16px;color:#6B7280;">Hi ${d.userName}, your identity has been verified by the Cubby team.</p>
      <div style="background:#DCFCE7;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0;font-size:15px;color:#15803D;font-weight:600;">🎉 Verified Traveller badge unlocked</p>
        <p style="margin:8px 0 0;font-size:14px;color:#166534;">Hosts can now see that you're a verified traveller, which increases trust and may help you get bookings approved faster.</p>
      </div>
      <p style="font-size:13px;color:#6B7280;">Open the Cubby app to see your verified badge.</p>
    `
    : `
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1A1A1A;">Verification not approved</h1>
      <p style="margin:0 0 16px;font-size:16px;color:#6B7280;">Hi ${d.userName}, unfortunately we were unable to verify your identity with the documents submitted.</p>
      <div style="background:#FEF2F2;border-radius:12px;padding:20px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#991B1B;line-height:1.6;">Common reasons: blurry photo, expired ID, or the selfie didn't match the ID. Please try again with clear, valid documents.</p>
      </div>
      <p style="font-size:13px;color:#6B7280;">Open the Cubby app to re-submit your documents.</p>
    `
  );
  const text = approved
    ? `You're verified!\n\nHi ${d.userName},\n\nYour identity has been verified. Your Verified Traveller badge is now active.\n\n— Cubby`
    : `Verification not approved\n\nHi ${d.userName},\n\nWe were unable to verify your identity. Please re-submit clear, valid documents in the Cubby app.\n\n— Cubby`;
  return { subject, html, text };
}

function tmpl_review_prompt(d: {
  recipientName: string; otherPartyName: string; role: 'traveller' | 'host';
  appUrl?: string;
}): { subject: string; html: string; text: string } {
  const subject = d.role === 'traveller'
    ? `How was your stay with ${d.otherPartyName}?`
    : `How was ${d.otherPartyName} as a traveller?`;
  const cta = d.role === 'traveller' ? 'Leave a review' : 'Review your traveller';
  const appUrl = d.appUrl ?? 'https://mycubby.co.za';
  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1A1A1A;">Share your experience ⭐</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#6B7280;">Hi ${d.recipientName}, your booking with ${d.otherPartyName} is complete. Let the community know how it went!</p>
    <div style="background:#FFF0F0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#1A1A1A;line-height:1.6;">Reviews help build trust in the Cubby community and help ${d.role === 'traveller' ? 'other travellers find great hosts' : 'hosts know who to welcome'}. It only takes 30 seconds.</p>
    </div>
    ${btn(cta, appUrl)}
    <p style="font-size:12px;color:#9CA3AF;margin:16px 0 0;">The review window closes after 7 days.</p>
  `);
  const text = `Share your experience\n\nHi ${d.recipientName},\n\nYour booking with ${d.otherPartyName} is complete. Please take a moment to leave a review.\n\nOpen the Cubby app to ${cta.toLowerCase()}.\n\n— Cubby`;
  return { subject, html, text };
}

function tmpl_review_received(d: {
  recipientName: string; reviewerName: string; rating: number; comment?: string;
  role: 'traveller' | 'host';
}): { subject: string; html: string; text: string } {
  const subject = `${d.reviewerName} left you a review`;
  const stars = '★'.repeat(d.rating) + '☆'.repeat(5 - d.rating);
  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1A1A1A;">New review received 🙌</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#6B7280;">Hi ${d.recipientName}, ${d.reviewerName} left you a review.</p>
    <div style="background:#F9FAFB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:24px;color:#F59E0B;">${stars}</p>
      ${d.comment ? `<p style="margin:0;font-size:15px;color:#1A1A1A;line-height:1.6;font-style:italic;">"${d.comment}"</p>` : ''}
    </div>
    <p style="font-size:13px;color:#6B7280;">Open the Cubby app to see your full rating profile.</p>
  `);
  const text = `New review from ${d.reviewerName}\n\nHi ${d.recipientName},\n\n${stars} ${d.rating}/5\n\n${d.comment ? `"${d.comment}"\n\n` : ''}Open the Cubby app to view your profile.\n\n— Cubby`;
  return { subject, html, text };
}

function tmpl_milestone_reached(d: {
  hostName: string; milestone: string; detail: string;
}): { subject: string; html: string; text: string } {
  const subject = `🎉 Milestone reached — ${d.milestone}`;
  const html = wrap(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1A1A1A;">You hit a milestone! 🎉</h1>
    <p style="margin:0 0 24px;font-size:16px;color:#6B7280;">Hi ${d.hostName}, congratulations on your latest achievement.</p>
    <div style="background:#DCFCE7;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:32px;">🏆</p>
      <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#15803D;">${d.milestone}</p>
      <p style="margin:0;font-size:14px;color:#166534;">${d.detail}</p>
    </div>
    <p style="font-size:13px;color:#6B7280;">Keep it up — travellers love great hosts. Open the Cubby app to see your full stats.</p>
  `);
  const text = `Milestone reached!\n\nHi ${d.hostName},\n\n🏆 ${d.milestone}\n${d.detail}\n\nOpen the Cubby app to see your stats.\n\n— Cubby`;
  return { subject, html, text };
}

// ─── DB Webhook Handlers ──────────────────────────────────────────────────────

async function handleDbWebhook(payload: any): Promise<void> {
  const { type, table, record, old_record } = payload;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // support_messages INSERT
  if (table === 'support_messages' && type === 'INSERT') {
    const tmpl = tmpl_support_received({
      userEmail: record.user_email ?? 'unknown',
      subject: record.subject,
      message: record.message,
      submittedAt: new Date(record.created_at).toLocaleString('en-ZA'),
    });
    await sendViaResend({ to: ADMIN_EMAIL, ...tmpl });
    return;
  }

  // partner_applications INSERT
  if (table === 'partner_applications' && type === 'INSERT') {
    const tmpl = tmpl_partner_application({
      name: record.name,
      email: record.email,
      phone: record.phone ?? '',
      businessName: record.business_name ?? '',
      businessType: record.business_type ?? '',
      location: record.location ?? '',
      storageCapacity: record.storage_capacity ?? 0,
      message: record.message ?? '',
      submittedAt: new Date(record.created_at).toLocaleString('en-ZA'),
    });
    await sendViaResend({ to: ADMIN_EMAIL, ...tmpl });
    return;
  }

  // verifications INSERT → notify admin
  if (table === 'verifications' && type === 'INSERT') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', record.user_id)
      .single();
    const tmpl = tmpl_verification_submitted({
      userName: profile?.full_name ?? 'Unknown',
      userEmail: profile?.email ?? 'unknown',
      submittedAt: new Date(record.submitted_at ?? record.created_at).toLocaleString('en-ZA'),
    });
    await sendViaResend({ to: ADMIN_EMAIL, ...tmpl });
    return;
  }

  // verifications UPDATE → notify traveller of decision
  if (table === 'verifications' && type === 'UPDATE') {
    const newStatus = record.status;
    const oldStatus = old_record?.status;
    if ((newStatus === 'approved' || newStatus === 'rejected') && oldStatus !== newStatus) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', record.user_id)
        .single();
      if (!profile?.email) return;
      const tmpl = tmpl_verification_decision({
        userName: profile.full_name ?? 'there',
        status: newStatus,
      });
      await sendViaResend({ to: profile.email, ...tmpl });
    }
    return;
  }

  // bookings UPDATE → cancelled notification
  if (table === 'bookings' && type === 'UPDATE') {
    if (record.status === 'cancelled' && old_record?.status !== 'cancelled') {
      // Fetch booking details
      const { data: booking } = await supabase
        .from('bookings')
        .select('traveller_id, host_id, drop_off_date, drop_off_time, bag_count')
        .eq('id', record.id)
        .single();
      if (!booking) return;

      const [{ data: traveller }, { data: host }, { data: hostOwner }] = await Promise.all([
        supabase.from('profiles').select('full_name, email').eq('id', booking.traveller_id).single(),
        supabase.from('hosts').select('display_name, location_name, user_id, assigned_user_id').eq('id', booking.host_id).single(),
        supabase.from('profiles').select('email').eq('id', (await supabase.from('hosts').select('user_id, assigned_user_id').eq('id', booking.host_id).single()).data?.assigned_user_id ?? (await supabase.from('hosts').select('user_id').eq('id', booking.host_id).single()).data?.user_id ?? '').single(),
      ]);

      const base = {
        hostName: host?.display_name ?? 'your host',
        location: host?.location_name ?? '',
        dropOffDate: record.drop_off_date ?? booking.drop_off_date,
        dropOffTime: record.drop_off_time ?? booking.drop_off_time,
        bagCount: record.bag_count ?? booking.bag_count,
        cancelledBy: 'system' as const,
      };

      if (traveller?.email) {
        const tmpl = tmpl_booking_cancelled({ ...base, recipientName: traveller.full_name ?? 'Traveller' });
        await sendViaResend({ to: traveller.email, ...tmpl });
      }
    }
    return;
  }

  console.log('[send-email] Unhandled webhook:', table, type);
}

// ─── Direct Call Handlers ─────────────────────────────────────────────────────

async function handleDirect(body: any): Promise<Response> {
  const { emailType, data } = body;
  let tmpl: { subject: string; html: string; text: string } | null = null;
  let to: string = data?.to ?? ADMIN_EMAIL;

  switch (emailType) {
    case 'booking_confirmed':
      tmpl = tmpl_booking_confirmed(data);
      to = data.travellerEmail;
      break;
    case 'new_booking_request':
      tmpl = tmpl_new_booking_request(data);
      to = data.hostEmail;
      break;
    case 'booking_cancelled':
      tmpl = tmpl_booking_cancelled(data);
      to = data.recipientEmail;
      break;
    case 'support_received':
      tmpl = tmpl_support_received(data);
      to = ADMIN_EMAIL;
      break;
    case 'partner_application':
      tmpl = tmpl_partner_application(data);
      to = ADMIN_EMAIL;
      break;
    case 'verification_submitted':
      tmpl = tmpl_verification_submitted(data);
      to = ADMIN_EMAIL;
      break;
    case 'verification_decision':
      tmpl = tmpl_verification_decision(data);
      to = data.travellerEmail;
      break;
    case 'review_prompt':
      tmpl = tmpl_review_prompt(data);
      to = data.recipientEmail;
      break;
    case 'review_received':
      tmpl = tmpl_review_received(data);
      to = data.recipientEmail;
      break;
    case 'milestone_reached':
      tmpl = tmpl_milestone_reached(data);
      to = data.hostEmail;
      break;
    default:
      return new Response(JSON.stringify({ error: `Unknown emailType: ${emailType}` }), { status: 400 });
  }

  if (tmpl) await sendViaResend({ to, ...tmpl });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret' } });
  }

  try {
    const body = await req.json();

    // DB webhook: has a `table` field
    if (body.table) {
      await handleDbWebhook(body);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Direct call: requires admin secret
    const secret = req.headers.get('x-admin-secret');
    if (secret !== ADMIN_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    return await handleDirect(body);
  } catch (err) {
    console.error('[send-email] Error:', err);
    // Never fail — email errors must not block user actions
    return new Response(JSON.stringify({ ok: true, warning: String(err) }), { status: 200 });
  }
});
