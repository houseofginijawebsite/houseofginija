'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/context/StoreContext';
import ImageWithSkeleton from '@/components/ImageWithSkeleton';
import SkeletonCard from '@/components/SkeletonCard';
import ProductImageGallery from '@/components/ProductImageGallery';
import { AddToBagLabel, ProductFeatureStrip, ProductShareButton, ProductTagBadges } from '@/components/ProductQuickViewExtras';
import { compareCatalogProducts, getCategoryTitle, isJewelleryProduct, productMatchesCategory, mergeCatalogWithLocalOverrides } from '@/lib/catalogClient';

function MobileSearchBar({ allProducts, initialQuery, onSearch, handleProductClick }) {
  const [localQuery, setLocalQuery] = useState(initialQuery || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef(null);
  
  const inputRef = useRef(null);

  // Close suggestions if user clicks outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const searchRow = document.querySelector('.mobile-search-bar-row');
      if (searchRow && !searchRow.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close suggestions on scroll
  useEffect(() => {
    const handleScroll = () => setShowSuggestions(false);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getSuggestions = () => {
    if (!localQuery) return [];
    const q = localQuery.toLowerCase().trim();
    return allProducts
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 5);
  };

  return (
    <div className="mobile-search-bar-row">
      <form 
        className="mobile-search-bar-inner" 
        style={{ position: 'relative', width: '100%', margin: 0 }}
        onSubmit={(e) => {
          e.preventDefault();
          setShowSuggestions(false);
          if (inputRef.current) {
            inputRef.current.blur();
          }
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          onSearch(localQuery);
        }}
      >
        <svg className="mobile-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(0, 0, 0, 0.4)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          ref={inputRef}
          type="search"
          placeholder="Search for products, collections..."
          value={localQuery}
          onChange={(e) => {
            const val = e.target.value;
            setLocalQuery(val);
            setShowSuggestions(true);
            
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
              onSearch(val);
            }, 300);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setShowSuggestions(false);
              e.currentTarget.blur();
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              onSearch(localQuery);
            }
          }}
          className="mobile-search-input"
          style={{
            width: '100%',
            height: '38px',
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(139, 119, 137, 0.25)',
            borderRadius: '50px',
            paddingLeft: '2.6rem',
            paddingRight: '1rem',
            fontSize: '0.85rem',
            color: '#000000',
            boxSizing: 'border-box',
            outline: 'none'
          }}
        />
        
        {showSuggestions && localQuery.trim().length > 0 && (
          <div className="search-suggestions-dropdown" style={{
            position: 'absolute',
            top: '44px',
            left: 0,
            right: 0,
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(139, 119, 137, 0.15)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 1001,
            maxHeight: '260px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            padding: '0.4rem 0',
          }}>
            {getSuggestions().map((p) => (
              <a
                key={p.id}
                href={`/products/${p.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  padding: '0.6rem 1rem',
                  textDecoration: 'none',
                  borderBottom: '1px solid rgba(139, 119, 137, 0.05)',
                  color: '#000000',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowSuggestions(false);
                  
                  // When opening the bottom sheet, we do NOT clear the search state.
                  // We also perform the search based on current input so feed populates beneath the sheet.
                  if (timeoutRef.current) clearTimeout(timeoutRef.current);
                  onSearch(localQuery);
                  
                  handleProductClick(e, p);
                }}
                onClick={(e) => e.preventDefault()}
              >
                <ImageWithSkeleton 
                  src={p.images?.[0] || '/placeholder.png'} 
                  style={{
                    width: '36px',
                    height: '36px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    border: '1px solid rgba(139, 119, 137, 0.1)',
                  }} 
                  alt="" 
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#000000' }}>{p.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#D98E9B', fontWeight: '600', marginTop: '0.1rem' }}>
                    ₹{parseFloat(p.price).toLocaleString('en-IN')}
                  </span>
                </div>
              </a>
            ))}
            {getSuggestions().length === 0 && (
              <div style={{ padding: '1rem', color: 'rgba(0,0,0,0.5)', fontSize: '0.85rem', textAlign: 'center' }}>
                No matching products found
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

function CollectionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, cart, addToCart, updateCartQuantity, wishlist, toggleWishlist, jewelleryEnabled } = useStore();

  // Filter States
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Read initial params
  const initialCollection = searchParams.get('category') || searchParams.get('collection') || '';
  const [selectedCollection, setSelectedCollection] = useState(initialCollection);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSort, setSelectedSort] = useState('name_asc');

  // Detailed view states
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeProductImage, setActiveProductImage] = useState('');
  const [activeProductSize, setActiveProductSize] = useState('');
  const [activeProductColor, setActiveProductColor] = useState('');
  const [activeProductQty, setActiveProductQty] = useState(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [activeCategorySidebar, setActiveCategorySidebar] = useState('');

  // Viewport width state for mobile sibling switcher centering
  const [viewportWidth, setViewportWidth] = useState(390);
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);

  // Manage scroll-lock on document.body and documentElement when mobile filter drawer is open
  useEffect(() => {
    if (isMobileFilterOpen) {
      document.body.classList.add('scroll-locked');
      document.documentElement.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
      document.documentElement.classList.remove('scroll-locked');
    }
    return () => {
      document.body.classList.remove('scroll-locked');
      document.documentElement.classList.remove('scroll-locked');
    };
  }, [isMobileFilterOpen]);

  // Lock body and html scroll when product detail sheet is open
  useEffect(() => {
    if (activeProduct) {
      document.body.classList.add('scroll-locked');
      document.documentElement.classList.add('scroll-locked');
    } else {
      document.body.classList.remove('scroll-locked');
      document.documentElement.classList.remove('scroll-locked');
    }
    return () => {
      document.body.classList.remove('scroll-locked');
      document.documentElement.classList.remove('scroll-locked');
    };
  }, [activeProduct]);

  // Trap Escape key for closing filter drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMobileFilterOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handle manual collections reset event (e.g., clicking Collections in header link while already on collections page)
  useEffect(() => {
    const handleReset = () => {
      setActiveProduct(null);
      setSelectedCollection('');
      setSearchQuery('');
      setSelectedSize('');
      setSelectedColor('');
      setSelectedSort('newest');
    };
    window.addEventListener('reset-collections', handleReset);
    return () => {
      window.removeEventListener('reset-collections', handleReset);
    };
  }, []);

  // Synchronize state when URL query parameters change (e.g., from Header dropdown links)
  const colParam = searchParams.get('category') || searchParams.get('collection') || '';
  const searchParam = searchParams.get('search') || '';
  const categoryParam = searchParams.get('category') || '';

  useEffect(() => {
    setSelectedCollection(colParam);
    setSearchQuery(searchParam);
    setActiveCategorySidebar(colParam);
    
    // Close detailed preview when collection query changes
    setActiveProduct(null);
  }, [colParam, searchParam]);

  // Scroll to category if present in the URL (Runs once products are loaded)
  useEffect(() => {
    if (!loading && categoryParam) {
      let targetId = categoryParam.toLowerCase();
      if (targetId === 'necklace') targetId = 'necklaces';
      
      setTimeout(() => {
        const element = document.getElementById(targetId);
        if (element) {
          const yOffset = -180;
          const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
          setActiveCategorySidebar(targetId);
        }
      }, 300);
    }
  }, [categoryParam, loading]);

  // Scroll-Spy: Highlight active category on left panel as user scrolls the right panel feed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      if (searchQuery) {
        setActiveCategorySidebar('');
        return;
      }

      const sections = getSidebarCategories()
        .map(c => c.id)
        .filter(id => id !== 'all' && id !== 'jewellery');
      
      const scrollPosition = window.scrollY + 242; // offset of header + search bar + category bar + buffer
      let activeSection = '';

      for (const secId of sections) {
        const el = document.getElementById(secId);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            activeSection = secId;
            break;
          }
        }
      }

      if (activeSection) {
        setActiveCategorySidebar(activeSection);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount/load
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [loading, products, activeProduct, searchQuery, collections]);



  // Sync nav bar highlight with active collection filter selection
  useEffect(() => {
    if (selectedCollection) {
      setActiveCategorySidebar(selectedCollection);
    } else {
      setActiveCategorySidebar('');
    }
  }, [selectedCollection]);

  const handleCategorySidebarClick = (catId) => {
    setActiveCategorySidebar(catId);
    setSelectedCollection(catId);
    
    setTimeout(() => {
      const element = document.querySelector('.blinkit-feed');
      if (element) {
        const yOffset = -232;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  // Static options matching our seed data
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  
  const activeFilterCount = [
    selectedCollection,
    selectedSize,
    selectedColor
  ].filter(Boolean).length;

  const getSuggestions = () => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase().trim();
    return allProducts
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 5);
  };
  const colors = [
    'Champagne Pink',
    'Deep Plum',
    'Blush Cream',
    'Midnight Plum',
    '#000000 #000000',
    'Warm Ivory',
    'Rose Mauve',
    'Rose Pink',
    'Mulberry',
    'Rose Pink Foil',
    'Dusty Mauve',
  ];

  // Helper to render filter controls (shared between desktop sidebar and mobile bottom sheet)
  const renderFilters = (isMobile = false) => (
    <>
      {!isMobile && (
        <div style={filterGroupStyle}>
          <h4 style={filterTitleStyle}>Search</h4>
          <input
            type="text"
            placeholder="Search creations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={searchFieldStyle}
          />
        </div>
      )}

      <div style={filterGroupStyle}>
        <h4 style={filterTitleStyle}>Collections</h4>
        <select
          value={selectedCollection}
          onChange={(e) => setSelectedCollection(e.target.value)}
          style={selectFieldStyle}
        >
          {collections
            .filter((c) => c.parent_slug !== 'new-collection' && String(c.parent_id) !== '3' && c.slug !== 'muslin' && c.slug !== 'cotton' && c.slug !== 'cotton-linen')
            .map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          {jewelleryEnabled !== false && (
            <>
              <option disabled>-- Jewellery Types --</option>
              <option value="rings">Rings</option>
              <option value="necklaces">Necklaces</option>
              <option value="bracelets">Bracelets</option>
            </>
          )}
        </select>
      </div>

      <div style={filterGroupStyle}>
        <h4 style={filterTitleStyle}>Size</h4>
        <div style={gridSelectStyle}>
          {sizes.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSize(selectedSize === s ? '' : s)}
              style={selectedSize === s ? activeGridItemStyle : gridItemStyle}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={filterGroupStyle}>
        <h4 style={filterTitleStyle}>Sort By</h4>
        <select
          value={selectedSort}
          onChange={(e) => setSelectedSort(e.target.value)}
          style={selectFieldStyle}
        >
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Alphabetical</option>
        </select>
      </div>

      <button 
        onClick={() => {
          handleClearFilters();
          setIsMobileFilterOpen(false);
        }} 
        style={clearBtnStyle}
      >
        Reset All Filters
      </button>
    </>
  );

  // Fetch collections
  useEffect(() => {
    const fetchCols = async () => {
      try {
        const res = await fetch('/api/collections');
        if (res.ok) {
          const data = await res.json();
          setCollections(data.collections || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCols();
  }, []);
  // Scroll-Spy: Highlight active category on left panel as user scrolls the right panel feed
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      if (searchQuery) {
        setActiveCategorySidebar('');
        return;
      }

      const sections = getSidebarCategories()
        .map(c => c.id)
        .filter(id => id !== 'all' && id !== 'jewellery');
      
      const scrollPosition = window.scrollY + 242; // offset of header + search bar + category bar + buffer
      let activeSection = '';

      for (const secId of sections) {
        const el = document.getElementById(secId);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            activeSection = secId;
            break;
          }
        }
      }

      if (activeSection) {
        setActiveCategorySidebar(activeSection);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount/load
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [loading, products, activeProduct, searchQuery, collections]);



  // Sync nav bar highlight with active collection filter selection
  useEffect(() => {
    if (selectedCollection) {
      setActiveCategorySidebar(selectedCollection);
    } else {
      setActiveCategorySidebar('');
    }
  }, [selectedCollection]);

  const handleCategorySidebarClick = (catId) => {
    setActiveCategorySidebar(catId);
    setSelectedCollection(catId);
    
    setTimeout(() => {
      const element = document.querySelector('.blinkit-feed');
      if (element) {
        const yOffset = -232;
        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  // Static options matching our seed data
  const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
  
  const activeFilterCount = [
    selectedCollection,
    selectedSize,
    selectedColor
  ].filter(Boolean).length;

  const getSuggestions = () => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase().trim();
    return allProducts
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 5);
  };
  const colors = [
    'Champagne Pink',
    'Deep Plum',
    'Blush Cream',
    'Midnight Plum',
    '#000000 #000000',
    'Warm Ivory',
    'Rose Mauve',
    'Rose Pink',
    'Mulberry',
    'Rose Pink Foil',
    'Dusty Mauve',
  ];

  // Helper to render filter controls (shared between desktop sidebar and mobile bottom sheet)
  const renderFilters = (isMobile = false) => (
    <>
      {!isMobile && (
        <div style={filterGroupStyle}>
          <h4 style={filterTitleStyle}>Search</h4>
          <input
            type="text"
            placeholder="Search creations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={searchFieldStyle}
          />
        </div>
      )}

      <div style={filterGroupStyle}>
        <h4 style={filterTitleStyle}>Collections</h4>
        <select
          value={selectedCollection}
          onChange={(e) => setSelectedCollection(e.target.value)}
          style={selectFieldStyle}
        >
          {collections
            .filter((c) => c.parent_slug !== 'new-collection' && String(c.parent_id) !== '3' && c.slug !== 'muslin' && c.slug !== 'cotton' && c.slug !== 'cotton-linen')
            .map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          {jewelleryEnabled !== false && (
            <>
              <option disabled>-- Jewellery Types --</option>
              <option value="rings">Rings</option>
              <option value="necklaces">Necklaces</option>
              <option value="bracelets">Bracelets</option>
            </>
          )}
        </select>
      </div>

      <div style={filterGroupStyle}>
        <h4 style={filterTitleStyle}>Size</h4>
        <div style={gridSelectStyle}>
          {sizes.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSize(selectedSize === s ? '' : s)}
              style={selectedSize === s ? activeGridItemStyle : gridItemStyle}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={filterGroupStyle}>
        <h4 style={filterTitleStyle}>Sort By</h4>
        <select
          value={selectedSort}
          onChange={(e) => setSelectedSort(e.target.value)}
          style={selectFieldStyle}
        >
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Alphabetical</option>
        </select>
      </div>

      <button 
        onClick={() => {
          handleClearFilters();
          setIsMobileFilterOpen(false);
        }} 
        style={clearBtnStyle}
      >
        Reset All Filters
      </button>
    </>
  );

  // Fetch collections
  useEffect(() => {
    const fetchCols = async () => {
      try {
        const res = await fetch('/api/collections');
        if (res.ok) {
          const data = await res.json();
          setCollections(data.collections || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCols();
  }, []);

  // Fetch products once on mount to cache in memory
  useEffect(() => {
    const fetchAllProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/products', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
        if (res.ok) {
          const data = await res.json();
          let list = data.products || [];
          if (jewelleryEnabled === false) {
            list = list.filter((product) => !isJewelleryProduct(product));
          }
          setAllProducts(list);
          setProducts(list);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllProducts();
  }, [jewelleryEnabled]);

  // Filter in memory or fetch from API when selections change
  useEffect(() => {
    const filterAndFetch = async () => {
      if (searchQuery.trim().length > 0) {
        setLoading(true);
        try {
          const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery.trim())}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
          if (res.ok) {
            const data = await res.json();
            let list = data.products || [];
            if (jewelleryEnabled === false) {
              list = list.filter((product) => !isJewelleryProduct(product));
            }
            list.sort((a, b) => compareCatalogProducts(a, b, 'name_asc'));
            setProducts(list);
      } else {
        let filtered = [...allProducts];

        if (jewelleryEnabled === false) {
          filtered = filtered.filter((product) => !isJewelleryProduct(product));
        }

        // Filter mode: apply collection, size, and color filters
        if (selectedCollection) {
          filtered = filtered.filter((product) =>
            productMatchesCategory(product, selectedCollection)
          );
        }

        if (selectedSize) {
          filtered = filtered.filter(p => 
            p.variants && p.variants.some(v => v.size === selectedSize && v.stock > 0)
          );
        }

        if (selectedColor) {
          filtered = filtered.filter(p => 
            p.variants && p.variants.some(v => v.color === selectedColor && v.stock > 0)
          );
        }

        filtered.sort((a, b) => compareCatalogProducts(a, b, selectedSort));

        setProducts(filtered);
      }
    };

    filterAndFetch();

    // URL sync has been removed to prevent Next.js App Router Suspense bugs 
    // where modifying history manually causes a remount on the next state change (like closing a bottom sheet).
  }, [selectedCollection, searchQuery, selectedSize, selectedColor, selectedSort, allProducts, jewelleryEnabled]);

  const handleClearFilters = () => {
    setSelectedCollection('');
    setSelectedSize('');
    setSelectedColor('');
    setSelectedSort('name_asc');
  };

  const getCollectionTitle = () =>
    getCategoryTitle(collections, selectedCollection);

  // Group products for "All Collections" and "Jewellery" views
  const groupedProducts = {};
  const shouldGroup = !searchQuery && (!selectedCollection || selectedCollection === 'jewellery');

  if (shouldGroup && products.length > 0) {
    const sidebarCats = getSidebarCategories().filter(cat => cat.id !== 'all' && cat.id !== 'jewellery');
    sidebarCats.forEach(cat => {
      const matchedItems = products.filter(p => productMatchesCategory(p, cat.id));
      matchedItems.sort((a, b) => compareCatalogProducts(a, b, selectedSort));
      groupedProducts[cat.name] = matchedItems;
    });
  }

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
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCategoryIcon = (catId) => {
    const strokeColor = '#B8860B'; // Gold accent color
    
    switch (catId) {
      case 'heavy-dresses':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.38 3.46L16 2a4 4 0 00-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10a2 2 0 002 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
          </svg>
        );
      case 'indo-western':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L4 7v13a2 2 0 002 2h12a2 2 0 002-2V7l-8-5z" />
            <path d="M12 22V7" />
            <path d="M12 7l4 3" />
            <path d="M12 7l-4 3" />
          </svg>
        );
      case 'shararas':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3h12l1 7H5l1-7z" />
            <path d="M5 10l-3 11h9L9 10" />
            <path d="M19 10l3 11h-9l2-11" />
          </svg>
        );
      case 'gowns':
      case 'heavy-gown':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 00-3 3h6a3 3 0 00-3-3z" />
            <path d="M9 5l-4 5h14l-4-5" />
            <path d="M5 10l-2 12h18l-2-12" />
          </svg>
        );
      case 'suits':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 00-3 3h6a3 3 0 00-3-3z" />
            <path d="M2 19V9a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2z" />
            <line x1="12" y1="5" x2="12" y2="21" />
            <path d="M6 9l6 4 6-4" />
          </svg>
        );
      case 'jewellery':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 22 8.5 12 22 2 8.5" />
            <polygon points="12 2 17 8.5 12 15 7 8.5" />
          </svg>
        );
      case 'rings':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="14" r="6" />
            <polygon points="12 2 7 7 17 7" />
          </svg>
        );
      case 'necklaces':
      case 'necklace':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a8 8 0 00-8 8c0 4.4 3.6 8 8 8s8-3.6 8-8a8 8 0 00-8-8z" />
            <circle cx="12" cy="18" r="1.5" fill={strokeColor} />
          </svg>
        );
      case 'bracelets':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="10" width="5" height="4" rx="1.5" />
            <rect x="8" y="10" width="5" height="4" rx="1.5" />
            <rect x="13" y="10" width="5" height="4" rx="1.5" />
          </svg>
        );
      case 'earrings':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="6" r="1.5" />
            <circle cx="17" cy="6" r="1.5" />
            <path d="M7 7.5v5.5m10-5.5v5.5" />
            <polygon points="7 13 5 17 9 17" />
            <polygon points="17 13 15 17 19 17" />
          </svg>
        );
      case 'co-ords':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="16" height="6" rx="2" />
            <rect x="4" y="14" width="7" height="6" rx="2" />
            <rect x="13" y="14" width="7" height="6" rx="2" />
          </svg>
        );
      case 'new-collection':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      case 'flash-sale':
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        );
      default:
        return (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.38 3.46L16 2a4 4 0 00-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10a2 2 0 002 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" />
          </svg>
        );
    }
  };

  const getSidebarCategories = () => {
    const list = [
      { id: 'new-collection', name: 'Fresh Collection', targetId: 'new-collection' },
      { id: 'flash-sale', name: 'Flash Sale', targetId: 'flash-sale' },
      { id: 'suits', name: 'Unstitched Suits', targetId: 'suits' },
      { id: 'indo-western', name: 'Indo-Western', targetId: 'indo-western' },
      { id: 'shararas', name: 'Drape Sarees', targetId: 'shararas' },
      { id: 'gowns', name: 'Heavy Gowns', targetId: 'gowns' },
      { id: 'co-ords', name: 'Co-ords', targetId: 'co-ords' },
    ];
    if (jewelleryEnabled !== false) {
      list.push(
        { id: 'earrings', name: 'Earrings', targetId: 'earrings' },
        { id: 'rings', name: 'Rings', targetId: 'rings' },
        { id: 'necklaces', name: 'Necklace', targetId: 'necklaces' },
        { id: 'bracelets', name: 'Bracelet', targetId: 'bracelets' }
      );
    }
    return list;
  };

  const renderProductCard = (p, index = 0) => {
    const isHeavyDress = 
      productMatchesCategory(p, 'indo-western') || 
      productMatchesCategory(p, 'gowns') || 
      productMatchesCategory(p, 'shararas');

    const outOfStock = p.is_out_of_stock;

    if (isHeavyDress) {
      const regPrice = parseFloat(p.price) || 0;
      const salePrice = p.flash_sale && p.flash_sale_price ? parseFloat(p.flash_sale_price) : (p.on_sale && p.sale_price ? parseFloat(p.sale_price) : regPrice);
      const isOnSale = regPrice > salePrice;
      const discountPct = regPrice > 0 ? Math.max(1, Math.round(((regPrice - salePrice) / regPrice) * 100)) : 20;
      const isWishlisted = wishlist.includes(p.id);

      return (
        <div key={p.id} className="new-arrival-card" style={{ opacity: outOfStock ? 0.8 : 1, transition: 'opacity 0.3s ease' }}>
          {/* Product Image Container */}
          <div className="new-arrival-img-container">
            <div onClick={(e) => handleProductClick(e, p)} style={{ cursor: 'pointer', width: '100%', height: '100%' }}>
              <ImageWithSkeleton 
                src={p.images?.[0] || '/icon.png'} 
                alt={p.name} 
                eager={index < 2}
                className="new-arrival-img-style" 
                style={{ filter: outOfStock ? 'grayscale(100%) opacity(50%)' : 'none' }}
              />
            </div>
            
            {/* Discount Badge on Top Left */}
            {isOnSale && (
              <div style={flashSaleBadgeStyle} className="flash-sale-badge">
                -{discountPct}%
              </div>
            )}

            {/* Wishlist Heart on Top Right */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleWishlist(p.id);
              }}
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

            {outOfStock && (
              <div style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                backgroundColor: 'rgba(51, 51, 51, 0.85)',
                color: '#FFFFFF',
                padding: '4px 10px',
                borderRadius: '2px',
                fontSize: '0.65rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 10
              }}>
                Out of Stock
              </div>
            )}
          </div>

          {/* Product Content */}
          <div className="new-arrival-card-content">
            <div onClick={(e) => handleProductClick(e, p)} style={{ cursor: 'pointer', color: 'inherit' }}>
              <h3 className="new-arrival-product-name">{p.name}</h3>
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
    }

    const rating = (4.0 + ((p.id * 13) % 10) / 10).toFixed(1);
    const reviews = (p.id * 37) % 950 + 50; 
    
    // Check if product has custom size/color options
    const hasVariants = p.variants && p.variants.length > 1;
    
    const defaultVariant = p.variants && p.variants[0]
      ? p.variants[0]
      : { size: 'One Size', color: 'Default', stock: 10 };
    const cartItem = cart && cart.find(
      item => item.id === p.id && 
              item.size === (defaultVariant.size || 'One Size') && 
              item.color === (defaultVariant.color || 'Default')
    );
    const currentQty = cartItem ? cartItem.quantity : 0;
    
    // Total quantity of all variants of this product currently in cart
    const totalQtyInCart = cart ? cart.filter(item => item.id === p.id).reduce((sum, item) => sum + item.quantity, 0) : 0;

    return (
      <div 
        key={p.id} 
        style={{
          ...cardContainerStyle,
          opacity: outOfStock ? 0.8 : 1,
          transition: 'opacity 0.3s ease'
        }} 
        className="collections-product-card"
      >
        <div onClick={(e) => handleProductClick(e, p)} style={{ display: 'block', cursor: 'pointer' }}>
          <div style={cardImageWrapperStyle} className="collections-product-image-wrapper">
            <ImageWithSkeleton 
              src={p.images && p.images[0] ? p.images[0] : '/placeholder.jpg'} 
              alt={p.name} 
              eager={index < 2}
              style={{ 
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: outOfStock ? 'grayscale(100%) opacity(50%)' : 'none',
                transition: 'filter 0.3s ease, background-color 0.4s ease, opacity 0.4s ease'
              }}
            />
            {p.flash_sale && p.flash_sale_price && (
              <div style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                backgroundColor: '#B97285',
                color: '#FFFFFF',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.65rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 10
              }}>
                -{Math.round(((parseFloat(p.price) - parseFloat(p.flash_sale_price)) / parseFloat(p.price)) * 100)}%
              </div>
            )}
            {outOfStock && (
              <div style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                backgroundColor: 'rgba(51, 51, 51, 0.85)',
                color: '#FFFFFF',
                padding: '4px 10px',
                borderRadius: '2px',
                fontSize: '0.65rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 10
              }}>
                Out of Stock
              </div>
            )}
            {/* Wishlist Heart on Top Right */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                toggleWishlist(p.id);
              }}
              style={{
                position: 'absolute',
                top: '2px',
                right: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                zIndex: 11
              }}
              className="card-wishlist-btn"
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill={wishlist.includes(p.id) ? '#B97285' : 'none'} 
                stroke={wishlist.includes(p.id) ? '#B97285' : '#000000'} 
                strokeWidth="2.0" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
        </div>
        <div style={cardContentStyle} className="collections-product-card-content">
          <div onClick={(e) => handleProductClick(e, p)} style={{ cursor: 'pointer', color: '#B97285' }}>
            <h3 style={cardTitleStyle}>{p.name}</h3>
          </div>


          {p.flash_sale && p.flash_sale_price ? (
            <p style={cardPriceStyle}>
              <span style={{ color: '#B97285', marginRight: '0.5rem' }}>
                ₹{parseFloat(p.flash_sale_price).toLocaleString('en-IN')}
              </span>
              <span style={{ color: 'rgba(0, 0, 0, 0.4)', textDecoration: 'line-through' }}>
                ₹{parseFloat(p.price).toLocaleString('en-IN')}
              </span>
            </p>
          ) : (
            <p style={cardPriceStyle}>₹{parseFloat(p.price).toLocaleString('en-IN')}</p>
          )}

          <div style={{ height: '44px', display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
            {user && user.role === 'admin' ? (
              <Link
                href={`/admin/products?edit=${p.slug}`}
                style={adminPreviewBadgeLinkStyle}
                onClick={(e) => e.stopPropagation()}
              >
                Admin Preview: Edit
              </Link>
            ) : currentQty > 0 ? (
              /* Items already added to cart */
              <div className="blinkit-count-controller" style={{ width: '100%', borderRadius: '6px' }} onClick={(e) => e.stopPropagation()}>
                <button 
                  className="blinkit-count-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    updateCartQuantity(p.id, defaultVariant.size || 'One Size', defaultVariant.color || 'Default', currentQty - 1);
                  }}
                >
                  -
                </button>
                <span className="blinkit-count-val">{currentQty}</span>
                <button 
                  className="blinkit-count-btn"
                  disabled={currentQty >= (defaultVariant.stock || 10)}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const maxStock = defaultVariant.stock || 10;
                    if (currentQty >= maxStock) return;
                    updateCartQuantity(p.id, defaultVariant.size || 'One Size', defaultVariant.color || 'Default', currentQty + 1);
                  }}
                >
                  +
                </button>
              </div>
            ) : (
              /* Add item directly to cart */
              <button 
                className="blinkit-add-btn"
                disabled={outOfStock}
                style={{ width: '100%', borderRadius: '6px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (outOfStock) return;
                  addToCart(p, defaultVariant.size || 'One Size', defaultVariant.color || 'Default');
                }}
              >
                {outOfStock ? 'Sold Out' : 'ADD'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const activeCartItem = activeProduct && cart && cart.find(
    item => Number(item.id) === Number(activeProduct.id) && 
            (item.size || '') === (activeProductSize || '') && 
            (item.color || '') === (activeProductColor || '')
  );
  const currentQtyInCart = activeCartItem ? activeCartItem.quantity : 0;

  const siblingProducts = activeProduct
    ? products.filter(sib => sib.collection_id === activeProduct.collection_id && sib.id !== activeProduct.id)
    : [];

  const switcherProducts = activeProduct
    ? (activeProduct.flash_sale
        ? allProducts.filter(sib => sib.flash_sale)
        : products.filter(sib => sib.collection_id === activeProduct.collection_id))
    : [];

  const activeMatchingVar = activeProduct && activeProduct.variants && activeProduct.variants.find(
    v => (v.size || '') === (activeProductSize || '') && (v.color || '') === (activeProductColor || '')
  );
  const maxStock = activeMatchingVar ? activeMatchingVar.stock : 10;
  const isPlusDisabled = currentQtyInCart > 0 ? (currentQtyInCart >= maxStock) : (activeProductQty >= maxStock);

  // Initialize viewport width
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setViewportWidth(window.innerWidth);
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  return (
    <div style={pageStyle} className="collections-root-container">
      {/* Mobile bottom sheet backdrop */}
      {activeProduct && (
        <div 
          className="mobile-bottom-sheet-backdrop" 
          onClick={() => setActiveProduct(null)}
        >
          <div className="mobile-bottom-sheet-backdrop-inner" />
        </div>
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
                Back to Collections
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
                  /* Standard Selector & Add to Cart button when not in cart */
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
                        setActiveProductQty(1); // Reset counter selector to 1 after adding to cart
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

          {/* Sibling switcher row of 56px circular buttons (Outside the card!) */}
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
                  {switcherProducts.map((sib, idx) => {
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



      {/* Catalog Grid container (desktop: hidden when activeProduct is set, mobile: always rendered and visible underneath modal) */}
      <div className="catalog-grid-container-box" style={{ display: activeProduct ? 'none' : 'block' }}>
          {/* Filters Sidebar (Desktop only, hidden on mobile) */}
          <aside style={{ ...sidebarStyle, display: isDesktopFilterOpen ? 'flex' : 'none' }} className="collections-sidebar-desktop">
            {renderFilters(false)}
          </aside>

          <MobileSearchBar 
            allProducts={allProducts} 
            initialQuery={searchQuery}
            onSearch={(val) => {
              setSearchQuery(val);
            }} 
            handleProductClick={handleProductClick} 
          />

          {/* Blinkit Mobile Category Sidebar (Mobile only, hidden on desktop) */}
          <aside className="blinkit-sidebar">
            <div 
              className="blinkit-sidebar-item blinkit-sidebar-filter-btn"
              onClick={() => setIsMobileFilterOpen(true)}
            >
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <div className="blinkit-sidebar-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B8860B" strokeWidth="2.5">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                </div>
                {activeFilterCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: '#D98E9B',
                    color: '#FFFFFF',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    fontSize: '9px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #FFFFFF',
                    zIndex: 10
                  }}>
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <span>Filter</span>
            </div>

            {getSidebarCategories().map(cat => (
              <div 
                key={cat.id} 
                className={`blinkit-sidebar-item ${(!searchQuery && activeCategorySidebar === cat.id) ? 'active' : ''}`}
                onClick={() => handleCategorySidebarClick(cat.id)}
              >
                <div className="blinkit-sidebar-icon">
                  {renderCategoryIcon(cat.id)}
                </div>
                <span>{cat.name}</span>
              </div>
            ))}
          </aside>

          {/* Products Grid / Product Feed */}
          <main style={mainGridStyle} className="blinkit-feed">
            {/* Page Header (Desktop only) */}
            <section className="blinkit-feed-main-header" style={{ textAlign: 'center', marginBottom: '1.5rem', paddingTop: '1rem' }}>
              <h1 style={titleStyle}>{getCollectionTitle()}</h1>
              <div style={dividerStyle}></div>
              <button 
                onClick={() => setIsDesktopFilterOpen(!isDesktopFilterOpen)}
                style={desktopFilterBtnStyle}
                className="desktop-filter-toggle-btn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '8px' }}>
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
                {isDesktopFilterOpen ? 'Hide Filters' : 'Show Filters'}
              </button>
            </section>

            {loading && products.length === 0 ? (
              <div className={(selectedCollection === 'indo-western' || selectedCollection === 'gowns' || selectedCollection === 'shararas') ? "new-arrivals-grid" : "grid-cols-shop"}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard 
                    key={i} 
                    type={(selectedCollection === 'indo-western' || selectedCollection === 'gowns' || selectedCollection === 'shararas') ? "home-new-arrival" : "collection"} 
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div style={emptyStateStyle}>
                <p>{searchQuery ? 'No matching creations found.' : 'No creations match your active filters.'}</p>
                <button onClick={handleClearFilters} style={resetBtnStyle}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <div 
                style={{ 
                  opacity: loading ? 0.6 : 1, 
                  transition: 'opacity 0.2s ease',
                  pointerEvents: loading ? 'none' : 'auto' 
                }}
              >
                {shouldGroup ? (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {getSidebarCategories()
                      .filter(cat => cat.id !== 'all' && cat.id !== 'jewellery')
                      .map(cat => {
                        const group = cat.name;
                        const items = groupedProducts[group] || [];
                        const isHeavy = cat.id === 'indo-western' || cat.id === 'gowns' || cat.id === 'shararas';
                        return (
                          <div key={cat.id} id={cat.id} className="blinkit-feed-section">
                            <h2 className="blinkit-feed-section-title" id={cat.id}>
                              {group}
                            </h2>
                            {items.length > 0 ? (
                              <div className={isHeavy ? "new-arrivals-grid" : "grid-cols-shop"}>
                                {items.map((p, index) => renderProductCard(p, index))}
                              </div>
                            ) : (
                              <div style={{
                                padding: '2.5rem 1.5rem',
                                textAlign: 'center',
                                backgroundColor: '#F6DDE2',
                                borderRadius: '8px',
                                color: 'rgba(0,0,0,0.5)',
                                fontSize: '0.9rem',
                                border: '1px dashed rgba(139, 119, 137, 0.15)'
                              }}>
                                No creations currently available in this vault.
                              </div>
                            )}
                          </div>
                        );
                      })
                    }
                  </div>
                ) : (
                  <div className="blinkit-feed-section" id={selectedCollection}>
                    {!searchQuery && (
                      <h2 className="blinkit-feed-section-title">
                        {getCollectionTitle()}
                      </h2>
                    )}
                    <div className={(selectedCollection === 'indo-western' || selectedCollection === 'gowns' || selectedCollection === 'shararas') ? "new-arrivals-grid" : "grid-cols-shop"}>
                      {products.map((p, index) => renderProductCard(p, index))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
      </div>



      {/* Sliding Bottom Sheet Filter Panel for Mobile */}
      <div className={`mobile-filter-backdrop ${isMobileFilterOpen ? 'open' : ''}`} onClick={() => setIsMobileFilterOpen(false)}>
        <div className="mobile-filter-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="mobile-filter-drawer-header">
            <button className="mobile-filter-drawer-close-btn" onClick={() => setIsMobileFilterOpen(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <h3 className="mobile-filter-drawer-title">Filters & Sort</h3>
          </div>
          
          <div className="mobile-filter-drawer-content" style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingTop: '0.8rem' }}>
            {renderFilters(true)}
          </div>

          <div className="mobile-filter-drawer-footer" style={{ marginTop: '0.8rem', flexShrink: 0 }}>
            <button 
              onClick={() => setIsMobileFilterOpen(false)}
              style={{
                backgroundColor: '#D98E9B',
                color: '#000000',
                padding: '0.8rem',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.8rem',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'center'
              }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Collections() {
  return (
    <Suspense fallback={<div>Loading Collections...</div>}>
      <CollectionsContent />
    </Suspense>
  );
}

// Inline styles for Collections Browse Page
const pageStyle = {
  paddingBottom: '5rem',
  backgroundColor: '#FFFFFF',
};

const headerSectionStyle = {
  textAlign: 'center',
  padding: '4rem 1rem 2rem 1rem',
};

const subHeaderStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  color: '#000000',
  fontWeight: '600',
  display: 'block',
  marginBottom: '0.5rem',
};

const titleStyle = {
  fontSize: '2.5rem',
  fontFamily: 'var(--font-serif)',
  color: '#D98E9B',
  fontWeight: '400',
};

const dividerStyle = {
  width: '60px',
  height: '1px',
  backgroundColor: '#D98E9B',
  margin: '1.2rem auto 0 auto',
};

const sidebarStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.2rem',
  backgroundColor: '#F6DDE2', // Blush Cream background for sidebar
  padding: '1.5rem',
  borderRadius: '8px',
  height: 'fit-content',
  border: '1px solid rgba(139, 119, 137, 0.15)',
  position: 'sticky',
  top: '115px',
};

const filterGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
};

const filterTitleStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#000000',
  fontWeight: '800',
};

const searchFieldStyle = {
  padding: '0.6rem 0.8rem',
  border: '1px solid rgba(139, 119, 137, 0.25)',
  fontSize: '0.85rem',
};

const selectFieldStyle = {
  padding: '0.6rem 0.8rem',
  border: '1px solid rgba(139, 119, 137, 0.25)',
  fontSize: '0.85rem',
};

const gridSelectStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '0.4rem',
};

const gridItemStyle = {
  padding: '0.5rem 0.2rem',
  border: '1px solid rgba(139, 119, 137, 0.2)',
  fontSize: '0.75rem',
  textAlign: 'center',
  backgroundColor: '#FFFFFF',
  color: '#000000',
  borderRadius: '2px',
};

const activeGridItemStyle = {
  ...gridItemStyle,
  backgroundColor: '#F6DDE2', // Heather Mauve
  color: '#000000',
  bordercolor: '#000000',
};

const clearBtnStyle = {
  backgroundColor: 'transparent',
  border: '1px solid #000000',
  color: '#000000',
  padding: '0.6rem',
  fontSize: '0.8rem',
  fontWeight: '600',
  borderRadius: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const mainGridStyle = {
  flex: 1,
};

const loadingStateStyle = {
  textAlign: 'center',
  padding: '8rem 0',
  color: '#000000',
  fontSize: '1.1rem',
  fontFamily: 'var(--font-serif)',
};

const emptyStateStyle = {
  textAlign: 'center',
  padding: '6rem 2rem',
  color: '#000000',
};

const resetBtnStyle = {
  marginTop: '1rem',
  backgroundColor: '#D98E9B',
  color: '#000000',
  padding: '0.6rem 1.5rem',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: '600',
};

const desktopFilterBtnStyle = {
  backgroundColor: '#D98E9B',
  color: '#FFFFFF',
  border: 'none',
  padding: '0.6rem 1.2rem',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: '600',
  display: 'inline-flex',
  alignItems: 'center',
  margin: '1rem auto 0 auto',
  transition: 'background-color 0.3s ease',
  fontFamily: 'inherit',
  fontSize: '0.85rem',
};

// Card Styles
const cardContainerStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '6px',
  overflow: 'hidden',
  boxShadow: 'var(--shadow-sm)',
  transition: 'var(--transition)',
  border: '1px solid rgba(139, 119, 137, 0.05)',
  position: 'relative',
  ':hover': {
    boxShadow: 'var(--shadow-md)',
  },
};

const cardLinkStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
};

const cardImageWrapperStyle = {
  position: 'relative',
  width: '100%',
  height: '320px',
  overflow: 'hidden',
  backgroundColor: '#FFFFFF',
};

const cardImgStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const pinkBadgeStyle = {
  position: 'absolute',
  top: '0.75rem',
  right: '0.75rem',
  backgroundColor: '#D98E9B',
  color: '#000000',
  padding: '0.25rem 0.6rem',
  borderRadius: '999px',
  fontSize: '0.6rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  border: '1px solid #D98E9B',
};

const outOfStockOverlayStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundColor: 'rgba(60, 48, 58, 0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const outOfStockTextStyle = {
  backgroundColor: '#FFFFFF',
  color: '#000000',
  padding: '0.4rem 1rem',
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  fontWeight: '600',
  borderRadius: '2px',
};

const cardContentStyle = {
  padding: '1.2rem',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  flexGrow: 1,
  gap: '0.3rem',
};

const collectionLabelStyle = {
  fontSize: '0.68rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: '#000000',
  fontWeight: '600',
};

const cardTitleStyle = {
  fontSize: '1.1rem',
  fontFamily: 'var(--font-serif)',
  color: '#B97285',
  fontWeight: '600',
};

const cardPriceStyle = {
  fontSize: '0.9rem',
  color: '#000000',
  fontWeight: '600',
  minHeight: '24px',
  display: 'flex',
  alignItems: 'center',
};

const cardCartBtnStyle = {
  backgroundColor: '#F6DDE2', // Blush Cream background
  color: '#000000',
  padding: '0.6rem 0',
  borderRadius: '4px',
  border: '1px solid rgba(139, 119, 137, 0.15)',
  width: '100%',
  fontSize: '0.8rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
  marginTop: '0.8rem',
  transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
  boxShadow: 'var(--shadow-sm)',
};

const adminPreviewBadgeStyle = {
  ...cardCartBtnStyle,
  backgroundColor: 'transparent',
  border: '1px solid #000000',
  color: '#000000',
  cursor: 'default',
  textAlign: 'center',
  boxShadow: 'none',
};

const adminPreviewBadgeLinkStyle = {
  ...adminPreviewBadgeStyle,
  display: 'block',
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
};

const qtyControllerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: '#D98E9B', // Brand Plum/Pink
  color: '#FFFFFF',
  borderRadius: '4px',
  border: '1px solid #D98E9B',
  width: '100%',
  marginTop: '0.8rem',
  overflow: 'hidden',
  height: '38px',
  boxSizing: 'border-box',
  boxShadow: 'var(--shadow-sm)',
};

const qtyControllerBtnStyle = {
  width: '40px',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.2rem',
  fontWeight: '600',
  color: '#FFFFFF',
  backgroundColor: 'transparent',
  cursor: 'pointer',
};

const qtyControllerValueStyle = {
  fontSize: '0.85rem',
  fontWeight: '700',
  flex: 1,
  textAlign: 'center',
};

// Styles for active product detailed view
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

const wishlistBtnStyle = {
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '0.5rem',
  color: '#000000',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const detailGalleryStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
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

const detailThumbRowStyle = {
  display: 'flex',
  gap: '0.8rem',
  overflowX: 'auto',
  paddingBottom: '0.4rem',
};

const detailThumbStyle = {
  width: '70px',
  height: '70px',
  borderRadius: '4px',
  overflow: 'hidden',
  border: '1px solid rgba(139, 119, 137, 0.15)',
  padding: 0,
  cursor: 'pointer',
  backgroundColor: '#FFFFFF',
};

const activeDetailThumbStyle = {
  ...detailThumbStyle,
  borderColor: '#D98E9B',
  borderWidth: '2px',
};

const detailThumbImgStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
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

const ratingRowStyle = {
  display: 'flex',
  alignItems: 'center',
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

const detailColorsRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.6rem',
};

const colorOptStyle = {
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

const activeColorOptStyle = {
  ...colorOptStyle,
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

const detailExploreSectionStyle = {
  borderTop: '1px solid rgba(139, 119, 137, 0.15)',
  paddingTop: '2.5rem',
  marginTop: '2rem',
};

const detailExploreTitleStyle = {
  fontSize: '1.3rem',
  fontFamily: 'var(--font-serif)',
  marginBottom: '1.5rem',
  color: '#000000',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
};

const detailExploreCarouselStyle = {
  display: 'flex',
  gap: '2rem',
  overflowX: 'auto',
  paddingBottom: '1rem',
};

const detailExploreItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  cursor: 'pointer',
  flexShrink: 0,
  width: '100px',
  transition: 'transform 0.2s ease',
};

const detailExploreImgStyle = {
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  objectFit: 'cover',
  border: '2px solid rgba(139, 119, 137, 0.15)',
  marginBottom: '0.6rem',
  transition: 'border-color 0.2s ease',
};

const detailExploreNameStyle = {
  fontSize: '0.75rem',
  fontWeight: '600',
  color: 'rgba(0,0,0,0.8)',
  textAlign: 'center',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  width: '100%',
};

// Mobile Sticky Buy Bar Styles
const mobileStickyBarWrapperStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  position: 'fixed',
  bottom: 0,
  left: 0,
  width: '100%',
  backgroundColor: '#FFFFFF',
  borderTop: '1px solid rgba(139, 119, 137, 0.15)',
  padding: '0.8rem 1.2rem',
  boxSizing: 'border-box',
  zIndex: 150,
  boxShadow: '0 -4px 15px rgba(0,0,0,0.06)',
};

const mobileStickyPriceInfoStyle = {
  display: 'flex',
  flexDirection: 'column',
};

const mobileStickyNameStyle = {
  fontSize: '0.75rem',
  fontWeight: '700',
  color: 'rgba(0,0,0,0.5)',
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
};

const mobileStickyPriceStyle = {
  fontSize: '1.2rem',
  fontWeight: '700',
  color: '#000000',
};

const mobileStickyBtnStyle = {
  backgroundColor: '#D98E9B',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '4px',
  padding: '0.6rem 1.4rem',
  fontSize: '0.8rem',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  cursor: 'pointer',
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
