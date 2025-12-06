import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Instagram } from 'lucide-react';
import { storeInfo } from '@/data/storeInfo';

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand & Description */}
          <div>
            <h3 className="text-lg font-semibold text-foreground">{storeInfo.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Modern furniture and floor samples ready to take home today. Quality pieces for contemporary living.
            </p>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Contact
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{storeInfo.fullAddress}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" />
                <a href={`tel:${storeInfo.phone}`} className="hover:text-foreground">
                  {storeInfo.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="h-4 w-4 shrink-0" />
                <a
                  href="https://instagram.com/vmodernfurniture"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  {storeInfo.instagram}
                </a>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Store Hours
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{storeInfo.hours.weekdays}</span>
              </li>
              <li className="ml-6">{storeInfo.hours.sunday}</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} {storeInfo.name}. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/floor-samples" className="hover:text-foreground">
              Floor Samples
            </Link>
            <Link to="/online-inventory" className="hover:text-foreground">
              Online Inventory
            </Link>
            <Link to="/admin" className="hover:text-foreground">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
