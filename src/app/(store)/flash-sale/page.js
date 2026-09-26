'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import ImageWithSkeleton from '@/components/ImageWithSkeleton';
import SkeletonCard from '@/components/SkeletonCard';
import ProductImageGallery from '@/components/ProductImageGallery';
import { AddToBagLabel, ProductFeatureStrip, ProductShareButton, ProductTagBadges } from '@/components/ProductQuickViewExtras';
import { useStore } from '@/context/StoreContext';
import { getLocalHomepageFallback } from '@/lib/localCatalogFallback';
import { mergeCatalogWithLocalOverrides } from '@/lib/catalogClient';

function FlashSaleContent() {
  const { cart, wishlist, toggleWishlist, addToCart, updateCartQuantity, user } = useStore();
  const isFlashProduct = (p) => Boolean(p.flash_sale || p.on_sale || (Array.isArray(p.collection_slugs) && p.collection_slugs.includes('flash-sale')));
  const initialFlashItems = (getLocalHomepageFallback().flashProducts || []).filter(isFlashProduct);
  const [products, setProducts] = useState(initialFlashItems);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState('name_asc');
  
  // Quick View Modal
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeProductImage, setActiveProductImage] = useState('');
  const [activeProductSize, setActiveProductSize] = useState('');
  const [activeProductColor, setActiveProductColor] = useState('');
  const [activeProductQty, setActiveProductQty] = useState(1);

  const loadFlashProducts = () => {
    fetch('/api/products?collection=flash-sale', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const all = mergeCatalogWithLocalOverrides(data?.products || []);
        const flashOnly = all.filter(isFlashProduct);
        setProducts(flashOnly);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch flash sale products error:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadFlashProducts();

    let channel;
    if (typeof window !== 'undefined') {
      try {
        channel = new BroadcastChannel('houseofginija-catalog-sync');
        channel.onmessage = () => {
          loadFlashProducts();
        };
      } catch {}
    }

    return () => {
      if (channel) channel.close();
    };
  }, []);

  const handleProductClick = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveProduct(product);
    setActiveProductImage(product.images?.[0] || product.image_url || '/icon.png');
    setActiveProductSize(product.variants?.[0]?.size || 'One Size');
    setActiveProductColor(product.variants?.[0]?.color || 'Default');
    setActiveProductQty(1);
  };

  // Filter & Sort
  const filteredProducts = products.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
  }).sort((a, b) => {
    const priceA = parseFloat(a.flash_sale_price || a.price) || 0;
    const priceB = parseFloat(b.flash_sale_price || b.price) || 0;
    if (selectedSort === 'price_asc') return priceA - priceB;
    if (selectedSort === 'price_desc') return priceB - priceA;
    return a.name.localeCompare(b.name);
  });

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* Header Banner */}
      <div style={{ backgroundColor: '#F6DDE2', padding: '3rem 1.2rem 2.5rem 1.2rem', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#B97285', display: 'block', marginBottom: '0.5rem' }}>
            Limited Time Offers
          </span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: '#2D2429', fontWeight: '400', margin: '0 0 0.8rem 0' }}>
            Clearance Sale Collection
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'rgba(0, 0, 0, 0.6)', maxWidth: '500px', margin: '0 auto' }}>
            Discover handcrafted silhouettes at special archival pricing. Available for a limited time.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="container" style={{ maxWidth: '1200px', margin: '1.5rem auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'rgba(0,0,0,0.6)', fontWeight: '500' }}>
          Showing {filteredProducts.length} Clearance Sale Items
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search sale items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '20px',
              border: '1px solid rgba(139, 119, 137, 0.25)',
              fontSize: '0.82rem',
              outline: 'none',
              width: '180px',
            }}
          />
          <select
            value={selectedSort}
            onChange={(e) => setSelectedSort(e.target.value)}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: '20px',
              border: '1px solid rgba(139, 119, 137, 0.25)',
              fontSize: '0.82rem',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="name_asc">Sort by Name</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        {loading ? (
          <div className="new-arrivals-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} type="home-new-arrival" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'rgba(0,0,0,0.5)' }}>
            <h3>No Clearance Sale items found matching your filter.</h3>
            <Link href="/collections" style={{ display: 'inline-block', marginTop: '1rem', color: '#B97285', textDecoration: 'underline' }}>
              Explore All Collections &rarr;
            </Link>
          </div>
        ) : (
          <div className="new-arrivals-grid">
            {filteredProducts.map((product, index) => {
              const regPrice = parseFloat(product.price) || 0;
              const flashPrice = parseFloat(product.flash_sale_price) || Math.round(regPrice * 0.8);
              const discountPct = regPrice > 0 ? Math.max(1, Math.round(((regPrice - flashPrice) / regPrice) * 100)) : 20;
              const isWishlisted = wishlist.includes(product.id);

              return (
                <div key={product.id} className="new-arrival-card">
                  {/* Product Image Container */}
                  <div className="new-arrival-img-container">
                    <div onClick={(e) => handleProductClick(e, product)} style={{ cursor: 'pointer', width: '100%', height: '100%' }}>
                      <ImageWithSkeleton 
                        src={product.images?.[0] || '/icon.png'} 
                        alt={product.name} 
                        eager={index < 4}
                        className="new-arrival-img-style" 
                      />
                    </div>
                    
                    {/* Discount Badge */}
                    <div className="flash-sale-badge" style={{ position: 'absolute', top: '8px', left: '8px', backgroundColor: '#B97285', color: '#FFFFFF', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', zIndex: 10 }}>
                      -{discountPct}%
                    </div>

                    {/* Wishlist Heart */}
                    <button 
                      onClick={() => toggleWishlist(product.id)}
                      className="new-arrival-wishlist-btn"
                    >
                      <svg 
                        width="18" 
                        height="18" 
                        viewBox="0 0 24 24" 
                        fill={isWishlisted ? '#D98E9B' : 'none'} 
                        stroke={isWishlisted ? '#D98E9B' : '#000000'} 
                        strokeWidth="2.0" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="new-arrival-card-content">
                    <div onClick={(e) => handleProductClick(e, product)} style={{ cursor: 'pointer', color: 'inherit' }}>
                      <h3 className="new-arrival-product-name">{product.name}</h3>
                    </div>
                    <div className="new-arrival-price" style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ color: '#B97285' }}>₹{flashPrice.toLocaleString('en-IN')}</span>
                      <span style={{ fontSize: '0.78rem', color: 'rgba(0, 0, 0, 0.4)', textDecoration: 'line-through', fontWeight: 'normal' }}>₹{regPrice.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick View Sheet */}
      {activeProduct && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }} onClick={() => setActiveProduct(null)}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '1.5rem', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setActiveProduct(null)}>✕</button>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: '#B97285', marginBottom: '0.5rem' }}>{activeProduct.name}</h3>
            <p style={{ color: '#B97285', fontWeight: '600', fontSize: '1.1rem', marginBottom: '1rem' }}>₹{parseFloat(activeProduct.flash_sale_price || activeProduct.price).toLocaleString('en-IN')}</p>
            <ProductImageGallery images={activeProduct.images || [activeProduct.image_url]} name={activeProduct.name} />
            <button
              onClick={() => {
                addToCart({ ...activeProduct, price: activeProduct.flash_sale_price || activeProduct.price }, activeProductSize, activeProductColor, activeProductQty);
                setActiveProduct(null);
              }}
              style={{ width: '100%', marginTop: '1.2rem', padding: '0.8rem', backgroundColor: '#B97285', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}
            >
              ADD TO BAG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FlashSalePage() {
  return (
    <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center' }}>Loading Clearance Sale...</div>}>
      <FlashSaleContent />
    </Suspense>
  );
}
