import React from 'react';
import Link from 'next/link';

interface FooterProps {
  logo?: string;
  logoIcon?: string;
  company?: string;
  links?: Array<{ label: string; href: string }>;
}

const defaultLinks = [
  { label: 'Về chúng tôi', href: '/about' },
  { label: 'Điều khoản', href: '/terms' },
  { label: 'Liên hệ', href: '/contact' },
];

export function Footer({
  logo = 'PlaySoft',
  logoIcon = '🎮',
  company = '2025',
  links = defaultLinks,
}: FooterProps) {
  return (
    <footer className="border-t-2 border-[var(--color-border)] pt-8">
      <div className="flex justify-between items-center flex-wrap gap-4 px-5">
        <div className="flex items-center gap-1 font-[family-name:var(--font-display)] font-extrabold text-lg">
          <span className="text-xl">{logoIcon}</span>
          <span>{logo}</span>
        </div>

        <div className="text-xs text-[var(--color-muted)]">
          © {company} {logo} — Minigame cho mọi người
        </div>

        <div className="flex gap-5">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-[var(--color-muted)] no-underline font-medium hover:text-ink transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

Footer.displayName = 'Footer';
