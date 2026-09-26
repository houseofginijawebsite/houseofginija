'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/context/StoreContext';
import AdminSidebar from '@/components/AdminSidebar';
import productsFallback from '@/data/local-products-fallback.json';
import homepageFallback from '@/data/local-homepage-fallback.json';
import { getLocalProductsFallback } from '@/lib/localCatalogFallback';

export default function AdminFlashSalePage() {
  const { logout } = useStore();
  const [products, setProducts] = useState(getLocalProductsFallback() || productsFallback.products || []);
  const [collections, setCollections] = useState(homepageFallback.collections || []);
  const [flashSaleEnabled, setFlashSaleEnabled] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Table Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  // Quick Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Disable background scrolling when modal is open
  useEffect(() => {
    if (isAddModalOpen && typeof document !== 'undefined') {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else if (typeof document !== 'undefined') {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
    };
  }, [isAddModalOpen]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  // Saving states per product ID
  const [savingId, setSavingId] = useState(null);
  const [priceInputs, setPriceInputs] = useState({});

  const fetchData = async () => {
    setError('');
    try {
      const prodRes = await fetch('/api/admin/products', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
        setCollections(prodData.collections || []);
        
        // Initialize price inputs
        const initialPrices = {};
        (prodData.products || []).forEach(p => {
          initialPrices[p.id] = p.flash_sale_price ? p.flash_sale_price.toString() : '';
        });
        setPriceInputs(initialPrices);
      }

      const settingsRes = await fetch('/api/admin/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setFlashSaleEnabled(settingsData.settings?.flash_sale_enabled === 'true');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Initialize price inputs for fallback data
    const initialPrices = {};
    (productsFallback.products || []).forEach(p => {
      initialPrices[p.id] = p.flash_sale_price ? p.flash_sale_price.toString() : '';
    });
    setPriceInputs(initialPrices);

    fetchData();

    const handleProductUpdate = (updatedProduct) => {
      if (!updatedProduct) return;
      setProducts((prev) => {
        const exists = prev.some((p) => String(p.id) === String(updatedProduct.id));
        const next = exists
          ? prev.map((p) => (String(p.id) === String(updatedProduct.id) ? updatedProduct : p))
          : [updatedProduct, ...prev];
        return next.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      });
    };

    const handleCustomEvent = (e) => {
      if (e.detail && e.detail.product) {
        handleProductUpdate(e.detail.product);
      } else {
        fetchData();
      }
    };

    let channel;
    if (typeof window !== 'undefined') {
      window.addEventListener('catalog-updated', handleCustomEvent);
      try {
        channel = new BroadcastChannel('houseofginija-catalog-sync');
        channel.onmessage = (event) => {
          if (event.data && event.data.product) {
            handleProductUpdate(event.data.product);
          }
        };
      } catch {}
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('catalog-updated', handleCustomEvent);
        if (channel) channel.close();
      }
    };
  }, []);

  // Toggle global flash sale section on homepage
  const handleGlobalToggle = async () => {
    setSavingSettings(true);
    setError('');
    setSuccess('');
    const newValue = !flashSaleEnabled;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            flash_sale_enabled: newValue ? 'true' : 'false'
          }
        })
      });
      if (res.ok) {
        setFlashSaleEnabled(newValue);
        setSuccess(`Clearance Sale section is now ${newValue ? 'ENABLED' : 'DISABLED'} on your store homepage.`);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save global setting.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error.');
    } finally {
      setSavingSettings(false);
    }
  };

  // 1-Click Toggle Flash Sale ON/OFF for any product
  const handleToggleProductFlashSale = async (product, enableSale) => {
    setSavingId(product.id);
    setError('');
    setSuccess('');

    const origPrice = parseFloat(product.price) || 0;
    let salePriceNum = null;

    if (enableSale) {
      const enteredPrice = parseFloat(priceInputs[product.id]);
      if (!isNaN(enteredPrice) && enteredPrice > 0 && enteredPrice < origPrice) {
        salePriceNum = enteredPrice;
      } else {
        salePriceNum = Math.round(origPrice * 0.8); // 20% off default
      }
    }

    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...product,
          flash_sale: enableSale,
          flash_sale_price: salePriceNum
        })
      });

      const data = await res.json();
      if (res.ok) {
        setProducts(prev => prev.map(p => String(p.id) === String(product.id) ? data.product : p));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('catalog-updated', { detail: { product: data.product } }));
          try {
            const channel = new BroadcastChannel('houseofginija-catalog-sync');
            channel.postMessage({ product: data.product });
            channel.close();
          } catch {}
        }
        if (enableSale) {
          setSuccess(`"${product.name}" is now ON CLEARANCE SALE for ₹${salePriceNum.toLocaleString('en-IN')}!`);
        } else {
          setSuccess(`"${product.name}" removed from Clearance Sale.`);
        }
      } else {
        setError(data.error || 'Failed to update product.');
      }
    } catch (err) {
      console.error(err);
      setError('Network request failed.');
    } finally {
      setSavingId(null);
    }
  };

  // Save new price input for a product
  const handleSavePriceChange = async (product) => {
    const origPrice = parseFloat(product.price) || 0;
    const newPrice = parseFloat(priceInputs[product.id]);

    if (isNaN(newPrice) || newPrice <= 0 || newPrice >= origPrice) {
      setError(`Clearance sale price for "${product.name}" must be between ₹1 and ₹${(origPrice - 1).toLocaleString('en-IN')}.`);
      return;
    }

    handleToggleProductFlashSale(product, true);
  };

  // Quick Add via Modal
  const handleModalAdd = async (e) => {
    e.preventDefault();
    setAddError('');

    if (!selectedProductId) {
      setAddError('Please select a product.');
      return;
    }

    const product = products.find(p => p.id.toString() === selectedProductId.toString());
    if (!product) return;

    const origPrice = parseFloat(product.price) || 0;
    const pct = parseFloat(discountPercent) || 20;
    const computedPrice = Math.round(origPrice * (1 - pct / 100));

    setIsAdding(true);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...product,
          flash_sale: true,
          flash_sale_price: computedPrice
        })
      });

      const data = await res.json();
      if (res.ok) {
        setProducts(prev => prev.map(p => String(p.id) === String(product.id) ? data.product : p));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('catalog-updated', { detail: { product: data.product } }));
          try {
            const channel = new BroadcastChannel('houseofginija-catalog-sync');
            channel.postMessage({ product: data.product });
            channel.close();
          } catch {}
        }
        setSuccess(`"${product.name}" added to Clearance Sale at ₹${computedPrice.toLocaleString('en-IN')} (-${pct}%)!`);
        setIsAddModalOpen(false);
      } else {
        setAddError(data.error || 'Failed to add product.');
      }
    } catch (err) {
      console.error(err);
      setAddError('Network request failed.');
    } finally {
      setIsAdding(false);
    }
  };

  const isProductOnFlashSale = (p) => Boolean(
    p.flash_sale ||
    p.flashSale ||
    p.on_sale ||
    p.onSale ||
    (Array.isArray(p.collection_slugs) && p.collection_slugs.includes('flash-sale'))
  );

  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  const activeFlashProducts = sortedProducts.filter(isProductOnFlashSale);
  const nonFlashProducts = sortedProducts.filter(p => !isProductOnFlashSale(p));

  const calculateDiscountPct = (original, saleVal) => {
    const orig = parseFloat(original);
    const sale = parseFloat(saleVal);
    if (isNaN(orig) || isNaN(sale) || orig <= 0 || sale <= 0 || sale >= orig) return null;
    const pct = Math.round(((orig - sale) / orig) * 100);
    return `-${pct}%`;
  };

  return (
    <div style={layoutStyle} className="admin-page-root animate-fade-in">
      <AdminSidebar active="flash-sale" />

      <main style={mainContentStyle}>
        {/* Header bar */}
        <header style={headerBarStyle}>
          <div>
            <h1 style={pageTitleStyle}>Clearance Sale Manager</h1>
            <p style={pageSubStyle}>Easily put any product on Clearance Sale with custom discount prices</p>
          </div>
          <button onClick={logout} style={logoutBtnStyle}>
            Sign Out
          </button>
        </header>

        {/* Global Notifications */}
        {error && <div style={errorBannerStyle}>{error}</div>}
        {success && <div style={successBannerStyle}>{success}</div>}

        {/* SECTION 1: GLOBAL STOREFRONT TOGGLE */}
        <section style={sectionCardStyle}>
          <div style={globalRowStyle}>
            <div>
              <h2 style={sectionTitleStyle}>Store Homepage Banner Status</h2>
              <p style={sectionSubStyle}>Turn the entire Clearance Sale section ON or OFF on your website homepage.</p>
            </div>
            <div>
              <button 
                onClick={handleGlobalToggle}
                disabled={savingSettings}
                style={{
                  ...actionBtnStyle,
                  backgroundColor: flashSaleEnabled ? '#B65C73' : '#3C303A',
                  color: '#FFFFFF'
                }}
              >
                {savingSettings ? 'Saving...' : (flashSaleEnabled ? 'CLEARANCE SALE SECTION: ACTIVE' : 'CLEARANCE SALE SECTION: HIDDEN')}
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 2: ACTIVE FLASH SALE PRODUCTS SUMMARY */}
        <section style={sectionCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
            <div>
              <h2 suppressHydrationWarning style={sectionTitleStyle}>
                Active Clearance Sale Items ({mounted ? activeFlashProducts.length : activeFlashProducts.length})
              </h2>
              <p style={{ ...sectionSubStyle, marginBottom: 0 }}>These items currently feature discounted prices on your store.</p>
            </div>

            <button
              onClick={() => {
                setIsAddModalOpen(true);
                setAddError('');
                if (nonFlashProducts.length > 0) setSelectedProductId(nonFlashProducts[0].id);
              }}
              style={{
                ...actionBtnStyle,
                backgroundColor: '#D98E9B',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(217, 142, 155, 0.3)'
              }}
            >
              + ADD PRODUCT TO CLEARANCE SALE
            </button>
          </div>

          {activeFlashProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', backgroundColor: '#FAF5F6', borderRadius: '12px', border: '1px dashed rgba(139, 119, 137, 0.2)' }}>
              <p style={{ fontSize: '0.95rem', fontWeight: '600', color: '#000', marginBottom: '0.4rem' }}>No products are currently on Clearance Sale.</p>
              <p style={{ fontSize: '0.85rem', color: 'rgba(0,0,0,0.5)', marginBottom: '1rem' }}>Turn ON the Clearance Sale switch for any product in the catalog table below!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {activeFlashProducts.map(product => {
                const origPrice = parseFloat(product.price) || 0;
                const salePrice = parseFloat(product.flash_sale_price) || Math.round(origPrice * 0.8);
                const discountTag = calculateDiscountPct(origPrice, salePrice);

                return (
                  <div key={product.id} style={activeCardStyle}>
                    <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
                      <img 
                        src={product.images?.[0] || '/icon.png'} 
                        alt={product.name} 
                        style={{ width: '56px', height: '70px', objectFit: 'cover', borderRadius: '8px' }} 
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: '#000', marginBottom: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {product.name}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.4)', textDecoration: 'line-through' }}>₹{origPrice.toLocaleString('en-IN')}</span>
                          <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#B65C73' }}>₹{salePrice.toLocaleString('en-IN')}</span>
                          {discountTag && <span style={badgeStyle}>{discountTag}</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleProductFlashSale(product, false)}
                      disabled={savingId === product.id}
                      style={removeBtnStyle}
                    >
                      {savingId === product.id ? 'Updating...' : 'Remove from Sale ✕'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 3: ALL CATALOG PRODUCTS TABLE WITH ON/OFF SWITCHES */}
        <section style={sectionCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={sectionTitleStyle}>All Catalog Products</h2>
              <p style={{ ...sectionSubStyle, marginBottom: 0 }}>Flip the Clearance Sale switch ON for any product and enter its discounted price.</p>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search products by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(139, 119, 137, 0.25)',
                  fontSize: '0.8rem',
                  outline: 'none',
                  minWidth: '220px'
                }}
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  padding: '0.55rem 1rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(139, 119, 137, 0.25)',
                  fontSize: '0.8rem',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Categories</option>
                <option value="FLASH_ONLY">On Clearance Sale Only</option>
                {collections.map(c => (
                  <option key={c.id} value={c.slug || c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={tableWrapperStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle} className="hide-on-mobile">Category</th>
                  <th style={thStyle} className="hide-on-mobile">Original Price</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Clearance Sale Status</th>
                  <th style={thStyle}>Sale Price (₹)</th>
                  <th style={thStyle} className="hide-on-mobile">Discount Badge</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Save</th>
                </tr>
              </thead>
              <tbody>
                {products.filter(product => {
                  const matchesSearch = !searchQuery || product.name.toLowerCase().includes(searchQuery.toLowerCase());
                  let matchesCat = true;
                  if (filterCategory === 'FLASH_ONLY') {
                    matchesCat = !!product.flash_sale;
                  } else if (filterCategory !== 'ALL') {
                    matchesCat = (product.collection_slug === filterCategory || product.collection_name === filterCategory);
                  }
                  return matchesSearch && matchesCat;
                }).map(product => {
                  const isFlashSale = !!product.flash_sale;
                  const origPrice = parseFloat(product.price) || 0;
                  const currentInputPrice = priceInputs[product.id] || '';
                  const discountTag = isFlashSale ? calculateDiscountPct(origPrice, product.flash_sale_price) : calculateDiscountPct(origPrice, currentInputPrice);

                  return (
                    <tr key={product.id} style={{ ...trStyle, backgroundColor: isFlashSale ? '#FFF9FA' : 'transparent' }}>
                      <td style={tdStyle}>
                        <div style={productInfoStyle}>
                          <img 
                            src={product.images?.[0] || '/icon.png'} 
                            alt={product.name} 
                            style={productImgStyle} 
                            loading="lazy"
                          />
                          <div>
                            <span style={productNameStyle}>{product.name}</span>
                            {isFlashSale && <span style={activeTagStyle}>ACTIVE ON SALE</span>}
                          </div>
                        </div>
                      </td>
                      <td style={tdStyle} className="hide-on-mobile">{product.collection_name || 'Unassigned'}</td>
                      <td style={{ ...tdStyle, fontWeight: '600' }} className="hide-on-mobile">₹{origPrice.toLocaleString('en-IN')}</td>
                      
                      {/* 1-CLICK TOGGLE SWITCH */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleProductFlashSale(product, !isFlashSale)}
                          disabled={savingId === product.id}
                          style={{
                            padding: '0.4rem 0.9rem',
                            borderRadius: '20px',
                            border: 'none',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            backgroundColor: isFlashSale ? '#B65C73' : 'rgba(139, 119, 137, 0.15)',
                            color: isFlashSale ? '#FFFFFF' : 'rgba(0,0,0,0.6)'
                          }}
                        >
                          {savingId === product.id ? 'Updating...' : (isFlashSale ? 'ON (ACTIVE)' : 'OFF')}
                        </button>
                      </td>

                      {/* DISCOUNT PRICE INPUT */}
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.85rem', color: 'rgba(0,0,0,0.5)' }}>₹</span>
                          <input 
                            type="number"
                            placeholder="Sale price"
                            value={currentInputPrice}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPriceInputs(prev => ({ ...prev, [product.id]: val }));
                            }}
                            style={{
                              ...priceInputStyle,
                              borderColor: isFlashSale ? '#D98E9B' : 'rgba(139, 119, 137, 0.2)',
                              fontWeight: isFlashSale ? '700' : '400',
                              color: isFlashSale ? '#B65C73' : '#000'
                            }}
                          />
                        </div>
                      </td>

                      <td style={tdStyle} className="hide-on-mobile">
                        {discountTag ? (
                          <span style={badgeStyle}>{discountTag}</span>
                        ) : (
                          <span style={{ color: 'rgba(0, 0, 0, 0.3)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>

                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => handleSavePriceChange(product)}
                          disabled={savingId === product.id}
                          style={saveBtnStyle}
                        >
                          {savingId === product.id ? 'Saving...' : 'Save Price'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* MODAL: QUICK ADD PRODUCT TO FLASH SALE */}
        {isAddModalOpen && (
          <div style={modalOverlayStyle} onClick={() => setIsAddModalOpen(false)}>
            <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: '600', color: '#000' }}>
                  Put Product on Clearance Sale
                </h3>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'rgba(0,0,0,0.5)' }}
                >
                  ✕
                </button>
              </div>

              {addError && <div style={{ ...errorBannerStyle, marginBottom: '1rem' }}>{addError}</div>}

              <form onSubmit={handleModalAdd}>
                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={labelStyle}>Select Product</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    style={inputSelectStyle}
                    required
                  >
                    {nonFlashProducts.length === 0 ? (
                      <option value="">All products are already on clearance sale!</option>
                    ) : (
                      nonFlashProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ₹{parseFloat(p.price).toLocaleString('en-IN')}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={labelStyle}>Discount Percentage Off</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number"
                      placeholder="e.g. 20"
                      min="1"
                      max="99"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      style={inputSelectStyle}
                      required
                    />
                    <span style={{ fontSize: '1rem', fontWeight: '700', color: '#B65C73' }}>%</span>
                  </div>
                  {selectedProductId && (
                    <p style={{ fontSize: '0.78rem', color: 'rgba(0,0,0,0.5)', marginTop: '0.5rem' }}>
                      Calculated Sale Price: <strong style={{ color: '#B65C73' }}>₹{
                        Math.round((parseFloat(products.find(p => p.id.toString() === selectedProductId.toString())?.price || 0)) * (1 - (parseFloat(discountPercent) || 0) / 100)).toLocaleString('en-IN')
                      }</strong>
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    style={smallBtnOutlineStyle}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdding || nonFlashProducts.length === 0}
                    style={{ ...actionBtnStyle, backgroundColor: '#D98E9B', color: '#FFF' }}
                  >
                    {isAdding ? 'Adding...' : 'Put Product On Sale'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Styling Constants
const layoutStyle = {
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: '#FBF0EC',
};

const mainContentStyle = {
  flex: 1,
  padding: '2.5rem',
  overflowY: 'auto',
};

const headerBarStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '2rem',
  borderBottom: '1px solid rgba(139, 119, 137, 0.12)',
  paddingBottom: '1rem',
};

const pageTitleStyle = {
  fontFamily: 'var(--font-serif)',
  fontSize: '2rem',
  color: '#000000',
  fontWeight: '400',
};

const pageSubStyle = {
  fontSize: '0.85rem',
  color: 'rgba(0, 0, 0, 0.5)',
  marginTop: '0.2rem',
};

const logoutBtnStyle = {
  backgroundColor: 'transparent',
  border: '1px solid rgba(74, 52, 57, 0.2)',
  padding: '0.5rem 1.2rem',
  borderRadius: '30px',
  fontSize: '0.8rem',
  fontWeight: '600',
  color: '#000000',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const sectionCardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '12px',
  padding: '2rem',
  boxShadow: '0 4px 20px rgba(74, 52, 57, 0.03)',
  border: '1px solid rgba(139, 119, 137, 0.08)',
  marginBottom: '2rem',
};

const globalRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const sectionTitleStyle = {
  fontSize: '1.25rem',
  fontWeight: '600',
  color: '#000000',
  marginBottom: '0.4rem',
  fontFamily: 'var(--font-serif)',
};

const sectionSubStyle = {
  fontSize: '0.8rem',
  color: 'rgba(0, 0, 0, 0.45)',
  marginBottom: '1.5rem',
};

const actionBtnStyle = {
  padding: '0.75rem 1.5rem',
  borderRadius: '30px',
  fontSize: '0.8rem',
  fontWeight: '700',
  letterSpacing: '0.08em',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
};

const errorBannerStyle = {
  backgroundColor: '#FDF2F2',
  color: '#000000',
  padding: '1rem',
  borderRadius: '8px',
  marginBottom: '1.5rem',
  border: '1px solid #F8B4B4',
  fontSize: '0.85rem',
  fontWeight: '600',
};

const successBannerStyle = {
  backgroundColor: '#F3FAF7',
  color: '#000000',
  padding: '1rem',
  borderRadius: '8px',
  marginBottom: '1.5rem',
  border: '1px solid #DEF7EC',
  fontSize: '0.85rem',
  fontWeight: '600',
};

const activeCardStyle = {
  backgroundColor: '#FFF7F8',
  borderRadius: '12px',
  padding: '1rem',
  border: '1px solid #F4E1E5',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: '0.8rem',
};

const badgeStyle = {
  backgroundColor: '#FDF2F4',
  color: '#B65C73',
  padding: '0.2rem 0.5rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '700',
  border: '1px solid rgba(182, 92, 115, 0.2)',
};

const activeTagStyle = {
  display: 'inline-block',
  backgroundColor: '#FDF2F4',
  color: '#B65C73',
  fontSize: '0.65rem',
  fontWeight: '700',
  padding: '0.15rem 0.4rem',
  borderRadius: '4px',
  marginTop: '0.2rem',
};

const removeBtnStyle = {
  width: '100%',
  padding: '0.45rem',
  borderRadius: '20px',
  border: '1px solid #F8B4B4',
  backgroundColor: '#FDF2F2',
  color: '#C81E1E',
  fontSize: '0.75rem',
  fontWeight: '600',
  cursor: 'pointer',
};

const tableWrapperStyle = {
  overflowX: 'auto',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
};

const thStyle = {
  padding: '0.8rem 1rem',
  fontSize: '0.75rem',
  fontWeight: '700',
  color: 'rgba(0, 0, 0, 0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  borderBottom: '1px solid rgba(139, 119, 137, 0.12)',
};

const trStyle = {
  borderBottom: '1px solid rgba(139, 119, 137, 0.08)',
  transition: 'background-color 0.2s ease',
};

const tdStyle = {
  padding: '1rem',
  fontSize: '0.85rem',
  verticalAlign: 'middle',
};

const productInfoStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.8rem',
};

const productImgStyle = {
  width: '44px',
  height: '56px',
  objectFit: 'cover',
  borderRadius: '6px',
};

const productNameStyle = {
  fontWeight: '600',
  color: '#000000',
  display: 'block',
};

const priceInputStyle = {
  width: '110px',
  padding: '0.45rem 0.6rem',
  borderRadius: '6px',
  border: '1px solid rgba(139, 119, 137, 0.2)',
  fontSize: '0.85rem',
  outline: 'none',
};

const saveBtnStyle = {
  padding: '0.45rem 0.9rem',
  borderRadius: '20px',
  border: 'none',
  backgroundColor: '#D98E9B',
  color: '#FFFFFF',
  fontSize: '0.75rem',
  fontWeight: '700',
  cursor: 'pointer',
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.4)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 999,
  padding: '1rem',
};

const modalContentStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  padding: '2rem',
  width: '100%',
  maxWidth: '460px',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: '600',
  color: '#000000',
  marginBottom: '0.5rem',
};

const inputSelectStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  border: '1px solid rgba(139, 119, 137, 0.25)',
  fontSize: '0.85rem',
  outline: 'none',
  backgroundColor: '#FFFFFF',
};

const smallBtnOutlineStyle = {
  padding: '0.5rem 1rem',
  borderRadius: '20px',
  border: '1px solid rgba(139, 119, 137, 0.3)',
  backgroundColor: '#FFFFFF',
  color: '#000000',
  fontSize: '0.8rem',
  fontWeight: '600',
  cursor: 'pointer',
};
