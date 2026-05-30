import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// Store hours: Mon-Sat 11AM-5PM, Sun closed. 30-min slots.
const SLOTS = [
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
];

const formatTimeLabel = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
};

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255),
  phone: z.string().trim().min(7, 'Phone is required').max(30),
  notes: z.string().trim().max(500).optional(),
});

const getBookingErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;
  if (typeof err !== 'object' || err === null) return 'Failed to book appointment';

  const context = 'context' in err ? err.context : undefined;
  if (typeof context === 'object' && context !== null && 'responseJson' in context) {
    const responseJson = context.responseJson;
    if (
      typeof responseJson === 'object' &&
      responseJson !== null &&
      'error' in responseJson &&
      typeof responseJson.error === 'string'
    ) {
      return responseJson.error;
    }
  }

  if ('message' in err && typeof err.message === 'string') return err.message;
  return 'Failed to book appointment';
};

export function AppointmentBookingDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch booked slots for selected date
  useEffect(() => {
    if (!date) {
      setBookedSlots([]);
      return;
    }
    const dateStr = format(date, 'yyyy-MM-dd');
    setLoadingSlots(true);
    setTime('');
    supabase
      .from('appointments')
      .select('appointment_time')
      .eq('appointment_date', dateStr)
      .neq('status', 'cancelled')
      .then(({ data }) => {
        setBookedSlots((data ?? []).map((r) => (r.appointment_time as string).slice(0, 5)));
        setLoadingSlots(false);
      });
  }, [date]);

  const availableSlots = useMemo(
    () => SLOTS.filter((s) => !bookedSlots.includes(s)),
    [bookedSlots]
  );

  const reset = () => {
    setName(''); setEmail(''); setPhone(''); setNotes('');
    setDate(undefined); setTime(''); setBookedSlots([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, email, phone, notes });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    if (!date) {
      toast.error('Please pick a date');
      return;
    }
    if (!time) {
      toast.error('Please pick a time');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('book-appointment', {
        body: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          notes: parsed.data.notes || null,
          appointment_date: format(date, 'yyyy-MM-dd'),
          appointment_time: time,
        },
      });
      if (error) throw error;
      toast.success('Appointment booked! We will be in touch shortly.');
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(getBookingErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Disable Sundays + past dates
  const disabledDays = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today || d.getDay() === 0;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) onOpenChange(v); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Book an Appointment</DialogTitle>
          <DialogDescription>
            Schedule a visit to our Worcester showroom. Mon–Sat, 11 AM – 5 PM.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required disabled={submitting} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={submitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={submitting} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} disabled={disabledDays} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {date && (
            <div className="space-y-2">
              <Label>Time *</Label>
              {loadingSlots ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading available times…
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No times available on this day. Please pick another date.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {SLOTS.map((slot) => {
                    const isBooked = bookedSlots.includes(slot);
                    const selected = time === slot;
                    return (
                      <Button
                        key={slot}
                        type="button"
                        size="sm"
                        variant={selected ? 'default' : 'outline'}
                        disabled={isBooked || submitting}
                        onClick={() => setTime(slot)}
                        className={cn(isBooked && 'line-through opacity-50')}
                      >
                        {formatTimeLabel(slot)}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={submitting} rows={3} maxLength={500} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" disabled={submitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking…</> : 'Confirm Booking'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
