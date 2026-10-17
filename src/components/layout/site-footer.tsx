import Link from 'next/link';
import { business } from '@/config/business';
import { navigation } from '@/config/navigation';
import { ButtonLink } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Brand } from './brand';
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <Brand />
          <p>Moments Pass. Memories Stay.</p>
        </div>
        <div className="footer-grid">
          <div>
            <h2 className="eyebrow">Explore</h2>
            <nav className="footer-nav" aria-label="Footer navigation">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <h2 className="eyebrow">Our studio</h2>
            <address>{business.address}</address>
          </div>
          <div>
            <h2 className="eyebrow">Your next celebration</h2>
            <ButtonLink href="/book" variant="text">
              Plan Your Event <Icon name="arrow" />
            </ButtonLink>
            <p className="footer-note">
              <a href={`tel:${business.phone}`}>{business.phone}</a>
            </p>
            <p className="footer-note">
              <a
                href={business.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get directions ↗
              </a>
            </p>
            {business.socialLinks.map((link) => (
              <p className="footer-note" key={link.label}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.label} ↗
                </a>
              </p>
            ))}
          </div>
        </div>
        <div className="footer-bottom">
          <small>
            © {new Date().getFullYear()} {business.name}
          </small>
          <small>Balighattam · Andhra Pradesh</small>
          <small>
            <Link href="/admin/requests">Admin portal</Link>
          </small>
        </div>
      </div>
    </footer>
  );
}
