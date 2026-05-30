import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const NOTIFY_EMAIL = 'Furniture1141@yahoo.com';
const STORE_NAME = 'Vmodern Furniture';
const STORE_ADDRESS = '1141 Main Street, Unit B, Worcester, MA 01603';
const STORE_PHONE = '(508) 749-3311';

// Mon-Sat 11:00-17:00, 30-min slots
const VALID_SLOTS = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
];

interface Body {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string | null;
  appointment_date?: string;
  appointment_time?: string;
}

interface BookingEmail {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  appointmentDate: string;
  appointmentTime: string;
  notes: string;
}

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const requiredSecret = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
};

const buildBookingEmail = (booking: BookingEmail) => {
  const subject = `New appointment booking - ${booking.appointmentDate} at ${booking.appointmentTime}`;
  const text = [
    'New appointment booking',
    '',
    `Customer: ${booking.customerName}`,
    `Email: ${booking.customerEmail}`,
    `Phone: ${booking.customerPhone}`,
    `Date: ${booking.appointmentDate}`,
    `Time: ${booking.appointmentTime}`,
    `Notes: ${booking.notes || 'None'}`,
    '',
    STORE_NAME,
    STORE_ADDRESS,
    STORE_PHONE,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 16px;">New appointment booking</h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 560px;">
        <tr><td style="padding: 6px 0; font-weight: 700;">Customer</td><td>${escapeHtml(booking.customerName)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700;">Email</td><td>${escapeHtml(booking.customerEmail)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700;">Phone</td><td>${escapeHtml(booking.customerPhone)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700;">Date</td><td>${escapeHtml(booking.appointmentDate)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700;">Time</td><td>${escapeHtml(booking.appointmentTime)}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700; vertical-align: top;">Notes</td><td>${escapeHtml(booking.notes || 'None')}</td></tr>
      </table>
      <p style="margin-top: 20px; color: #4b5563;">
        ${STORE_NAME}<br />
        ${STORE_ADDRESS}<br />
        ${STORE_PHONE}
      </p>
    </div>
  `;

  return { subject, text, html };
};

const sendWithResend = async (booking: BookingEmail) => {
  const apiKey = requiredSecret('RESEND_API_KEY');
  const from = requiredSecret('BOOKING_EMAIL_FROM');
  const to = Deno.env.get('BOOKING_NOTIFY_EMAIL')?.trim() || NOTIFY_EMAIL;
  const email = buildBookingEmail(booking);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `appointment-${booking.id}`,
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: booking.customerEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${details}`);
  }
};

const sendWithZohoSmtp = async (booking: BookingEmail) => {
  const username = requiredSecret('ZOHO_SMTP_USER');
  const password = requiredSecret('ZOHO_SMTP_PASSWORD');
  const hostname = Deno.env.get('ZOHO_SMTP_HOST')?.trim() || 'smtp.zoho.com';
  const port = Number(Deno.env.get('ZOHO_SMTP_PORT') || '465');
  const tls = (Deno.env.get('ZOHO_SMTP_TLS') || 'true').toLowerCase() !== 'false';
  const from = Deno.env.get('BOOKING_EMAIL_FROM')?.trim() || username;
  const to = Deno.env.get('BOOKING_NOTIFY_EMAIL')?.trim() || NOTIFY_EMAIL;
  const email = buildBookingEmail(booking);

  const client = new SMTPClient({
    connection: {
      hostname,
      port,
      tls,
      auth: {
        username,
        password,
      },
    },
  });

  try {
    await client.send({
      from,
      to,
      replyTo: booking.customerEmail,
      subject: email.subject,
      content: email.text,
      html: email.html,
    });
  } finally {
    await client.close();
  }
};

const sendBookingNotification = async (booking: BookingEmail) => {
  if (Deno.env.get('RESEND_API_KEY')) {
    await sendWithResend(booking);
    return;
  }

  if (Deno.env.get('ZOHO_SMTP_USER') && Deno.env.get('ZOHO_SMTP_PASSWORD')) {
    await sendWithZohoSmtp(booking);
    return;
  }

  console.warn(
    'Booking email was not sent because no email provider secrets are configured. Set RESEND_API_KEY or ZOHO_SMTP_USER/ZOHO_SMTP_PASSWORD.'
  );
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body: Body = await req.json();

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.trim();
    const notes = body.notes?.toString().trim().slice(0, 500) || null;
    const date = body.appointment_date;
    const time = body.appointment_time;

    // Validation
    if (!name || name.length > 100) return json(400, { error: 'Invalid name' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255)
      return json(400, { error: 'Invalid email' });
    if (!phone || phone.length < 7 || phone.length > 30) return json(400, { error: 'Invalid phone' });
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(400, { error: 'Invalid date' });
    if (!time || !VALID_SLOTS.includes(time.slice(0, 5)))
      return json(400, { error: 'Time is outside store hours' });

    const dt = new Date(`${date}T${time}:00`);
    if (isNaN(dt.getTime())) return json(400, { error: 'Invalid date/time' });

    // Block past dates
    const now = new Date();
    if (dt < now) return json(400, { error: 'Cannot book a past time' });

    // Block Sundays (getUTCDay because date is YYYY-MM-DD)
    const [y, m, d] = date.split('-').map(Number);
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (dow === 0) return json(400, { error: 'Closed on Sundays' });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Double-booking check
    const { data: existing, error: checkErr } = await supabase
      .from('appointments')
      .select('id')
      .eq('appointment_date', date)
      .eq('appointment_time', time)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (checkErr) {
      console.error('Check error:', checkErr);
      return json(500, { error: 'Failed to verify slot availability' });
    }
    if (existing) return json(409, { error: 'That time slot is already booked. Please pick another.' });

    // Insert
    const { data: inserted, error: insertErr } = await supabase
      .from('appointments')
      .insert({
        name, email, phone, notes,
        appointment_date: date,
        appointment_time: time,
        status: 'pending',
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Insert error:', insertErr);
      // 23505 = unique violation (race condition)
      const insertCode =
        typeof insertErr === 'object' && insertErr !== null && 'code' in insertErr
          ? String((insertErr as { code?: unknown }).code)
          : '';
      if (insertCode === '23505') {
        return json(409, { error: 'That time slot was just taken. Please pick another.' });
      }
      return json(500, { error: 'Failed to save appointment' });
    }

    // Format pretty values
    const prettyDate = new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    });
    const [hh, mm] = time.split(':').map(Number);
    const period = hh >= 12 ? 'PM' : 'AM';
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    const prettyTime = `${h12}:${mm.toString().padStart(2, '0')} ${period}`;

    // Send notification email to store owner only. Booking remains saved if email delivery fails.
    try {
      await sendBookingNotification({
        id: inserted.id,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        appointmentDate: prettyDate,
        appointmentTime: prettyTime,
        notes: notes || '',
      });
    } catch (emailErr) {
      console.warn('Email notification failed (non-fatal):', emailErr);
    }

    return json(200, { ok: true, appointment: inserted });
  } catch (err) {
    console.error('Unhandled error:', err);
    return json(500, { error: 'Unexpected server error' });
  }
});
