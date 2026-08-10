'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/context/StoreContext';
import { useEffect, useState } from 'react';
import ImageWithSkeleton from '@/components/ImageWithSkeleton';
import SkeletonCard from '@/components/SkeletonCard';
import HeroReelsSection from '@/components/HeroReelsSection';
import ProductImageGallery from '@/components/ProductImageGallery';
import { AddToBagLabel, ProductFeatureStrip, ProductShareButton, ProductTagBadges } from '@/components/ProductQuickViewExtras';
import FounderReelsRow from '@/components/FounderReelsRow';
import ShopByCategories from '@/components/ShopByCategories';

const CLOUDINARY_REEL_URLS = [
  'https://res.cloudinary.com/cyygtyfb/video/upload/v1786258826/houseofginija/videos/hero_reels/reel_1.mp4',
  'https://res.cloudinary.com/cyygtyfb/video/upload/v1786258829/houseofginija/videos/hero_reels/reel_2.mp4',
  'https://res.cloudinary.com/cyygtyfb/video/upload/v1786258831/houseofginija/videos/hero_reels/reel_3.mp4',
  'https://res.cloudinary.com/cyygtyfb/video/upload/v1786258833/houseofginija/videos/hero_reels/reel_4.mp4',
  'https://res.cloudinary.com/cyygtyfb/video/upload/v1786258836/houseofginija/videos/hero_reels/reel_5.mp4',
  'https://res.cloudinary.com/cyygtyfb/video/upload/v1786258838/houseofginija/videos/hero_reels/reel_6.mp4',
  'https://res.cloudinary.com/cyygtyfb/video/upload/v1786258841/houseofginija/videos/hero_reels/reel_7.mp4',
  'https://res.cloudinary.com/cyygtyfb/video/upload/v1786258843/houseofginija/videos/hero_reels/reel_8.mp4',
];

const LOCAL_HERO_REELS = Array.from({ length: 8 }, (_, index) => ({
  id: `local-hero-reel-${index + 1}`,
  video_url: CLOUDINARY_REEL_URLS[index],
  title: `Hero Reel ${index + 1}`,
}));

export default function Home() {
  const { 
    wishlist = [], 
    toggleWishlist, 
    cart = [], 
    addToCart, 
    updateCartQuantity, 
    user 
  } = useStore();
  
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [flashProducts, setFlashProducts] = useState([]);
  const [flashSaleEnabled, setFlashSaleEnabled] = useState(true);
  const [newArrivalProducts, setNewArrivalProducts] = useState([]);
  const [newArrivalsEnabled, setNewArrivalsEnabled] = useState(false);
  const [showAllNewArrivals, setShowAllNewArrivals] = useState(false);
  const [founderReels, setFounderReels] = useState([]);
  const [heavyDresses, setHeavyDresses] = useState({ indoWestern: [], heavyGown: [], shararas: [] });

  const whatsAppNumber = '917080806053';
  const whatsAppUrl = `https://wa.me/${whatsAppNumber}`;
  const whatsAppDisplayNumber = '+91 70808 06053';

  // States for product detail bottom sheet modal
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeProductImage, setActiveProductImage] = useState('');
  const [activeProductSize, setActiveProductSize] = useState('');
  const [activeProductColor, setActiveProductColor] = useState('');
  const [activeProductQty, setActiveProductQty] = useState(1);
  const [viewportWidth, setViewportWidth] = useState(390);

  const reviewImages = [
    {
      img: 'https://res.cloudinary.com/cyygtyfb/image/upload/v1786258948/houseofginija/reviews/review_1.jpg',
      name: 'Saurabh Singh',
      location: 'Lucknow',
      initial: 'S',
      text: 'I have been visiting the House of Ginija since last two years and all the ladies in my family absolutely adore the collection of the studio. The professional yet personal touch provided by Nikita to all the handcrafted pieces is what makes it one of the leading brand of chique fashion in the city.',
    },
    {
      img: 'https://res.cloudinary.com/cyygtyfb/image/upload/v1786258949/houseofginija/reviews/review_2.jpg',
      name: 'Chaitra Reddy',
      location: 'United States',
      initial: 'C',
      text: 'The store was recommended to me by a friend, absolutely lovely collection. Recently I placed an order ( which I am going to ship to the United States later ) and I want to appreciate all the patience and responsiveness even with the time difference. Amazing collection and service.',
    },
    {
      img: 'https://res.cloudinary.com/cyygtyfb/image/upload/v1786258950/houseofginija/reviews/review_3.jpg',
      name: 'Riya Sen',
      location: 'Delhi',
      initial: 'R',
      text: 'Heyy! I loved your lehanga so much ... it was too good 😊 I was looking so pretty in the lehanga ... looking to buy more dresses from you ... Will share the pics soon !!! ❤️',
    },
    {
      img: 'https://res.cloudinary.com/cyygtyfb/image/upload/v1786258950/houseofginija/reviews/review_4.jpg',
      name: 'Krati Parmar',
      location: 'Lucknow',
      initial: 'K',
      text: "I have been visiting House of Ginija since their launch in Lucknow and I just can't stop coming back. Nikita, the owner is super hospitable and the staff provides the best support and service. Their every season collection is to die for😍 Best brand label in Lucknow!! Highly recommended",
    },
    {
      img: 'https://res.cloudinary.com/cyygtyfb/image/upload/v1786258951/houseofginija/reviews/review_5.jpg',
      name: 'Priya Sharma',
      location: 'Mumbai',
      initial: 'P',
      text: 'Hey thanks for the beautiful suit ❤️ it\'s really very gorgeous. My husband too loved it 🥰🥰 Looking forward to purchase many more outfits from your collection in coming festive season. Simply superb & classy 😍 Thank you once again!',
    },
    {
      img: 'https://res.cloudinary.com/cyygtyfb/image/upload/v1786258948/houseofginija/reviews/review_1.jpg',
      name: 'Anjali Verma',
      location: 'Lucknow',
      initial: 'A',
      text: 'Superb quality and absolute master craftsmanship! The suit fits like a dream and the fabric is incredibly premium. Nikita was very responsive and guided me on sizing options. Definitely buying more soon.',
    },
    {
      img: 'https://res.cloudinary.com/cyygtyfb/image/upload/v1786258949/houseofginija/reviews/review_2.jpg',
      name: 'Divya Nair',
      location: 'Bangalore',
      initial: 'D',
      text: 'Outstanding experience shopping here. The designs are exclusive and unique, and the fit is absolute perfection. Highly recommend their bespoke tailoring service for special occasions.',
    },
    {
      img: 'https://res.cloudinary.com/cyygtyfb/image/upload/v1786258950/houseofginija/reviews/review_4.jpg',
      name: 'Meenakshi Iyer',
      location: 'Chennai',
      initial: 'M',
      text: 'House of Ginija has become my absolute favorite label. The attention to detail, fine embroidery, and overall customer service is unparalleled. A stellar brand for high-end couture.',
    },
  ];

  // Handle anchor deep link scroll on page load/mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashId = window.location.hash.replace('#', '');
      if (hashId) {
        setTimeout(() => {
          const el = document.getElementById(hashId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          }
        }, 400);
      }
    }
  }, []);

  useEffect(() => {

    // Fetch unified homepage data
    const fetchHomepageData = async () => {
      try {
        const res = await fetch('/api/homepage', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
        if (res.ok) {
          const data = await res.json();
          setFlashProducts(data.flashProducts || []);
          setFlashSaleEnabled(!!data.flash_sale_enabled);
          setNewArrivalProducts(data.newArrivalProducts || []);
          setNewArrivalsEnabled(!!data.new_arrivals_enabled);
          setFounderReels(data.founderReels || []);
          setHeavyDresses(data.heavyDresses || { indoWestern: [], heavyGown: [], shararas: [] });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchHomepageData();

    let channel;
    if (typeof window !== 'undefined') {
      try {
        channel = new BroadcastChannel('houseofginija-catalog-sync');
        channel.onmessage = () => {
          fetchHomepageData();
        };
      } catch {}
    }

    return () => {
      if (channel) channel.close();
    };
  }, []);

  // Handle window resizing for sibling switcher translateX calculations
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    handleResize(); // set initial viewport width
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll when flash sale bottom sheet is open, restore on close
  useEffect(() => {
    if (activeProduct) {
      document.body.style.overflow = 'hidden';
      
      const preventScroll = (e) => {
        // Only prevent scroll if it's not inside the bottom sheet
        if (e.cancelable) {
          // Check if the touch is inside the bottom sheet
          const bottomSheet = document.querySelector('.mobile-bottom-sheet');
          if (bottomSheet && bottomSheet.contains(e.target)) {
            return; // Allow scrolling inside the bottom sheet
          }
          e.preventDefault();
        }
      };
      
      document.addEventListener('touchmove', preventScroll, { passive: false });
      
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('touchmove', preventScroll);
      };
    }
  }, [activeProduct]);

  const handleProductClick = (e, product) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    setActiveProduct(product);
    if (product.images && product.images.length > 0) {
      setActiveProductImage(product.images[0]);
    } else {
      setActiveProductImage('/placeholder.jpg');
    }
    
    // Auto-select size/color combinations
    const vars = product.variants || [];
    const inStockVar = vars.find(v => v.stock > 0);
    if (inStockVar) {
      setActiveProductSize(inStockVar.size || '');
      setActiveProductColor(inStockVar.color || '');
    } else if (vars.length > 0) {
      setActiveProductSize(vars[0].size || '');
      setActiveProductColor(vars[0].color || '');
    } else {
      setActiveProductSize('One Size');
      setActiveProductColor('Default');
    }
    setActiveProductQty(1);
  };

  const activeCartItem = activeProduct && cart && cart.find(
    item => Number(item.id) === Number(activeProduct.id) && 
            (item.size || '') === (activeProductSize || '') && 
            (item.color || '') === (activeProductColor || '')
  );
  const currentQtyInCart = activeCartItem ? activeCartItem.quantity : 0;

  const activeMatchingVar = activeProduct && activeProduct.variants && activeProduct.variants.find(
    v => (v.size || '') === (activeProductSize || '') && (v.color || '') === (activeProductColor || '')
  );
  const maxStock = activeMatchingVar ? activeMatchingVar.stock : 10;
  const isPlusDisabled = currentQtyInCart > 0 ? (currentQtyInCart >= maxStock) : (activeProductQty >= maxStock);

  const switcherProducts = activeProduct
    ? (activeProduct.flash_sale
        ? flashProducts
        : (activeProduct.new_arrival ? newArrivalProducts : []))
    : [];

  const cartSubtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <div style={pageContainerStyle}>
      {/* 1. HERO REELS SECTION */}
      <HeroReelsSection heroReels={LOCAL_HERO_REELS} />

      {/* 2. FLASH SALE SECTION */}
      <section 
        style={{ 
          ...flashSaleSectionStyle, 
          display: (loading || (flashSaleEnabled && flashProducts.length > 0)) ? 'block' : 'none' 
        }} 
        className="home-section home-flash-sale-section"
      >
        {(loading || (flashSaleEnabled && flashProducts.length > 0)) && (
          <div className={loading ? 'container' : 'container animate-fade-in'}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }} className="flash-sale-header-container">
              <h2 style={{ ...sectionTitleStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="#D98E9B" stroke="none" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
                Flash Sale
              </h2>
              <div style={sectionDividerLineStyle}></div>
              <p style={{
                fontSize: '0.85rem',
                color: 'rgba(0, 0, 0, 0.5)',
                fontWeight: '500',
                marginTop: '0.8rem',
              }}>
                Limited time. Exclusive pieces.
              </p>
            </div>

            <div className="new-arrivals-grid">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} type="home-new-arrival" />
                ))
              ) : (
                flashProducts.slice(0, 6).map((product, index) => {
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
                            eager={false}
                            className="new-arrival-img-style" 
                          />
                        </div>
                        
                        {/* Discount Badge on Top Left */}
                        <div style={flashSaleBadgeStyle} className="flash-sale-badge">
                          -{discountPct}%
                        </div>

                        {/* Wishlist Heart on Top Right */}
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
                })
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '1rem' }}>
              <Link href="/flash-sale" style={flashSaleShopAllStyle}>
                SHOP ALL FLASH SALE &rarr;
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* 2.5. ORDER STATUS WHATSAPP BANNER */}
      <section className="whatsapp-order-status-section">
        <div className="container">
          <a
            href={whatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-order-status-banner"
          >
            <div className="whatsapp-order-status-top">
              <div className="whatsapp-order-status-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.45 5.407 0 9.811-4.38 9.813-9.75.002-2.602-1.01-5.05-2.85-6.895-1.84-1.847-4.292-2.865-6.894-2.866-5.417 0-9.821 4.382-9.825 9.75-.002 2.115.556 4.177 1.621 5.995L1.898 21.6l4.75-1.246zm11.23-5.385c-.298-.148-1.758-.865-2.03-.966-.273-.101-.471-.148-.67.149-.197.297-.768.966-.94 1.164-.173.199-.347.223-.646.074-.299-.148-1.261-.464-2.399-1.48-1.272-1.134-1.83-2.15-2.079-2.547-.248-.396-.026-.61.173-.808.18-.178.397-.462.596-.693.199-.23.265-.396.398-.66.133-.264.066-.495-.033-.693-.1-.198-.865-2.08-1.186-2.85-.314-.755-.632-.653-.865-.653H7.49c-.23 0-.604.088-.92.43-.318.344-1.211 1.187-1.211 2.895 0 1.708 1.244 3.359 1.417 3.59.172.23 2.45 3.738 5.93 5.24 2.443 1.054 3.528 1.157 4.79.97 1.137-.168 2.76-.84 3.153-1.652.393-.813.393-1.509.276-1.656-.118-.149-.438-.236-.736-.384z" />
                </svg>
              </div>

              <div className="whatsapp-order-status-copy">
                <div className="whatsapp-order-status-heading">
                  For Order Status<br />WhatsApp Us On
                </div>
                <div className="whatsapp-order-status-divider">
                  <span></span>
                  <span className="whatsapp-order-status-diamond"></span>
                  <span></span>
                </div>
              </div>
            </div>

            <div className="whatsapp-order-status-pill">
              <span>{whatsAppDisplayNumber}</span>
            </div>
          </a>
        </div>
      </section>

      {/* 4. SHOP BY CATEGORIES */}
      <ShopByCategories />


      {/* Separator Line */}
      <div style={{ height: '1px', backgroundColor: 'rgba(139, 119, 137, 0.15)', width: '100%' }}></div>


      {/* ABOUT THE FOUNDER SECTION */}
      <section className="home-founder-section" style={{ backgroundColor: '#FFFFFF', padding: '4rem 1.2rem', textAlign: 'center' }}>
        <div className="container animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Decorative label */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#B97285', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
            <span style={{ width: '30px', height: '1px', backgroundColor: 'rgba(185, 114, 133, 0.4)' }}></span>
            <span>About the Founder</span>
            <span style={{ width: '30px', height: '1px', backgroundColor: 'rgba(185, 114, 133, 0.4)' }}></span>
          </div>

          {/* Heading */}
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', color: '#B97285', fontWeight: '500', marginBottom: '2rem' }}>
            Nikita Agarwal
          </h2>

          {/* Centered circular photo */}
          <div style={{ width: '280px', height: '280px', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', marginBottom: '2.5rem' }} className="founder-photo-container">
            <img 
              src="/images/story.jpeg" 
              alt="Nikita Agarwal" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              loading="lazy"
            />
          </div>

          {/* Bio paragraph */}
          <p style={{ fontSize: '1rem', lineHeight: '1.7', color: '#2D2429', maxWidth: '650px', margin: '0 auto 2.5rem auto', fontWeight: '400', textAlign: 'center' }} className="founder-bio-text">
            At House of Ginija, fashion is more than clothing. Founded by Nikita Agarwal, the label was born from a passion for creating luxurious ethnic wear that blends traditional artistry with modern sophistication.
          </p>

          {/* CTA outlined pill button */}
          <Link 
            href="/our-story" 
            style={{
              display: 'inline-block',
              backgroundColor: 'transparent',
              color: '#B97285',
              border: '1.5px solid #B97285',
              padding: '0.75rem 2.2rem',
              borderRadius: '999px',
              fontSize: '0.78rem',
              fontWeight: '700',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            className="founder-read-more-btn"
          >
            READ MORE &rarr;
          </Link>

          {/* 3-Reel Row in About Founder Section */}
          <FounderReelsRow founderReels={LOCAL_HERO_REELS.slice(-3)} loading={false} />

        </div>
      </section>

      {/* Separator Line */}
      <div style={{ height: '1px', backgroundColor: 'rgba(139, 119, 137, 0.15)', width: '100%' }}></div>

      {/* HEAVY DRESSES SECTION */}
      <section id="heavy-dresses" style={{ backgroundColor: '#FFFFFF', padding: '4rem 0 3rem 0' }} className="home-section home-heavy-dresses-section">
        <div className="container">
          {/* Main Section Header */}
          <div style={sectionHeaderStyle} className="animate-fade-in">
            <h2 style={sectionTitleStyle}>Heavy Dresses</h2>
            <div style={sectionDividerLineStyle}></div>
          </div>

          {/* Sub-sections Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem', marginTop: '2.5rem' }}>
            
            {/* 1. INDO WESTERN SUB-SECTION */}
            <div id="indo-western" className="heavy-dresses-subsection">
              <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
                <h3 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.75rem',
                  color: '#2D2429',
                  fontWeight: '500',
                  letterSpacing: '0.02em',
                  marginBottom: '0.4rem'
                }}>
                  Indo Western
                </h3>
                <div style={{ width: '40px', height: '1.5px', backgroundColor: '#B97285', margin: '0 auto' }}></div>
              </div>

              <div className="new-arrivals-grid">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} type="home-new-arrival" />
                  ))
                ) : (
                  (heavyDresses.indoWestern || []).slice(0, 4).map((product, index) => {
                    const regPrice = parseFloat(product.price) || 0;
                    const salePrice = product.flash_sale && product.flash_sale_price ? parseFloat(product.flash_sale_price) : (product.on_sale && product.sale_price ? parseFloat(product.sale_price) : regPrice);
                    const isOnSale = regPrice > salePrice;
                    const discountPct = regPrice > 0 ? Math.max(1, Math.round(((regPrice - salePrice) / regPrice) * 100)) : 20;
                    const isWishlisted = wishlist.includes(product.id);
                    return (
                      <div key={product.id || index} className="new-arrival-card">
                        <div className="new-arrival-img-container">
                          <div onClick={(e) => handleProductClick(e, product)} style={{ cursor: 'pointer', width: '100%', height: '100%' }}>
                            <ImageWithSkeleton 
                              src={product.images?.[0] || '/icon.png'} 
                              alt={product.name} 
                              eager={false}
                              className="new-arrival-img-style" 
                            />
                          </div>

                          {/* Discount Badge on Top Left */}
                          {isOnSale && (
                            <div style={flashSaleBadgeStyle} className="flash-sale-badge">
                              -{discountPct}%
                            </div>
                          )}

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

                        <div className="new-arrival-card-content">
                          <div onClick={(e) => handleProductClick(e, product)} style={{ cursor: 'pointer', color: 'inherit' }}>
                            <h3 className="new-arrival-product-name">{product.name}</h3>
                          </div>
                          {isOnSale ? (
                            <div className="new-arrival-price" style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ color: '#B97285' }}>₹{salePrice.toLocaleString('en-IN')}</span>
                              <span style={{ fontSize: '0.78rem', color: 'rgba(0, 0, 0, 0.4)', textDecoration: 'line-through', fontWeight: 'normal' }}>₹{regPrice.toLocaleString('en-IN')}</span>
                            </div>
                          ) : (
                            <div className="new-arrival-price">
                              ₹{regPrice.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '1rem' }}>
                <Link href="/collections?collection=indo-western" style={flashSaleShopAllStyle}>
                  SHOP ALL INDO WESTERN &rarr;
                </Link>
              </div>
            </div>

            {/* 2. GOWNS SUB-SECTION */}
            <div id="gowns" className="heavy-dresses-subsection">
              <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
                <h3 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.75rem',
                  color: '#2D2429',
                  fontWeight: '500',
                  letterSpacing: '0.02em',
                  marginBottom: '0.4rem'
                }}>
                  Heavy Gowns
                </h3>
                <div style={{ width: '40px', height: '1.5px', backgroundColor: '#B97285', margin: '0 auto' }}></div>
              </div>

              <div className="new-arrivals-grid">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} type="home-new-arrival" />
                  ))
                ) : (
                  (heavyDresses.heavyGown || []).slice(0, 4).map((product, index) => {
                    const regPrice = parseFloat(product.price) || 0;
                    const salePrice = product.flash_sale && product.flash_sale_price ? parseFloat(product.flash_sale_price) : (product.on_sale && product.sale_price ? parseFloat(product.sale_price) : regPrice);
                    const isOnSale = regPrice > salePrice;
                    const discountPct = regPrice > 0 ? Math.max(1, Math.round(((regPrice - salePrice) / regPrice) * 100)) : 20;
                    const isWishlisted = wishlist.includes(product.id);
                    return (
                      <div key={product.id || index} className="new-arrival-card">
                        <div className="new-arrival-img-container">
                          <div onClick={(e) => handleProductClick(e, product)} style={{ cursor: 'pointer', width: '100%', height: '100%' }}>
                            <ImageWithSkeleton 
                              src={product.images?.[0] || '/icon.png'} 
                              alt={product.name} 
                              eager={false}
                              className="new-arrival-img-style" 
                            />
                          </div>

                          {/* Discount Badge on Top Left */}
                          {isOnSale && (
                            <div style={flashSaleBadgeStyle} className="flash-sale-badge">
                              -{discountPct}%
                            </div>
                          )}

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

                        <div className="new-arrival-card-content">
                          <div onClick={(e) => handleProductClick(e, product)} style={{ cursor: 'pointer', color: 'inherit' }}>
                            <h3 className="new-arrival-product-name">{product.name}</h3>
                          </div>
                          {isOnSale ? (
                            <div className="new-arrival-price" style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ color: '#B97285' }}>₹{salePrice.toLocaleString('en-IN')}</span>
                              <span style={{ fontSize: '0.78rem', color: 'rgba(0, 0, 0, 0.4)', textDecoration: 'line-through', fontWeight: 'normal' }}>₹{regPrice.toLocaleString('en-IN')}</span>
                            </div>
                          ) : (
                            <div className="new-arrival-price">
                              ₹{regPrice.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '1rem' }}>
                <Link href="/collections?collection=gowns" style={flashSaleShopAllStyle}>
                  SHOP ALL HEAVY GOWNS &rarr;
                </Link>
              </div>
            </div>

            {/* 3. SHARARAS SUB-SECTION */}
            <div id="shararas" className="heavy-dresses-subsection">
              <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
                <h3 style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.75rem',
                  color: '#2D2429',
                  fontWeight: '500',
                  letterSpacing: '0.02em',
                  marginBottom: '0.4rem'
                }}>
                  Drape Sarees
                </h3>
                <div style={{ width: '40px', height: '1.5px', backgroundColor: '#B97285', margin: '0 auto' }}></div>
              </div>

              <div className="new-arrivals-grid">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} type="home-new-arrival" />
                  ))
                ) : (
                  (heavyDresses.shararas || []).slice(0, 4).map((product, index) => {
                    const regPrice = parseFloat(product.price) || 0;
                    const salePrice = product.flash_sale && product.flash_sale_price ? parseFloat(product.flash_sale_price) : (product.on_sale && product.sale_price ? parseFloat(product.sale_price) : regPrice);
                    const isOnSale = regPrice > salePrice;
                    const discountPct = regPrice > 0 ? Math.max(1, Math.round(((regPrice - salePrice) / regPrice) * 100)) : 20;
                    const isWishlisted = wishlist.includes(product.id);
                    return (
                      <div key={product.id || index} className="new-arrival-card">
                        <div className="new-arrival-img-container">
                          <div onClick={(e) => handleProductClick(e, product)} style={{ cursor: 'pointer', width: '100%', height: '100%' }}>
                            <ImageWithSkeleton 
                              src={product.images?.[0] || '/icon.png'} 
                              alt={product.name} 
                              eager={false}
                              className="new-arrival-img-style" 
                            />
                          </div>

                          {/* Discount Badge on Top Left */}
                          {isOnSale && (
                            <div style={flashSaleBadgeStyle} className="flash-sale-badge">
                              -{discountPct}%
                            </div>
                          )}

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

                        <div className="new-arrival-card-content">
                          <div onClick={(e) => handleProductClick(e, product)} style={{ cursor: 'pointer', color: 'inherit' }}>
                            <h3 className="new-arrival-product-name">{product.name}</h3>
                          </div>
                          {isOnSale ? (
                            <div className="new-arrival-price" style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ color: '#B97285' }}>₹{salePrice.toLocaleString('en-IN')}</span>
                              <span style={{ fontSize: '0.78rem', color: 'rgba(0, 0, 0, 0.4)', textDecoration: 'line-through', fontWeight: 'normal' }}>₹{regPrice.toLocaleString('en-IN')}</span>
                            </div>
                          ) : (
                            <div className="new-arrival-price">
                              ₹{regPrice.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ textAlign: 'center', marginTop: '1rem', marginBottom: '1rem' }}>
                <Link href="/collections?collection=shararas" style={flashSaleShopAllStyle}>
                  SHOP ALL DRAPE SAREES &rarr;
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Separator Line */}
      <div style={{ height: '1px', backgroundColor: 'rgba(139, 119, 137, 0.15)', width: '100%' }}></div>

      {/* 4. CLIENT REVIEWS SECTION */}
      <section style={reviewsSectionStyle} className="home-section home-reviews-section">
        <div className="container">
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>Reviews</h2>
            <div style={sectionDividerLineStyle}></div>
          </div>
        </div>

        <div className="reviews-ticker-container">
          <div className="reviews-ticker-wrapper">
            {/* Duplicate array mapping to support seamless loop auto scroll ticker */}
            {[...reviewImages, ...reviewImages].map((rev, idx) => (
              <div 
                key={idx} 
                className="review-card"
                onClick={() => setSelectedReview(rev.img)}
              >
                <div className="review-card-header">
                  <span className="review-stars">★★★★★</span>
                  <span className="review-quote-icon">”</span>
                </div>
                <p className="review-card-text">
                  "{rev.text}"
                </p>
                <div className="review-card-footer">
                  <div className="review-avatar">{rev.initial}</div>
                  <div className="review-client-info">
                    <span className="review-client-name">{rev.name}</span>
                    <span className="review-client-location">{rev.location}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile bottom sheet backdrop */}
      {activeProduct && (
        <div 
          className="homepage-flash-sale-backdrop" 
          onClick={() => setActiveProduct(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            display: 'block',
            pointerEvents: 'auto',
            animation: 'fadeInBackdrop 0.3s ease-out forwards',
          }}
        />
      )}

      {activeProduct && (
        <div className="mobile-sheet-wrapper-container animate-fade-in">
          {/* Floating Card */}
          <div className="container detail-container-box" style={detailContainerStyle} onClick={(e) => e.stopPropagation()}>
            {/* Mobile Drag handle pill */}
            <div className="mobile-sheet-drag-handle" />

            {/* Back button and wishlist toggle on top */}
            <div style={detailHeaderStyle} className="detail-header-mobile-overlay">
              <button onClick={() => setActiveProduct(null)} style={detailBackButtonStyle} className="desktop-back-btn detail-back-btn-overlay">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back to Store
              </button>

              {/* Mobile Down Chevron dismiss button */}
              <button onClick={() => setActiveProduct(null)} className="mobile-sheet-dismiss-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              
              {/* Heart Wishlist button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(activeProduct.id);
                }} 
                className="detail-wishlist-btn-overlay"
                style={{
                  color: wishlist.includes(activeProduct.id) ? '#D98E9B' : '#000000',
                  marginRight: '6px',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={wishlist.includes(activeProduct.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
              <ProductShareButton product={activeProduct} />
            </div>

            {/* Grid container */}
            <div style={{}} className="detail-preview-grid">
              {/* Top Half: Image */}
              <div style={{ ...detailMainImgWrapperStyle, position: 'relative' }} className="detail-main-img-wrapper">
                <ProductImageGallery 
                  images={activeProduct.images || []} 
                  name={activeProduct.name} 
                />
                {activeProduct.flash_sale && activeProduct.flash_sale_price && (
                  <div style={{
                    position: 'absolute',
                    top: '22px',
                    right: '64px',
                    backgroundColor: '#D98E9B',
                    color: '#FFFFFF',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 10
                  }}>
                    -{Math.round(((parseFloat(activeProduct.price) - parseFloat(activeProduct.flash_sale_price)) / parseFloat(activeProduct.price)) * 100)}%
                  </div>
                )}
              </div>

              {/* Bottom Half: Details */}
              <div style={detailInfoStyle}>
                <div className="detail-static-content">
                <span style={detailCollectionLabelStyle} className="detail-collection-label">{activeProduct.collection_name}</span>
                <h1 style={detailTitleStyle} className="detail-product-name">{activeProduct.name}</h1>
                {activeProduct.flash_sale && activeProduct.flash_sale_price ? (
                  <p style={detailPriceStyle} className="detail-product-price">
                    <span style={{ color: '#000000', fontWeight: '700', marginRight: '0.8rem' }}>
                      ₹{parseFloat(activeProduct.flash_sale_price).toLocaleString('en-IN')}
                    </span>
                    <span style={{ color: 'rgba(0, 0, 0, 0.4)', textDecoration: 'line-through', fontSize: '1.1rem', fontWeight: '400' }}>
                      ₹{parseFloat(activeProduct.price).toLocaleString('en-IN')}
                    </span>
                  </p>
                ) : (
                  <p style={detailPriceStyle} className="detail-product-price">₹{parseFloat(activeProduct.price).toLocaleString('en-IN')}</p>
                )}
                <ProductTagBadges tags={activeProduct.tags} />
                <div style={detailDividerStyle} className="detail-divider"></div>
                <p style={detailDescStyle} className="detail-product-desc">{(activeProduct.description && activeProduct.description.trim()) ? activeProduct.description.trim() : 'Exclusive luxury item, crafted from premium archival coutures.'}</p>

                <div className="detail-stock-warning" style={{ marginTop: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#B8860B', fontWeight: '600' }}>
                  {maxStock <= 3 ? (
                    <span style={{ color: '#D9534F' }}>⚠️ Only {maxStock} left in our vaults!</span>
                  ) : (
                    <span>Remaining stock: {maxStock} available</span>
                  )}
                </div>

                {/* Sizes selector */}
                {activeProduct.variants && activeProduct.variants.some(v => v.size) && (() => {
                  const hasClothingSizes = activeProduct.variants.some(v => ['S', 'M', 'L', 'XL', 'XXL'].includes(v.size?.toUpperCase()));
                  const sizesToRender = hasClothingSizes 
                    ? ['S', 'M', 'L', 'XL', 'XXL'] 
                    : [...new Set(activeProduct.variants.map(v => v.size))].filter(Boolean);

                  return (
                    <div style={detailOptionGroupStyle} className="detail-option-group">
                      <h4 style={detailOptionTitleStyle} className="detail-option-title">Select Size</h4>
                      <div style={detailSizesRowStyle} className="detail-sizes-row">
                        {sizesToRender.map(size => {
                          const variantForSize = activeProduct.variants.find(v => (v.size || '').toUpperCase() === size.toUpperCase());
                          const hasStock = variantForSize && variantForSize.stock > 0;
                          const isSelected = activeProductSize === size;
                          
                          return (
                            <button 
                              key={size}
                              disabled={!hasStock}
                              onClick={() => setActiveProductSize(size)}
                              style={{
                                ...(isSelected ? activeSizeOptStyle : sizeOptStyle),
                                ...(!hasStock ? { opacity: 0.35, cursor: 'not-allowed', textDecoration: 'line-through' } : {})
                              }}
                            >
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                </div>

                {/* Sticky Actions Footer (inside card) */}
                <div className="card-sticky-footer">
                  <div style={detailActionWrapperStyle} className="detail-action-bottom-bar">
                    {user && user.role === 'admin' ? (
                      <Link
                        href={`/admin/products?edit=${activeProduct.slug}`}
                        style={detailAdminEditBtnStyle}
                      >
                        Admin Preview: Edit Product
                      </Link>
                    ) : currentQtyInCart > 0 ? (
                      /* Counter controller when product is already in cart */
                      <div className="blinkit-count-controller" style={{ ...detailAddBtnStyle, backgroundColor: '#FFFFFF', border: '1px solid #D98E9B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem', cursor: 'default', width: '100%' }}>
                        <button 
                          style={{ border: 'none', backgroundColor: 'transparent', fontSize: '1.4rem', color: '#D98E9B', cursor: 'pointer', fontWeight: 'bold', padding: '0 0.8rem' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCartQuantity(activeProduct.id, activeProductSize, activeProductColor, currentQtyInCart - 1);
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: '700', color: '#000000', fontSize: '1rem' }}>{currentQtyInCart} in bag</span>
                        <button 
                          style={{ border: 'none', backgroundColor: 'transparent', fontSize: '1.4rem', color: '#D98E9B', cursor: 'pointer', fontWeight: 'bold', padding: '0 0.8rem', opacity: currentQtyInCart >= maxStock ? 0.35 : 1 }}
                          disabled={currentQtyInCart >= maxStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCartQuantity(activeProduct.id, activeProductSize, activeProductColor, currentQtyInCart + 1);
                          }}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      /* Standard Add to Cart button when not in cart */
                      <>
                        <div className="mobile-hide-qty" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div style={detailQtyControlStyle}>
                            <button 
                              style={detailQtyBtnStyle}
                              onClick={() => {
                                if (activeProductQty > 1) {
                                  setActiveProductQty(activeProductQty - 1);
                                }
                              }}
                            >
                              -
                            </button>
                            <span style={detailQtyValStyle}>{activeProductQty}</span>
                            <button 
                              style={{
                                ...detailQtyBtnStyle,
                                opacity: isPlusDisabled ? 0.35 : 1,
                                cursor: isPlusDisabled ? 'not-allowed' : 'pointer'
                              }}
                              disabled={isPlusDisabled}
                              onClick={() => {
                                if (activeProductQty < maxStock) {
                                  setActiveProductQty(activeProductQty + 1);
                                }
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button 
                          style={detailAddBtnStyle}
                          disabled={activeProduct.is_out_of_stock || isPlusDisabled}
                          onClick={() => {
                            if (activeProduct.is_out_of_stock || isPlusDisabled) return;
                            addToCart(activeProduct, activeProductSize, activeProductColor, activeProductQty);
                            setActiveProductQty(1);
                          }}
                        >
                          {activeProduct.is_out_of_stock ? 'Sold Out' : <AddToBagLabel />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sibling switcher row of 56px circular switcher circles */}
          {switcherProducts.length > 0 && (() => {
            const activeIdx = switcherProducts.findIndex(p => p.id === activeProduct.id);
            const W = viewportWidth || 390;
            const translateX = (W / 2) - 28 - (activeIdx * 68.8);

            return (
              <div className="mobile-sibling-switcher-row-outer hide-scrollbar">
                <div 
                  className="mobile-sibling-switcher-row-inner"
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '0.8rem',
                    transform: `translateX(${translateX}px)`,
                    transition: 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
                    willChange: 'transform'
                  }}
                >
                  {switcherProducts.map((sib) => {
                    const isActive = sib.id === activeProduct.id;
                    return (
                      <button
                        key={sib.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          setActiveProduct(sib);
                          setActiveProductImage(sib.images && sib.images[0] ? sib.images[0] : '/placeholder.jpg');
                          const vars = sib.variants || [];
                          const inStockVar = vars.find(v => v.stock > 0) || vars[0];
                          setActiveProductSize(inStockVar ? inStockVar.size || '' : '');
                          setActiveProductColor(inStockVar ? inStockVar.color || '' : '');
                          setActiveProductQty(1);
                        }}
                        className={`sibling-switcher-circle-btn ${isActive ? 'active' : ''}`}
                      >
                        <ImageWithSkeleton 
                          src={sib.images && sib.images[0] ? sib.images[0] : '/placeholder.jpg'} 
                          alt={sib.name} 
                          className="sibling-switcher-circle-img"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedReview && (
        <div 
          style={lightboxOverlayStyle} 
          onClick={() => setSelectedReview(null)}
        >
          <div style={lightboxContentStyle} onClick={(e) => e.stopPropagation()}>
            <button 
              style={lightboxCloseBtnStyle} 
              onClick={() => setSelectedReview(null)}
            >
              ✕
            </button>
            <img 
              src={selectedReview} 
              alt="Client appreciation full" 
              style={lightboxImgStyle} 
              loading="lazy"
            />
          </div>
        </div>
      )}

      {/* Floating WhatsApp Chat Button */}
      <a 
        href={whatsAppUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="whatsapp-floating-btn"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.45 5.407 0 9.811-4.38 9.813-9.75.002-2.602-1.01-5.05-2.85-6.895-1.84-1.847-4.292-2.865-6.894-2.866-5.417 0-9.821 4.382-9.825 9.75-.002 2.115.556 4.177 1.621 5.995L1.898 21.6l4.75-1.246zm11.23-5.385c-.298-.148-1.758-.865-2.03-.966-.273-.101-.471-.148-.67.149-.197.297-.768.966-.94 1.164-.173.199-.347.223-.646.074-.299-.148-1.261-.464-2.399-1.48-1.272-1.134-1.83-2.15-2.079-2.547-.248-.396-.026-.61.173-.808.18-.178.397-.462.596-.693.199-.23.265-.396.398-.66.133-.264.066-.495-.033-.693-.1-.198-.865-2.08-1.186-2.85-.314-.755-.632-.653-.865-.653H7.49c-.23 0-.604.088-.92.43-.318.344-1.211 1.187-1.211 2.895 0 1.708 1.244 3.359 1.417 3.59.172.23 2.45 3.738 5.93 5.24 2.443 1.054 3.528 1.157 4.79.97 1.137-.168 2.76-.84 3.153-1.652.393-.813.393-1.509.276-1.656-.118-.149-.438-.236-.736-.384z"/>
        </svg>
        <span>Chat With Us</span>
      </a>
    </div>
  );
}

// Inline styles for Homepage
const pageContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
};



const sectionHeaderStyle = {
  textAlign: 'center',
  marginBottom: '2rem',
  marginTop: '0',
};

const sectionSubStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  color: '#D98E9B', // Pink
  fontWeight: '600',
  display: 'block',
  marginBottom: '0.5rem',
};

const sectionTitleStyle = {
  fontSize: '2.2rem',
  fontFamily: 'var(--font-serif)',
  color: '#D98E9B',
};

const sectionDividerLineStyle = {
  width: '50px',
  height: '1px',
  backgroundColor: '#D98E9B',
  margin: '1rem auto 0 auto',
};

// Timeline Styles
const timelineSectionStyle = {
  padding: '1rem 0 5rem 0',
  backgroundColor: '#FFFFFF',
};

const timelineContainerStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '2.5rem',
  position: 'relative',
  paddingTop: '2rem',
  margin: '0 auto',
  maxWidth: '1100px',
};

const timelineNodeStyle = {
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  position: 'relative',
};

const timelineYearStyle = {
  fontFamily: 'var(--font-serif)',
  fontSize: '1.8rem',
  fontWeight: '600',
  color: '#000000',
  marginBottom: '0.6rem',
};

const timelineDotStyle = {
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  backgroundColor: '#FFFFFF',
  marginBottom: '1.2rem',
  border: '2px solid #FFFFFF',
  boxShadow: '0 0 0 4px rgba(194,168,175,0.2)',
};

const timelineDotActiveStyle = {
  ...timelineDotStyle,
  backgroundColor: '#D98E9B',
  boxShadow: '0 0 0 6px rgba(74, 52, 57, 0.08)',
};

const timelineNodeTitleStyle = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.9rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#D98E9B',
  marginBottom: '0.5rem',
  fontWeight: '600',
};

const timelineNodeTitleActiveStyle = {
  ...timelineNodeTitleStyle,
  color: '#000000',
};

const timelineNodeDescStyle = {
  fontSize: '0.8rem',
  color: '#000000',
  lineHeight: 1.5,
  maxWidth: '220px',
};

// Featured Collections Styles
const collectionsSectionStyle = {
  padding: '3rem 0',
  backgroundColor: '#FFFFFF',
};


const collectionsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '1.5rem',
  maxWidth: '1200px',
  margin: '0 auto',
};

const collectionCardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 4px 15px rgba(60, 48, 58, 0.04)',
  display: 'flex',
  flexDirection: 'column',
  transition: 'all 0.3s ease',
  border: '1px solid rgba(139, 119, 137, 0.05)',
  height: '100%',
};

const collectionCardPinkStyle = {
  ...collectionCardStyle,
  border: '1px solid #D98E9B',
  boxShadow: '0 10px 25px rgba(74, 52, 57, 0.08)',
};

const cardImageWrapperStyle = {
  position: 'relative',
  width: '100%',
  height: '350px',
  overflow: 'hidden',
  borderRadius: '8px',
};

const cardImgStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  transition: 'transform 0.5s ease',
};

const pinkCardBadgeStyle = {
  position: 'absolute',
  top: '1rem',
  right: '1rem',
  backgroundColor: '#D98E9B',
  color: '#000000',
  padding: '0.35rem 0.8rem',
  borderRadius: '999px',
  fontSize: '0.65rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  border: '1px solid #D98E9B',
  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
};

const cardContentStyle = {
  padding: '1.8rem 1rem',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  flex: 1,
};

const cardDividerStyle = {
  width: '24px',
  height: '1px',
  backgroundColor: '#D98E9B',
  marginBottom: '1.2rem',
};

const cardTitleStyle = {
  fontSize: '1.8rem',
  fontFamily: 'var(--font-serif)',
  marginBottom: '0.6rem',
  color: '#B97285',
};

const cardDescStyle = {
  fontSize: '0.85rem',
  color: 'rgba(0,0,0,0.7)',
  lineHeight: 1.6,
  marginBottom: '1.8rem',
  flex: 1,
};

const cardLinkStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: '700',
  color: '#A06B79',
  border: '1px solid rgba(217, 142, 155, 0.6)',
  backgroundColor: 'transparent',
  borderRadius: '25px',
  padding: '0.6rem 1rem',
  width: '85%',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  marginTop: 'auto',
  alignSelf: 'center',
  marginBottom: '1.8rem',
  display: 'inline-block',
};

// Atelier Promo Styles
const atelierPromoSectionStyle = {
  backgroundColor: '#FFFFFF',
  color: '#000000',
  overflow: 'hidden',
};

const atelierPromoGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1.2fr 1fr',
  minHeight: '480px',
  '@media (maxWidth: 768px)': {
    gridTemplateColumns: '1fr',
  },
};

const atelierPromoImgStyle = {
  backgroundColor: '#FAF5F6',
  minHeight: '350px',
};

const atelierPromoContentStyle = {
  padding: '4.5rem 3.5rem',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'flex-start',
  gap: '1.2rem',
};

const atelierPromoLabelStyle = {
  color: '#000000',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.15em',
  fontWeight: '600',
};

const atelierPromoTitleStyle = {
  fontSize: '2.2rem',
  color: '#D98E9B',
  fontFamily: 'var(--font-serif)',
};

const atelierPromoDescStyle = {
  fontSize: '0.9rem',
  lineHeight: 1.6,
  color: '#000000',
  marginBottom: '1rem',
};

const atelierBtnStyle = {
  backgroundColor: 'transparent',
  color: '#000000',
  border: '1px solid #D98E9B',
  padding: '0.75rem 1.8rem',
  borderRadius: '4px',
  fontSize: '0.8rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const reviewsSectionStyle = {
  backgroundColor: '#FFFFFF',
  padding: '3rem 0',
};

const reviewsGridStyle = {
  display: 'flex',
  gap: '1.5rem',
  overflowX: 'auto',
  padding: '1rem 0.5rem 2rem 0.5rem',
  scrollSnapType: 'x mandatory',
};

const reviewImgStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const lightboxOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
};

const lightboxContentStyle = {
  position: 'relative',
  maxWidth: '90%',
  maxHeight: '90%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const lightboxCloseBtnStyle = {
  position: 'absolute',
  top: '-2.5rem',
  right: '0',
  backgroundColor: 'transparent',
  border: 'none',
  color: '#FFFFFF',
  fontSize: '1.5rem',
  cursor: 'pointer',
  padding: '0.5rem',
};

const lightboxImgStyle = {
  maxWidth: '100%',
  maxHeight: '85vh',
  borderRadius: '8px',
  objectFit: 'contain',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
};

const flashSaleSectionStyle = {
  padding: '3rem 0',
  backgroundColor: '#FFFFFF',
};

const flashSaleHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '2rem',
};

const flashSaleTitleStyle = {
  fontFamily: 'var(--font-sans)',
  fontSize: '1.1rem',
  fontWeight: '700',
  letterSpacing: '0.12em',
  color: '#B65C73',
};

const flashSaleTitleDividerStyle = {
  color: 'rgba(139, 119, 137, 0.25)',
  margin: '0 0.2rem',
  fontSize: '1.1rem',
};

const flashSaleSubStyle = {
  fontSize: '0.82rem',
  color: 'rgba(0, 0, 0, 0.6)',
  fontWeight: '500',
};

const flashSaleImgContainerStyle = {
  position: 'relative',
  width: '100%',
  aspectRatio: '1',
  borderRadius: '12px',
  overflow: 'hidden',
  backgroundColor: '#F6DDE2',
  marginBottom: '0.8rem',
};

const flashSaleImgStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const flashSaleBadgeStyle = {
  position: 'absolute',
  top: '8px',
  left: '8px',
  backgroundColor: '#B97285',
  color: '#FFFFFF',
  padding: '0.25rem 0.6rem',
  borderRadius: '6px',
  fontSize: '0.75rem',
  fontWeight: '700',
  zIndex: 10,
};

const flashSaleWishlistBtnStyle = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  border: 'none',
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  zIndex: 10,
};

const flashSaleProductNameStyle = {
  fontSize: '0.9rem',
  fontWeight: '600',
  color: '#B97285',
  marginBottom: '0.3rem',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const flashSalePriceRowStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '0.6rem',
};

const flashSaleDiscountPriceStyle = {
  fontSize: '0.9rem',
  fontWeight: '600',
  color: '#B97285',
};

const flashSaleOriginalPriceStyle = {
  fontSize: '0.9rem',
  fontWeight: '600',
  color: 'rgba(0, 0, 0, 0.4)',
  textDecoration: 'line-through',
};

const flashSaleShopAllStyle = {
  fontSize: '0.75rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: '#B65C73',
  borderBottom: '1.5px solid #B65C73',
  paddingBottom: '2px',
};
// Bottom Sheet Product Detail card styles

const seeMoreBtnContainerStyle = {
  textAlign: 'center',
  marginTop: '2.5rem',
};

const seeMoreButtonStyle = {
  display: 'inline-block',
  width: '100%',
  maxWidth: '650px',
  backgroundColor: 'transparent',
  color: '#B97285',
  border: '1.5px solid #B97285',
  padding: '0.75rem 2rem',
  borderRadius: '8px',
  fontSize: '0.85rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

// Bottom Sheet Product Detail card styles
const detailContainerStyle = {
  padding: '1.5rem',
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  boxShadow: 'var(--shadow-md)',
  border: '1px solid rgba(139, 119, 137, 0.1)',
  marginTop: '1.5rem',
};

const detailHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
};

const detailBackButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: 'transparent',
  border: 'none',
  color: '#000000',
  fontSize: '0.9rem',
  fontWeight: '600',
  cursor: 'pointer',
  padding: '0.5rem 0',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
};

const detailMainImgWrapperStyle = {
  width: '100%',
  maxHeight: '430px',
  overflow: 'hidden',
  borderRadius: '8px',
  border: '1px solid rgba(139, 119, 137, 0.1)',
  backgroundColor: '#FBF0EC',
};

const detailMainImgStyle = {
  width: '100%',
  height: '100%',
  maxHeight: '430px',
  objectFit: 'cover',
  display: 'block',
};

const detailInfoStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const detailCollectionLabelStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: '#D98E9B',
  fontWeight: '700',
};

const detailTitleStyle = {
  fontSize: '1.8rem',
  fontFamily: 'var(--font-serif)',
  color: '#000000',
  fontWeight: '400',
  lineHeight: '1.15',
  margin: '0.1rem 0',
};

const detailPriceStyle = {
  fontSize: '1.4rem',
  color: '#000000',
  fontWeight: '600',
};

const detailDividerStyle = {
  height: '1px',
  backgroundColor: 'rgba(139, 119, 137, 0.15)',
  margin: '0.2rem 0',
};

const detailDescStyle = {
  fontSize: '0.88rem',
  lineHeight: '1.5',
  color: 'rgba(0,0,0,0.7)',
};

const detailOptionGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
  marginTop: '0.2rem',
};

const detailOptionTitleStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#D98E9B',
  fontWeight: '700',
};

const detailSizesRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.6rem',
};

const sizeOptStyle = {
  padding: '0.4rem 1rem',
  border: '1px solid rgba(139, 119, 137, 0.25)',
  borderRadius: '4px',
  fontSize: '0.75rem',
  fontWeight: '600',
  backgroundColor: '#FFFFFF',
  color: '#000000',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const activeSizeOptStyle = {
  ...sizeOptStyle,
  backgroundColor: '#000000',
  border: '1px solid #000000',
  color: '#FFFFFF',
};

const detailActionWrapperStyle = {
  display: 'flex',
  gap: '0.8rem',
  marginTop: '0.6rem',
};

const detailQtyControlStyle = {
  display: 'flex',
  alignItems: 'center',
  border: '1px solid rgba(139, 119, 137, 0.25)',
  borderRadius: '4px',
  overflow: 'hidden',
  height: '40px',
};

const detailQtyBtnStyle = {
  width: '36px',
  height: '100%',
  backgroundColor: 'transparent',
  border: 'none',
  fontSize: '1.1rem',
  cursor: 'pointer',
  color: '#000000',
};

const detailQtyValStyle = {
  padding: '0 0.8rem',
  fontWeight: '600',
  fontSize: '0.95rem',
};

const detailAddBtnStyle = {
  flex: 1,
  backgroundColor: '#D98E9B',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '4px',
  fontSize: '0.8rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  cursor: 'pointer',
  height: '40px',
  transition: 'all 0.3s ease',
};

const detailAdminEditBtnStyle = {
  flex: 1,
  backgroundColor: '#FFFFFF',
  color: '#000000',
  border: '1px solid #000000',
  borderRadius: '4px',
  fontSize: '0.8rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  cursor: 'pointer',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  textDecoration: 'none',
  transition: 'all 0.3s ease',
};

