export const JEWELLERY_CATEGORY_SLUGS = ['jewellery', 'rings', 'necklaces', 'bracelets', 'earrings'];
export const JEWELLERY_COLLECTION_IDS = ['2', '4', '5', '6'];

export function isJewelleryProduct(product = {}) {
  const collectionId = String(product.collection_id || '');
  if (JEWELLERY_COLLECTION_IDS.includes(collectionId)) return true;

  const collectionSlug = (product.collection_slug || '').toLowerCase();
  const parentCollectionSlug = (product.parent_collection_slug || '').toLowerCase();
  if (JEWELLERY_CATEGORY_SLUGS.includes(collectionSlug) || JEWELLERY_CATEGORY_SLUGS.includes(parentCollectionSlug)) {
    return true;
  }

  const collectionSlugs = Array.isArray(product.collection_slugs)
    ? product.collection_slugs.map((slug) => String(slug).toLowerCase())
    : [];
  if (collectionSlugs.some((slug) => JEWELLERY_CATEGORY_SLUGS.includes(slug))) return true;

  const collectionName = (product.collection_name || '').toLowerCase();
  if (collectionName.includes('jewellery') || collectionName.includes('jewelry')) return true;

  const name = (product.name || '').toLowerCase();
  return /\b(rings?|necklaces?|bracelets?|earrings?)\b/.test(name);
}

export function isJewelleryCollection(collection = {}) {
  const slug = (collection.slug || '').toLowerCase();
  const parentSlug = (collection.parent_slug || '').toLowerCase();
  const id = String(collection.id || '');
  const parentId = String(collection.parent_id || '');

  return (
    JEWELLERY_CATEGORY_SLUGS.includes(slug) ||
    JEWELLERY_CATEGORY_SLUGS.includes(parentSlug) ||
    JEWELLERY_COLLECTION_IDS.includes(id) ||
    JEWELLERY_COLLECTION_IDS.includes(parentId)
  );
}

export function productMatchesCategory(product, selectedCategory) {
  if (!selectedCategory) return true;

  const cat = selectedCategory.toLowerCase();
  const colSlug = (product.collection_slug || '').toLowerCase();
  const parentColSlug = (product.parent_collection_slug || '').toLowerCase();
  const colName = (product.collection_name || '').toLowerCase();
  const colSlugs = Array.isArray(product.collection_slugs) ? product.collection_slugs.map((s) => String(s).toLowerCase()) : [];
  const colId = String(product.collection_id || '');

  // 1. Fresh Collection / New Arrival Gatekeeping
  if (cat === 'new-collection') {
    return Boolean(product.new_arrival || colSlugs.includes('new-collection'));
  }

  // 2. Flash Sale Gatekeeping
  if (cat === 'flash-sale') {
    return Boolean(product.flash_sale || colSlugs.includes('flash-sale'));
  }

  // 3. Strict Category Tag Gatekeeping
  const nameLower = (product.name || '').toLowerCase();
  
  if (colSlugs.length > 0) {
    if (cat === 'suits' || cat === 'unstitched' || cat === 'unstitched-suits') {
      if (isJewelleryProduct(product)) return false;
      return colSlugs.includes('suits') || colSlugs.includes('unstitched') || colSlugs.includes('unstitched-suits');
    }
    if (cat === 'indo-western') {
      return colSlugs.includes('indo-western') || nameLower.includes('cape') || nameLower.includes('co-ord');
    }
    if (cat === 'gowns' || cat === 'heavy-gown') {
      return colSlugs.includes('gowns') || colSlugs.includes('heavy-gown') || nameLower.includes('gown') || nameLower.includes('anarkali');
    }
    if (cat === 'shararas' || cat === 'drape-sarees' || cat === 'drapes') {
      return colSlugs.includes('shararas') || colSlugs.includes('drape-sarees') || nameLower.includes('drape') || nameLower.includes('saree');
    }
    if (cat === 'co-ords') {
      return colSlugs.includes('co-ords');
    }
    if (cat === 'rings' || cat === 'ring') {
      return colSlugs.includes('rings') || colSlugs.includes('ring');
    }
    if (cat === 'necklaces' || cat === 'necklace') {
      return colSlugs.includes('necklaces') || colSlugs.includes('necklace');
    }
    if (cat === 'bracelets' || cat === 'bracelet') {
      return colSlugs.includes('bracelets') || colSlugs.includes('bracelet');
    }
    if (cat === 'earrings' || cat === 'earring') {
      return colSlugs.includes('earrings') || colSlugs.includes('earring');
    }
    return colSlugs.includes(cat);
  }

  // Fallback for legacy items without explicit collection_slugs array
  if (cat === 'rings' || cat === 'ring') {
    return colSlug === 'rings' || colId === '5';
  }
  if (cat === 'necklaces' || cat === 'necklace') {
    return colSlug === 'necklaces' || colId === '2';
  }
  if (cat === 'bracelets' || cat === 'bracelet') {
    return colSlug === 'bracelets' || colId === '6';
  }
  if (cat === 'earrings' || cat === 'earring') {
    return colSlug === 'earrings' || colId === '4';
  }
  if (cat === 'suits' || cat === 'unstitched' || cat === 'unstitched-suits') {
    if (isJewelleryProduct(product)) return false;
    return colSlug === 'suits' || colSlug === 'unstitched' || colId === '1';
  }
  if (cat === 'indo-western') {
    return colSlug === 'indo-western' || colId === '8' || nameLower.includes('cape') || nameLower.includes('co-ord');
  }
  if (cat === 'gowns' || cat === 'heavy-gown') {
    return colSlug === 'gowns' || colSlug === 'heavy-gown' || colId === '10' || nameLower.includes('gown') || nameLower.includes('anarkali');
  }
  if (cat === 'shararas' || cat === 'drape-sarees' || cat === 'drapes') {
    return colSlug === 'shararas' || colId === '9' || nameLower.includes('drape') || nameLower.includes('saree');
  }
  if (cat === 'co-ords') {
    return colSlug === 'co-ords' || colId === '11';
  }

  return (
    colSlug === cat ||
    parentColSlug === cat ||
    colName === cat ||
    colId === cat
  );
}

export function compareCatalogProducts(a, b, selectedSort = 'name_asc') {
  const flashDelta = Number(Boolean(b.flash_sale || b.on_sale)) - Number(Boolean(a.flash_sale || a.on_sale));
  if (flashDelta) return flashDelta;

  if (selectedSort === 'price_asc') {
    return Number.parseFloat(a.price) - Number.parseFloat(b.price);
  }
  if (selectedSort === 'price_desc') {
    return Number.parseFloat(b.price) - Number.parseFloat(a.price);
  }

  return a.name.localeCompare(b.name, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function getCategoryTitle(collections, selectedCategory) {
  if (!selectedCategory) return 'All collections';
  if (selectedCategory === 'rings' || selectedCategory === 'ring') return 'Rings';
  if (selectedCategory === 'necklaces' || selectedCategory === 'necklace') return 'Necklaces';
  if (selectedCategory === 'bracelets' || selectedCategory === 'bracelet') return 'Bracelets';
  if (selectedCategory === 'earrings' || selectedCategory === 'earring') return 'Earrings';
  if (selectedCategory === 'new-collection') return 'Fresh Collection';
  if (selectedCategory === 'flash-sale') return 'Flash Sale';
  if (selectedCategory === 'shararas' || selectedCategory === 'sharara') return 'Drape Sarees';
  if (selectedCategory === 'gowns' || selectedCategory === 'heavy-gown') return 'Heavy Gowns';
  if (selectedCategory === 'indo-western') return 'Indo-Western';
  if (selectedCategory === 'co-ords') return 'Co-ords';
  if (selectedCategory === 'suits' || selectedCategory === 'unstitched' || selectedCategory === 'unstitched-suits') return 'Unstitched Suits';

  const match = (collections || []).find((c) => c.slug === selectedCategory);
  return match ? match.name : selectedCategory.replace(/-/g, ' ');
}

export function getStoredLocalCatalogOverrides() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('houseofginija_custom_products');
    if (!raw) return [];
    const list = JSON.parse(raw);
    const cleaned = list.filter((p) => {
      if (p.id === '201' || p.slug === 'muslin-kurta-and-dupatta-bottom-santoon') return false;
      if ((p.name || '').toLowerCase().includes('muslin kurta and dupatta bottom')) return false;
      return true;
    });
    if (cleaned.length !== list.length) {
      localStorage.setItem('houseofginija_custom_products', JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function saveStoredLocalCatalogOverride(product) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredLocalCatalogOverrides();
    const idx = existing.findIndex((p) => String(p.id) === String(product.id) || p.slug === product.slug);
    let updated;
    if (idx !== -1) {
      updated = existing.map((p, i) => (i === idx ? { ...p, ...product } : p));
    } else {
      updated = [product, ...existing];
    }
    localStorage.setItem('houseofginija_custom_products', JSON.stringify(updated));
  } catch {}
}

export function removeStoredLocalCatalogOverride(idOrSlug) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredLocalCatalogOverrides();
    const updated = existing.filter((p) => String(p.id) !== String(idOrSlug) && p.slug !== String(idOrSlug));
    localStorage.setItem('houseofginija_custom_products', JSON.stringify(updated));
  } catch {}
}

export function mergeCatalogWithLocalOverrides(fetchedList = []) {
  let merged = fetchedList.filter((p) => {
    if (p.id === '201' || p.slug === 'muslin-kurta-and-dupatta-bottom-santoon') return false;
    if ((p.name || '').toLowerCase().includes('muslin kurta and dupatta bottom')) return false;
    return true;
  });

  const overrides = getStoredLocalCatalogOverrides();
  if (!Array.isArray(overrides) || overrides.length === 0) return merged;

  // The server/database is the source of truth for products that exist.
  // Only keep local overrides for unsaved offline drafts that do not exist on the server.
  let hasCleanup = false;
  overrides.forEach((override) => {
    const idx = merged.findIndex((p) => String(p.id) === String(override.id) || p.slug === override.slug);
    if (idx === -1) {
      merged.unshift(override);
    } else {
      hasCleanup = true;
    }
  });

  if (hasCleanup) {
    const remaining = overrides.filter((override) =>
      !merged.some((p) => String(p.id) === String(override.id) || p.slug === override.slug)
    );
    try {
      localStorage.setItem('houseofginija_custom_products', JSON.stringify(remaining));
    } catch {}
  }

  return merged;
}
