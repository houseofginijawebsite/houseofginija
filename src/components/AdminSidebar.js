"use client";

import Link from "next/link";
import { useStore } from '@/context/StoreContext';

export default function AdminSidebar({ active }) {
  const { logout } = useStore();

  return (
    <aside style={sidebarStyle} className="admin-sidebar">
      <div className="admin-sidebar-header-row">
        <Link href="/" style={sidebarHeaderLinkStyle} className="admin-sidebar-header-link">
          <div style={sidebarHeaderStyle} className="admin-sidebar-header">
            <span className="desktop-title mobile-title" style={sidebarTitleStyle}>Admin Portal</span>
          </div>
        </Link>
        <div className="admin-mobile-actions" style={{ display: 'none' }}>
          <Link href="/" className="admin-mobile-btn">Store</Link>
          <button onClick={logout} className="admin-mobile-btn outline">Sign Out</button>
        </div>
      </div>
      <nav style={sidebarNavStyle} className="admin-sidebar-nav">
        <Link 
          href="/admin/dashboard" 
          style={active === "dashboard" ? activeNavLinkStyle : navLinkStyle}
        >
          Dashboard
        </Link>
        <Link 
          href="/admin/products" 
          style={active === "products" ? activeNavLinkStyle : navLinkStyle}
        >
          Products
        </Link>
        <Link 
          href="/admin/hero-reels" 
          style={active === "hero-reels" ? activeNavLinkStyle : navLinkStyle}
        >
          Hero Reels
        </Link>
        <Link 
          href="/admin/founder-reels" 
          style={active === "founder-reels" ? activeNavLinkStyle : navLinkStyle}
        >
          Founder Reels
        </Link>
        <Link 
          href="/admin/flash-sale" 
          style={active === "flash-sale" ? activeNavLinkStyle : navLinkStyle}
        >
          Clearance Sale
        </Link>
        <Link 
          href="/admin/new-arrivals" 
          style={active === "new-arrivals" ? activeNavLinkStyle : navLinkStyle}
        >
          Fresh Collection
        </Link>
        <Link 
          href="/admin/orders" 
          style={active === "orders" ? activeNavLinkStyle : navLinkStyle}
        >
          Orders
        </Link>
        <Link 
          href="/admin/coupons" 
          style={active === "coupons" ? activeNavLinkStyle : navLinkStyle}
        >
          Coupons
        </Link>
        <Link 
          href="/admin/settings" 
          style={active === "settings" ? activeNavLinkStyle : navLinkStyle}
        >
          Settings
        </Link>
      </nav>
      <div style={sidebarFooterStyle}>
        <span style={sidebarFooterTextStyle}>
          Ginija Portal v1.0
        </span>
      </div>
    </aside>
  );
}

const sidebarStyle = {
  backgroundColor: "#F6DDE2",
  color: "#000000",
  padding: "2rem 1.5rem",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  borderRight: "1px solid rgba(74, 52, 57, 0.08)",
  width: "240px",
  minWidth: "240px",
  boxSizing: "border-box",
};

const sidebarHeaderLinkStyle = {
  textDecoration: "none",
  display: "block",
};

const sidebarHeaderStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
  marginBottom: "3rem",
};

const sidebarTitleStyle = {
  fontFamily: "var(--font-serif)",
  fontSize: "1.3rem",
  letterSpacing: "0.12em",
  fontWeight: "600",
  color: "#000000",
};

const adminBadgeStyle = {
  fontSize: "0.62rem",
  textTransform: "uppercase",
  color: "#000000",
  letterSpacing: "0.1em",
  fontWeight: "600",
};

const sidebarNavStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0.8rem",
  flex: 1,
};

const navLinkStyle = {
  color: "#000000",
  fontSize: "0.85rem",
  fontWeight: "600",
  padding: "0.6rem 0.8rem",
  borderRadius: "4px",
  transition: "all 0.2s ease",
  textDecoration: "none",
  display: "block",
};

const activeNavLinkStyle = {
  ...navLinkStyle,
  color: "#000000",
  backgroundColor: "#D98E9B",
};

const sidebarFooterStyle = {
  borderTop: "1px solid rgba(0, 0, 0, 0.08)",
  paddingTop: "1.2rem",
};

const sidebarFooterTextStyle = {
  fontSize: "0.75rem",
  color: "rgba(0, 0, 0, 0.4)",
  textAlign: "center",
  display: "block",
  fontWeight: "500",
};
