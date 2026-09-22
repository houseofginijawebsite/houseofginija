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
  getLocalProductsFallback,
  getLocalProductsResponseFallback,
} from '@/lib/localCatalogFallback';
import { isJewelleryProduct, productMatchesCategory } from '@/lib/catalogClient';
import { fetchCloudSettingsHttps, getSetting } from '@/lib/settingsStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
};

export async function GET(request) {
  await fetchCloudSettingsHttps();
  let jewelleryEnabled = getSetting('jewellery_enabled', true);

  if (shouldUseLocalCatalogFallbackFirst()) {
    const response = getLocalProductsResponseFallback();
    const { searchParams } = new URL(request.url);
    const collection = searchParams.get('collection') || searchParams.get('category');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const ids = searchParams.get('ids');
    const sort = searchParams.get('sort');

    let products = [...response.products];

    if (jewelleryEnabled === false) {
      products = products.filter((product) => !isJewelleryProduct(product));
    }

    if (ids) {
      const selectedIds = new Set(ids.split(',').map(String));
      products = products.filter((product) => selectedIds.has(String(product.id)));
    }
    if (collection) {
      products = products.filter((product) => productMatchesCategory(product, collection));
    }
    if (tag) {
      products = products.filter((product) =>
        (product.tags || []).some((productTag) => productTag.slug === tag)
      );
    }
    if (search) {
      const term = search.toLowerCase();
      products = products.filter((product) => product.name.toLowerCase().includes(term));
    }

    products.sort((a, b) => {
      const saleDelta = Number(Boolean(b.on_sale)) - Number(Boolean(a.on_sale));
      if (saleDelta) return saleDelta;
      const flashDelta = Number(Boolean(b.flash_sale)) - Number(Boolean(a.flash_sale));
      if (flashDelta) return flashDelta;
      if (sort === 'price_asc') return Number(a.price) - Number(b.price);
      if (sort === 'price_desc') return Number(b.price) - Number(a.price);
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    return NextResponse.json(
      { ...response, products, jewellery_enabled: jewelleryEnabled },
      { headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const collection = searchParams.get('collection') || searchParams.get('category');
    const search = searchParams.get('search');
    const size = searchParams.get('size');
    const color = searchParams.get('color');
    const tag = searchParams.get('tag');
    const sort = searchParams.get('sort');

    let queryText = `
      SELECT ${PRODUCT_SELECT_FIELDS}
      FROM products p
      ${PRODUCT_COLLECTION_JOINS}
      WHERE 1=1
    `;
    const queryParams = [];
    let paramIndex = 1;

    const ids = searchParams.get('ids');
    if (ids) {
      const idArray = ids.split(',').map((id) => Number.parseInt(id, 10)).filter(Number.isInteger);
      if (idArray.length > 0) {
        queryText += ` AND p.id = ANY($${paramIndex}::int[])`;
        queryParams.push(idArray);
        paramIndex += 1;
      }
    }

    if (collection) {
      queryText += ` AND (
        c.slug = $${paramIndex}
        OR parent_c.slug = $${paramIndex}
        OR ($${paramIndex} = 'gowns' AND c.slug = 'heavy-gown')
        OR ($${paramIndex} = 'shararas' AND (c.slug = 'heavy-dresses' OR parent_c.slug = 'heavy-dresses'))
        OR ($${paramIndex} = 'new-collection' AND p.new_arrival = TRUE)
        OR ($${paramIndex} = 'flash-sale' AND (p.on_sale = TRUE OR p.flash_sale = TRUE))
        OR (p.collection_slugs IS NOT NULL AND p.collection_slugs @> to_jsonb($${paramIndex}::text))
      )`;
      queryParams.push(collection);
      paramIndex += 1;
    }

    if (tag) {
      queryText += ` AND EXISTS (
        SELECT 1
        FROM product_tags filter_pt
        INNER JOIN tags filter_tag ON filter_tag.id = filter_pt.tag_id
        WHERE filter_pt.product_id = p.id AND filter_tag.slug = $${paramIndex}
      )`;
      queryParams.push(tag);
      paramIndex += 1;
    }

    if (search) {
      queryText += ` AND p.name ILIKE $${paramIndex}`;
      queryParams.push(`%${search}%`);
      paramIndex += 1;
    }

    if (size) {
      queryText += ` AND EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p.variants) AS v(size TEXT, stock INT)
        WHERE v.size = $${paramIndex} AND v.stock > 0
      )`;
      queryParams.push(size);
      paramIndex += 1;
    }

    if (color) {
      queryText += ` AND EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p.variants) AS v(color TEXT, stock INT)
        WHERE v.color = $${paramIndex} AND v.stock > 0
      )`;
      queryParams.push(color);
      paramIndex += 1;
    }

    const naturalNameSort = `SUBSTRING(p.name FROM '^[^0-9]+') ASC,
      COALESCE(NULLIF(SUBSTRING(p.name FROM '[0-9]+'), ''), '0')::integer ASC,
      p.name ASC`;

    if (sort === 'price_asc') {
      queryText += ' ORDER BY p.on_sale DESC, p.price ASC, p.flash_sale DESC, p.id ASC';
    } else if (sort === 'price_desc') {
      queryText += ' ORDER BY p.on_sale DESC, p.price DESC, p.flash_sale DESC, p.id ASC';
    } else {
      queryText += ` ORDER BY p.on_sale DESC, p.flash_sale DESC, ${naturalNameSort}`;
    }

    const result = await pool.query(queryText, queryParams);
    const settingsResult = await pool.query(
      "SELECT key, value FROM settings WHERE key IN ('flash_sale_enabled', 'jewellery_enabled')"
    );
    const flash_sale_enabled =
      settingsResult.rows.find((row) => row.key === 'flash_sale_enabled')?.value === 'true';
    const jewelleryRow = settingsResult.rows.find((row) => row.key === 'jewellery_enabled');
    if (jewelleryRow) {
      jewelleryEnabled = jewelleryRow.value !== 'false';
    }

    const dbProducts = result.rows.map((row) => mapProductData(row, { isAdmin: false }));
    const fallbackProducts = getLocalProductsFallback();
    const dbSlugs = new Set(dbProducts.map((p) => p.slug));

    let matchingFallback = fallbackProducts.filter((p) => !dbSlugs.has(p.slug));
    if (ids) {
      const selectedIds = new Set(ids.split(',').map((id) => String(id).trim()));
      matchingFallback = matchingFallback.filter((p) => selectedIds.has(String(p.id)));
    }
    if (collection) {
      matchingFallback = matchingFallback.filter((p) => {
        const slugs = Array.isArray(p.collection_slugs) ? p.collection_slugs : [];
        return (
          p.collection_slug === collection ||
          p.parent_collection_slug === collection ||
          slugs.includes(collection) ||
          (collection === 'shararas' && (p.collection_slug === 'heavy-dresses' || p.parent_collection_slug === 'heavy-dresses')) ||
          (collection === 'new-collection' && (p.new_arrival || slugs.includes('new-collection'))) ||
          (collection === 'flash-sale' && (p.on_sale || p.flash_sale || slugs.includes('flash-sale')))
        );
      });
    }
    if (tag) {
      matchingFallback = matchingFallback.filter((p) =>
        (p.tags || []).some((productTag) => productTag.slug === tag)
      );
    }
    if (search) {
      const term = search.toLowerCase();
      matchingFallback = matchingFallback.filter((p) => p.name.toLowerCase().includes(term));
    }

    let finalProducts = [...dbProducts, ...matchingFallback];
    if (jewelleryEnabled === false) {
      finalProducts = finalProducts.filter((product) => !isJewelleryProduct(product));
    }

    return NextResponse.json(
      {
        products: finalProducts,
        flash_sale_enabled,
        jewellery_enabled: jewelleryEnabled,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Fetch products error:', error);
    if (canUseLocalCatalogFallback()) {
      const response = getLocalProductsResponseFallback();
      const products = jewelleryEnabled === false
        ? response.products.filter((product) => !isJewelleryProduct(product))
        : response.products;
      return NextResponse.json(
        { ...response, products, jewellery_enabled: jewelleryEnabled },
        { headers: NO_CACHE_HEADERS }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
