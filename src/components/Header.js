'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { usePathname, useRouter } from 'next/navigation';
import ImageWithSkeleton from '@/components/ImageWithSkeleton';

export default function Header() {
  const { cart, cartCount, updateCartQuantity, removeFromCart, wishlist, toggleWishlist, addToCart, user, logout, setIsLoginOpen, jewelleryEnabled } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [heavyDressesOpen, setHeavyDressesOpen] = useState(false);
  const [jewelleryOpen, setJewelleryOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const scrollYRef = useRef(0);

  // Manage scroll-lock on document.body when cart or menu is open (iOS Safari position: fixed method)
  useEffect(() => {
    const isLocked = isCartOpen || menuOpen;
    
    if (isLocked) {
      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      scrollYRef.current = scrollY;
      
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body.classList.add('mobile-nav-locked');
    } else {
      const savedScrollY = scrollYRef.current;
      
      if (document.body.style.position === 'fixed' || document.body.classList.contains('mobile-nav-locked')) {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.classList.remove('mobile-nav-locked');
        window.scrollTo(0, savedScrollY);
      }
    }

    return () => {
      if (document.body.style.position === 'fixed' || document.body.classList.contains('mobile-nav-locked')) {
        const savedScrollY = scrollYRef.current;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.classList.remove('mobile-nav-locked');
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [isCartOpen, menuOpen]);

  // Trap Escape key to close cart or menu
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsCartOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const [isBumping, setIsBumping] = useState(false);
  const prevCount = useRef(cartCount);

  useEffect(() => {
    if (cartCount > prevCount.current) {
      setIsBumping(true);
      const timer = setTimeout(() => setIsBumping(false), 800);
      return () => clearTimeout(timer);
    }
    prevCount.current = cartCount;
  }, [cartCount]);

  const isCurrent = (path) => pathname === path;

  return (
    <>
      {/* Announcement Bar */}
      <div className="announcement-bar-wrapper">
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.7rem', color: '#FFFFFF', fontWeight: '700', fontSize: '0.68rem', letterSpacing: '0.06em' }}>
          FREE EXPRESS SHIPPING
          <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>•</span>
          <span style={{ color: '#D98E9B', fontWeight: '700' }}>SHOP NOW</span>
        </div>
      </div>

      <header className="storefront-header" style={headerContainerStyle}>
      {/* Brand Header */}
      <div style={brandHeaderStyle}>
        
        {/* 1. Left: Logo */}
        <div style={brandLogoWrapperStyle}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', textDecoration: 'none', cursor: 'pointer' }}>
            <img 
              src="https://res.cloudinary.com/cyygtyfb/image/upload/v1786258952/houseofginija/brand_symbol_logo.png" 
              alt="House of Ginija Symbol" 
              style={{ height: '34px', width: 'auto', objectFit: 'contain', display: 'block' }} 
              loading="lazy"
            />
            <div style={{
              width: '1px',
              height: '24px',
              backgroundColor: 'rgba(139, 119, 137, 0.25)',
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '0.95rem',
                color: '#000000',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                lineHeight: '1.1',
                fontWeight: '700'
              }}>
                House of Ginija
              </span>
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.52rem',
                color: '#D98E9B',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                lineHeight: '1.2',
                fontWeight: '700',
                marginTop: '0.1rem'
              }}>
                The Designer Label
              </span>
            </div>
          </Link>
        </div>

        {/* 2. Center: Desktop Navigation Links (hidden on mobile via className) */}
        <nav className="desktop-nav-only">
          <ul style={navLinksStyle}>
            <li>
              <Link href="/" style={isCurrent('/') ? activeLinkStyle : navLinkStyle} onClick={() => setMenuOpen(false)}>
                Home
              </Link>
            </li>
            <li 
              onMouseEnter={() => setDropdownOpen(true)}
              onMouseLeave={() => setDropdownOpen(false)}
              style={dropdownLiStyle}
            >
              <Link 
                href="/collections" 
                style={dropdownTriggerStyle} 
                onClick={() => {
                  setMenuOpen(false);
                  if (typeof window !== 'undefined' && window.location.pathname === '/collections') {
                    window.dispatchEvent(new CustomEvent('reset-collections'));
                  }
                }}
              >
                Collections
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={dropdownIconStyle}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </Link>
              {dropdownOpen && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 12px 36px rgba(60, 48, 58, 0.14)',
                    borderRadius: '10px',
                    padding: '1.25rem 1.5rem',
                    minWidth: '380px',
                    border: '1px solid rgba(139, 119, 137, 0.15)',
                    zIndex: 1000,
                  }}
                  onMouseEnter={() => setDropdownOpen(true)}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem 1.8rem' }}>
                    {/* Fresh Collection */}
                    <div>
                      <Link 
                        href="/collections?collection=new-collection" 
                        style={{ fontSize: '0.8rem', fontWeight: '700', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}
                        onClick={() => { setDropdownOpen(false); setMenuOpen(false); }}
                      >
                        Fresh Collection
                      </Link>
                    </div>

                    {/* Indo-Western, Shararas, Gowns */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <Link 
                        href="/collections?collection=indo-western" 
                        style={{ fontSize: '0.8rem', fontWeight: '700', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}
                        onClick={() => { setDropdownOpen(false); setMenuOpen(false); }}
                      >
                        Indo-Western
                      </Link>
                      <Link 
                        href="/collections?collection=shararas" 
                        style={{ fontSize: '0.8rem', fontWeight: '700', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}
                        onClick={() => { setDropdownOpen(false); setMenuOpen(false); }}
                      >
                        Drape Sarees
                      </Link>
                      <Link 
                        href="/collections?collection=gowns" 
                        style={{ fontSize: '0.8rem', fontWeight: '700', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}
                        onClick={() => { setDropdownOpen(false); setMenuOpen(false); }}
                      >
                        Heavy Gowns
                      </Link>
                    </div>

                    {/* Co-ords & Suits */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <Link 
                        href="/collections?collection=co-ords" 
                        style={{ fontSize: '0.8rem', fontWeight: '700', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}
                        onClick={() => { setDropdownOpen(false); setMenuOpen(false); }}
                      >
                        Co-ords
                      </Link>
                      <Link 
                        href="/collections?collection=suits" 
                        style={{ fontSize: '0.8rem', fontWeight: '700', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none' }}
                        onClick={() => { setDropdownOpen(false); setMenuOpen(false); }}
                      >
                        Unstitched Suits
                      </Link>
                    </div>

                    {/* Jewellery Subcategories & Flash Sale */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {jewelleryEnabled !== false && (
                        <>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.2rem' }}>
                            Jewellery
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: '0.5rem', borderLeft: '2px solid #F4E1E5' }}>
                            <Link href="/collections?collection=earrings" style={{ fontSize: '0.78rem', color: '#565959', textDecoration: 'none' }} onClick={() => { setDropdownOpen(false); setMenuOpen(false); }}>Earrings</Link>
                            <Link href="/collections?collection=rings" style={{ fontSize: '0.78rem', color: '#565959', textDecoration: 'none' }} onClick={() => { setDropdownOpen(false); setMenuOpen(false); }}>Rings</Link>
                            <Link href="/collections?collection=necklaces" style={{ fontSize: '0.78rem', color: '#565959', textDecoration: 'none' }} onClick={() => { setDropdownOpen(false); setMenuOpen(false); }}>Necklace</Link>
                            <Link href="/collections?collection=bracelets" style={{ fontSize: '0.78rem', color: '#565959', textDecoration: 'none' }} onClick={() => { setDropdownOpen(false); setMenuOpen(false); }}>Bracelet</Link>
                          </div>
                        </>
                      )}
                      <Link 
                        href="/collections?collection=flash-sale" 
                        style={{ fontSize: '0.8rem', fontWeight: '700', color: '#D98E9B', textTransform: 'uppercase', letterSpacing: '0.08em', textDecoration: 'none', marginTop: '0.4rem' }}
                        onClick={() => { setDropdownOpen(false); setMenuOpen(false); }}
                      >
                        Flash Sale
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </li>
            <li>
              <Link href="/about" style={isCurrent('/about') ? activeLinkStyle : navLinkStyle} onClick={() => setMenuOpen(false)}>
                Our Story
              </Link>
            </li>
            <li>
              <Link href="/contact" style={isCurrent('/contact') ? activeLinkStyle : navLinkStyle} onClick={() => setMenuOpen(false)}>
                Contact
              </Link>
            </li>
          </ul>
        </nav>
        
        <div style={headerActionsStyle} className="header-actions-row">
          {user ? (
            <Link href="/account" style={actionLinkStyle} title="My Account" className="header-action-btn">
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="hide-mobile-label">Hello, {user.name.split(' ')[0]}</span>
            </Link>
          ) : (
            <button 
              onClick={() => setIsLoginOpen(true)} 
              style={{ ...actionLinkStyle, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} 
              title="Sign In" 
              className="header-action-btn"
            >
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="hide-mobile-label">Sign In</span>
            </button>
          )}

          {!(user && user.role === 'admin') && (
            <>
              <Link href="/account?tab=wishlist" style={actionLinkStyle} title="Wishlist" className="header-action-btn">
                <div style={badgeWrapperStyle}>
                  <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {wishlist.length > 0 && <span style={badgeStyle}>{wishlist.length}</span>}
                </div>
              </Link>

              <Link 
                href="/cart" 
                style={actionLinkStyle} 
                title="Shopping Bag"
                className="header-action-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setIsCartOpen(true);
                }}
              >
                <div style={badgeWrapperStyle} className={isBumping ? 'animate-cart-bump' : ''}>
                  <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  {cartCount > 0 && <span style={badgeStyle}>{cartCount}</span>}
                </div>
              </Link>
            </>
          )}

          {user && user.role === 'admin' && (
            <Link href="/admin/dashboard" style={adminLinkStyle}>
              Admin Portal
            </Link>
          )}

          {/* Mobile Menu Button */}
          <button className="mobile-menu-btn" style={mobileMenuButtonStyle} onClick={() => setMenuOpen(!menuOpen)}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {menuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* 4. Slide-Out Mobile Navigation Drawer (Right Side, 85% Width, Below Site Header) */}
      <div 
        className={`mobile-nav-backdrop ${menuOpen ? 'open' : ''}`} 
        onClick={() => setMenuOpen(false)}
        style={{ touchAction: 'none' }}
      >
        <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
          {/* Menu Items List Feed */}
          <div className="mobile-nav-feed hide-scrollbar">
            {/* 1. HOME */}
            <Link 
              href="/" 
              className={`mobile-nav-item-row ${isCurrent('/') ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <div className="mobile-nav-item-left">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D98E9B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span className="mobile-nav-item-title">HOME</span>
              </div>
              {!isCurrent('/') && (
                <div className="mobile-nav-item-chevron">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              )}
            </Link>

            {/* 2. FRESH COLLECTION */}
            <Link 
              href="/collections?collection=new-collection" 
              className="mobile-nav-item-row"
              onClick={() => setMenuOpen(false)}
            >
              <div className="mobile-nav-item-left">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D98E9B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="mobile-nav-item-title">FRESH COLLECTION</span>
              </div>
              <div className="mobile-nav-item-chevron">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </Link>

            {/* 3. HEAVY DRESSES */}
            <div
              className="mobile-nav-item-row"
              role="button"
              tabIndex={0}
              onClick={() => {
                setHeavyDressesOpen((open) => !open);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setHeavyDressesOpen((open) => !open);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="mobile-nav-item-left">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D98E9B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2h8l2 5-3 2v4l5 9H4l5-9V9L6 7l2-5z" />
                </svg>
                <span className="mobile-nav-item-title">HEAVY DRESSES</span>
              </div>
              <button
                type="button"
                className="mobile-nav-item-chevron"
                aria-label={heavyDressesOpen ? 'Collapse Heavy Dresses menu' : 'Expand Heavy Dresses menu'}
                aria-expanded={heavyDressesOpen}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setHeavyDressesOpen((open) => !open);
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transform: heavyDressesOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>

            {heavyDressesOpen && (
              <div className="mobile-nav-submenu-card animate-fade-in">
                <Link href="/collections?collection=indo-western" className="mobile-nav-submenu-item" onClick={() => setMenuOpen(false)}>
                  <span className="mobile-nav-submenu-dot" />
                  <span>INDO-WESTERN</span>
                </Link>
                <Link href="/collections?collection=gowns" className="mobile-nav-submenu-item" onClick={() => setMenuOpen(false)}>
                  <span className="mobile-nav-submenu-dot" />
                  <span>HEAVY GOWNS</span>
                </Link>
                <Link href="/collections?collection=shararas" className="mobile-nav-submenu-item" onClick={() => setMenuOpen(false)}>
                  <span className="mobile-nav-submenu-dot" />
                  <span>DRAPE SAREES</span>
                </Link>
              </div>
            )}

            {/* 4. UNSTITCHED SUITS */}
            <Link 
              href="/collections?collection=suits" 
              className={`mobile-nav-item-row ${isCurrent('/suits') ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <div className="mobile-nav-item-left">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D98E9B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="3" width="14" height="18" rx="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
                <span className="mobile-nav-item-title">UNSTITCHED SUITS</span>
              </div>
              <div className="mobile-nav-item-chevron">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </Link>

            {/* 5. CO-ORDS */}
            <Link 
              href="/collections?collection=co-ords"
              className="mobile-nav-item-row"
              onClick={() => setMenuOpen(false)}
            >
              <div className="mobile-nav-item-left">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D98E9B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5" />
                </svg>
                <span className="mobile-nav-item-title">CO-ORDS</span>
              </div>
              <div className="mobile-nav-item-chevron">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </Link>

            {/* 6. JEWELLERY */}
            {jewelleryEnabled !== false && (
              <>
                <div
                  className="mobile-nav-item-row"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setJewelleryOpen((open) => !open);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setJewelleryOpen((open) => !open);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="mobile-nav-item-left">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D98E9B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 3c0 6 2.7 11 6 11s6-5 6-11" />
                      <circle cx="12" cy="17" r="2" />
                    </svg>
                    <span className="mobile-nav-item-title">JEWELLERY</span>
                  </div>
                  <button
                    type="button"
                    className="mobile-nav-item-chevron"
                    aria-label={jewelleryOpen ? 'Collapse Jewellery menu' : 'Expand Jewellery menu'}
                    aria-expanded={jewelleryOpen}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setJewelleryOpen((open) => !open);
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ transform: jewelleryOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                </div>

                {jewelleryOpen && (
              <div className="mobile-nav-submenu-card animate-fade-in">
                <Link href="/collections?collection=earrings" className="mobile-nav-submenu-item" onClick={() => setMenuOpen(false)}>
                  <span className="mobile-nav-submenu-dot" />
                  <span>EARRINGS</span>
                </Link>
                <Link href="/collections?collection=rings" className="mobile-nav-submenu-item" onClick={() => setMenuOpen(false)}>
                  <span className="mobile-nav-submenu-dot" />
                  <span>RINGS</span>
                </Link>
                <Link href="/collections?collection=necklaces" className="mobile-nav-submenu-item" onClick={() => setMenuOpen(false)}>
                  <span className="mobile-nav-submenu-dot" />
                  <span>NECKLACE</span>
                </Link>
                <Link href="/collections?collection=bracelets" className="mobile-nav-submenu-item" onClick={() => setMenuOpen(false)}>
                  <span className="mobile-nav-submenu-dot" />
                  <span>BRACELET</span>
                </Link>
              </div>
            )}
          </>
        )}

            {/* 7. FLASH SALE */}
            <Link
              href="/collections?collection=flash-sale"
              className="mobile-nav-item-row"
              onClick={() => setMenuOpen(false)}
            >
              <div className="mobile-nav-item-left">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D98E9B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2c1.5 4-1 5.5-1 8 0 1.7 1.3 3 3 3 2.2 0 4-1.8 4-4 2 2.2 3 4.6 3 7a9 9 0 0 1-18 0c0-4.1 2.4-7.4 6-10-.2 2.5.8 4 2 5" />
                </svg>
                <span className="mobile-nav-item-title">FLASH SALE</span>
              </div>
              <div className="mobile-nav-item-chevron">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </Link>

            {/* 8. OUR STORY */}
            <Link 
              href="/about" 
              className={`mobile-nav-item-row ${isCurrent('/about') ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <div className="mobile-nav-item-left">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D98E9B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <span className="mobile-nav-item-title">OUR STORY</span>
              </div>
              {!isCurrent('/about') && (
                <div className="mobile-nav-item-chevron">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              )}
            </Link>

            {/* 9. CONTACT */}
            <Link 
              href="/contact" 
              className={`mobile-nav-item-row ${isCurrent('/contact') ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              <div className="mobile-nav-item-left">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D98E9B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span className="mobile-nav-item-title">CONTACT</span>
              </div>
              {!isCurrent('/contact') && (
                <div className="mobile-nav-item-chevron">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Slide-Out Cart Drawer */}
      <div className={`cart-drawer-backdrop ${isCartOpen ? 'open' : ''}`} onClick={() => setIsCartOpen(false)}>
        <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="cart-drawer-header">
            {/* Mobile Back Button (on the left) */}
            <button className="cart-drawer-back-btn" onClick={() => setIsCartOpen(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            <h3 className="cart-drawer-title">Shopping Bag ({cartCount})</h3>

            <button className="cart-drawer-close" onClick={() => setIsCartOpen(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className="cart-drawer-feed hide-scrollbar">
            {cart && cart.length > 0 ? (
              cart.map((item, idx) => {
                const itemSubtotal = item.price * item.quantity;
                return (
                  <div key={`${item.id}-${item.size}-${item.color}-${idx}`} className="cart-drawer-item">
                    <ImageWithSkeleton 
                      src={item.images && item.images[0] ? item.images[0] : (item.image ? item.image : '/placeholder.jpg')} 
                      alt={item.name} 
                      className="cart-drawer-thumb" 
                    />
                    <div className="cart-drawer-item-details">
                      <h4 className="cart-drawer-item-title">{item.name}</h4>
                      <span className="cart-drawer-item-variant">
                        {item.size || 'One Size'} {item.color ? `• ${item.color}` : ''}
                      </span>
                      <span className="cart-drawer-item-price">
                        {item.flash_sale && item.original_price ? (
                          <>
                            <span style={{ fontWeight: 'bold' }}>₹{parseFloat(item.price).toLocaleString('en-IN')}</span>
                            <span style={{ textDecoration: 'line-through', color: '#999', marginLeft: '6px', fontSize: '0.85em', fontWeight: '400' }}>
                              ₹{parseFloat(item.original_price).toLocaleString('en-IN')}
                            </span>
                          </>
                        ) : (
                          <span>₹{parseFloat(item.price).toLocaleString('en-IN')}</span>
                        )}
                        {' '}x {item.quantity}
                      </span>
                      
                      <div className="cart-drawer-item-actions">
                        <div className="cart-drawer-qty-controller">
                          <button 
                            className="cart-drawer-qty-btn"
                            onClick={() => updateCartQuantity(item.id, item.size || 'One Size', item.color || 'Default', item.quantity - 1)}
                          >
                            -
                          </button>
                          <span className="cart-drawer-qty-val">{item.quantity}</span>
                          <button 
                            className="cart-drawer-qty-btn"
                            onClick={() => {
                              const vars = item.variants || [];
                              const matchingVar = vars.find(v => (v.size || '') === (item.size || '') && (v.color || '') === (item.color || ''));
                              const maxStock = matchingVar ? matchingVar.stock : 10;
                              if (item.quantity >= maxStock) return;
                              updateCartQuantity(item.id, item.size || 'One Size', item.color || 'Default', item.quantity + 1);
                            }}
                          >
                            +
                          </button>
                        </div>
                        <button 
                          className="cart-drawer-item-remove"
                          onClick={() => removeFromCart(item.id, item.size || 'One Size', item.color || 'Default')}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="cart-drawer-empty-state">
                <div className="cart-drawer-empty-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <span className="cart-drawer-empty-text">No products in the cart.</span>
              </div>
            )}
          </div>

          {cart && cart.length > 0 && (
            <div className="cart-drawer-footer">
              <div className="cart-drawer-total-row">
                <span className="cart-drawer-total-label">Subtotal</span>
                <span className="cart-drawer-total-val">
                  ₹{parseFloat(cart.reduce((sum, item) => sum + item.price * item.quantity, 0)).toLocaleString('en-IN')}
                </span>
              </div>
              <span className="cart-drawer-subtext">
                Taxes and shipping calculated at checkout
              </span>
              <Link 
                href="/checkout" 
                className="cart-drawer-checkout-btn"
                onClick={() => setIsCartOpen(false)}
              >
                Checkout
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  );
}

// Vanilla styles for Header
const headerContainerStyle = {
  backgroundColor: '#F6DDE2', // Matched to Footer Pink
  borderBottom: '1px solid rgba(139, 119, 137, 0.1)',
  position: 'sticky',
  top: 0,
  zIndex: 90,
  height: '75px',
  boxSizing: 'border-box',
};

const brandHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0 2rem',
  maxWidth: '1280px',
  margin: '0 auto',
  height: '100%',
};

const brandLogoWrapperStyle = {
  display: 'flex',
  flexDirection: 'column',
};

const logoLinkStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
};

const headerActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '1.5rem',
};

const userActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.8rem',
};

const actionLinkStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  color: '#000000',
  fontSize: '0.85rem',
  cursor: 'pointer',
};

const logoutButtonStyle = {
  color: '#000000',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
};

const badgeWrapperStyle = {
  position: 'relative',
  display: 'flex',
};

const badgeStyle = {
  position: 'absolute',
  top: '-6px',
  right: '-6px',
  backgroundColor: '#D98E9B',
  color: '#000000',
  fontSize: '0.7rem',
  fontWeight: '700',
  borderRadius: '50%',
  width: '18px',
  height: '18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const adminLinkStyle = {
  fontSize: '0.75rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#000000',
  border: '1px solid #D98E9B',
  padding: '0.3rem 0.6rem',
  borderRadius: '4px',
};

const mobileMenuButtonStyle = {
  color: '#000000',
  cursor: 'pointer',
};

const mobileNavStyle = {
  display: 'block',
  position: 'absolute',
  top: '100%',
  left: 0,
  width: '100%',
  backgroundColor: '#FFFFFF',
  borderBottom: '1px solid rgba(139, 119, 137, 0.1)',
  padding: '1.5rem',
  boxShadow: '0 8px 16px rgba(0,0,0,0.05)',
  zIndex: 99,
};

const navLinksStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '2.5rem',
  listStyle: 'none',
  flexWrap: 'wrap',
};

const navLinkStyle = {
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontWeight: '500',
  color: '#000000',
};

const activeLinkStyle = {
  ...navLinkStyle,
  color: '#000000',
  borderBottom: '1px solid #000000',
  paddingBottom: '2px',
};

const dropdownLiStyle = {
  position: 'relative',
  cursor: 'pointer',
};

const dropdownTriggerStyle = {
  ...navLinkStyle,
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
};

const dropdownIconStyle = {
  transition: 'transform 0.2s ease',
};

const dropdownMenuStyle = {
  position: 'absolute',
  top: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  backgroundColor: '#FFFFFF',
  boxShadow: '0 10px 30px rgba(60, 48, 58, 0.1)',
  borderRadius: '8px',
  listStyle: 'none',
  padding: '0.8rem 0',
  minWidth: '200px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.2rem',
  border: '1px solid rgba(139, 119, 137, 0.1)',
  animation: 'fadeIn 0.2s ease forwards',
};

const dropdownLinkItemStyle = {
  display: 'block',
  padding: '0.5rem 1.5rem',
  fontSize: '0.85rem',
  color: '#000000',
  textAlign: 'left',
};

const dropdownLinkAccentStyle = {
  ...dropdownLinkItemStyle,
  color: '#000000',
  fontWeight: '600',
  borderBottom: '1px dashed rgba(74, 52, 57, 0.08)',
  backgroundColor: '#FFFFFF',
};
