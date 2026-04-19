'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const links = [
  { href: '/', label: 'Overview' },
  { href: '/user', label: 'Issuer' },
  { href: '/verifier/inbox', label: 'Verifier' },
] as const;

function BrandMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v18M5 8.5h14M6.5 14h11"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WalletBar() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-brand">
          <span className="site-brand__mark" aria-hidden>
            <BrandMark />
          </span>
          <span>Carbon rails</span>
        </Link>
        <nav className="site-nav" aria-label="Primary">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link${pathname === href ? ' nav-link--active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="site-header__wallet">
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
