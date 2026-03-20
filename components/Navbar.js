'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const { totalItems } = useCart();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/#find-my-taste', label: 'Find my taste' },
    { href: '/shop', label: 'Shop' },
    { href: '/contact', label: 'Contact Us' },
  ];

  useEffect(() => {
    const el = document.getElementById('navbarSupportedContent');
    if (!el) return;

    const onShown = () => document.body.classList.add('pp-mobile-nav-open');
    const onHidden = () => document.body.classList.remove('pp-mobile-nav-open');

    el.addEventListener('shown.bs.collapse', onShown);
    el.addEventListener('hidden.bs.collapse', onHidden);

    return () => {
      el.removeEventListener('shown.bs.collapse', onShown);
      el.removeEventListener('hidden.bs.collapse', onHidden);
    };
  }, []);

  return (
    <section className="nav_section">
      <div className="container">
        <div className="custom_nav2">
          <nav className="navbar navbar-expand-lg custom_nav-container">
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarSupportedContent"
              aria-controls="navbarSupportedContent"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarSupportedContent">
              <div className="d-flex flex-column flex-lg-row align-items-center">
                <ul className="navbar-nav">
                  {links.map(({ href, label }) => (
                    <li key={href} className={`nav-item${pathname === href ? ' active' : ''}`}>
                      <Link className="nav-link" href={href}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="ml-0 ml-lg-4 mb-3 mb-lg-0">
                  <Link href="/cart" className="nav-link position-relative" style={{ color: '#fff' }}>
                    🛒
                    {totalItems > 0 && (
                      <span
                        className="badge"
                        style={{
                          background: '#f9a51e',
                          color: '#fff',
                          borderRadius: '50%',
                          fontSize: '11px',
                          padding: '2px 6px',
                          marginLeft: '4px',
                        }}
                      >
                        {totalItems}
                      </span>
                    )}
                  </Link>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </section>
  );
}
