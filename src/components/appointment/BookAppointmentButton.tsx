import { useState, ReactNode } from 'react';
import { Calendar } from 'lucide-react';
import { Button, ButtonProps } from '@/components/ui/button';
import { AppointmentBookingDialog } from './AppointmentBookingDialog';

interface Props extends Omit<ButtonProps, 'onClick'> {
  children?: ReactNode;
}

export function BookAppointmentButton({ children, ...props }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} {...props}>
        <Calendar className="mr-2 h-4 w-4" />
        {children ?? 'Book an Appointment'}
      </Button>
      <AppointmentBookingDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
