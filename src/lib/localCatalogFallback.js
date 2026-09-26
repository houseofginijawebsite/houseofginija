import homepageFallback from '@/data/local-homepage-fallback.json';
import productsFallback from '@/data/local-products-fallback.json';
import localSettings from '@/data/local-settings.json';
import { getStore, findBySlug } from '@/lib/globalProductStore';
import { getSetting } from '@/lib/settingsStore';
import { isJewelleryProduct, productMatchesCategory } from '@/lib/catalogClient';
import { buildCategoryTree } from '@/lib/catalogMetadata';

const isProduction = process.env.NODE_ENV === 'production';
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

const fallbackTags = [
  { id: '1', name: 'Cotton', slug: 'cotton' },
  { id: '2', name: 'Linen', slug: 'linen' },
  { id: '3', name: 'Muslin', slug: 'muslin' },
  { id: '4', name: 'Bestseller', slug: 'bestseller' },
  { id: '5', name: 'Limited Edition', slug: 'limited-edition' },
];

export function canUseLocalCatalogFallback() {
  return true;
}

export function shouldUseLocalCatalogFallbackFirst() {
  return isBuild || !hasDatabaseUrl;
}

export function getLocalCollectionsFallback() {
  return homepageFallback.collections || [];
}

export function getLocalCategoryTreeFallback() {
  return buildCategoryTree(getLocalCollectionsFallback());
}

export function getLocalTagsFallback() {
  return fallbackTags;
}

export function getLocalHomepageFallback() {
  const store = getStore();
  const jewelleryEnabled = getSetting('jewellery_enabled', true);
  const visibleStore = jewelleryEnabled === false
    ? store.filter((product) => !isJewelleryProduct(product))
    : store;
  const flashProducts = visibleStore.filter((p) => Boolean(p.flash_sale || p.on_sale || (Array.isArray(p.collection_slugs) && p.collection_slugs.includes('flash-sale'))));
  const newArrivalProducts = visibleStore.filter((p) => Boolean(p.new_arrival || (Array.isArray(p.collection_slugs) && p.collection_slugs.includes('new-collection'))));

  const isIndoWestern = (p) => productMatchesCategory(p, 'indo-western');
  const isGown = (p) => productMatchesCategory(p, 'gowns');
  const isSharara = (p) => productMatchesCategory(p, 'shararas');

  const heavyDresses = {
    indoWestern: visibleStore.filter(isIndoWestern),
    heavyGown: visibleStore.filter(isGown),
    shararas: visibleStore.filter(isSharara),
  };

  return {
    ...homepageFallback,
    flashProducts,
    flash_sale_enabled: true,
    newArrivalProducts,
    new_arrivals_enabled: true,
    jewellery_enabled: jewelleryEnabled,
    heavyDresses,
  };
}

export function getLocalProductsFallback() {
  return getStore();
}

export function getLocalProductsResponseFallback() {
  const jewelleryEnabled = getSetting('jewellery_enabled', true);
  const products = jewelleryEnabled === false
    ? getStore().filter((product) => !isJewelleryProduct(product))
    : getStore();

  return {
    products,
    flash_sale_enabled: productsFallback.flash_sale_enabled ?? true,
    jewellery_enabled: jewelleryEnabled,
  };
}

export function getLocalProductBySlugFallback(slug) {
  return findBySlug(slug);
}
