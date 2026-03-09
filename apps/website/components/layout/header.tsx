'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useLoginGoogle, useLogout } from '@/lib/api/auth';
import { useAuthStore, useUIStore } from '@/stores';

interface HeaderProps {
  logo?: string;
  logoIcon?: string;
  googleClientId?: string;
  apiUrl?: string;
}

const navLinks = [
  { label: 'Games', href: '/' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Profile', href: '/profile' },
  { label: 'Shop', href: '/shop' },
];

export function Header({
  logo = 'PlaySoft',
  logoIcon = '🎮',
  googleClientId = 'YOUR_GOOGLE_CLIENT_ID',
}: HeaderProps) {
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const googleButtonRendered = useRef(false);

  const { data: user, isLoading } = useUser();
  const loginGoogle = useLoginGoogle();
  const logout = useLogout();

  const setUser = useAuthStore((s) => s.setUser);
  const { isLoginModalOpen, openLoginModal, closeLoginModal } = useUIStore();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  React.useEffect(() => {
    if (user) setUser(user);
  }, [user, setUser]);

  React.useEffect(() => {
    if (!isLoginModalOpen || !googleClientId || googleButtonRendered.current) return;

    const renderGoogleButton = () => {
      if (!(window as unknown as { google?: { accounts?: { id?: { renderButton?: (el: HTMLElement, options: unknown) => void } } } }).google?.accounts?.id) return;
      
      googleButtonRendered.current = true;
      (window as unknown as { google: { accounts: { id: { renderButton: (el: HTMLElement, options: unknown) => void } } } }).google.accounts.id.renderButton(
        document.getElementById('google-signin-button')!,
        {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signin_with',
          shape: 'rectangular',
        }
      );
    };

    const loadGoogleSDK = () => {
      if (document.getElementById('google-sdk')) {
        renderGoogleButton();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-sdk';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        (window as unknown as { google: { accounts: { id: { initialize: (config: unknown) => void; renderButton: (el: HTMLElement, options: unknown) => void } } } }).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
        });
        renderGoogleButton();
      };
      document.head.appendChild(script);
    };

    loadGoogleSDK();
  }, [isLoginModalOpen, googleClientId]);

  const handleCredentialResponse = async (response: { credential?: string }) => {
    if (!response.credential) return;
    
    setIsLoggingIn(true);
    try {
      await loginGoogle.mutateAsync(response.credential);
      closeLoginModal();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || 'Đăng nhập thất bại');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout.mutateAsync();
    setUser(null);
    setShowDropdown(false);
  };

  const userInitial = user?.name?.charAt(0).toUpperCase() || '';

  return (
    <>
      <header className="relative z-[100]">
        <div className="flex items-center justify-between px-5 py-6">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <span className="text-xl">{logoIcon}</span>
            <span className="font-[family-name:var(--font-display)] font-extrabold text-[20px] bg-cream border-2 border-[var(--color-border)] rounded-[10px] px-4 py-1.5 shadow-[var(--shadow-sm)] text-ink">
              {logo}
            </span>
          </Link>

          <nav className="flex gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[13px] font-semibold px-4 py-2 rounded-[30px] no-underline transition-colors duration-200 ${
                  isActive(link.href)
                    ? 'bg-ink text-white'
                    : 'text-[var(--color-muted)] hover:bg-ink hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {isLoading ? null : user ? (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 bg-cream border-2 border-[var(--color-border)] rounded-[30px] px-3 py-1 cursor-pointer font-semibold shadow-[var(--shadow-sm)]"
                >
                  <div className="w-7 h-7 bg-butter rounded-full flex items-center justify-center border-[1.5px] border-[var(--color-border)] text-xs">
                    {userInitial}
                  </div>
                  <span className="text-sm">{user.name}</span>
                </button>

                {showDropdown && (
                  <div className="absolute top-full right-0 mt-2.5 w-[220px] bg-cream border-2 border-[var(--color-border)] rounded-xl shadow-[var(--shadow-md)] flex flex-col overflow-hidden">
                    <div className="p-4 flex items-center gap-3 border-b-2 border-[var(--color-border)] bg-white">
                      <div className="w-10 h-10 bg-butter rounded-full flex items-center justify-center border-2 border-[var(--color-border)] font-bold">
                        {userInitial}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-extrabold text-sm whitespace-nowrap text-ellipsis overflow-hidden">
                          {user.name}
                        </div>
                        <div className="text-[11px] text-[var(--color-muted)]">
                          {user.email || ''}
                        </div>
                      </div>
                    </div>
                    <Link href="/profile" className="p-3 text-[13px] font-semibold no-underline text-ink hover:bg-gray-100 flex items-center gap-2">
                      👤 Hồ sơ
                    </Link>
                    <Link href="/shop" className="p-3 text-[13px] font-semibold no-underline text-ink hover:bg-gray-100 flex items-center gap-2">
                      🛒 Cửa hàng
                    </Link>
                    <div className="border-t border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="p-3 text-[13px] font-semibold text-red-600 hover:bg-gray-100 flex items-center gap-2 border-none bg-transparent w-full cursor-pointer text-left"
                    >
                      🚪 Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openLoginModal}
                className="font-bold px-5 py-2 bg-cream border-2 border-[var(--color-border)] rounded-[30px] shadow-[var(--shadow-sm)] cursor-pointer"
              >
                Đăng nhập
              </button>
            )}

            <button className="font-bold px-5 py-2 bg-butter border-2 border-[var(--color-border)] rounded-[30px] shadow-[var(--shadow-sm)] cursor-pointer">
              ▶ Chơi Ngay
            </button>
          </div>
        </div>
      </header>

      {isLoginModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]"
          onClick={closeLoginModal}
        >
          <div
            className="bg-cream border-[3px] border-[var(--color-border)] p-[30px] rounded-[20px] w-full max-w-[380px] relative shadow-[8px_8px_0_#000]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeLoginModal}
              className="absolute top-[15px] right-[15px] text-2xl border-none bg-transparent cursor-pointer"
            >
              ×
            </button>
            <div className="mb-5">
              <h2 className="font-[family-name:var(--font-display)] font-extrabold text-2xl mb-1">
                Đăng nhập
              </h2>
              <p className="text-[var(--color-muted)] text-sm">
                Chào mừng bạn đến với PlaySoft
              </p>
            </div>
            <div id="google-signin-button" className="mb-5" />
            {isLoggingIn && (
              <p className="text-center text-sm text-muted">Đang đăng nhập...</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

Header.displayName = 'Header';
