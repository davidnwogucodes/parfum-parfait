'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeId, setActiveId] = useState(null); // editing
  const [form, setForm] = useState({
    name: '',
    brand: '',
    size: '',
    category: 'retail',
    price: '',
    wholesalePrice: '',
    stock: '',
    image: '',
    description: '',
    notes: '',
  });

  const [discountRules, setDiscountRules] = useState([
    { minQty: '', percent: '' },
  ]);

  const [accords, setAccords] = useState([
    { label: '', strength: '3' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState(null);

  const isEditing = useMemo(() => Boolean(activeId), [activeId]);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch('/api/admin/products', { method: 'GET' });
      const data = await res.json();
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to load products');
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDiscountChange = (index, field, value) => {
    setDiscountRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const handleAccordChange = (index, field, value) => {
    setAccords((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a))
    );
  };

  const addDiscountRow = () =>
    setDiscountRules((prev) => [...prev, { minQty: '', percent: '' }]);

  const addAccordRow = () =>
    setAccords((prev) => [...prev, { label: '', strength: '3' }]);

  const resetForm = () => {
    setActiveId(null);
    setForm({
      name: '',
      brand: '',
      size: '',
      category: 'retail',
      price: '',
      wholesalePrice: '',
      stock: '',
      image: '',
      description: '',
      notes: '',
    });
    setDiscountRules([{ minQty: '', percent: '' }]);
    setAccords([{ label: '', strength: '3' }]);
  };

  const startEdit = (p) => {
    setActiveId(p.id);
    setForm({
      name: p.name || '',
      brand: p.brand || '',
      size: p.size || '',
      category: p.category || 'retail',
      price: p.price ?? '',
      wholesalePrice: p.wholesalePrice ?? '',
      stock: p.stock ?? '',
      image: p.image || '',
      description: p.description || '',
      notes: p.notes || '',
    });

    const dr = Array.isArray(p.discountRules) && p.discountRules.length > 0 ? p.discountRules : [{ minQty: '', percent: '' }];
    setDiscountRules(
      dr.map((r) => ({ minQty: r.minQty ?? '', percent: r.percent ?? '' }))
    );

    const ac = Array.isArray(p.accords) && p.accords.length > 0 ? p.accords : [{ label: '', strength: '3' }];
    setAccords(
      ac.map((a) => ({ label: a.label ?? '', strength: String(a.strength ?? 3) }))
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    const ok = window.confirm('Delete this product? This cannot be undone.');
    if (!ok) return;

    setMessage(null);
    try {
      const res = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok || !data.success) throw new Error(data.error || 'Delete failed');
      setProducts((prev) => prev.filter((p) => p.id !== id));
      if (activeId === id) resetForm();
      setMessage({ type: 'success', text: 'Product deleted.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;

    if (!CLOUDINARY_CLOUD_NAME) {
      setMessage({ type: 'error', text: 'Cloudinary cloud name is missing.' });
      return;
    }

    setUploadingImage(true);
    setMessage(null);
    try {
      // 1) Ask server for a signed upload signature
      const sigRes = await fetch('/api/admin/cloudinary-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'parfum-parfait/products' }),
      });
      const sig = await sigRes.json();
      if (sigRes.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!sigRes.ok) throw new Error(sig.error || 'Failed to get upload signature');

      // 2) Upload directly to Cloudinary using the signed params
      const fd = new FormData();
      fd.append('file', file);
      fd.append('api_key', sig.apiKey);
      fd.append('timestamp', String(sig.timestamp));
      fd.append('signature', sig.signature);
      fd.append('folder', sig.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: 'POST', body: fd }
      );

      const uploaded = await uploadRes.json();
      if (!uploadRes.ok) {
        throw new Error(uploaded?.error?.message || 'Cloudinary upload failed');
      }

      setForm((prev) => ({ ...prev, image: uploaded.public_id || '' }));
      setMessage({ type: 'success', text: 'Image uploaded and linked.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const cleanedDiscounts = discountRules
      .filter((r) => r.minQty && r.percent)
      .map((r) => ({
        minQty: Number(r.minQty),
        percent: Number(r.percent),
      }));

    const cleanedAccords = accords
      .filter((a) => a.label)
      .map((a) => ({
        label: a.label,
        strength: Number(a.strength),
      }));

    const payload = {
      ...(isEditing ? { id: activeId } : {}),
      ...form,
      price: form.price ? Number(form.price) : 0,
      wholesalePrice: form.wholesalePrice ? Number(form.wholesalePrice) : null,
      stock: form.stock ? Number(form.stock) : 0,
      discountRules: cleanedDiscounts,
      accords: cleanedAccords,
    };

    try {
      const res = await fetch('/api/admin/products', {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save product');
      }

      if (isEditing) {
        setProducts((prev) => prev.map((p) => (String(p.id) === String(activeId) ? data.product : p)));
        setMessage({ type: 'success', text: 'Product updated successfully.' });
      } else {
        setProducts((prev) => [data.product, ...prev]);
        setMessage({ type: 'success', text: 'Product saved successfully.' });
      }
      resetForm();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="hero_area sub_page">
        <section className="slider_section position-relative">
          <div className="shop_hero_image">
            <img src="/hh.png" alt="Admin – Products" />
          </div>
          <div className="hero_overlay">
            <div className="hero_overlay_nav">
              <Navbar />
            </div>
            <div className="hero_overlay_content">
              <h1>Admin · Products</h1>
              <p>Create and manage fragrances for Parfum-Parfait.</p>
            </div>
          </div>
        </section>
      </div>

      <section className="layout_padding">
        <div className="container">
          <div className="heading_container mb-4 d-flex align-items-center justify-content-between">
            <div>
              <hr />
              <h2>{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
            </div>
            <Link href="/shop" style={{ color: '#f9a51e' }}>
              View Shop
            </Link>
          </div>

          {message && (
            <div
              className={`alert ${
                message.type === 'success' ? 'alert-success' : 'alert-danger'
              }`}
              role="alert"
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Brand</label>
                  <input
                    type="text"
                    className="form-control"
                    name="brand"
                    value={form.brand}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Size (e.g. 100ml)</label>
                  <input
                    type="text"
                    className="form-control"
                    name="size"
                    value={form.size}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Product image</label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    disabled={uploadingImage}
                    onChange={(e) => handleImageUpload(e.target.files?.[0])}
                  />
                  <div className="mt-2">
                    <label className="form-label">Cloudinary public ID</label>
                    <input
                      type="text"
                      className="form-control"
                      name="image"
                      value={form.image}
                      onChange={handleChange}
                      placeholder="Auto-filled after upload (or paste manually)"
                    />
                  </div>
                  <input
                    type="hidden"
                    name="image_hidden"
                    value={form.image}
                  />
                  <small className="form-text text-muted">
                    Choose an image above to upload. If upload isn’t configured yet, you can still paste an existing Cloudinary public_id.
                  </small>
                </div>
              </div>

              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Retail Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Wholesale Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    name="wholesalePrice"
                    value={form.wholesalePrice}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Stock (Quantity available)</label>
                  <input
                    type="number"
                    className="form-control"
                    name="stock"
                    value={form.stock}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    name="description"
                    rows={3}
                    value={form.description}
                    onChange={handleChange}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Notes (top/middle/base)</label>
                  <textarea
                    className="form-control"
                    name="notes"
                    rows={3}
                    value={form.notes}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <hr className="my-4" />

            <div className="row">
              <div className="col-md-6 mb-4">
                <h5>Discount tiers (optional)</h5>
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                  Example: buy 2+ bottles get 5% off, 5+ bottles get 12% off.
                </p>
                {discountRules.map((rule, index) => (
                  <div className="row mb-2" key={index}>
                    <div className="col-6">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="Min quantity"
                        value={rule.minQty}
                        onChange={(e) =>
                          handleDiscountChange(index, 'minQty', e.target.value)
                        }
                      />
                    </div>
                    <div className="col-6">
                      <input
                        type="number"
                        className="form-control"
                        placeholder="% discount"
                        value={rule.percent}
                        onChange={(e) =>
                          handleDiscountChange(index, 'percent', e.target.value)
                        }
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary mt-1"
                  onClick={addDiscountRow}
                >
                  + Add tier
                </button>
              </div>

              <div className="col-md-6 mb-4">
                <h5>Accords (optional)</h5>
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                  Add how the fragrance feels, similar to Fragrantica (sweet, citrus, musky…).
                </p>
                {accords.map((accord, index) => (
                  <div className="row mb-2" key={index}>
                    <div className="col-7">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Label (e.g. sweet)"
                        value={accord.label}
                        onChange={(e) =>
                          handleAccordChange(index, 'label', e.target.value)
                        }
                      />
                    </div>
                    <div className="col-5">
                      <select
                        className="form-select"
                        value={accord.strength}
                        onChange={(e) =>
                          handleAccordChange(index, 'strength', e.target.value)
                        }
                      >
                        <option value="1">1 – subtle</option>
                        <option value="2">2</option>
                        <option value="3">3 – medium</option>
                        <option value="4">4</option>
                        <option value="5">5 – very strong</option>
                      </select>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary mt-1"
                  onClick={addAccordRow}
                >
                  + Add accord
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-dark px-5"
              disabled={submitting}
            >
              {submitting ? 'Saving…' : isEditing ? 'Update Product' : 'Save Product'}
            </button>

            {isEditing && (
              <button
                type="button"
                className="btn btn-outline-secondary px-5 ms-2"
                onClick={resetForm}
                disabled={submitting}
              >
                Cancel
              </button>
            )}
          </form>

          <hr className="my-5" />

          <div className="d-flex align-items-center justify-content-between mb-3">
            <h4 style={{ margin: 0 }}>Existing products</h4>
            <button className="btn btn-sm btn-outline-secondary" type="button" onClick={loadProducts}>
              Refresh
            </button>
          </div>

          {loadingProducts ? (
            <p style={{ color: '#888' }}>Loading products…</p>
          ) : products.length === 0 ? (
            <p style={{ color: '#888' }}>No products yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Best seller</th>
                    <th style={{ width: 220 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        <div style={{ color: '#777', fontSize: 12 }}>
                          {p.brand ? `${p.brand} · ` : ''}
                          {p.size || ''}
                        </div>
                        <div style={{ color: '#777', fontSize: 12 }}>
                          id: {p.id}
                        </div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{p.category || '-'}</td>
                      <td>${Number(p.price || 0).toFixed(2)}</td>
                      <td>{p.stock ?? 0}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={p.bestSeller === true}
                          onChange={async (e) => {
                            const next = e.target.checked;
                            try {
                              const res = await fetch('/api/admin/products', {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: p.id, bestSeller: next }),
                              });
                              const data = await res.json();
                              if (res.status === 401) {
                                router.push('/admin/login');
                                return;
                              }
                              if (!res.ok || !data.success) throw new Error(data.error || 'Update failed');
                              setProducts((prev) => prev.map((x) => (String(x.id) === String(p.id) ? data.product : x)));
                            } catch (err) {
                              setMessage({ type: 'error', text: err.message });
                            }
                          }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-dark me-2"
                          onClick={() => startEdit(p)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(p.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

