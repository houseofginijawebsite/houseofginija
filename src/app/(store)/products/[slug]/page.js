'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import Link from 'next/link';
import { getStoredLocalCatalogOverrides } from '@/lib/catalogClient';

export default function ProductPage({ params }) {
  const { slug } = use(params);
  const router = useRouter();
  const { user, cart, addToCart, updateCartQuantity, wishlist, toggleWishlist } = useStore();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeImage, setActiveImage] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cartSuccess, setCartSuccess] = useState(false);
  const [reviewsOpen, setReviewsOpen] = useState(false);

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        const res = await fetch(`/api/products/${slug}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
        let targetProd = null;
        if (res.ok) {
          const data = await res.json();
          targetProd = data.product;
        }

        const overrides = getStoredLocalCatalogOverrides();
        const localMatch = overrides.find((p) => p.slug === slug || String(p.id) === String(targetProd?.id));
        if (!targetProd && localMatch) {
          targetProd = localMatch;
        }

        if (!targetProd) {
          throw new Error('Product not found in our vaults.');
        }

        setProduct(targetProd);
        if (targetProd.images && targetProd.images.length > 0) {
          setActiveImage(targetProd.images[0]);
        }
        
        // Auto select first available size/color combinations if they have stock
        const vars = data.product.variants || [];
        const inStockVar = vars.find(v => v.stock > 0);
        if (inStockVar) {
          setSelectedSize(inStockVar.size || '');
          setSelectedColor(inStockVar.color || '');
        } else if (vars.length > 0) {
          setSelectedSize(vars[0].size || '');
          setSelectedColor(vars[0].color || '');
        }
      } catch (err) {
        setError(err.message || 'Failed to load product.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [slug]);

  if (loading) {
    return <div style={loadingContainerStyle}>Unveiling creation...</div>;
  }

  if (error || !product) {
    return (
      <div style={errorContainerStyle}>
        <h2>Creations Vault Error</h2>
        <p>{error || 'This creation does not exist.'}</p>
        <Link href="/collections" style={backBtnStyle}>
          Back to Collections
        </Link>
      </div>
    );
  }

  // Get available sizes & colors
  const hasClothingSizes = product.variants && product.variants.some(v => ['S', 'M', 'L', 'XL', 'XXL'].includes(v.size?.toUpperCase()));
  const sizes = hasClothingSizes 
    ? ['S', 'M', 'L', 'XL', 'XXL'] 
    : [...new Set(product.variants.map(v => v.size))].filter(Boolean);
  const colors = [...new Set(product.variants.map(v => v.color))].filter(Boolean);

  // Find stock of selected size/color combination
  const getSelectedVariant = () => {
    return product.variants.find(
      v => v.size === selectedSize && v.color === selectedColor
    );
  };

  const selectedVariant = getSelectedVariant();
  const stockCount = selectedVariant ? selectedVariant.stock : 0;
  const isOutOfStock = product.is_out_of_stock || stockCount <= 0;
  const isLowStock = stockCount > 0 && stockCount <= 3;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product, selectedSize, selectedColor, quantity);
    
    // Show success feedback
    setCartSuccess(true);
    setTimeout(() => {
      setCartSuccess(false);
    }, 3000);
  };

  const isStarred = wishlist.includes(product.id);
  const cartItem = cart && cart.find(
    item => item.id === product.id && item.size === selectedSize && item.color === selectedColor
  );
  const cartQty = cartItem ? cartItem.quantity : 0;

  const handleButtonClick = () => {
    if (isOutOfStock) return;
    if (cartQty > 0) {
      router.push('/cart');
    } else {
      handleAddToCart();
    }
  };

  return (
    <div style={pageStyle} className="container animate-fade-in">
      <div style={breadcrumbsStyle}>
        <Link href="/">Home</Link> &gt;{' '}
        <Link href="/collections">Creations</Link> &gt;{' '}
        <Link href={`/collections?collection=${product.collection_slug}`}>{product.collection_name}</Link> &gt;{' '}
        <span>{product.name}</span>
      </div>

      <div style={productGridStyle} className="product-detail-grid">
        {/* Left Column: Image Gallery */}
        <div style={galleryColumnStyle}>
          <div style={mainImageContainerStyle} className="product-detail-main-image-container">
            <button
              onClick={() => router.back()}
              aria-label="Go back"
              style={overlayBackBtnStyle}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>

            <div style={overlayTopRightStyle}>
              {product.flash_sale && product.flash_sale_price && (
                <span style={overlayDiscountBadgeStyle}>
                  -{Math.round(((parseFloat(product.price) - parseFloat(product.flash_sale_price)) / parseFloat(product.price)) * 100)}%
                </span>
              )}
              <button
                onClick={() => toggleWishlist(product.id)}
                aria-label="Wishlist"
                style={overlayIconBtnStyle}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isStarred ? '#D98E9B' : 'none'} stroke={isStarred ? '#D98E9B' : '#111111'} strokeWidth="1.8">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.share) {
                    navigator.share({ title: product.name, url: window.location.href }).catch(() => {});
                  } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied to clipboard!');
                  }
                }}
                aria-label="Share"
                style={overlayIconBtnStyle}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </button>
            </div>

            <img src={activeImage} alt={product.name} style={mainImageStyle} className="product-detail-main-image" loading="lazy" />
          </div>
          {product.images && product.images.length > 1 && (
            <div style={thumbnailRowStyle}>
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  style={activeImage === img ? activeThumbStyle : thumbnailStyle}
                >
                  <img src={img} alt={`${product.name} thumbnail ${idx}`} style={thumbImgStyle} loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details & Configuration */}
        <div style={detailsColumnStyle}>
          <span style={collectionNameStyle}>{product.collection_name}</span>
          <h1 style={productNameStyle}>{product.name}</h1>
          <p style={priceStyle}>₹{parseFloat(product.price).toLocaleString('en-IN')}</p>

          {/* Custom Tag Badges below Price and above Description */}
          {(() => {
            let raw = product.tags;
            if (typeof raw === 'string') {
              try { raw = JSON.parse(raw); } catch {}
            }
            if (!Array.isArray(raw) || raw.length === 0) return null;
            const normalizedTags = raw.map((tag) => {
              if (typeof tag === 'string') {
                try {
                  const parsed = JSON.parse(tag);
                  if (parsed && typeof parsed === 'object') return parsed;
                } catch {}
                return { name: tag };
              }
              return tag;
            }).filter(Boolean);

            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.8rem', marginBottom: '1.2rem' }}>
                {normalizedTags.map((tag, idx) => {
                  const tagName = typeof tag === 'string' ? tag : (tag?.name || tag?.slug);
                  if (!tagName) return null;
                  return (
                    <span
                      key={tag?.id || tag?.slug || idx}
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        letterSpacing: '0.01em',
                        backgroundColor: '#FFF7F8',
                        color: '#8B4C5C',
                        padding: '0.3rem 0.7rem',
                        borderRadius: '6px',
                        border: '1px solid #EFA7B3',
                        display: 'inline-flex',
                        alignItems: 'center',
                        lineHeight: '1.2',
                      }}
                    >
                      {tagName}
                    </span>
                  );
                })}
              </div>
            );
          })()}

          <p style={descriptionStyle}>{product.description}</p>

          <div style={{ marginTop: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#B8860B', fontWeight: '600' }}>
            {stockCount <= 3 ? (
              <span style={{ color: '#D9534F' }}>⚠️ Only {stockCount} left in our vaults!</span>
            ) : (
              <span>Remaining stock: {stockCount} available</span>
            )}
          </div>

          <div style={dividerLineStyle}></div>

          {/* Variant selections */}
          <div style={selectionContainerStyle}>
            {sizes.length > 0 && (
              <div style={selectionGroupStyle}>
                <span style={selectionLabelStyle}>Select Size:</span>
                <div style={sizeSelectorStyle}>
                  {sizes.map(size => {
                    // Check if size has any stock overall
                    const variantForSize = product.variants.find(v => (v.size || '').toUpperCase() === size.toUpperCase());
                    const hasStockInSize = variantForSize && variantForSize.stock > 0;
                    const isSelected = selectedSize === size;

                    return (
                      <button
                        key={size}
                        disabled={!hasStockInSize}
                        onClick={() => setSelectedSize(size)}
                        style={{
                          ...(isSelected
                            ? activeSizeBtnStyle
                            : !hasStockInSize
                            ? disabledSizeBtnStyle
                            : sizeBtnStyle),
                          ...(!hasStockInSize ? { opacity: 0.35, cursor: 'not-allowed', textDecoration: 'line-through' } : {})
                        }}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            {!(user && user.role === 'admin') && cartQty === 0 && (
              <div style={selectionGroupStyle}>
                <span style={selectionLabelStyle}>Quantity:</span>
                <div style={quantityWrapperStyle}>
                  <button
                    onClick={() => {
                      if (cartQty > 0) {
                        updateCartQuantity(product.id, selectedSize, selectedColor, cartQty - 1);
                      } else {
                        setQuantity(q => Math.max(1, q - 1));
                      }
                    }}
                    style={qtyBtnStyle}
                    disabled={isOutOfStock}
                  >
                    -
                  </button>
                  <span style={qtyValueStyle}>{cartQty > 0 ? cartQty : quantity}</span>
                  <button
                    onClick={() => {
                      if (cartQty > 0) {
                        if (cartQty >= stockCount) return;
                        updateCartQuantity(product.id, selectedSize, selectedColor, cartQty + 1);
                      } else {
                        setQuantity(q => Math.min(stockCount, q + 1));
                      }
                    }}
                    style={qtyBtnStyle}
                    disabled={isOutOfStock || (cartQty > 0 ? cartQty >= stockCount : quantity >= stockCount)}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Stock status indicator */}
            <div style={stockStatusContainerStyle}>
              {isOutOfStock ? (
                <span style={outOfStockLabelStyle}>
                  <span style={dotStyle}>●</span> Selection Out of Stock
                </span>
              ) : isLowStock ? (
                <span style={lowStockLabelStyle}>
                  <span style={dotStyle}>●</span> Low Stock: Only {stockCount} left!
                </span>
              ) : (
                <span style={inStockLabelStyle}>
                  <span style={dotStyle}>●</span> In Stock
                </span>
              )}
            </div>

            {/* Action Buttons */}
            {user && user.role === 'admin' ? (
              <div style={actionsContainerStyle}>
                <Link
                  href={`/admin/products?edit=${product.slug}`}
                  style={adminPreviewBtnLinkStyle}
                >
                  Admin Preview: Edit Product
                </Link>
              </div>
            ) : (
              <div style={actionsContainerStyle}>
                {cartQty > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    <div className="blinkit-count-controller" style={{ ...buyBtnStyle, backgroundColor: '#FFFFFF', border: '1px solid #D98E9B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem', cursor: 'default', height: '48px', boxSizing: 'border-box', flex: 1 }}>
                      <button 
                        style={{ border: 'none', backgroundColor: 'transparent', fontSize: '1.4rem', color: '#D98E9B', cursor: 'pointer', fontWeight: 'bold', padding: '0 0.8rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCartQuantity(product.id, selectedSize, selectedColor, cartQty - 1);
                        }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: '700', color: '#000000', fontSize: '1rem' }}>{cartQty} in bag</span>
                      <button 
                        style={{ border: 'none', backgroundColor: 'transparent', fontSize: '1.4rem', color: '#D98E9B', cursor: 'pointer', fontWeight: 'bold', padding: '0 0.8rem', opacity: cartQty >= stockCount ? 0.35 : 1 }}
                        disabled={cartQty >= stockCount}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCartQuantity(product.id, selectedSize, selectedColor, cartQty + 1);
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleButtonClick}
                    style={isOutOfStock ? disabledBuyBtnStyle : cartSuccess ? addedBuyBtnStyle : buyBtnStyle}
                    disabled={isOutOfStock}
                  >
                    {isOutOfStock ? 'Sold Out' : cartSuccess ? '✓ Added to Bag' : 'Add to Bag'}
                  </button>
                )}

                <button
                  onClick={() => toggleWishlist(product.id)}
                  style={isStarred ? activeWishlistBtnStyle : wishlistBtnStyle}
                  title={isStarred ? 'Remove from Wishlist' : 'Add to Wishlist'}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill={isStarred ? '#D98E9B' : 'none'} stroke={isStarred ? '#D98E9B' : 'currentColor'} strokeWidth="1.5">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>
            )}

            {cartSuccess && (
              <div style={successNotificationStyle} className="animate-fade-in">
                ✨ Timeless creation added to your shopping bag!
              </div>
            )}
          </div>

          <div style={assurancePanelStyle}>
            <div style={assuranceItemStyle}>
              <span style={assuranceIconStyle}>✦</span>
              <div>
                <strong style={assuranceTitleStyle}>Bespoke Tailoring</strong>
                <p style={assuranceDescStyle}>Complimentary pattern adjustments to fit your exact measurements. Contact customer care after checkout.</p>
              </div>
            </div>
            <div style={assuranceItemStyle}>
              <span style={assuranceIconStyle}>✦</span>
              <div>
                <strong style={assuranceTitleStyle}>Free Shipping</strong>
                <p style={assuranceDescStyle}>Complimentary insured door-to-door delivery across India on orders above ₹10,000.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Reviews Accordion */}
      {(() => {
        const getProductReviews = () => {
          if (!product) return [];
          if (product.collection_slug === 'suits' || product.name.toLowerCase().includes('suit')) {
            return [
              {
                author: 'Aria S. (Mumbai)',
                date: 'May 2026',
                stars: 5,
                content: 'The custom fit is absolutely exquisite. The fabric weights and silk linings feel incredibly premium against the skin. Will definitely order custom measurements again.'
              },
              {
                author: 'Meera K. (New Delhi)',
                date: 'June 2026',
                stars: 5,
                content: 'Flawless tailoring. Every seam is finished to perfection. It is rare to find this level of slow-fashion artisan craftsmanship today.'
              }
            ];
          } else {
            return [
              {
                author: 'Priya R. (Bengaluru)',
                date: 'April 2026',
                stars: 5,
                content: 'A stunning heirloom piece. The gold luster and weight feel substantial and luxury. The design strikes a perfect balance between modern and traditional.'
              },
              {
                author: 'Kiran D. (Hyderabad)',
                date: 'June 2026',
                stars: 5,
                content: 'Beautifully packaged and absolute master craftsmanship. The detail under a magnifying loop shows how precise the artisan setting is.'
              }
            ];
          }
        };

        const reviewsList = getProductReviews();

        return (
          <div style={{ marginTop: '4rem', borderTop: '1px solid #ECECEC', borderBottom: '1px solid #ECECEC' }}>
            <button
              onClick={() => setReviewsOpen(!reviewsOpen)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.5rem 0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Client Reviews ({reviewsList.length})
              </span>
              <span style={{ fontSize: '1.2rem', color: '#000000' }}>
                {reviewsOpen ? '−' : '+'}
              </span>
            </button>
            
            {reviewsOpen && (
              <div style={{ padding: '0.5rem 0.5rem 2rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">
                {reviewsList.map((rev, idx) => (
                  <div key={idx} style={{ borderBottom: idx < reviewsList.length - 1 ? '1px dashed #F3F3F3' : 'none', paddingBottom: '1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#000000' }}>{rev.author}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.4)' }}>{rev.date}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.5rem', color: '#B8860B', fontSize: '0.85rem' }}>
                      {'★'.repeat(rev.stars)}{'☆'.repeat(5 - rev.stars)}
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'rgba(0,0,0,0.7)', lineHeight: '1.5', fontStyle: 'italic', margin: 0 }}>
                      "{rev.content}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// Inline styles for Product Details Page
const pageStyle = {
  paddingTop: '2.5rem',
  paddingBottom: '6rem',
  backgroundColor: '#FFFFFF',
};

const loadingContainerStyle = {
  textAlign: 'center',
  padding: '10rem 0',
  color: '#000000',
  fontSize: '1.2rem',
  fontFamily: 'var(--font-serif)',
};

const errorContainerStyle = {
  textAlign: 'center',
  padding: '8rem 2rem',
  color: '#000000',
};

const backBtnStyle = {
  display: 'inline-block',
  marginTop: '1.5rem',
  backgroundColor: '#D98E9B',
  color: '#000000',
  padding: '0.75rem 2rem',
  borderRadius: '4px',
};

const breadcrumbsStyle = {
  fontSize: '0.8rem',
  color: '#000000',
  marginBottom: '2rem',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.4rem',
};

const productGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1.1fr 1fr',
  gap: '4rem',
  alignItems: 'start',
  '@media (max-width: 991px)': {
    gridTemplateColumns: '1fr',
    gap: '2.5rem',
  },
};

const galleryColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const mainImageContainerStyle = {
  position: 'relative',
  width: '100%',
  height: '78vh',
  minHeight: '560px',
  maxHeight: '850px',
  borderRadius: '16px',
  overflow: 'hidden',
  backgroundColor: '#FAF7F5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
};

const mainImageStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  objectPosition: 'center center',
  padding: '0',
  transform: 'scale(1.35)',
  transformOrigin: 'center center',
  transition: 'transform 0.3s ease',
};

const overlayBackBtnStyle = {
  position: 'absolute',
  top: '1rem',
  left: '1rem',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  backgroundColor: 'rgba(255, 255, 255, 0.92)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: 'none',
  boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  zIndex: 10,
  transition: 'transform 0.2s ease',
};

const overlayTopRightStyle = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  zIndex: 10,
};

const overlayDiscountBadgeStyle = {
  backgroundColor: '#E74C3C',
  color: '#FFFFFF',
  padding: '0.35rem 0.75rem',
  borderRadius: '999px',
  fontSize: '0.72rem',
  fontWeight: '700',
  letterSpacing: '0.04em',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
};

const overlayIconBtnStyle = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  backgroundColor: 'rgba(255, 255, 255, 0.92)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: 'none',
  boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'transform 0.2s ease',
};

const heroPinkBadgeStyle = {
  position: 'absolute',
  top: '1.5rem',
  right: '1.5rem',
  backgroundColor: '#D98E9B',
  color: '#000000',
  padding: '0.35rem 1rem',
  borderRadius: '999px',
  fontSize: '0.7rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  border: '1px solid #D98E9B',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
};

const thumbnailRowStyle = {
  display: 'flex',
  gap: '0.8rem',
  overflowX: 'auto',
  paddingBottom: '0.5rem',
};

const thumbnailStyle = {
  width: '80px',
  height: '80px',
  borderRadius: '4px',
  overflow: 'hidden',
  border: '2px solid transparent',
  backgroundColor: '#FFFFFF',
  flexShrink: 0,
};

const activeThumbStyle = {
  ...thumbnailStyle,
  bordercolor: '#000000',
};

const thumbImgStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const detailsColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
};

const collectionNameStyle = {
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: '#000000',
  fontWeight: '600',
  marginBottom: '0.5rem',
};

const productNameStyle = {
  fontSize: '2.8rem',
  color: '#000000',
  marginBottom: '0.8rem',
  fontFamily: 'var(--font-serif)',
  fontWeight: '400',
  lineHeight: 1.2,
};

const priceStyle = {
  fontSize: '1.6rem',
  fontWeight: '700',
  color: '#000000',
  marginBottom: '1.5rem',
};

const dividerLineStyle = {
  height: '1px',
  backgroundColor: 'rgba(139, 119, 137, 0.12)',
  margin: '1.5rem 0',
};

const descriptionStyle = {
  fontSize: '0.95rem',
  lineHeight: 1.7,
  color: '#000000',
};

const selectionContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const selectionGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
};

const selectionLabelStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#000000',
  fontWeight: '700',
};

const sizeSelectorStyle = {
  display: 'flex',
  gap: '0.6rem',
  flexWrap: 'wrap',
};

const sizeBtnStyle = {
  border: '1px solid rgba(139, 119, 137, 0.3)',
  backgroundColor: '#FFFFFF',
  padding: '0.5rem 1.2rem',
  fontSize: '0.8rem',
  borderRadius: '2px',
  color: '#000000',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const activeSizeBtnStyle = {
  ...sizeBtnStyle,
  backgroundColor: '#000000',
  color: '#FFFFFF',
  borderColor: '#000000',
};

const disabledSizeBtnStyle = {
  ...sizeBtnStyle,
  opacity: 0.3,
  textDecoration: 'line-through',
  cursor: 'not-allowed',
  backgroundColor: '#F9F9F9',
  color: '#999999',
};

const colorSelectorStyle = {
  display: 'flex',
  gap: '0.6rem',
  flexWrap: 'wrap',
};

const colorBtnStyle = {
  border: '1px solid rgba(139, 119, 137, 0.3)',
  backgroundColor: '#FFFFFF',
  padding: '0.5rem 1.2rem',
  fontSize: '0.8rem',
  borderRadius: '2px',
  color: '#000000',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const activeColorBtnStyle = {
  ...colorBtnStyle,
  backgroundColor: '#000000',
  color: '#FFFFFF',
  borderColor: '#000000',
};

const disabledColorBtnStyle = {
  ...colorBtnStyle,
  opacity: 0.3,
  textDecoration: 'line-through',
  cursor: 'not-allowed',
  backgroundColor: '#F9F9F9',
  color: '#999999',
};

const quantityWrapperStyle = {
  display: 'flex',
  alignItems: 'center',
  border: '1px solid rgba(139, 119, 137, 0.3)',
  width: '120px',
  borderRadius: '4px',
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
};

const qtyBtnStyle = {
  width: '35px',
  height: '35px',
  fontSize: '1.2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
  color: '#000000',
};

const qtyValueStyle = {
  flex: 1,
  textAlign: 'center',
  fontSize: '0.9rem',
  fontWeight: '600',
};

const stockStatusContainerStyle = {
  fontSize: '0.8rem',
  fontWeight: '600',
};

const dotStyle = {
  marginRight: '0.3rem',
};

const inStockLabelStyle = {
  color: '#000000', // Green
};

const lowStockLabelStyle = {
  color: '#000000', // Red
};

const outOfStockLabelStyle = {
  color: '#000000', // Gray
};

const actionsContainerStyle = {
  display: 'flex',
  gap: '1rem',
  marginTop: '1rem',
};

const buyBtnStyle = {
  flex: 1,
  backgroundColor: '#F6DDE2', // Deep Plum
  color: '#000000',
  padding: '1rem 2rem',
  fontSize: '0.85rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  borderRadius: '4px',
  boxShadow: 'var(--shadow-sm)',
  transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
};

const addedBuyBtnStyle = {
  ...buyBtnStyle,
  backgroundColor: '#D98E9B',
  color: '#FFFFFF',
  transform: 'scale(1.02)',
};

const disabledBuyBtnStyle = {
  ...buyBtnStyle,
  backgroundColor: 'rgba(60, 48, 58, 0.15)',
  color: '#000000',
  cursor: 'not-allowed',
  boxShadow: 'none',
};

const adminPreviewBtnStyle = {
  ...buyBtnStyle,
  backgroundColor: 'transparent',
  border: '1px solid #000000',
  color: '#000000',
  cursor: 'default',
  textAlign: 'center',
  boxShadow: 'none',
};

const adminPreviewBtnLinkStyle = {
  ...adminPreviewBtnStyle,
  display: 'block',
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
};

const wishlistBtnStyle = {
  width: '52px',
  height: '52px',
  border: '1px solid rgba(139, 119, 137, 0.3)',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#000000',
  backgroundColor: '#D98E9B',
};

const activeWishlistBtnStyle = {
  ...wishlistBtnStyle,
  bordercolor: '#000000',
  color: '#000000',
};

const successNotificationStyle = {
  backgroundColor: '#FFFFFF',
  color: '#000000',
  border: '1px solid #D98E9B',
  padding: '0.8rem 1rem',
  borderRadius: '4px',
  fontSize: '0.85rem',
  fontWeight: '600',
  textAlign: 'center',
};

const assurancePanelStyle = {
  marginTop: '3.5rem',
  backgroundColor: '#F6DDE2', // Blush Cream background
  padding: '1.8rem',
  borderRadius: '6px',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.2rem',
  border: '1px solid rgba(139, 119, 137, 0.12)',
};

const assuranceItemStyle = {
  display: 'flex',
  gap: '1rem',
  alignItems: 'start',
};

const assuranceIconStyle = {
  color: '#000000',
  fontSize: '1.2rem',
  lineHeight: 1,
};

const assuranceTitleStyle = {
  fontSize: '0.85rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#D98E9B',
  display: 'block',
  marginBottom: '0.2rem',
};

const assuranceDescStyle = {
  fontSize: '0.78rem',
  lineHeight: 1.5,
  color: '#000000',
};
