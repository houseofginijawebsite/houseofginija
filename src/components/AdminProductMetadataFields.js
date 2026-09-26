'use client';

import { useState } from 'react';

export function AdminProductMetadataFields({
  tags = [],
  selectedTagIds = [],
  onSelectedTagIdsChange,
  customTags = [],
  onCustomTagsChange,
  onSale,
  onSaleChange,
}) {
  const [newTagInput, setNewTagInput] = useState('');

  const toggleTag = (tagId) => {
    const selected = selectedTagIds.includes(tagId);
    onSelectedTagIdsChange(
      selected
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId]
    );
  };

  const handleAddCustomTag = (e) => {
    if (e) e.preventDefault();
    const trimmed = newTagInput.trim();
    if (!trimmed) return;

    if (!customTags.some((t) => (typeof t === 'string' ? t : t.name).toLowerCase() === trimmed.toLowerCase())) {
      onCustomTagsChange([...customTags, trimmed]);
    }
    setNewTagInput('');
  };

  const handleRemoveCustomTag = (indexToRemove) => {
    onCustomTagsChange(customTags.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', margin: '0.5rem 0 1rem 0' }}>
      <div style={fieldGroupStyle}>
        <h3 style={sectionTitleStyle}>Product Tags & Highlights</h3>

        {/* Standard System Tags */}
        {tags.length > 0 && (
          <div style={{ marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#565959', fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>
              Standard System Tags
            </span>
            <div style={tagOptionsStyle}>
              {tags.map((tag) => {
                const tagId = Number(tag.id);
                const selected = selectedTagIds.includes(tagId);
                return (
                  <label key={tag.id} style={selected ? selectedTagStyle : tagStyle}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleTag(tagId)}
                    />
                    <span>{tag.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Tags Section */}
        <div>
          <span style={{ fontSize: '0.75rem', color: '#565959', fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>
            Custom Product Tags
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem' }}>
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomTag();
                }
              }}
              placeholder="e.g. Pure Silk, Handcrafted Zari, Bestseller..."
              style={{
                flex: 1,
                padding: '0.45rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid #E2D5D8',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleAddCustomTag}
              style={{
                backgroundColor: '#D98E9B',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.45rem 0.95rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
            >
              + Add a Tag
            </button>
          </div>

          {/* Active Custom Tags List */}
          {customTags.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {customTags.map((tag, idx) => {
                const tagName = typeof tag === 'string' ? tag : (tag.name || tag.slug);
                return (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '999px',
                      backgroundColor: '#F6DDE2',
                      color: '#7D4352',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      border: '1px solid rgba(217, 142, 155, 0.4)',
                    }}
                  >
                    <span>{tagName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomTag(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#7D4352',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        padding: '0 0.15rem',
                        fontSize: '0.8rem',
                        lineHeight: 1,
                      }}
                      title="Remove tag"
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: '0.75rem', color: '#8B7789', fontStyle: 'italic', margin: 0 }}>
              No custom tags added yet. Type a name above and click &quot;+ Add a Tag&quot;.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminProductMetadataBadges({ product }) {
  if (!product) return null;

  const tags = Array.isArray(product.tags) ? product.tags : [];
  const slugs = Array.isArray(product.collection_slugs) ? product.collection_slugs : [];

  const isFlashSale = Boolean(
    product.flash_sale ||
    product.flashSale ||
    product.on_sale ||
    product.onSale ||
    slugs.includes('flash-sale')
  );

  const origPrice = parseFloat(product.price) || 0;
  const flashPrice = parseFloat(product.flash_sale_price || product.flashSalePrice) || 0;
  const discountPct = (origPrice > 0 && flashPrice > 0 && flashPrice < origPrice)
    ? Math.round(((origPrice - flashPrice) / origPrice) * 100)
    : null;

  if (!isFlashSale && tags.length === 0) return null;

  return (
    <div style={metadataRowStyle}>
      {isFlashSale && (
        <span style={flashSaleBadgeStyle}>
          ⚡ CLEARANCE SALE {discountPct ? `(-${discountPct}%)` : (flashPrice ? `(₹${flashPrice.toLocaleString('en-IN')})` : '')}
        </span>
      )}
      {tags.map((tag) => (
        <span key={tag.id || tag.slug} style={tagBadgeStyle}>
          {tag.name}
        </span>
      ))}
    </div>
  );
}

const fieldGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
};

const sectionTitleStyle = {
  fontSize: '0.82rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#D98E9B',
  fontWeight: '700',
  marginBottom: '0.5rem',
};

const tagOptionsStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.55rem',
};

const tagStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.4rem',
  padding: '0.4rem 0.7rem',
  borderRadius: '999px',
  border: '1px solid rgba(217, 142, 155, 0.45)',
  color: '#2D2429',
  backgroundColor: '#FFFFFF',
  fontSize: '0.78rem',
  cursor: 'pointer',
};

const selectedTagStyle = {
  ...tagStyle,
  backgroundColor: '#F6DDE2',
  borderColor: '#D98E9B',
};

const checkboxGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
};

const checkboxStyle = {
  width: '18px',
  height: '18px',
  accentColor: '#D98E9B',
};

const checkboxLabelStyle = {
  fontSize: '0.82rem',
  color: '#000000',
  fontWeight: '600',
};

const metadataRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.3rem',
  marginTop: '0.35rem',
};

const tagBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0.16rem 0.45rem',
  borderRadius: '999px',
  backgroundColor: '#F6DDE2',
  color: '#8A4F5D',
  border: '1px solid rgba(217, 142, 155, 0.5)',
  fontSize: '0.62rem',
  fontWeight: '700',
};

const onSaleBadgeStyle = {
  ...tagBadgeStyle,
  backgroundColor: '#D98E9B',
  color: '#FFFFFF',
};

const flashSaleBadgeStyle = {
  ...tagBadgeStyle,
  backgroundColor: '#B65C73',
  color: '#FFFFFF',
  border: 'none',
  padding: '0.18rem 0.55rem',
  fontSize: '0.65rem',
  letterSpacing: '0.04em',
  boxShadow: '0 2px 6px rgba(182, 92, 115, 0.25)',
};
