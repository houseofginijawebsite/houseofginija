import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import {
  PRODUCT_COLLECTION_JOINS,
  PRODUCT_SELECT_FIELDS,
  mapProductData,
} from '@/lib/catalogMetadata';
import {
  shouldUseLocalCatalogFallbackFirst,
  canUseLocalCatalogFallback,
  getLocalHomepageFallback,
} from '@/lib/localCatalogFallback';
import { getStore } from '@/lib/globalProductStore';
import { isJewelleryProduct, isJewelleryCollection } from '@/lib/catalogClient';

import { fetchCloudSettingsHttps } from '@/lib/settingsStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  await fetchCloudSettingsHttps();

  if (shouldUseLocalCatalogFallbackFirst()) {
    return NextResponse.json({
      ...getLocalHomepageFallback(),
      db_connected: false,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      }
    });
  }

  try {
    const collectionsQuery = `
      SELECT
        c.*,
        parent.name AS parent_name,
        parent.slug AS parent_slug
      FROM collections c
      LEFT JOIN collections parent ON parent.id = c.parent_id
      WHERE c.is_active = TRUE
      ORDER BY
        COALESCE(parent.sort_order, c.sort_order) ASC,
        COALESCE(parent.id, c.id) ASC,
        CASE WHEN c.parent_id IS NULL THEN 0 ELSE 1 END ASC,
        c.sort_order ASC,
        c.name ASC
    `;

    const flashProductsQuery = `
      SELECT ${PRODUCT_SELECT_FIELDS}
      FROM products p
      ${PRODUCT_COLLECTION_JOINS}
      WHERE p.flash_sale = TRUE
      ORDER BY
        SUBSTRING(p.name FROM '^[^0-9]+') ASC,
        COALESCE(NULLIF(SUBSTRING(p.name FROM '[0-9]+'), ''), '0')::integer ASC,
        p.name ASC
    `;

    const newArrivalsQuery = `
      SELECT ${PRODUCT_SELECT_FIELDS}
      FROM products p
      ${PRODUCT_COLLECTION_JOINS}
      WHERE p.new_arrival = TRUE
      ORDER BY
        SUBSTRING(p.name FROM '^[^0-9]+') ASC,
        COALESCE(NULLIF(SUBSTRING(p.name FROM '[0-9]+'), ''), '0')::integer ASC,
        p.name ASC
    `;

    const heavyDressesQuery = `
      SELECT ${PRODUCT_SELECT_FIELDS}
      FROM products p
      ${PRODUCT_COLLECTION_JOINS}
      WHERE c.slug IN ('indo-western', 'gowns', 'heavy-gown', 'shararas')
      ORDER BY p.id ASC
    `;

    const allProductsQuery = `
      SELECT ${PRODUCT_SELECT_FIELDS}
      FROM products p
      ${PRODUCT_COLLECTION_JOINS}
      WHERE p.is_out_of_stock = FALSE
    `;

    const settingsQuery =
      "SELECT key, value FROM settings WHERE key IN ('flash_sale_enabled', 'new_arrivals_enabled', 'jewellery_enabled')";
    const heroReelsQuery = 'SELECT * FROM hero_reels ORDER BY sort_order ASC, id ASC';
    const founderReelsQuery =
      'SELECT * FROM founder_reels ORDER BY sort_order ASC, id ASC LIMIT 3';

    const [
      collectionsResult,
      flashProductsResult,
      newArrivalsResult,
      settingsResult,
      heroReelsResult,
      founderReelsResult,
      heavyDressesResult,
      allProductsResult,
    ] = await Promise.all([
      pool.query(collectionsQuery),
      pool.query(flashProductsQuery),
      pool.query(newArrivalsQuery),
      pool.query(settingsQuery),
      pool.query(heroReelsQuery),
      pool.query(founderReelsQuery),
      pool.query(heavyDressesQuery),
      pool.query(allProductsQuery),
    ]);

    const flash_sale_enabled =
      settingsResult.rows.find((row) => row.key === 'flash_sale_enabled')?.value !== 'false';
    const new_arrivals_enabled =
      settingsResult.rows.find((row) => row.key === 'new_arrivals_enabled')?.value !== 'false';
    const jewellery_enabled =
      settingsResult.rows.find((row) => row.key === 'jewellery_enabled')?.value !== 'false';

    const dbFlashProducts = flashProductsResult.rows.map((row) => mapProductData(row, { isAdmin: false }));
    const localFlashProducts = getLocalHomepageFallback().flashProducts || [];
    const dbFlashSlugs = new Set(dbFlashProducts.map((p) => p.slug));
    let flashProducts = [
      ...dbFlashProducts,
      ...localFlashProducts.filter((p) => !dbFlashSlugs.has(p.slug) && (p.flash_sale || p.on_sale))
    ];

    let newArrivalProducts = newArrivalsResult.rows.map((row) => mapProductData(row, { isAdmin: false }));
    let heavyDressProducts = heavyDressesResult.rows.map((row) => mapProductData(row, { isAdmin: false }));
    let allProductsMapped = allProductsResult.rows.map((row) => mapProductData(row, { isAdmin: false }));

    let visibleCollections = collectionsResult.rows;
    if (jewellery_enabled === false) {
      visibleCollections = visibleCollections.filter((c) => !isJewelleryCollection(c));
      flashProducts = flashProducts.filter((product) => !isJewelleryProduct(product));
      newArrivalProducts = newArrivalProducts.filter((product) => !isJewelleryProduct(product));
      heavyDressProducts = heavyDressProducts.filter((product) => !isJewelleryProduct(product));
      allProductsMapped = allProductsMapped.filter((product) => !isJewelleryProduct(product));
    }

    const isSuitsCategory = (slug) => slug === 'suits' || slug === 'unstitched';
    const isHeavyCategory = (slug) => ['indo-western', 'gowns', 'heavy-gown', 'shararas'].includes(slug);

    const categoryCounts = {
      discounted_suits: allProductsMapped.filter((p) => Boolean(p.flash_sale) && isSuitsCategory(p.collection_slug)).length,
      discounted_heavy: allProductsMapped.filter((p) => Boolean(p.flash_sale) && isHeavyCategory(p.collection_slug)).length,
      suits: allProductsMapped.filter((p) => isSuitsCategory(p.collection_slug)).length,
      indo_western: allProductsMapped.filter((p) => p.collection_slug === 'indo-western').length,
      gowns: allProductsMapped.filter((p) => p.collection_slug === 'gowns' || p.collection_slug === 'heavy-gown').length,
      shararas: allProductsMapped.filter((p) => p.collection_slug === 'shararas').length,
    };

    const fallbackHeavyDresses = getLocalHomepageFallback().heavyDresses || {};
    const getCategoryProducts = (slugs, fallbackItems = []) => {
      const acceptedSlugs = Array.isArray(slugs) ? slugs : [slugs];
      const matched = heavyDressProducts.filter((product) =>
        acceptedSlugs.includes(product.collection_slug) ||
        (Array.isArray(product.collection_slugs) && product.collection_slugs.some((s) => acceptedSlugs.includes(s))) ||
        (acceptedSlugs.includes('indo-western') && String(product.collection_id) === '8')
      );

      const storeItems = getStore().filter((product) => {
        if (jewellery_enabled === false && isJewelleryProduct(product)) return false;
        return (
          acceptedSlugs.includes(product.collection_slug) ||
          (Array.isArray(product.collection_slugs) && product.collection_slugs.some((s) => acceptedSlugs.includes(s))) ||
          (acceptedSlugs.includes('indo-western') && String(product.collection_id) === '8')
        );
      });

      const fallbackFiltered = fallbackItems.filter((product) =>
        acceptedSlugs.includes(product.collection_slug) ||
        (Array.isArray(product.collection_slugs) && product.collection_slugs.some((s) => acceptedSlugs.includes(s))) ||
        (acceptedSlugs.includes('indo-western') && String(product.collection_id) === '8')
      );

      const uniqueMap = new Map();
      [...matched, ...storeItems, ...fallbackFiltered].forEach((p) => {
        if (!uniqueMap.has(p.id || p.slug)) {
          uniqueMap.set(p.id || p.slug, p);
        }
      });

      return Array.from(uniqueMap.values());
    };

    const heavyDresses = {
      indoWestern: getCategoryProducts(
        'indo-western',
        fallbackHeavyDresses.indoWestern || []
      ),
      heavyGown: getCategoryProducts(
        ['gowns', 'heavy-gown'],
        fallbackHeavyDresses.heavyGown || []
      ),
      shararas: getCategoryProducts(
        'shararas',
        fallbackHeavyDresses.shararas || []
      ),
    };

    return NextResponse.json({
      collections: visibleCollections,
      flashProducts,
      flash_sale_enabled,
      newArrivalProducts,
      new_arrivals_enabled,
      jewellery_enabled,
      categoryCounts,
      heroReels: heroReelsResult.rows || [],
      founderReels: founderReelsResult.rows || [],
      heavyDresses,
      db_connected: true,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      }
    });
  } catch (error) {
    console.error('Fetch homepage data error:', error);
    if (canUseLocalCatalogFallback()) {
      return NextResponse.json({
        ...getLocalHomepageFallback(),
        db_connected: false,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        }
      });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
