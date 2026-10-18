import { uiCopy } from '@/config/copy';
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
        <div className="footer-invitation">
          <p className="eyebrow">Every story starts somewhere</p>
          <Link href="/contact" className="footer-invitation-link">
            <span>
              Let’s make
              <br />
              <em>something timeless.</em>
            </span>
            <span className="invitation-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
          <p>Your people. Your celebration. Your next chapter.</p>
        </div>
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
              {uiCopy.actions.buildQuote} <Icon name="arrow" />
            </ButtonLink>
            <p className="footer-note">
              <a href={`tel:${business.phone}`}>
                <Icon name="phone" />
                {business.phone}
              </a>
            </p>
            <p className="footer-note">
              <a
                href={business.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="map-pin" />
                Get directions
              </a>
            </p>
            {business.socialLinks.map((link) => (
              <p className="footer-note" key={link.label}>
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  <Icon
                    name={link.label === 'Instagram' ? 'instagram' : 'external'}
                  />
                  {link.label}
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
