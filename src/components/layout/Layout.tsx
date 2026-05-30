import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { BookAppointmentFab } from '@/components/appointment/BookAppointmentFab';

interface LayoutProps {
  children: ReactNode;
  hideFooter?: boolean;
}

export function Layout({ children, hideFooter = false }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
      <BookAppointmentFab />
    </div>
  );
}

