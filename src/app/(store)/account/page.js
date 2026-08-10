'use client';

import { useState, useEffect, Suspense } from 'react';
import { useStore } from '@/context/StoreContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AccountContent() {
  const { user, loading, logout, toggleWishlist, addToCart } = useStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || null);

  // Data states
  const [orders, setOrders] = useState([]);
  const [expandedOrders, setExpandedOrders] = useState({});

  const toggleOrderDetails = (orderId) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };
  const [wishlistItems, setWishlistItems] = useState([]);
  const [addresses, setAddresses] = useState([]);

  // Loaders
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(false);

  // Address form
  const [newAddress, setNewAddress] = useState({
    type: 'shipping',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
  });
  const [addressSuccess, setAddressSuccess] = useState('');
  const [addressError, setAddressError] = useState('');

  // Authentication check
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Sync tab from URL if changed externally (e.g., clicking header icon)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab !== activeTab) {
      setActiveTab(tab || null);
    }
  }, [searchParams, activeTab]);

  // Sheet change handler
  const handleSheetChange = (sheet) => {
    setActiveTab(sheet);
    const params = new URLSearchParams(window.location.search);
    if (sheet) {
      params.set('tab', sheet);
    } else {
      params.delete('tab');
    }
    const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState(null, '', newRelativePathQuery);
  };

  const handleSignOut = async () => {
    await logout();
  };

  // Fetch orders
  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/account/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Fetch detailed wishlist items
  const fetchWishlist = async () => {
    setWishlistLoading(true);
    try {
      const res = await fetch('/api/account/wishlist?details=true');
      if (res.ok) {
        const data = await res.json();
        setWishlistItems(data.wishlist || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setWishlistLoading(false);
    }
  };

  // Fetch addresses
  const fetchAddresses = async () => {
    setAddressesLoading(true);
    try {
      const res = await fetch('/api/account/address');
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddressesLoading(false);
    }
  };

  // Fetch appropriate data on tab change
  useEffect(() => {
    if (!user) return;
    
    if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'wishlist') {
      fetchWishlist();
    } else if (activeTab === 'addresses') {
      fetchAddresses();
    }
  }, [activeTab, user]);

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setAddressSuccess('');
    setAddressError('');

    try {
      const res = await fetch('/api/account/address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddress),
      });

      if (res.ok) {
        setAddressSuccess('Address successfully registered.');
        setNewAddress({
          type: 'shipping',
          line1: '',
          line2: '',
          city: '',
          state: '',
          postal_code: '',
          phone: '',
        });
        fetchAddresses(); // Refresh list
      } else {
        const data = await res.json();
        setAddressError(data.error || 'Failed to save address.');
      }
    } catch (err) {
      console.error(err);
      setAddressError('Network error. Failed to save address.');
    }
  };

  const handleRemoveWishlistItem = async (id) => {
    await toggleWishlist(id);
    // Optimistic UI update
    setWishlistItems(prev => prev.filter(item => item.id !== id));
  };

  const handleMoveToBag = (item) => {
    const defaultVariant = item.variants?.[0] || {};
    addToCart(item, defaultVariant.size || 'One Size', defaultVariant.color || 'Default', 1);
    handleRemoveWishlistItem(item.id);
  };

  const handleMoveAllToBag = async () => {
    await Promise.all(wishlistItems.map(async (item) => {
      const defaultVariant = item.variants?.[0] || {};
      addToCart(item, defaultVariant.size || 'One Size', defaultVariant.color || 'Default', 1);
      await handleRemoveWishlistItem(item.id);
    }));
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div style={pageStyle} className="container">
      
      {/* MAIN MENU VIEW */}
      {!activeTab && (
        <div className="animate-fade-in">
          <div style={headerStyle}>
            <h1 style={titleStyle}>My Account</h1>
            <p style={welcomeStyle}>Welcome back, {user.name}</p>
            <button onClick={logout} style={logoutBtnStyle}>
              Sign Out of Account
            </button>
          </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', maxWidth: '600px', margin: '0.5rem auto 0 auto', borderRadius: '8px', overflow: 'hidden' }}>
          {/* My Profile */}
          <button style={menuRowStyle} onClick={() => handleSheetChange('profile')}>
            <div style={menuRowLeftStyle}>
              <div style={menuIconStyle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.0">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div style={menuTextGroupStyle}>
                <span style={menuTitleStyle}>My Profile</span>
                <span style={menuSubtitleStyle}>Manage your personal details</span>
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          
          {/* Order History */}
          <button style={menuRowStyle} onClick={() => handleSheetChange('orders')}>
            <div style={menuRowLeftStyle}>
              <div style={menuIconStyle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.0">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </div>
              <div style={menuTextGroupStyle}>
                <span style={menuTitleStyle}>Order History</span>
                <span style={menuSubtitleStyle}>View and track your orders</span>
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          {/* My Wishlist */}
          <button style={menuRowStyle} onClick={() => handleSheetChange('wishlist')}>
            <div style={menuRowLeftStyle}>
              <div style={menuIconStyle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.0">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </div>
              <div style={menuTextGroupStyle}>
                <span style={menuTitleStyle}>My Wishlist</span>
                <span style={menuSubtitleStyle}>View your saved items</span>
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>

          {/* Saved Addresses */}
          <button style={menuRowStyle} onClick={() => handleSheetChange('addresses')}>
            <div style={menuRowLeftStyle}>
              <div style={menuIconStyle}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.0">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div style={menuTextGroupStyle}>
                <span style={menuTitleStyle}>Saved Addresses</span>
                <span style={menuSubtitleStyle}>Manage your addresses</span>
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
        </div>
      )}

      {/* ACTIVE SECTION VIEW */}
      {activeTab && (
        <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
          
          {/* Section Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            position: activeTab === 'orders' ? 'sticky' : 'relative',
            top: activeTab === 'orders' ? '107px' : 'auto',
            width: activeTab === 'orders' ? '100%' : 'auto',
            backgroundColor: '#FFF',
            zIndex: 100,
            padding: '1rem 0',
            borderBottom: activeTab === 'orders' ? '1px solid #eaeaea' : 'none'
          }}>
            <button 
              onClick={() => handleSheetChange(null)} 
              style={{ position: 'absolute', left: '0', width: '40px', height: '40px', borderRadius: '50%', border: '1px solid rgba(139, 119, 137, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', cursor: 'pointer' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <h1 style={titleStyle}>
              {activeTab === 'profile' && 'My Profile'}
              {activeTab === 'orders' && 'Order History'}
              {activeTab === 'wishlist' && 'My Wishlist'}
              {activeTab === 'addresses' && 'Saved Addresses'}
            </h1>
          </div>

          {/* Section Content */}
          <div style={{ backgroundColor: '#FFFFFF' }}>
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div style={tabContentStyle}>
              
              
              <div style={profileGridStyle}>
                <div style={infoGroupStyle}>
                  <span style={infoLabelStyle}>Customer Name</span>
                  <span style={infoValueStyle}>{user.name}</span>
                </div>
                <div style={infoGroupStyle}>
                  <span style={infoLabelStyle}>Email Address</span>
                  <span style={infoValueStyle}>{user.email}</span>
                </div>
                <div style={infoGroupStyle}>
                  <span style={infoLabelStyle}>Customer Rank</span>
                  <span style={{ ...infoValueStyle, textTransform: 'uppercase', color: '#000000' }}>
                    {user.role}
                  </span>
                </div>
                <div style={infoGroupStyle}>
                  <span style={infoLabelStyle}>Registered Since</span>
                  <span style={infoValueStyle}>
                    {new Date(user.created_at || '2026-01-01').toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div style={{ width: '100%' }}>
              

              {ordersLoading ? (
                <div>Retrieving order records...</div>
              ) : orders.length === 0 ? (
                <div style={emptyTabStyle}>
                  <p>You have not placed any orders yet.</p>
                  <Link href="/collections" style={shopLinkStyle}>Browse Collections</Link>
                </div>
              ) : (
                <div style={ordersWrapperStyle}>
                  {/* Summary Row */}
                  <div style={ordersSummaryRowStyle}>
                    <div style={ordersSummaryIconText}>
                      <div style={ordersSummaryIconWrapper}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                          <line x1="3" y1="6" x2="21" y2="6"></line>
                          <path d="M16 10a4 4 0 0 1-8 0"></path>
                        </svg>
                      </div>
                      <div>
                        <h2 style={ordersSummaryTitle}>{orders.length} Orders</h2>
                        <span style={ordersSummarySubtitle}>You&apos;ve placed {orders.length} order(s) with us</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Orders List */}
                  {orders.map((order) => (
                    <div key={order.id} style={newOrderCardStyle}>
                      
                      {/* Top Row */}
                      <div style={newOrderCardTopStyle}>
                        <div style={{ flex: '0 0 34%', minWidth: 0, borderRight: '1px solid #f0f0f0', paddingRight: '0.2rem' }}>
                          <div style={newOrderCardId}>ORDER #HG{order.id}</div>
                          <div style={newOrderCardDate}>{new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>
                        <div style={{ flex: '0 0 36%', minWidth: 0, borderRight: '1px solid #f0f0f0', padding: '0 0.2rem' }}>
                          <div style={newOrderCardLabel}>TOTAL</div>
                          <div style={newOrderCardValue}>₹{parseFloat(order.total).toLocaleString('en-IN')}</div>
                        </div>
                        <div style={{ flex: '0 0 30%', minWidth: 0, paddingLeft: '0.25rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <div style={newOrderCardLabel}>STATUS</div>
                            <span style={newOrderCardStatus(order.status)}>{order.status}</span>
                          </div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </div>
                      </div>

                      {/* Bottom Row */}
                      <div style={newOrderCardBottomStyle}>
                        <div style={newOrderCardImages} className="hide-scrollbar">
                          {order.items.map((item, idx) => (
                            <img 
                              key={idx} 
                              src={item.image || 'https://placehold.co/70x85/eeeeee/cccccc?text=No+Image'} 
                              alt={item.name} 
                              style={newOrderCardImg} 
                            />
                          ))}
                        </div>
                        <div style={newOrderCardDetailsBtn}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{order.items.length} Items</span>
                          <button 
                            onClick={() => toggleOrderDetails(order.id)} 
                            style={{ background: 'none', border: 'none', padding: 0, color: '#B97285', textDecoration: 'underline', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                          >
                            View Details
                          </button>
                        </div>
                      </div>

                      {/* Expanded View */}
                      {expandedOrders[order.id] && (
                        <div style={itemTextExpandStyle}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.8rem', borderBottom: idx !== order.items.length - 1 ? '1px solid rgba(139, 119, 137, 0.1)' : 'none' }}>
                              <div style={{ fontSize: '0.85rem' }}>
                                <strong>{item.name}</strong>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.2rem', color: '#666' }}>
                                  <span>Size: {item.size}</span>
                                  <span>Color: {item.color}</span>
                                  <span>Qty: {item.quantity}</span>
                                </div>
                              </div>
                              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* WISHLIST TAB */}
          {activeTab === 'wishlist' && (
            <div style={tabContentStyle}>
              

              {wishlistLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Loading wishlist...</div>
              ) : wishlistItems.length === 0 ? (
                <div style={emptyTabStyle}>
                  <p>Your wishlist is currently empty.</p>
                  <Link href="/collections" style={shopLinkStyle}>Save Creations</Link>
                </div>
              ) : (
                <div style={wishlistContainerStyle}>
                  <button onClick={handleMoveAllToBag} style={moveAllToBagBtnStyle}>
                    MOVE ALL TO BAG
                  </button>
                  <div className="cart-drawer-feed hide-scrollbar" style={{ padding: 0, gap: 0 }}>
                    {wishlistItems.map((item) => (
                      <div key={item.id} className="cart-drawer-item" style={{ paddingBottom: '1rem', paddingTop: '1rem', borderBottom: '1px solid rgba(139, 119, 137, 0.15)' }}>
                        <img src={Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : (typeof item.images === 'string' ? JSON.parse(item.images)[0] : 'https://placehold.co/400x500/eeeeee/cccccc?text=No+Image')} alt={item.name} className="cart-drawer-thumb" loading="lazy" />
                        <div className="cart-drawer-item-details">
                          <h4 className="cart-drawer-item-title">{item.name}</h4>
                          <span className="cart-drawer-item-price">
                            {item.is_flash_sale ? (
                              <>
                                <span style={{ fontWeight: 'bold' }}>₹{parseFloat(item.flash_sale_price).toLocaleString('en-IN')}</span>
                                <span style={{ textDecoration: 'line-through', color: '#999', marginLeft: '6px', fontSize: '0.85em', fontWeight: '400' }}>
                                  ₹{parseFloat(item.price).toLocaleString('en-IN')}
                                </span>
                              </>
                            ) : (
                              <span>₹{parseFloat(item.price).toLocaleString('en-IN')}</span>
                            )}
                          </span>
                          
                          <div className="cart-drawer-item-actions">
                            <button onClick={() => handleMoveToBag(item)} className="wishlist-add-cart-btn">
                              MOVE TO BAG
                            </button>
                            <button onClick={() => handleRemoveWishlistItem(item.id)} className="cart-drawer-item-remove">
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ADDRESSES TAB */}
          {activeTab === 'addresses' && (
            <div style={tabContentStyle}>
              

              {addressesLoading ? (
                <div>Loading customer addresses...</div>
              ) : (
                <div style={addressesGridStyle}>
                  {addresses.map((addr) => (
                    <div key={addr.id} style={addressCardStyle}>
                      <span style={addressTypeStyle}>{addr.type}</span>
                      <p style={addressBodyStyle}>
                        {addr.line1}
                        {addr.line2 && `, ${addr.line2}`}
                        <br />
                        {addr.city}, {addr.state} - {addr.postal_code}
                        <br />
                        Phone: {addr.phone}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Address Form */}
              <div style={addressFormContainerStyle}>
                <h3 style={formTitleStyle}>Register New Address</h3>
                <form onSubmit={handleAddressSubmit} style={formStyle}>
                  <div style={formRowStyle}>
                    <div style={{ ...formGroupStyle, flex: 1 }}>
                      <label style={labelStyle}>Address label (e.g. Home, Work)</label>
                      <input
                        type="text"
                        placeholder="Home"
                        value={newAddress.type}
                        onChange={(e) => setNewAddress({ ...newAddress, type: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>
                  </div>

                  <div style={formRowStyle}>
                    <div style={{ ...formGroupStyle, flex: 1 }}>
                      <label style={labelStyle}>Street Address Line 1</label>
                      <input
                        type="text"
                        placeholder="House/flat number, building name"
                        value={newAddress.line1}
                        onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>
                  </div>

                  <div style={formRowStyle}>
                    <div style={{ ...formGroupStyle, flex: 1 }}>
                      <label style={labelStyle}>Address Line 2 (Optional)</label>
                      <input
                        type="text"
                        placeholder="Landmark, locality"
                        value={newAddress.line2}
                        onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div style={formRowStyle}>
                    <div style={{ ...formGroupStyle, flex: 1 }}>
                      <label style={labelStyle}>City</label>
                      <input
                        type="text"
                        placeholder="City"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div style={{ ...formGroupStyle, flex: 1 }}>
                      <label style={labelStyle}>State</label>
                      <input
                        type="text"
                        placeholder="State"
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>
                  </div>

                  <div style={formRowStyle}>
                    <div style={{ ...formGroupStyle, flex: 1 }}>
                      <label style={labelStyle}>Postal Code</label>
                      <input
                        type="text"
                        placeholder="PIN code"
                        value={newAddress.postal_code}
                        onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>
                    <div style={{ ...formGroupStyle, flex: 1 }}>
                      <label style={labelStyle}>Contact Phone</label>
                      <input
                        type="tel"
                        placeholder="10-digit phone number"
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>
                  </div>

                  {addressSuccess && <p style={successStyle}>{addressSuccess}</p>}
                  {addressError && <p style={errorStyle}>{addressError}</p>}

                  <button type="submit" style={addressSubmitBtnStyle}>
                    Save Address
                  </button>
                </form>
              </div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div>Loading profile...</div>}>
      <AccountContent />
    </Suspense>
  );
}

const pageStyle = {
  paddingTop: '1rem',
  paddingBottom: '2rem',
  backgroundColor: '#FFFFFF',
};

const loadingContainerStyle = {
  textAlign: 'center',
  padding: '10rem 0',
  color: '#000000',
  fontSize: '1.2rem',
  fontFamily: 'var(--font-serif)',
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '1rem',
};

const subtitleStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  color: '#D98E9B',
  fontWeight: '600',
  display: 'block',
  marginBottom: '0.4rem',
};

const titleStyle = {
  fontSize: '2.5rem',
  fontFamily: 'var(--font-serif)',
  color: '#D98E9B',
  fontWeight: '400',
  lineHeight: 1.1,
  marginBottom: '0',
};

const welcomeStyle = {
  fontSize: '0.95rem',
  color: '#000000',
  marginTop: '0',
};

const logoutBtnStyle = {
  backgroundColor: 'transparent',
  color: '#000000',
  border: '1px solid #000000',
  padding: '0.4rem 1.2rem',
  borderRadius: '4px',
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: '600',
  marginTop: '0.5rem',
};

const portalLayoutStyle = {
  display: 'grid',
  gridTemplateColumns: '260px 1fr',
  gap: '3rem',
  alignItems: 'start',
  '@media (max-width: 991px)': {
    gridTemplateColumns: '1fr',
    gap: '2rem',
  },
};

const tabsSidebarStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  backgroundColor: '#FFFFFF',
  padding: '1.5rem',
  borderRadius: '8px',
  border: '1px solid rgba(139, 119, 137, 0.12)',
};

const tabBtnStyle = {
  width: '100%',
  textAlign: 'left',
  padding: '0.8rem 1rem',
  fontSize: '0.85rem',
  color: '#000000',
  fontWeight: '600',
  borderRadius: '4px',
  transition: 'all 0.2s ease',
};

const activeTabBtnStyle = {
  ...tabBtnStyle,
  backgroundColor: '#D98E9B',
  color: '#000000',
};

const contentPanelStyle = {
  flex: 1,
};

const tabContentStyle = {
  backgroundColor: '#FFFFFF',
  padding: '1.2rem',
  borderRadius: '8px',
  border: '1px solid rgba(139, 119, 137, 0.12)',
  boxShadow: 'var(--shadow-sm)',
};

const tabTitleStyle = {
  fontFamily: 'var(--font-serif)',
  fontSize: '1.5rem',
  color: '#D98E9B',
  fontWeight: '500',
};

const dividerLineStyle = {
  height: '1px',
  backgroundColor: 'rgba(139, 119, 137, 0.12)',
  margin: '1.2rem 0 2rem 0',
};

// Profile style
const profileGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '2rem',
};

const infoGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
};

const infoLabelStyle = {
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#000000',
  fontWeight: '700',
};

const infoValueStyle = {
  fontSize: '1rem',
  fontWeight: '600',
  color: '#000000',
  wordBreak: 'break-word',
};

const emptyTabStyle = {
  textAlign: 'center',
  padding: '4rem 1rem',
  color: '#000000',
};

const shopLinkStyle = {
  color: '#000000',
  fontWeight: '600',
  textDecoration: 'underline',
  marginTop: '0.8rem',
  display: 'inline-block',
};

// Orders style
const ordersWrapperStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
  padding: '1.5rem',
  border: '1px solid #eaeaea',
  borderRadius: '12px',
  backgroundColor: '#fff'
};

const ordersSummaryRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '1.5rem',
  borderBottom: '1px solid #eaeaea',
  flexWrap: 'nowrap',
  gap: '1rem'
};

const ordersSummaryIconText = {
  display: 'flex',
  gap: '1rem',
  alignItems: 'center'
};

const ordersSummaryIconWrapper = {
  width: '45px',
  height: '45px',
  borderRadius: '50%',
  backgroundColor: '#fdf2f4',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: '#B97285'
};

const ordersSummaryTitle = {
  fontSize: '1.1rem',
  fontWeight: '700',
  color: '#000',
  marginBottom: '0.2rem'
};

const ordersSummarySubtitle = {
  fontSize: '0.85rem',
  color: '#666'
};

const ordersFilterBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.8rem',
  border: '1px solid #eaeaea',
  borderRadius: '6px',
  backgroundColor: '#fff',
  fontSize: '0.85rem',
  color: '#333',
  cursor: 'pointer'
};

const newOrderCardStyle = {
  border: '1px solid #eaeaea',
  borderRadius: '12px',
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem'
};

const newOrderCardTopStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingBottom: '1.25rem',
  borderBottom: '1px solid #f0f0f0',
  flexWrap: 'nowrap',
  gap: '0.2rem'
};

const newOrderCardLabel = {
  fontSize: '0.55rem',
  color: '#666',
  textTransform: 'uppercase',
  fontWeight: '600',
  letterSpacing: '0.02em',
  marginBottom: '0.2rem',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const newOrderCardId = {
  fontSize: '0.7rem',
  fontWeight: '600',
  color: '#B97285',
  marginBottom: '0.2rem',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const newOrderCardDate = {
  fontSize: '0.65rem',
  color: '#666',
  whiteSpace: 'nowrap'
};

const newOrderCardValue = {
  fontSize: '0.7rem',
  fontWeight: '700',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const newOrderCardStatus = (status) => {
  const s = status || 'Pending';
  const isDelivered = s === 'Delivered';
  const isPending = s === 'Pending';
  return {
    display: 'inline-block',
    padding: '0.35rem 0.8rem',
    borderRadius: '99px',
    fontSize: '0.75rem',
    fontWeight: '600',
    backgroundColor: isDelivered ? '#e8f5e9' : (isPending ? '#fff8e1' : '#fff3e0'),
    color: isDelivered ? '#2e7d32' : (isPending ? '#f57f17' : '#e65100')
  };
};

const newOrderCardBottomStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'nowrap',
  gap: '0.5rem'
};

const newOrderCardImages = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'nowrap',
  overflowX: 'auto',
  gap: '0.6rem',
  flex: '1 1 auto',
  WebkitOverflowScrolling: 'touch',
  scrollbarWidth: 'none',
  msOverflowStyle: 'none'
};

const newOrderCardImg = {
  width: '55px',
  height: '55px',
  flexShrink: 0,
  objectFit: 'cover',
  borderRadius: '6px',
  backgroundColor: '#f5f5f5'
};

const newOrderCardDetailsBtn = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  flexShrink: 0,
  gap: '0.2rem',
  marginLeft: '0.5rem'
};

const itemTextExpandStyle = {
  padding: '1rem 0 0 0',
  borderTop: '1px solid #eaeaea',
  marginTop: '0.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.8rem'
};

// Wishlist style
const wishlistContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const moveAllToBagBtnStyle = {
  width: '100%',
  padding: '0.6rem 1rem',
  backgroundColor: 'transparent',
  color: '#000000',
  border: '1px solid #000000',
  borderRadius: '4px',
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: '600',
  cursor: 'pointer',
  textAlign: 'center',
};



// Addresses style
const addressesGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: '1.5rem',
  marginBottom: '3rem',
};

const addressCardStyle = {
  border: '1px solid rgba(139, 119, 137, 0.15)',
  backgroundColor: '#FFFFFF',
  padding: '1.2rem',
  borderRadius: '6px',
  position: 'relative',
};

const addressTypeStyle = {
  fontSize: '0.65rem',
  textTransform: 'uppercase',
  backgroundColor: '#FFFFFF',
  color: '#000000',
  padding: '0.15rem 0.5rem',
  borderRadius: '2px',
  fontWeight: '700',
  letterSpacing: '0.05em',
  position: 'absolute',
  top: '1.2rem',
  right: '1.2rem',
};

const addressBodyStyle = {
  fontSize: '0.85rem',
  lineHeight: 1.6,
  color: '#000000',
  marginTop: '0.5rem',
};

// Form style
const addressFormContainerStyle = {
  marginTop: '2rem',
  borderTop: '1px solid rgba(139, 119, 137, 0.12)',
  paddingTop: '2.5rem',
};

const formTitleStyle = {
  fontFamily: 'var(--font-serif)',
  fontSize: '1.3rem',
  color: '#D98E9B',
  marginBottom: '1.5rem',
  fontWeight: '500',
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  maxWidth: '600px',
};

const formRowStyle = {
  display: 'flex',
  gap: '1rem',
  width: '100%',
};

const formGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
};

const labelStyle = {
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#000000',
  fontWeight: '700',
};

const inputStyle = {
  padding: '0.65rem',
  border: '1px solid rgba(139, 119, 137, 0.25)',
  borderRadius: '4px',
};

const successStyle = {
  color: '#000000',
  fontSize: '0.8rem',
  fontWeight: '600',
};

const errorStyle = {
  color: '#000000',
  fontSize: '0.8rem',
  fontWeight: '600',
};

const addressSubmitBtnStyle = {
  backgroundColor: '#D98E9B',
  color: '#000000',
  padding: '0.75rem 1.5rem',
  borderRadius: '4px',
  fontSize: '0.8rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  alignSelf: 'flex-start',
  boxShadow: 'var(--shadow-sm)',
};

const menuRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#F6DDE2', // Light pink
  padding: '1.2rem',
  borderRadius: '0',
  border: 'none',
  borderBottom: '1px solid rgba(139, 119, 137, 0.15)',
  width: '100%',
  cursor: 'pointer',
  textAlign: 'left',
};

const menuRowLeftStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
};

const menuIconStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#000000',
};

const menuTextGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
};

const menuTitleStyle = {
  fontSize: '1rem',
  fontWeight: '600',
  color: '#000000',
  marginBottom: '0.2rem',
};

const menuSubtitleStyle = {
  fontSize: '0.75rem',
  color: '#555555',
};
