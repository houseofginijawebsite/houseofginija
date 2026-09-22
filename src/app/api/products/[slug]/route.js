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
  getLocalProductBySlugFallback,
} from '@/lib/localCatalogFallback';
import { isJewelleryProduct } from '@/lib/catalogClient';
import { fetchCloudSettingsHttps, getSetting } from '@/lib/settingsStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
};

export async function GET(request, { params }) {
  const { slug } = await params;
  await fetchCloudSettingsHttps();
  let jewelleryEnabled = getSetting('jewellery_enabled', true);

  if (shouldUseLocalCatalogFallbackFirst()) {
    const product = getLocalProductBySlugFallback(slug);
    if (product && (jewelleryEnabled !== false || !isJewelleryProduct(product))) {
      return NextResponse.json({ product: mapProductData(product) }, { headers: NO_CACHE_HEADERS });
    }
    return NextResponse.json({ error: 'Product not found' }, { status: 404, headers: NO_CACHE_HEADERS });
  }

  try {
    const result = await pool.query(
      `
        SELECT ${PRODUCT_SELECT_FIELDS}
        FROM products p
        ${PRODUCT_COLLECTION_JOINS}
        WHERE p.slug = $1
      `,
      [slug]
    );
    const settingsResult = await pool.query(
      "SELECT value FROM settings WHERE key = 'jewellery_enabled'"
    );
    if (settingsResult.rows.length > 0) {
      jewelleryEnabled = settingsResult.rows[0].value !== 'false';
    }

    if (result.rows.length === 0) {
      if (canUseLocalCatalogFallback()) {
        const product = getLocalProductBySlugFallback(slug);
        if (product && (jewelleryEnabled !== false || !isJewelleryProduct(product))) {
          return NextResponse.json({ product: mapProductData(product) }, { headers: NO_CACHE_HEADERS });
        }
      }
      return NextResponse.json({ error: 'Product not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    const product = mapProductData(result.rows[0]);
    if (jewelleryEnabled === false && isJewelleryProduct(product)) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json({ product }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('Fetch product by slug error:', error);
    if (canUseLocalCatalogFallback()) {
      const product = getLocalProductBySlugFallback(slug);
      if (product && (jewelleryEnabled !== false || !isJewelleryProduct(product))) {
        return NextResponse.json({ product: mapProductData(product) }, { headers: NO_CACHE_HEADERS });
      }
      return NextResponse.json({ error: 'Product not found' }, { status: 404, headers: NO_CACHE_HEADERS });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
