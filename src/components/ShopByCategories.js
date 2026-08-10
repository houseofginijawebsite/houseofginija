'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { productMatchesCategory } from '@/lib/catalogClient';
import { useStore } from '@/context/StoreContext';

const ALL_CATEGORY_ITEMS = [
  { 
    id: 'discounted_suits',
    name: 'Discounted Unstitched Suits', 
    slug: 'discounted-suits', 
    defaultImage: 'https://res.cloudinary.com/cyygtyfb/image/upload/v1786258820/houseofginija/images/categories/unstitched.png', 
    href: '/collections?collection=suits&flash_sale=true',
    isDiscounted: true,
  },
  { 
    id: 'discounted_heavy',
    name: 'Discounted Heavy Dresses', 
    slug: 'discounted-heavy', 
    defaultImage: 'https://res.cloudinary.com/cyygtyfb/image/upload/v1786258814/houseofginija/images/categories/heavy-dresses.png', 
    href: '/collections?collection=gowns&flash_sale=true',
    isDiscounted: true,
  },
  { 
    id: 'suits',
    name: 'Unstitched Suits', 
    slug: 'suits', 
    defaultImage: 'https://res.cloudinary.com/cyygtyfb/image/upload/v1786258820/houseofginija/images/categories/unstitched.png', 
    href: '/collections?collection=suits' 
  },
  { 
    id: 'indo-western',
    name: 'Indo Western', 
    slug: 'indo-western', 
    defaultImage: 'https://res.cloudinary.com/cyygtyfb/image/upload/v1786258816/houseofginija/images/categories/indo-western.png', 
    href: '/collections?collection=indo-western' 
  },
  { 
    id: 'gowns',
    name: 'Heavy Gowns', 
    slug: 'gowns', 
    defaultImage: 'https://res.cloudinary.com/cyygtyfb/image/upload/v1786258877/houseofginija/local-products/037-champagne-drape-saree-1.jpg', 
    href: '/collections?collection=gowns' 
  },
  { 
    id: 'shararas',
    name: 'Drape Sarees', 
    slug: 'shararas', 
    defaultImage: 'https://res.cloudinary.com/cyygtyfb/image/upload/v1786258814/houseofginija/images/categories/heavy-dresses.png', 
    href: '/collections?collection=shararas' 
  },
];

export default function ShopByCategories({ initialCategoryCounts }) {
  const { jewelleryEnabled } = useStore();
  const trackRef = useRef(null);
  const [categoryImages, setCategoryImages] = useState({});
  const [counts, setCounts] = useState(initialCategoryCounts || null);

  useEffect(() => {
    fetch('/api/homepage?t=' + Date.now(), { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          if (data.categoryCounts) {
            setCounts(data.categoryCounts);
          }

          // Generate dynamic random product images for categories
          const flash = data.flashProducts || [];
          const heavy = data.heavyDresses || {};
          const imgs = {};

          const suitsDiscounted = flash.filter((p) => p.collection_slug === 'suits' || p.collection_slug === 'unstitched');
          if (suitsDiscounted.length > 0) {
            imgs['discounted-suits'] = suitsDiscounted[0].images?.[0] || suitsDiscounted[0].image_url;
          }

          const heavyDiscounted = flash.filter((p) => ['indo-western', 'gowns', 'heavy-gown', 'shararas'].includes(p.collection_slug));
          if (heavyDiscounted.length > 0) {
            imgs['discounted-heavy'] = heavyDiscounted[0].images?.[0] || heavyDiscounted[0].image_url;
          }

          if (heavy.indoWestern?.[0]) imgs['indo-western'] = heavy.indoWestern[0].images?.[0] || heavy.indoWestern[0].image_url;
          if (heavy.heavyGown?.[0]) imgs['gowns'] = heavy.heavyGown[0].images?.[0] || heavy.heavyGown[0].image_url;
          if (heavy.shararas?.[0]) imgs['shararas'] = heavy.shararas[0].images?.[0] || heavy.shararas[0].image_url;

          setCategoryImages(imgs);
        }
      })
      .catch((err) => console.error('ShopByCategories fetch homepage data error:', err));
  }, []);

  // Filter categories based on zero product counts for discounted items and jewelleryEnabled setting
  const activeCategories = ALL_CATEGORY_ITEMS.filter((item) => {
    if (jewelleryEnabled === false && (item.id === 'jewellery' || item.slug === 'jewellery' || item.slug === 'rings' || item.slug === 'necklaces' || item.slug === 'bracelets' || item.slug === 'earrings')) return false;
    if (!counts) return true; // Show by default until counts load
    if (item.id === 'discounted_suits' && counts.discounted_suits === 0) return false;
    if (item.id === 'discounted_heavy' && counts.discounted_heavy === 0) return false;
    return true;
  }).map((cat) => ({
    ...cat,
    image: categoryImages[cat.slug] || cat.defaultImage || '/placeholder.png',
  }));

  const move = (direction) => {
    trackRef.current?.scrollBy({
      left: direction * trackRef.current.clientWidth,
      behavior: 'smooth',
    });
  };

  return (
    <section className="shop-categories" aria-labelledby="shop-categories-title">
      <div className="container">
        <div className="shop-categories__header">
          <p className="shop-categories__eyebrow">Curated for every occasion</p>
          <h2 id="shop-categories-title">Shop by Categories</h2>
          <p>Discover silhouettes, fabrics and finishing touches made for your personal style.</p>
        </div>

        <div className="shop-categories__carousel">
          <button type="button" onClick={() => move(-1)} className="shop-categories__arrow shop-categories__arrow--left" aria-label="Previous categories">&#8249;</button>
          <div ref={trackRef} className="shop-categories__track">
            {activeCategories.map((category, index) => (
              <Link href={category.href} className="shop-categories__card" key={category.slug}>
                <span className="shop-categories__image">
                  {category.image.startsWith('data:') ? (
                    <img
                      src={category.image}
                      alt={`${category.name} collection`}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Image
                      src={category.image}
                      alt={`${category.name} collection`}
                      fill
                      priority={index < 2}
                      sizes="(max-width: 767px) 42vw, 280px"
                    />
                  )}
                </span>
                <span className="shop-categories__name">{category.name}</span>
                <span className="shop-categories__link">Explore collection <span aria-hidden="true">&rarr;</span></span>
              </Link>
            ))}
          </div>
          <button type="button" onClick={() => move(1)} className="shop-categories__arrow shop-categories__arrow--right" aria-label="Next categories">&#8250;</button>
        </div>

        <div className="shop-categories__hint" aria-hidden="true"><span /> Swipe to discover <span /></div>
      </div>

      <style jsx>{`
        .shop-categories { padding: 3.25rem 0 3.5rem; overflow: hidden; background: linear-gradient(180deg, #fff 0%, #fdf6f7 100%); }
        .shop-categories__header { max-width: 620px; margin: 0 auto 2rem; padding: 0 1rem; text-align: center; }
        .shop-categories__eyebrow { margin: 0 0 .55rem; color: #a66c7b; font-size: .68rem; font-weight: 700; letter-spacing: .17em; text-transform: uppercase; }
        .shop-categories__header h2 { margin: 0; color: #222; font-family: var(--font-serif); font-size: clamp(2rem, 6vw, 3rem); font-weight: 400; line-height: 1.1; }
        .shop-categories__header > p:last-child { margin: .8rem auto 0; color: rgba(0,0,0,.58); font-size: .88rem; line-height: 1.6; }
        .shop-categories__carousel { position: relative; max-width: 700px; margin: 0 auto; }
        .shop-categories__track { display: grid; grid-auto-flow: column; grid-auto-columns: calc(50% - .45rem); gap: .9rem; overflow-x: auto; padding: .5rem .9rem 1rem; scroll-behavior: smooth; scroll-snap-type: x mandatory; scrollbar-width: none; }
        .shop-categories__track::-webkit-scrollbar { display: none; }
        .shop-categories__card { min-width: 0; color: inherit; text-align: center; text-decoration: none; scroll-snap-align: start; display: flex; flex-direction: column; height: 100%; }
        .shop-categories__image { position: relative; display: block; width: 100%; aspect-ratio: 1; overflow: hidden; border: 3px solid #fff; border-radius: 50%; background: #f4e1e5; box-shadow: 0 12px 30px rgba(118,65,79,.16); transition: transform .3s ease, box-shadow .3s ease; }
        .shop-categories__image :global(img) { object-fit: cover; transition: transform .5s ease; }
        .shop-categories__card:hover .shop-categories__image { transform: translateY(-4px); box-shadow: 0 16px 34px rgba(118,65,79,.22); }
        .shop-categories__card:hover .shop-categories__image :global(img) { transform: scale(1.04); }
        .shop-categories__name { display: flex; align-items: center; justify-content: center; margin-top: .8rem; color: #282226; font-family: var(--font-serif); font-size: clamp(0.88rem, 3.6vw, 1.2rem); line-height: 1.18; min-height: 2.5em; text-align: center; }
        .shop-categories__link { display: block; margin-top: auto; padding-top: .4rem; color: #a66c7b; font-size: .61rem; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }
        .shop-categories__arrow { position: absolute; top: 42%; z-index: 2; width: 40px; height: 40px; padding: 0 0 4px; border: 1px solid rgba(166,108,123,.2); border-radius: 50%; background: rgba(255,255,255,.94); color: #402f34; box-shadow: 0 6px 18px rgba(0,0,0,.1); cursor: pointer; font: 300 1.9rem/1 var(--font-serif); }
        .shop-categories__arrow--left { left: .1rem; transform: translate(-25%,-50%); }
        .shop-categories__arrow--right { right: .1rem; transform: translate(25%,-50%); }
        .shop-categories__hint { display: flex; align-items: center; justify-content: center; gap: .65rem; margin-top: .35rem; color: rgba(0,0,0,.42); font-size: .62rem; letter-spacing: .12em; text-transform: uppercase; }
        .shop-categories__hint span { width: 28px; height: 1px; background: rgba(166,108,123,.35); }
        @media (min-width: 768px) { .shop-categories { padding: 4.5rem 0; } .shop-categories__track { grid-auto-columns: calc(50% - .75rem); gap: 1.5rem; padding: .75rem 2rem 1.2rem; } .shop-categories__arrow--left { left: .75rem; } .shop-categories__arrow--right { right: .75rem; } }
        @media (prefers-reduced-motion: reduce) { .shop-categories__track { scroll-behavior: auto; } .shop-categories__image, .shop-categories__image :global(img) { transition: none; } }
      `}</style>
    </section>
  );
}
