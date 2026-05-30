import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

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
      if ((insertErr as any).code === '23505') {
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

    // Send notification email to store owner only (no customer confirmation).
    // Fails gracefully if email infra/template not yet configured.
    try {
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'appointment-notification',
          recipientEmail: NOTIFY_EMAIL,
          idempotencyKey: `appt-notify-${inserted.id}`,
          templateData: {
            customerName: name,
            customerEmail: email,
            customerPhone: phone,
            appointmentDate: prettyDate,
            appointmentTime: prettyTime,
            notes: notes || '',
            storeName: STORE_NAME,
            storeAddress: STORE_ADDRESS,
            storePhone: STORE_PHONE,
          },
        },
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
