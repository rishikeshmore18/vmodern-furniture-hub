import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppointmentBookingDialog } from './AppointmentBookingDialog';
import { cn } from '@/lib/utils';

/**
 * Floating "Book an Appointment" action button — always visible, bottom-right.
 * Shrinks to icon-only on small screens; expanded label on desktop.
 */
export function BookAppointmentFab() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        aria-label="Book an Appointment"
        className={cn(
          'fixed bottom-5 right-5 z-50 shadow-lg transition-all duration-300',
          'rounded-full',
          scrolled ? 'h-14 w-14 p-0 sm:h-12 sm:w-auto sm:px-5' : 'h-12 px-5'
        )}
      >
        <Calendar className={cn('h-5 w-5', scrolled ? '' : 'mr-2')} />
        <span className={cn(scrolled ? 'hidden sm:inline' : 'inline')}>
          Book an Appointment
        </span>
      </Button>
      <AppointmentBookingDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
