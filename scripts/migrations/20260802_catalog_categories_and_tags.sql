BEGIN;

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS parent_id INTEGER,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE collections
  DROP CONSTRAINT IF EXISTS collections_parent_id_fkey;

ALTER TABLE collections
  ADD CONSTRAINT collections_parent_id_fkey
  FOREIGN KEY (parent_id) REFERENCES collections(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS collections_parent_id_idx;
CREATE INDEX collections_parent_id_idx ON collections(parent_id);

DROP INDEX IF EXISTS collections_active_sort_idx;
CREATE INDEX collections_active_sort_idx ON collections(is_active, sort_order, id);

CREATE UNIQUE INDEX IF NOT EXISTS collections_slug_unique_idx ON collections(slug);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS on_sale BOOLEAN NOT NULL DEFAULT FALSE;

DROP INDEX IF EXISTS products_on_sale_idx;
CREATE INDEX products_on_sale_idx ON products(on_sale DESC);

DROP INDEX IF EXISTS products_collection_on_sale_idx;
CREATE INDEX products_collection_on_sale_idx ON products(collection_id, on_sale DESC);

CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL UNIQUE,
  slug VARCHAR(500) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tags ALTER COLUMN name TYPE VARCHAR(500);
ALTER TABLE tags ALTER COLUMN slug TYPE VARCHAR(500);

CREATE TABLE IF NOT EXISTS product_tags (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id, tag_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS tags_slug_unique_idx ON tags(slug);

DROP INDEX IF EXISTS product_tags_tag_id_idx;
CREATE INDEX product_tags_tag_id_idx ON product_tags(tag_id, product_id);

-- Insert top-level collections if they don't exist
INSERT INTO collections (slug, name, description, sort_order, is_active)
SELECT val.slug, val.name, val.description, val.sort_order, TRUE
FROM (VALUES
  ('new-collection', 'New Collection', 'The latest House of Ginija seasonal creations.', 10),
  ('heavy-dresses', 'Heavy Dresses', 'Statement occasion wear and elevated festive silhouettes.', 20),
  ('co-ords', 'Co-ords', 'Contemporary coordinated sets.', 30),
  ('suits', 'Unstitched Suits', 'Premium unstitched suits and fine archival fabrics.', 40),
  ('jewellery', 'Jewellery', 'Exquisite artisan-crafted jewellery.', 50),
  ('flash-sale', 'Flash Sale', 'Limited-time House of Ginija offers.', 60)
) AS val(slug, name, description, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM collections c WHERE c.slug = val.slug);

-- Update existing top-level collections
UPDATE collections c
SET name = val.name,
    description = val.description,
    sort_order = val.sort_order,
    is_active = TRUE
FROM (VALUES
  ('new-collection', 'New Collection', 'The latest House of Ginija seasonal creations.', 10),
  ('heavy-dresses', 'Heavy Dresses', 'Statement occasion wear and elevated festive silhouettes.', 20),
  ('co-ords', 'Co-ords', 'Contemporary coordinated sets.', 30),
  ('suits', 'Unstitched Suits', 'Premium unstitched suits and fine archival fabrics.', 40),
  ('jewellery', 'Jewellery', 'Exquisite artisan-crafted jewellery.', 50),
  ('flash-sale', 'Flash Sale', 'Limited-time House of Ginija offers.', 60)
) AS val(slug, name, description, sort_order)
WHERE c.slug = val.slug;

UPDATE collections
SET parent_id = NULL
WHERE slug IN ('new-collection', 'heavy-dresses', 'co-ords', 'suits', 'jewellery', 'flash-sale');

UPDATE collections
SET slug = 'gowns', name = 'Gowns'
WHERE slug = 'heavy-gown'
  AND NOT EXISTS (SELECT 1 FROM collections WHERE slug = 'gowns');

-- Insert subcollections for new-collection
INSERT INTO collections (slug, name, description, parent_id, sort_order, is_active)
SELECT child.slug, child.name, child.description, parent.id, child.sort_order, TRUE
FROM collections parent
CROSS JOIN (VALUES
  ('muslin', 'Muslin', 'Lightweight muslin creations.', 10),
  ('cotton', 'Cotton', 'Breathable cotton creations.', 20),
  ('cotton-linen', 'Cotton Linen', 'Cotton-linen blend creations.', 30)
) AS child(slug, name, description, sort_order)
WHERE parent.slug = 'new-collection'
  AND NOT EXISTS (SELECT 1 FROM collections c WHERE c.slug = child.slug);

-- Update subcollections for new-collection
UPDATE collections c
SET name = child.name,
    description = child.description,
    parent_id = parent.id,
    sort_order = child.sort_order,
    is_active = TRUE
FROM collections parent
CROSS JOIN (VALUES
  ('muslin', 'Muslin', 'Lightweight muslin creations.', 10),
  ('cotton', 'Cotton', 'Breathable cotton creations.', 20),
  ('cotton-linen', 'Cotton Linen', 'Cotton-linen blend creations.', 30)
) AS child(slug, name, description, sort_order)
WHERE parent.slug = 'new-collection' AND c.slug = child.slug;

-- Insert subcollections for heavy-dresses
INSERT INTO collections (slug, name, description, parent_id, sort_order, is_active)
SELECT child.slug, child.name, child.description, parent.id, child.sort_order, TRUE
FROM collections parent
CROSS JOIN (VALUES
  ('indo-western', 'Indo-Western', 'Traditional artistry with contemporary silhouettes.', 10),
  ('shararas', 'Shararas', 'Embellished sharara sets.', 20),
  ('gowns', 'Gowns', 'Opulent floor-length gowns.', 30)
) AS child(slug, name, description, sort_order)
WHERE parent.slug = 'heavy-dresses'
  AND NOT EXISTS (SELECT 1 FROM collections c WHERE c.slug = child.slug);

-- Update subcollections for heavy-dresses
UPDATE collections c
SET name = child.name,
    description = child.description,
    parent_id = parent.id,
    sort_order = child.sort_order,
    is_active = TRUE
FROM collections parent
CROSS JOIN (VALUES
  ('indo-western', 'Indo-Western', 'Traditional artistry with contemporary silhouettes.', 10),
  ('shararas', 'Shararas', 'Embellished sharara sets.', 20),
  ('gowns', 'Gowns', 'Opulent floor-length gowns.', 30)
) AS child(slug, name, description, sort_order)
WHERE parent.slug = 'heavy-dresses' AND c.slug = child.slug;

UPDATE collections
SET is_active = FALSE
WHERE slug = 'heavy-gown'
  AND EXISTS (SELECT 1 FROM collections WHERE slug = 'gowns');

-- Insert tags if they don't exist
INSERT INTO tags (slug, name)
SELECT val.slug, val.name
FROM (VALUES
  ('cotton', 'Cotton'),
  ('linen', 'Linen'),
  ('muslin', 'Muslin'),
  ('bestseller', 'Bestseller'),
  ('limited-edition', 'Limited Edition')
) AS val(slug, name)
WHERE NOT EXISTS (SELECT 1 FROM tags t WHERE t.slug = val.slug);

-- Update existing tags
UPDATE tags t
SET name = val.name
FROM (VALUES
  ('cotton', 'Cotton'),
  ('linen', 'Linen'),
  ('muslin', 'Muslin'),
  ('bestseller', 'Bestseller'),
  ('limited-edition', 'Limited Edition')
) AS val(slug, name)
WHERE t.slug = val.slug;

-- Ensure products are mapped to subcollections where appropriate
UPDATE products p
SET collection_id = c.id
FROM collections c
WHERE c.slug = 'indo-western'
  AND (p.slug ILIKE '%indo-western%' OR p.slug ILIKE '%drape%' OR p.slug ILIKE '%cape%')
  AND (p.collection_id IS NULL OR p.collection_id IN (SELECT id FROM collections WHERE slug IN ('heavy-dresses', 'heavy-gown')));

UPDATE products p
SET collection_id = c.id
FROM collections c
WHERE c.slug = 'gowns'
  AND (p.slug ILIKE '%gown%' OR p.slug ILIKE '%heavy-gown%')
  AND (p.collection_id IS NULL OR p.collection_id IN (SELECT id FROM collections WHERE slug IN ('heavy-dresses', 'heavy-gown')));

COMMIT;
