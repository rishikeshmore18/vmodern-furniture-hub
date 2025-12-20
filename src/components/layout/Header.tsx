import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { storeInfo } from '@/data/storeInfo';
import { cn } from '@/lib/utils';

// Public navigation only - no Invoice or Admin
const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/floor-samples', label: 'Floor Samples' },
  { href: '/online-inventory', label: 'Online Inventory' },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      {/* Top bar with contact info */}
      <div className="hidden border-b border-border bg-secondary/50 md:block">
        <div className="container flex items-center justify-between py-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              {storeInfo.fullAddress}
            </span>
            <span className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              {storeInfo.phone}
            </span>
          </div>
          <span className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            {storeInfo.hoursShort.open} | {storeInfo.hoursShort.closed}
          </span>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt={storeInfo.name}
            className="h-16 w-auto object-contain"
          />
        </Link>

        {/* Desktop navigation */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors hover:text-foreground',
                location.pathname === link.href
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </nav>

      {/* Mobile navigation */}
      {isOpen && (
        <div className="border-t border-border bg-card md:hidden">
          <div className="container py-4">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'rounded-md px-4 py-3 text-sm font-medium transition-colors',
                    location.pathname === link.href
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                {storeInfo.fullAddress}
              </p>
              <p className="mt-2 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                {storeInfo.phone}
              </p>
              <p className="mt-2 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                {storeInfo.hoursShort.open}
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
