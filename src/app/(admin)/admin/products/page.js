'use client';

import { useState, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/context/StoreContext';
import AdminSidebar from '@/components/AdminSidebar';
import { AdminProductMetadataBadges, AdminProductMetadataFields } from '@/components/AdminProductMetadataFields';
import {
  productMatchesCategory,
  saveStoredLocalCatalogOverride,
  removeStoredLocalCatalogOverride,
  mergeCatalogWithLocalOverrides,
} from '@/lib/catalogClient';

import productsFallback from '@/data/local-products-fallback.json';
import homepageFallback from '@/data/local-homepage-fallback.json';

function AdminProductsContent() {
  const { logout } = useStore();
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState(homepageFallback.collections || []);
  const [tags, setTags] = useState([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dbError, setDbError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Disable background scrolling when modal is open
  useEffect(() => {
    if (isFormOpen && typeof document !== 'undefined') {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else if (typeof document !== 'undefined') {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
    };
  }, [isFormOpen]);
  const [editingId, setEditingId] = useState(null); // Null means creating
  const [formFields, setFormFields] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    collection_id: '',
    is_out_of_stock: false,
    on_sale: false,
    flash_sale_price: '',
    flash_sale_percent: '',
  });

  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [selectedCategorySlugs, setSelectedCategorySlugs] = useState([]);
  const [customTags, setCustomTags] = useState([]);
  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);

  const ADMIN_CATEGORY_OPTIONS = [
    { id: 'new-collection', name: 'Fresh Collection' },
    { id: 'flash-sale', name: 'Flash Sale' },
    { id: 'suits', name: 'Unstitched Suits' },
    { id: 'indo-western', name: 'Indo-Western' },
    { id: 'shararas', name: 'Drape Sarees' },
    { id: 'gowns', name: 'Heavy Gowns' },
    { id: 'co-ords', name: 'Co-ords' },
    { id: 'rings', name: 'Rings' },
    { id: 'necklaces', name: 'Necklace' },
    { id: 'bracelets', name: 'Bracelet' },
  ];

  const toggleCategorySlug = (slug) => {
    setSelectedCategorySlugs((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      return [...prev, slug];
    });
  };

  // Temp states for adding single variant
  const [tempVariant, setTempVariant] = useState({
    size: 'S',
    color: 'Default',
    stock: '',
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  const sizesOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size', 'Unstitched Fabric'];
  const colorsOptions = [
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

  const fetchProductsAndCollections = async (attempt = 1) => {
    try {
      const res = await fetch('/api/admin/products', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const rawText = await res.text();
        const data = rawText ? JSON.parse(rawText) : {};
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(mergeCatalogWithLocalOverrides(data.products));
        } else {
          setProducts(mergeCatalogWithLocalOverrides([]));
        }
        if (data.collections && Array.isArray(data.collections) && data.collections.length > 0) {
          setCollections(data.collections);
        }
        if (data.tags && Array.isArray(data.tags)) {
          setTags(data.tags);
        }
        setDbError(null);
        setLoading(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || `Server error (${res.status})`;
        if (attempt < 4) {
          console.warn(`Admin products API attempt ${attempt} failed: ${errMsg}. Retrying in 2s...`);
          setTimeout(() => fetchProductsAndCollections(attempt + 1), 2000);
          return; // keep loading=true while retrying
        }
        setDbError(errMsg);
        setLoading(false);
      }
    } catch (err) {
      if (attempt < 4) {
        console.warn(`Admin products fetch attempt ${attempt} threw: ${err.message}. Retrying in 2s...`);
        setTimeout(() => fetchProductsAndCollections(attempt + 1), 2000);
        return; // keep loading=true while retrying
      }
      setDbError(err.message || 'Network error');
      setLoading(false);
      console.error('Failed to fetch catalog details:', err);
    }
  };



  const searchParams = useSearchParams();
  const editIdParam = searchParams.get('edit');

  useEffect(() => {
    // Wipe all stale localStorage overrides so DB is always source of truth
    if (typeof window !== 'undefined') {
      localStorage.removeItem('houseofginija_custom_products');
    }
    fetchProductsAndCollections();

    const handleProductUpdate = (updatedProduct) => {
      if (!updatedProduct) return;
      setProducts((prev) => {
        const exists = prev.some((p) => String(p.id) === String(updatedProduct.id));
        const next = exists
          ? prev.map((p) => (String(p.id) === String(updatedProduct.id) ? updatedProduct : p))
          : [updatedProduct, ...prev];
        const sortByNewest = (a, b) => {
          const idA = String(a.id || ''); const idB = String(b.id || '');
          if (idA.length !== idB.length) return idB.length - idA.length;
          return idB.localeCompare(idA);
        };
        return next.sort(sortByNewest);
      });
    };

    const handleCustomEvent = (e) => {
      if (e.detail && e.detail.product) {
        handleProductUpdate(e.detail.product);
      } else {
        fetchProductsAndCollections();
      }
    };

    let channel;
    if (typeof window !== 'undefined') {
      window.addEventListener('catalog-updated', handleCustomEvent);
      try {
        channel = new BroadcastChannel('houseofginija-catalog-sync');
        channel.onmessage = (event) => {
          if (event.data && event.data.product) {
            handleProductUpdate(event.data.product);
          }
        };
      } catch {}
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('catalog-updated', handleCustomEvent);
        if (channel) channel.close();
      }
    };
  }, []);

  useEffect(() => {
    if (editIdParam && products.length > 0) {
      const prodToEdit = products.find(p => p.id.toString() === editIdParam || p.slug === editIdParam);
      if (prodToEdit) {
        openEditForm(prodToEdit);
      }
    }
  }, [editIdParam, products]);

  const handleTextChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'price') {
      const origPrice = parseFloat(value) || 0;
      const pct = parseFloat(formFields.flash_sale_percent);
      const computedPrice = (origPrice > 0 && !isNaN(pct) && pct > 0) ? Math.round(origPrice * (1 - pct / 100)) : '';
      setFormFields((prev) => ({
        ...prev,
        price: value,
        flash_sale_price: computedPrice ? computedPrice.toString() : prev.flash_sale_price,
      }));
    } else if (name === 'name' && !editingId) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormFields((prev) => ({
        ...prev,
        name: value,
        slug: generatedSlug,
      }));
    } else {
      setFormFields((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleDiscountPercentChange = (e) => {
    const pctVal = e.target.value;
    const origPrice = parseFloat(formFields.price) || 0;
    const pctNum = parseFloat(pctVal);

    if (!isNaN(pctNum) && pctNum > 0 && pctNum < 100 && origPrice > 0) {
      const computedPrice = Math.round(origPrice * (1 - pctNum / 100));
      setFormFields((prev) => ({
        ...prev,
        flash_sale_percent: pctVal,
        flash_sale_price: computedPrice.toString(),
      }));
    } else {
      setFormFields((prev) => ({
        ...prev,
        flash_sale_percent: pctVal,
      }));
    }
  };

  const handleDiscountPriceChange = (e) => {
    const priceVal = e.target.value;
    const origPrice = parseFloat(formFields.price) || 0;
    const priceNum = parseFloat(priceVal);

    if (!isNaN(priceNum) && priceNum > 0 && priceNum < origPrice && origPrice > 0) {
      const computedPct = Math.round(((origPrice - priceNum) / origPrice) * 100);
      setFormFields((prev) => ({
        ...prev,
        flash_sale_price: priceVal,
        flash_sale_percent: computedPct > 0 ? computedPct.toString() : '',
      }));
    } else {
      setFormFields((prev) => ({
        ...prev,
        flash_sale_price: priceVal,
      }));
    }
  };

  // Client-side image compression
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name || 'image.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now()
            }));
          }, 'image/jpeg', 0.8);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Cloudinary image upload handler (supports multiple files selection)
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImage(true);
    setImageError('');

    const uploadPromises = files.map(async (originalFile) => {
      let file = originalFile;
      try {
        file = await compressImage(file);
      } catch (err) {
        console.error('Compression error:', err);
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        const rawText = await res.text();
        const data = rawText ? JSON.parse(rawText) : {};
        if (res.ok && data.url) {
          return data.url;
        } else {
          throw new Error(data.error || 'Failed to upload image.');
        }
      } catch (err) {
        console.error('Image upload promise err:', err);
        throw err;
      }
    });

    try {
      const results = await Promise.allSettled(uploadPromises);
      const successfulUrls = [];
      let hasFailures = false;

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          successfulUrls.push(result.value);
        } else {
          hasFailures = true;
        }
      });

      if (successfulUrls.length > 0) {
        setImages((prev) => [...prev, ...successfulUrls]);
      }
      if (hasFailures) {
        setImageError('Some images failed to upload. Succeeded files were added.');
      }
    } catch (err) {
      console.error(err);
      setImageError('Network upload failure.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const removeImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const moveImage = (index, direction) => {
    setImages((prev) => {
      const next = [...prev];
      if (direction === 'left' && index > 0) {
        const temp = next[index];
        next[index] = next[index - 1];
        next[index - 1] = temp;
      } else if (direction === 'right' && index < next.length - 1) {
        const temp = next[index];
        next[index] = next[index + 1];
        next[index + 1] = temp;
      }
      return next;
    });
  };

  // Variant management
  const addVariant = () => {
    const stockNum = parseInt(tempVariant.stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      alert('Stock count must be a non-negative number.');
      return;
    }

    // Check if variant combination already exists
    const duplicate = variants.find(
      (v) => v.size === tempVariant.size
    );

    if (duplicate) {
      alert('This variant size already exists in the list.');
      return;
    }

    setVariants((prev) => [
      ...prev,
      {
        size: tempVariant.size,
        color: 'Default',
        stock: stockNum,
      },
    ]);
  };

  const removeVariant = (idxToRemove) => {
    setVariants((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const syncStandardSizes = () => {
    const standardSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    const defaultColor = 'Default';
    const defaultStock = 0;

    const existingSizes = new Set(variants.map(v => v.size));
    const newVariants = [...variants];

    standardSizes.forEach(size => {
      if (!existingSizes.has(size)) {
        newVariants.push({
          size: size,
          color: defaultColor,
          stock: defaultStock
        });
      }
    });

    setVariants(newVariants);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormFields({
      name: '',
      slug: '',
      description: '',
      price: '',
      collection_id: '',
      is_out_of_stock: false,
      on_sale: false,
      flash_sale_price: '',
      flash_sale_percent: '',
    });
    setSelectedCategorySlugs(['suits']);
    setCustomTags([]);
    setSelectedTagIds([]);
    setImages([]);
    setVariants([]);
    setIsFormOpen(true);
  };

  function openEditForm(product) {
    if (!product) return;
    setEditingId(product.id);
    const priceVal = product.price !== null && product.price !== undefined ? product.price.toString() : '';
    const flashVal = product.flash_sale_price !== null && product.flash_sale_price !== undefined ? product.flash_sale_price.toString() : '';

    const origPrice = parseFloat(priceVal) || 0;
    const salePrice = parseFloat(flashVal) || 0;
    const computedPct = (origPrice > 0 && salePrice > 0 && origPrice > salePrice)
      ? Math.round(((origPrice - salePrice) / origPrice) * 100).toString()
      : '';

    setFormFields({
      name: product.name || '',
      slug: product.slug || '',
      description: product.description || '',
      price: priceVal,
      collection_id: product.collection_id ? product.collection_id.toString() : '',
      is_out_of_stock: !!product.is_out_of_stock,
      on_sale: !!(product.on_sale || product.flash_sale),
      flash_sale_price: flashVal,
      flash_sale_percent: computedPct,
    });
    let initialSlugs = Array.isArray(product.collection_slugs) ? [...product.collection_slugs] : [];
    if (product.collection_slug && !initialSlugs.includes(product.collection_slug)) initialSlugs.push(product.collection_slug);
    if (product.parent_collection_slug && !initialSlugs.includes(product.parent_collection_slug)) initialSlugs.push(product.parent_collection_slug);
    if (product.new_arrival && !initialSlugs.includes('new-collection')) initialSlugs.push('new-collection');
    if ((product.on_sale || product.flash_sale) && !initialSlugs.includes('flash-sale')) initialSlugs.push('flash-sale');

    setSelectedCategorySlugs([...new Set(initialSlugs.length > 0 ? initialSlugs : ['suits'])]);
    const existingCustomTags = (product.tags || []).map((t) => (typeof t === 'string' ? t : t?.name || ''));
    setCustomTags([...new Set(existingCustomTags.filter(Boolean))]);
    setSelectedTagIds((product.tags || []).map((tag) => Number(tag?.id)).filter(Boolean));
    const prodImages = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image_url || '/icon.png'];
    const prodVariants = Array.isArray(product.variants) && product.variants.length > 0 ? product.variants : [{ size: 'One Size', stock: 10 }];
    setImages(prodImages);
    setVariants(prodVariants);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const finalCategories = selectedCategorySlugs.length > 0 ? selectedCategorySlugs : ['suits'];
    const finalImages = images.length > 0 ? images : ['/icon.png'];
    const finalVariants = variants.length > 0 ? variants : [{ size: 'One Size', stock: 10 }];

    const formattedCustomTags = customTags.map((name) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: name.trim(),
      slug: name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
    }));

    const isFlashSale = finalCategories.includes('flash-sale');
    const isNewArrival = finalCategories.includes('new-collection');
    let finalSlugs = finalCategories.filter((s) => s !== 'flash-sale');
    if (isNewArrival && !finalSlugs.includes('new-collection')) finalSlugs.push('new-collection');
    if (isFlashSale) {
      finalSlugs = ['flash-sale', ...finalSlugs];
    }

    const origPriceNum = parseFloat(formFields.price) || 0;
    const salePriceNum = formFields.flash_sale_price ? parseFloat(formFields.flash_sale_price) : (origPriceNum > 0 ? Math.round(origPriceNum * 0.8) : null);

    const payload = {
      id: editingId,
      ...formFields,
      collection_slugs: finalSlugs,
      images: finalImages,
      variants: finalVariants,
      tag_ids: selectedTagIds,
      tags: formattedCustomTags,
      new_arrival: isNewArrival,
      on_sale: isFlashSale,
      flash_sale: isFlashSale,
      flash_sale_price: isFlashSale ? salePriceNum : null,
    };

    // Construct local product object for 0ms instant optimistic update
    const targetId = editingId || (Date.now() % 2000000000).toString();
    const optimisticProduct = {
      id: targetId,
      name: formFields.name,
      slug: formFields.slug,
      description: formFields.description,
      price: origPriceNum.toString(),
      collection_id: formFields.collection_id || '1',
      collection_slugs: finalSlugs,
      collection_slug: finalSlugs[0] || 'suits',
      is_out_of_stock: Boolean(formFields.is_out_of_stock),
      images: finalImages,
      variants: finalVariants,
      tags: formattedCustomTags,
      new_arrival: isNewArrival,
      on_sale: isFlashSale,
      flash_sale: isFlashSale,
      flash_sale_price: isFlashSale && salePriceNum ? salePriceNum.toString() : null,
    };

    // 0ms Instant Client State Update & Dialog Close
    setProducts((prev) => {
      const exists = prev.some((p) => String(p.id) === String(targetId));
      const next = exists
        ? prev.map((p) => (String(p.id) === String(targetId) ? { ...p, ...optimisticProduct } : p))
        : [{ ...optimisticProduct }, ...prev];
      // Always put the newest (largest ID) first
      const sortByNewest = (a, b) => {
        const idA = String(a.id || ''); const idB = String(b.id || '');
        if (idA.length !== idB.length) return idB.length - idA.length;
        return idB.localeCompare(idA);
      };
      return next.sort(sortByNewest);
    });

    setIsFormOpen(false);
    setSuccess(`Product "${formFields.name}" saved successfully.`);

    saveStoredLocalCatalogOverride(optimisticProduct);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('catalog-updated', { detail: { product: optimisticProduct } }));
      try {
        const channel = new BroadcastChannel('houseofginija-catalog-sync');
        channel.postMessage({ product: optimisticProduct });
        channel.close();
      } catch {}
    }

    // Async Background Persistence Sync to API
    try {
      // Safety guard: editing mode must have a valid product ID
      if (editingId && !payload.id) {
        payload.id = editingId;
      }
      if (editingId && !payload.id) {
        setError('Cannot save: product ID is missing. Please close and reopen the edit form.');
        return;
      }

      const res = await fetch('/api/admin/products', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedData = await res.json().catch(() => ({}));
        const savedId = savedData?.product?.id || payload.id;
        // Remove the localStorage override so storefront always reads fresh DB data
        if (savedId) removeStoredLocalCatalogOverride(String(savedId));
        setSuccess(`Product "${formFields.name}" saved successfully to catalog.`);
        fetchProductsAndCollections();
      } else {
        const rawText = await res.text();
        const data = rawText ? JSON.parse(rawText) : {};
        setError(data.error || 'Failed to save product to database.');
        // Revert optimistic update by pulling the correct state from the database
        fetchProductsAndCollections();
      }
    } catch (err) {
      console.error('Background product save error:', err);
      setError('Network request error saving product.');
      fetchProductsAndCollections();
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete creation "${name}"? This action cannot be undone.`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        removeStoredLocalCatalogOverride(id);
        setSuccess(`Product "${name}" deleted from catalog.`);
        fetchProductsAndCollections();
      } else {
        const rawText = await res.text();
        const data = rawText ? JSON.parse(rawText) : {};
        setError(data.error || 'Failed to delete product.');
      }
    } catch (err) {
      console.error(err);
      setError('Network request error.');
    }
  };

  return (
    <div style={dashboardLayoutStyle} className="admin-page-root animate-fade-in">
      {/* Sidebar */}
      <AdminSidebar active="products" />

      {/* Main Panel */}
      <main style={mainPanelStyle}>
        {/* Header */}
        <header style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Products Manager</h1>
            <p style={subtitleStyle}>Create, edit, upload, and configure products catalog.</p>
          </div>
          <div style={headerRightActionsStyle}>
            <Link href="/" style={headerVisitStoreBtnStyle}>
              Visit Storefront
            </Link>
            <button onClick={logout} style={headerLogoutBtnStyle}>
              Sign Out
            </button>
            {!isFormOpen && (
              <button onClick={openCreateForm} style={createBtnStyle}>
                + Add Creation
              </button>
            )}
          </div>
        </header>

        {success && <div style={successBannerStyle}>{success}</div>}
        {error && <div style={errorBannerStyle}>{error}</div>}

        {/* CRUD FORM MODAL DIALOG (REACT PORTAL) */}
        {isFormOpen && mounted && createPortal(
          <div
            style={formOverlayBackdropStyle}
            className="animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsFormOpen(false);
            }}
          >
            <section style={formModalContainerStyle}>
              <div style={formHeaderRowStyle}>
                <h2 style={formTitleStyle}>
                  {editingId ? `Edit: ${formFields.name}` : 'Create New Creation'}
                </h2>
                <button onClick={() => setIsFormOpen(false)} style={closeFormBtnStyle}>
                  ✕ Close Form
                </button>
              </div>
              
              {error && <div style={errorBannerStyle}>{error}</div>}
            
            <form onSubmit={handleFormSubmit} style={formStyle}>
              {/* Row 1: Name & Slug */}
              <div style={formRowStyle}>
                <div style={{ ...formGroupStyle, flex: 1.2 }}>
                  <label style={labelStyle}>Product Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formFields.name}
                    onChange={handleTextChange}
                    style={inputStyle}
                    required
                    placeholder="Mulberry Archival Gown"
                  />
                </div>
                <div style={{ ...formGroupStyle, flex: 1 }}>
                  <label style={labelStyle}>URL Slug</label>
                  <input
                    type="text"
                    name="slug"
                    value={formFields.slug}
                    onChange={handleTextChange}
                    style={inputStyle}
                    required
                    placeholder="mulberry-archival-gown"
                  />
                </div>
              </div>

              {/* Row 2: Price & Multi-Category Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={formGroupStyle}>
                  <label style={labelStyle}>Retail Price (₹ INR)</label>
                  <input
                    type="number"
                    name="price"
                    value={formFields.price}
                    onChange={handleTextChange}
                    style={inputStyle}
                    required
                    placeholder="35000"
                  />
                </div>

                <div style={formGroupStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={labelStyle}>Product Categories (Select one or more)</label>
                    <span style={{ fontSize: '0.75rem', color: '#B8860B', fontWeight: '700' }}>
                      {selectedCategorySlugs.length} Selected
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.8rem', backgroundColor: '#FFF7F8', borderRadius: '8px', border: '1px solid #F4E1E5' }}>
                    {ADMIN_CATEGORY_OPTIONS.map((cat) => {
                      const isSelected = selectedCategorySlugs.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategorySlug(cat.id)}
                          style={{
                            padding: '0.45rem 0.9rem',
                            borderRadius: '999px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: isSelected ? '1.5px solid #B8860B' : '1px solid rgba(139, 119, 137, 0.2)',
                            backgroundColor: isSelected ? '#B8860B' : '#FFFFFF',
                            color: isSelected ? '#FFFFFF' : '#3C303A',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            boxShadow: isSelected ? '0 2px 8px rgba(184, 134, 11, 0.25)' : 'none',
                          }}
                        >
                          <span>{cat.name}</span>
                          {isSelected && <span style={{ fontSize: '0.85rem' }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* FLASH SALE DUAL AUTO-CALCULATING DISCOUNT INPUTS */}
                  {selectedCategorySlugs.includes('flash-sale') && (
                    <div style={{
                      marginTop: '0.8rem',
                      padding: '1.2rem',
                      backgroundColor: '#FFF0F3',
                      borderRadius: '10px',
                      border: '1.5px solid #D98E9B',
                    }}>
                      <div style={{ marginBottom: '0.8rem' }}>
                        <label style={{ ...labelStyle, color: '#B65C73', marginBottom: '0.2rem', fontSize: '0.9rem' }}>
                          ⚡ Flash Sale Discount Settings
                        </label>
                        <p style={{ fontSize: '0.75rem', color: 'rgba(0,0,0,0.55)', margin: 0 }}>
                          Type into <strong>either option</strong> below — setting percentage or sale price automatically calculates the other!
                        </p>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
                        {/* OPTION 1: DISCOUNT PERCENTAGE */}
                        <div style={{ backgroundColor: '#FFFFFF', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid rgba(217, 142, 155, 0.4)' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#B65C73', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                            Option 1: Discount % Off
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <input
                              type="number"
                              min="1"
                              max="99"
                              value={formFields.flash_sale_percent || ''}
                              onChange={handleDiscountPercentChange}
                              placeholder="Enter discount %"
                              style={{
                                width: '100%',
                                padding: '0.45rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #D98E9B',
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                color: '#B65C73',
                                outline: 'none'
                              }}
                            />
                            <span style={{ fontWeight: '700', color: '#B65C73', fontSize: '1.1rem' }}>%</span>
                          </div>
                        </div>

                        {/* OPTION 2: DISCOUNT SALE PRICE */}
                        <div style={{ backgroundColor: '#FFFFFF', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid rgba(217, 142, 155, 0.4)' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#B65C73', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                            Option 2: Sale Price (₹)
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: '700', color: '#B65C73', fontSize: '1rem' }}>₹</span>
                            <input
                              type="number"
                              name="flash_sale_price"
                              value={formFields.flash_sale_price || ''}
                              onChange={handleDiscountPriceChange}
                              placeholder="Enter sale price"
                              style={{
                                width: '100%',
                                padding: '0.45rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid #D98E9B',
                                fontSize: '0.95rem',
                                fontWeight: '700',
                                color: '#B65C73',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* SUMMARY PREVIEW */}
                      {formFields.price && formFields.flash_sale_price && (
                        <div style={{ marginTop: '0.8rem', paddingTop: '0.6rem', borderTop: '1px dashed rgba(217, 142, 155, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                          <span style={{ color: 'rgba(0,0,0,0.6)' }}>Original: <span style={{ textDecoration: 'line-through' }}>₹{parseFloat(formFields.price).toLocaleString('en-IN')}</span></span>
                          <span style={{ fontWeight: '700', color: '#B65C73' }}>
                            Final Sale Price: ₹{parseFloat(formFields.flash_sale_price).toLocaleString('en-IN')} ({
                              formFields.flash_sale_percent || Math.round(((parseFloat(formFields.price) - parseFloat(formFields.flash_sale_price)) / parseFloat(formFields.price)) * 100)
                            }% OFF)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: Description */}
              <div style={formGroupStyle}>
                <label style={labelStyle}>Couture Story (Description)</label>
                <textarea
                  name="description"
                  value={formFields.description}
                  onChange={handleTextChange}
                  style={textareaStyle}
                  rows="4"
                  placeholder="Detailed description, textile origin, fit, tailoring instructions..."
                ></textarea>
              </div>

              <AdminProductMetadataFields
                tags={tags}
                selectedTagIds={selectedTagIds}
                onSelectedTagIdsChange={setSelectedTagIds}
                customTags={customTags}
                onCustomTagsChange={setCustomTags}
              />

              {/* Row 4: Toggles */}
              <div style={formRowStyle}>

                <div style={checkboxGroupStyle}>
                  <input
                    type="checkbox"
                    name="is_out_of_stock"
                    id="is_out_of_stock"
                    checked={formFields.is_out_of_stock}
                    onChange={handleTextChange}
                    style={checkboxStyle}
                  />
                  <label htmlFor="is_out_of_stock" style={checkboxLabelStyle}>
                    Manual Out of Stock Override (Force pull item temporarily)
                  </label>
                </div>
              </div>

              <div style={formDividerLineStyle}></div>

              {/* Cloudinary Image Gallery Manager */}
              <div style={formGroupStyle}>
                <h3 style={subFormTitleStyle}>Cloudinary Media Gallery ({images.length})</h3>
                <div style={imageUploadRowStyle}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    style={fileInputStyle}
                    id="img-upload-input"
                  />
                  <label htmlFor="img-upload-input" style={uploadBtnLabelStyle}>
                    {uploadingImage ? 'Uploading to Cloudinary...' : 'Upload Image File(s)'}
                  </label>
                  {imageError && <span style={imageErrorStyle}>{imageError}</span>}
                </div>

                {images.length > 0 && (
                  <div style={imageThumbGridStyle}>
                    {images.map((img, idx) => (
                      <div key={idx} style={formThumbWrapperStyle}>
                        <div style={formThumbContainerStyle}>
                          <img src={img} alt="Uploaded thumbnail" style={formThumbStyle} loading="lazy" />
                          {idx === 0 && <span style={coverBadgeStyle}>Cover</span>}
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            style={removeThumbBtnStyle}
                          >
                            ✕
                          </button>
                        </div>
                        {images.length > 1 && (
                          <div style={reorderBtnContainerStyle}>
                            <button
                              type="button"
                              onClick={() => moveImage(idx, 'left')}
                              disabled={idx === 0}
                              style={{
                                ...reorderButtonStyle,
                                opacity: idx === 0 ? 0.3 : 1,
                                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                              }}
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              onClick={() => moveImage(idx, 'right')}
                              disabled={idx === images.length - 1}
                              style={{
                                ...reorderButtonStyle,
                                opacity: idx === images.length - 1 ? 0.3 : 1,
                                cursor: idx === images.length - 1 ? 'not-allowed' : 'pointer',
                              }}
                            >
                              →
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={formDividerLineStyle}></div>

              {/* Variants Stock Manager */}
              <div style={formGroupStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                  <h3 style={{ ...subFormTitleStyle, margin: 0 }}>Sizing & Color Variants Stock List ({variants.length})</h3>
                  <button 
                    type="button" 
                    onClick={syncStandardSizes} 
                    style={syncSizesBtnStyle}
                  >
                    ⚡ Sync Standard Sizes (S-XXL, 10 Stock)
                  </button>
                </div>
                
                {/* Add Variant Form */}
                <div style={addVariantRowStyle}>
                  <div style={miniFormGroupStyle}>
                    <label style={miniLabelStyle}>Size</label>
                    <select
                      value={tempVariant.size}
                      onChange={(e) => setTempVariant({ ...tempVariant, size: e.target.value })}
                      style={miniSelectStyle}
                    >
                      {sizesOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>



                  <div style={miniFormGroupStyle}>
                    <label style={miniLabelStyle}>Stock Count</label>
                    <input
                      type="number"
                      value={tempVariant.stock}
                      onChange={(e) => setTempVariant({ ...tempVariant, stock: e.target.value })}
                      style={miniInputStyle}
                    />
                  </div>

                  <button type="button" onClick={addVariant} style={addVariantBtnStyle}>
                    Add Variant
                  </button>
                </div>

                {/* Variants List Table */}
                {variants.length > 0 ? (
                  <div style={variantsTableContainerStyle}>
                    <table style={variantsTableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Size</th>
                          <th style={thStyle}>Stock</th>
                          <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((v, idx) => (
                          <tr key={idx} style={trStyle}>
                            <td style={tdStyle}>{v.size}</td>
                            <td style={tdStyle}>{v.stock}</td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => removeVariant(idx)}
                                style={removeVarBtnStyle}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={noVariantsTextStyle}>No sizing variants defined yet. Items must possess at least one size variant.</p>
                )}
              </div>

              <div style={formDividerLineStyle}></div>

              <button type="submit" style={saveFormBtnStyle}>
                {editingId ? 'Save Configuration Changes' : 'Create Product Catalog Item'}
              </button>
            </form>
          </section>
        </div>,
        document.body
        )}

        {/* DB ERROR BANNER */}
        {dbError && (
          <div style={{ background: '#FFF0F0', border: '1px solid #E57373', borderRadius: '8px', padding: '1rem 1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <strong style={{ color: '#C62828', fontSize: '0.95rem' }}>⚠️ Database connection failed</strong>
              <div style={{ color: '#B71C1C', fontSize: '0.82rem', marginTop: '0.25rem' }}>{dbError}</div>
              <div style={{ color: '#888', fontSize: '0.78rem', marginTop: '0.25rem' }}>Showing cached/offline data. Click Retry to reload from database.</div>
            </div>
            <button
              onClick={() => { setDbError(null); setLoading(true); fetchProductsAndCollections(1); }}
              style={{ background: '#C62828', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.2rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* PRODUCTS LIST TABLE */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', border: '4px solid #F4E1E5', borderTop: '4px solid #D98E9B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#8B7789', fontWeight: '600', fontSize: '0.95rem', margin: 0 }}>Loading your catalog from database…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (() => {

          const filteredProducts = products.filter((p) => {
            if (!filterCategory) return true;
            return productMatchesCategory(p, filterCategory);
          }).sort((a, b) => {
            const idA = String(a.id || '');
            const idB = String(b.id || '');
            if (idA.length !== idB.length) return idB.length - idA.length;
            return idB.localeCompare(idA);
          });

          return (
            <div>
              {/* Category Filter Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', gap: '1rem', flexWrap: 'wrap', backgroundColor: '#FFF7F8', padding: '0.9rem 1.2rem', borderRadius: '8px', border: '1px solid #F4E1E5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#3C303A' }}>
                    Filter by Category:
                  </label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      border: '1px solid #D98E9B',
                      backgroundColor: '#FFFFFF',
                      fontSize: '0.85rem',
                      color: '#3C303A',
                      fontWeight: '600',
                      cursor: 'pointer',
                      outline: 'none',
                      boxShadow: '0 2px 6px rgba(217, 142, 155, 0.12)',
                    }}
                  >
                    <option value="">All Categories ({products.length})</option>
                    <option value="new-collection">Fresh Collection</option>
                    <option value="indo-western">Indo-Western</option>
                    <option value="shararas">Drape Sarees</option>
                    <option value="gowns">Heavy Gowns</option>
                    <option value="co-ords">Co-ords</option>
                    <option value="suits">Unstitched Suits</option>
                    <option value="jewellery">Jewellery</option>
                    <option value="earrings">Earrings</option>
                    <option value="necklaces">Necklace</option>
                    <option value="rings">Rings</option>
                    <option value="bracelets">Bracelet</option>
                    <option value="flash-sale">Flash Sale</option>
                  </select>

                  {filterCategory && (
                    <button
                      onClick={() => setFilterCategory('')}
                      style={{
                        padding: '0.45rem 0.9rem',
                        fontSize: '0.78rem',
                        color: '#FFFFFF',
                        backgroundColor: '#D98E9B',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '700',
                      }}
                    >
                      Clear Filter (Show All)
                    </button>
                  )}
                </div>

                <div style={{ fontSize: '0.85rem', color: '#8B7789', fontWeight: '700' }}>
                  Showing <span style={{ color: '#D98E9B' }}>{filteredProducts.length}</span> of {products.length} Products
                </div>
              </div>

              <div style={tableCardStyle}>
                <table style={catalogTableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Creation Details</th>
                      <th style={thStyle} className="hide-on-mobile">Slug</th>
                      <th style={thStyle} className="hide-on-mobile">Collection</th>
                      <th style={thStyle}>Price</th>
                      <th style={thStyle} className="hide-on-mobile">Stock (Sum)</th>
                      <th style={thStyle} className="hide-on-mobile">Status</th>
                      <th style={{ ...thStyle, width: '120px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#8B7789', fontWeight: '600' }}>
                          No products found matching the selected category filter.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => {
                  const totalStock = (p.variants || []).reduce((sum, v) => sum + v.stock, 0);
                  const isForcedOut = p.is_out_of_stock;
                  return (
                    <tr key={p.id} style={trStyle}>
                      <td style={tdStyle}>
                        <div style={productInfoCellStyle}>
                          <img src={(p.images && p.images[0]) || '/placeholder.jpg'} alt={p.name} style={tableProdImgStyle} loading="lazy" />
                          <div>
                            <strong style={tableProdNameStyle}>
                              {p.name}
                            </strong>
                            <AdminProductMetadataBadges product={p} />
                          </div>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontSize: '0.8rem', color: '#000000' }} className="hide-on-mobile">
                        {p.slug}
                      </td>
                      <td style={tdStyle} className="hide-on-mobile">
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '220px' }}>
                          {(() => {
                            let rawSlugs = p.collection_slugs && p.collection_slugs.length > 0 ? [...p.collection_slugs] : [p.collection_slug || 'suits'];
                            if (p.flash_sale || p.on_sale) {
                              rawSlugs = ['flash-sale', ...rawSlugs.filter((s) => s !== 'flash-sale')];
                            }
                            return rawSlugs.map((slug) => {
                              const isFlashTag = slug === 'flash-sale';
                              const catObj = ADMIN_CATEGORY_OPTIONS.find((c) => c.id === slug);
                              return (
                                <span
                                  key={slug}
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: '700',
                                    backgroundColor: isFlashTag ? '#B65C73' : '#F6DDE2',
                                    color: isFlashTag ? '#FFFFFF' : '#7D4352',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '4px',
                                    textTransform: 'capitalize',
                                    boxShadow: isFlashTag ? '0 2px 5px rgba(182, 92, 115, 0.3)' : 'none',
                                  }}
                                >
                                  {isFlashTag ? '⚡ Flash Sale' : (catObj ? catObj.name : slug)}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      </td>
                      <td style={tdStyle}>₹{parseFloat(p.price).toLocaleString('en-IN')}</td>
                      <td style={tdStyle} className="hide-on-mobile">
                        <span style={totalStock <= 5 ? lowStockHighlightStyle : null}>
                          {totalStock} units
                        </span>
                      </td>
                      <td style={tdStyle} className="hide-on-mobile">
                        {isForcedOut ? (
                          <span style={statusBadgeForcedStyle}>Forced Out</span>
                        ) : totalStock === 0 ? (
                          <span style={statusBadgeSoldOutStyle}>Sold Out</span>
                        ) : (
                          <span style={statusBadgeActiveStyle}>Active</span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={actionsGroupStyle}>
                          <button onClick={() => openEditForm(p)} style={editActionBtnStyle}>
                            Edit
                          </button>
                          <button onClick={() => handleDelete(p.id, p.name)} style={deleteActionBtnStyle}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}

// Reuse styles from dashboard OVERVIEW
const dashboardLayoutStyle = {
  display: 'grid',
  gridTemplateColumns: '260px 1fr',
  minHeight: '100vh',
  backgroundColor: '#FFFFFF',
};

// Sidebar styles removed - managed by AdminSidebar component

const mainPanelStyle = {
  padding: '3rem',
  minHeight: '100vh',
};

const headerRightActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
};

const headerVisitStoreBtnStyle = {
  backgroundColor: 'transparent',
  border: '1px solid #000000',
  color: '#000000',
  padding: '0.5rem 1rem',
  fontSize: '0.8rem',
  fontWeight: '600',
  borderRadius: '4px',
  textDecoration: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const headerLogoutBtnStyle = {
  backgroundColor: '#000000',
  border: '1px solid #000000',
  color: '#FFFFFF',
  padding: '0.5rem 1rem',
  fontSize: '0.8rem',
  fontWeight: '600',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '2.5rem',
  borderBottom: '1px solid rgba(60, 48, 58, 0.08)',
  paddingBottom: '1.5rem',
};

const titleStyle = {
  fontFamily: 'var(--font-serif)',
  fontSize: '2.2rem',
  color: '#D98E9B',
  fontWeight: '500',
};

const subtitleStyle = {
  fontSize: '0.85rem',
  color: '#D98E9B',
};

const createBtnStyle = {
  backgroundColor: '#D98E9B',
  color: '#000000',
  padding: '0.6rem 1.5rem',
  fontSize: '0.8rem',
  fontWeight: '600',
  borderRadius: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const successBannerStyle = {
  backgroundColor: '#FFFFFF',
  color: '#000000',
  padding: '0.8rem 1.2rem',
  borderRadius: '4px',
  fontSize: '0.85rem',
  marginBottom: '1.5rem',
  border: '1px solid #c8e6c9',
};

const errorBannerStyle = {
  backgroundColor: '#FFFFFF',
  color: '#000000',
  padding: '0.8rem 1.2rem',
  borderRadius: '4px',
  fontSize: '0.85rem',
  marginBottom: '1.5rem',
  border: '1px solid #ffcdd2',
};

// Form Overlay & Modal Styles
const formOverlayBackdropStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  zIndex: 999999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
};

const formModalContainerStyle = {
  backgroundColor: '#FFFFFF',
  padding: '2.2rem',
  borderRadius: '16px',
  border: '1px solid #F4E1E5',
  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
  maxWidth: '920px',
  width: '100%',
  maxHeight: '88vh',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  position: 'relative',
};

const formHeaderRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '2rem',
};

const formTitleStyle = {
  fontFamily: 'var(--font-serif)',
  fontSize: '1.6rem',
  color: '#D98E9B',
  fontWeight: '500',
};

const closeFormBtnStyle = {
  color: '#000000',
  fontSize: '0.85rem',
  fontWeight: '600',
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const formRowStyle = {
  display: 'flex',
  gap: '1.5rem',
  width: '100%',
};

const formGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
};

const labelStyle = {
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#000000',
  fontWeight: '700',
};

const inputStyle = {
  padding: '0.75rem',
  border: '1px solid rgba(139, 119, 137, 0.25)',
  borderRadius: '4px',
};

const selectStyle = {
  padding: '0.75rem',
  border: '1px solid rgba(139, 119, 137, 0.25)',
  borderRadius: '4px',
  backgroundColor: '#FFFFFF',
};

const textareaStyle = {
  padding: '0.75rem',
  border: '1px solid rgba(139, 119, 137, 0.25)',
  borderRadius: '4px',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.95rem',
  outline: 'none',
};

const checkboxGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  flex: 1,
};

const checkboxStyle = {
  width: '18px',
  height: '18px',
  accentcolor: '#000000',
};

const checkboxLabelStyle = {
  fontSize: '0.82rem',
  color: '#000000',
  fontWeight: '600',
};

const formDividerLineStyle = {
  height: '1px',
  backgroundColor: 'rgba(139, 119, 137, 0.12)',
  margin: '0.5rem 0',
};

// Sub forms
const subFormTitleStyle = {
  fontSize: '0.82rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#D98E9B',
  fontWeight: '700',
  marginBottom: '0.5rem',
};

const imageUploadRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
};

const fileInputStyle = {
  display: 'none',
};

const uploadBtnLabelStyle = {
  backgroundColor: '#D98E9B',
  color: '#000000',
  padding: '0.6rem 1.2rem',
  borderRadius: '4px',
  fontSize: '0.8rem',
  fontWeight: '600',
  cursor: 'pointer',
};

const imageErrorStyle = {
  color: '#000000',
  fontSize: '0.8rem',
};

const imageThumbGridStyle = {
  display: 'flex',
  gap: '1rem',
  flexWrap: 'wrap',
  marginTop: '1rem',
};

const formThumbWrapperStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '80px',
};

const coverBadgeStyle = {
  position: 'absolute',
  top: '4px',
  left: '4px',
  backgroundColor: '#8B7789',
  color: '#FFFFFF',
  fontSize: '0.6rem',
  fontWeight: '700',
  padding: '2px 6px',
  borderRadius: '4px',
  textTransform: 'uppercase',
  zIndex: 2,
};

const reorderBtnContainerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
  marginTop: '4px',
  gap: '4px',
};

const reorderButtonStyle = {
  flex: 1,
  fontSize: '0.75rem',
  fontWeight: '700',
  backgroundColor: '#F5ECE9',
  color: '#8B7789',
  border: '1px solid rgba(139, 119, 137, 0.15)',
  borderRadius: '4px',
  padding: '2px 0',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'background-color 0.2s',
};

const formThumbContainerStyle = {
  position: 'relative',
  width: '80px',
  height: '100px',
  borderRadius: '4px',
  overflow: 'hidden',
  border: '1px solid rgba(139, 119, 137, 0.2)',
};

const formThumbStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const removeThumbBtnStyle = {
  position: 'absolute',
  top: '2px',
  right: '2px',
  backgroundColor: 'rgba(60, 48, 58, 0.8)',
  color: '#000000',
  border: 'none',
  width: '18px',
  height: '18px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.65rem',
  fontWeight: 'bold',
  cursor: 'pointer',
};

// Variant styles
const addVariantRowStyle = {
  display: 'flex',
  gap: '1rem',
  alignItems: 'flex-end',
  backgroundColor: '#FFFFFF',
  padding: '1.2rem',
  borderRadius: '6px',
  marginBottom: '1rem',
};

const miniFormGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
};

const miniLabelStyle = {
  fontSize: '0.65rem',
  textTransform: 'uppercase',
  color: '#000000',
  fontWeight: '700',
};

const miniSelectStyle = {
  padding: '0.5rem',
  border: '1px solid rgba(139, 119, 137, 0.2)',
  fontSize: '0.8rem',
  backgroundColor: '#FFFFFF',
  borderRadius: '4px',
};

const miniInputStyle = {
  padding: '0.5rem',
  border: '1px solid rgba(139, 119, 137, 0.2)',
  fontSize: '0.8rem',
  borderRadius: '4px',
  width: '90px',
};

const addVariantBtnStyle = {
  backgroundColor: '#D98E9B',
  color: '#000000',
  padding: '0.58rem 1.2rem',
  fontSize: '0.8rem',
  fontWeight: '600',
  borderRadius: '4px',
};

const variantsTableContainerStyle = {
  border: '1px solid rgba(139, 119, 137, 0.15)',
  borderRadius: '4px',
  overflow: 'hidden',
};

const variantsTableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  backgroundColor: '#FFFFFF',
};

const noVariantsTextStyle = {
  fontSize: '0.82rem',
  color: '#000000',
  fontStyle: 'italic',
};

const removeVarBtnStyle = {
  color: '#000000',
  fontSize: '0.75rem',
  textDecoration: 'underline',
};

const saveFormBtnStyle = {
  backgroundColor: '#D98E9B',
  color: '#000000',
  padding: '1rem 2rem',
  fontSize: '0.85rem',
  fontWeight: '600',
  borderRadius: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginTop: '1rem',
  boxShadow: 'var(--shadow-sm)',
};

// Catalog Table Styles
const tableCardStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: '8px',
  boxShadow: 'var(--shadow-sm)',
  border: '1px solid rgba(139, 119, 137, 0.12)',
  overflowX: 'auto',
};

const catalogTableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
};

const thStyle = {
  backgroundColor: '#FFFFFF',
  color: '#000000',
  padding: '1rem 1.5rem',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: '700',
};

const trStyle = {
  borderBottom: '1px solid rgba(60, 48, 58, 0.08)',
};

const tdStyle = {
  padding: '1.2rem 1.5rem',
  fontSize: '0.88rem',
  color: '#000000',
};

const productInfoCellStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
};

const tableProdImgStyle = {
  width: '45px',
  height: '55px',
  objectFit: 'cover',
  borderRadius: '4px',
  backgroundColor: '#FFFFFF',
};

const tableProdNameStyle = {
  fontSize: '0.92rem',
  fontWeight: '600',
  color: '#000000',
};

const lowStockHighlightStyle = {
  color: '#000000',
  fontWeight: '700',
};

const statusBadgeActiveStyle = {
  backgroundColor: '#D98E9B',
  color: '#000000',
  fontSize: '0.65rem',
  fontWeight: '700',
  padding: '0.2rem 0.5rem',
  borderRadius: '99px',
  textTransform: 'uppercase',
};

const statusBadgeSoldOutStyle = {
  backgroundColor: '#D98E9B',
  color: '#000000',
  fontSize: '0.65rem',
  fontWeight: '700',
  padding: '0.2rem 0.5rem',
  borderRadius: '99px',
  textTransform: 'uppercase',
};

const statusBadgeForcedStyle = {
  backgroundColor: '#D98E9B',
  color: '#000000',
  fontSize: '0.65rem',
  fontWeight: '700',
  padding: '0.2rem 0.5rem',
  borderRadius: '99px',
  textTransform: 'uppercase',
};

const actionsGroupStyle = {
  display: 'flex',
  gap: '0.8rem',
  justifyContent: 'center',
};

const editActionBtnStyle = {
  color: '#000000',
  fontSize: '0.8rem',
  fontWeight: '600',
};

const deleteActionBtnStyle = {
  color: '#000000',
  fontSize: '0.8rem',
  fontWeight: '600',
};

const syncSizesBtnStyle = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #D98E9B',
  color: '#D98E9B',
  fontSize: '0.78rem',
  fontWeight: '700',
  padding: '0.35rem 0.75rem',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '3rem' }}>Loading catalog manager...</div>}>
      <AdminProductsContent />
    </Suspense>
  );
}
