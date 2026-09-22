import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { buildCategoryTree } from '@/lib/catalogMetadata';
import {
  shouldUseLocalCatalogFallbackFirst,
  canUseLocalCatalogFallback,
  getLocalCollectionsFallback,
} from '@/lib/localCatalogFallback';
import { isJewelleryCollection } from '@/lib/catalogClient';
import { fetchCloudSettingsHttps, getSetting } from '@/lib/settingsStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
};

export async function GET() {
  await fetchCloudSettingsHttps();
  let jewelleryEnabled = getSetting('jewellery_enabled', true);
  const hideDisabledCollections = (collections) =>
    jewelleryEnabled === false
      ? collections.filter((collection) => !isJewelleryCollection(collection))
      : collections;

  if (shouldUseLocalCatalogFallbackFirst()) {
    const collections = hideDisabledCollections(getLocalCollectionsFallback());
    return NextResponse.json(
      {
        collections,
        categoryTree: buildCategoryTree(collections),
      },
      { headers: NO_CACHE_HEADERS }
    );
  }

  try {
    const result = await pool.query(`
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
    `);

    const dbCollections = result.rows;
    const settingsResult = await pool.query(
      "SELECT value FROM settings WHERE key = 'jewellery_enabled'"
    );
    if (settingsResult.rows.length > 0) {
      jewelleryEnabled = settingsResult.rows[0].value !== 'false';
    }

    const fallbackCollections = getLocalCollectionsFallback();
    const existingSlugs = new Set(dbCollections.map((c) => c.slug));

    const mergedCollections = [
      ...dbCollections,
      ...fallbackCollections.filter((c) => !existingSlugs.has(c.slug)),
    ];

    const visibleCollections = hideDisabledCollections(mergedCollections);

    return NextResponse.json(
      {
        collections: visibleCollections,
        categoryTree: buildCategoryTree(visibleCollections),
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Fetch collections error:', error);
    if (canUseLocalCatalogFallback()) {
      const collections = hideDisabledCollections(getLocalCollectionsFallback());
      return NextResponse.json(
        {
          collections,
          categoryTree: buildCategoryTree(collections),
        },
        { headers: NO_CACHE_HEADERS }
      );
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
