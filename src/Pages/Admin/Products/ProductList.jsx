import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiCloud } from 'react-icons/fi';
import AlertDialog from '../../../Components/AlertDialog/AlertDialog';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Alert Dialog State
  const [alertDialog, setAlertDialog] = useState({ open: false, title: 'Notice', message: '', type: 'error' });
  const showAlert = (message, title = 'Access Denied / Error', type = 'error') => {
    setAlertDialog({ open: true, title, message, type });
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: 0,
    sku: '',
    category_id: '',
    images: '',
    badge: '',
    is_featured: false,
    status: 'published'
  });

  const handleProductImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const data = new FormData();
    files.forEach((file) => data.append('images', file));

    setUploading(true);
    try {
      const res = await apiClient.post('/upload?folder=products', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success && res.data.urls) {
        const currentImgs = formData.images
          ? formData.images.split(',').map((s) => s.trim()).filter(Boolean)
          : [];
        const combined = [...currentImgs, ...res.data.urls];
        setFormData((prev) => ({ ...prev, images: combined.join(', ') }));
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to upload image files.', 'Upload Error', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    const currentImgs = formData.images
      ? formData.images.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    const filtered = currentImgs.filter((_, idx) => idx !== indexToRemove);
    setFormData({ ...formData, images: filtered.join(', ') });
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = '/products?limit=100';
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await apiClient.get(url);
      if (res.data.success) {
        setProducts(res.data.products || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/categories');
      if (res.data.success) {
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [search]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      stock: 10,
      sku: `JD-${Math.floor(1000 + Math.random() * 9000)}`,
      category_id: '',
      images: '',
      badge: 'NEW',
      is_featured: true,
      status: 'published'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingId(p.id);
    const imgs = Array.isArray(p.images) ? p.images : (typeof p.images === 'string' ? JSON.parse(p.images || '[]') : []);

    setFormData({
      name: p.name,
      description: p.description || '',
      price: p.price,
      stock: p.stock,
      sku: p.sku || '',
      category_id: p.category_id || '',
      images: imgs.join(', '),
      badge: p.badge || '',
      is_featured: p.is_featured || false,
      status: p.status || 'published'
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      const imgArray = formData.images.split(',').map(s => s.trim()).filter(Boolean);

      const payload = {
        ...formData,
        images: imgArray
      };

      if (editingId) {
        await apiClient.put(`/products/${editingId}`, payload);
      } else {
        await apiClient.post('/products', payload);
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save product.', 'Action Failed', 'error');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete product "${name}"?`)) {
      try {
        await apiClient.delete(`/products/${id}`);
        fetchProducts();
      } catch (err) {
        showAlert(err.response?.data?.message || 'Failed to delete product.', 'Action Failed', 'error');
      }
    }
  };

  return (
    <div className="productListPage">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h3 className="font-weight-bold mb-0">Product Catalog Management</h3>
          <p className="text-muted small mb-0">Add, edit, or archive inventory items for JD Shop</p>
        </div>
        <Button
          variant="contained"
          className="btn btn-primary font-weight-bold rounded-pill px-4 shadow-sm"
          onClick={handleOpenAddModal}
        >
          <FiPlus className="mr-1" /> Add New Product
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm p-3 mb-4 rounded-lg bg-white">
        <div className="row g-2 align-items-center">
          {/* Search Box */}
          <div className="col-lg-4 col-md-12 mb-2 mb-lg-0">
            <div className="admin-search-box position-relative">
              <input
                type="text"
                className="form-control pl-5 rounded-pill"
                placeholder="Search products by title, SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FiSearch className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Category Filter */}
          <div className="col-lg-3 col-md-4 mb-2 mb-md-0">
            <select
              className="form-control form-control-sm font-weight-bold rounded-pill"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Quantity Filter */}
          <div className="col-lg-3 col-md-4 mb-2 mb-md-0">
            <select
              className="form-control form-control-sm font-weight-bold rounded-pill"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="all">All Stock Levels</option>
              <option value="low">Low Stock (≤ 10)</option>
              <option value="out">Out of Stock (0)</option>
              <option value="instock">In Stock (&gt; 10)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-lg-2 col-md-4">
            <select
              className="form-control form-control-sm font-weight-bold rounded-pill"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Datatable */}
      <div className="card border-0 shadow-sm rounded-lg overflow-hidden bg-white p-3">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="thead-light small text-uppercase">
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock Level</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="mt-2 text-muted small mb-0">Loading inventory products...</p>
                  </td>
                </tr>
              ) : (() => {
                const displayed = products.filter((p) => {
                  if (stockFilter === 'low' && (p.stock > 10 || p.stock === 0)) return false;
                  if (stockFilter === 'out' && p.stock !== 0) return false;
                  if (stockFilter === 'instock' && p.stock <= 10) return false;
                  if (statusFilter !== 'all' && p.status !== statusFilter) return false;
                  if (categoryFilter !== 'all' && String(p.category_id) !== String(categoryFilter)) return false;
                  return true;
                });

                if (displayed.length === 0) {
                  return (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        No products found matching the filter criteria.
                      </td>
                    </tr>
                  );
                }

                return displayed.map((p) => {
                  const imgs = Array.isArray(p.images)
                    ? p.images
                    : (typeof p.images === 'string' ? JSON.parse(p.images || '[]') : []);
                  const thumb = imgs[0] || '';

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          {thumb ? (
                            <img src={thumb} alt={p.name} className="cart-item-thumb mr-3 rounded border" style={{ width: '44px', height: '44px', objectFit: 'cover' }} />
                          ) : (
                            <div className="cart-item-thumb mr-3 rounded border bg-light d-flex align-items-center justify-content-center text-muted small" style={{ width: '44px', height: '44px' }}>
                              <FiCloud size={16} />
                            </div>
                          )}
                          <div>
                            <div className="font-weight-bold text-dark">{p.name}</div>
                            {p.badge && (
                              <span className={`badge font-weight-bold px-2 py-0.5 text-white ${
                                p.badge.toUpperCase() === 'NEW' ? 'bg-success' :
                                p.badge.toUpperCase() === 'SALE' ? 'bg-danger' :
                                'bg-warning text-dark'
                              }`}>
                                {p.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="small font-weight-bold text-muted">{p.sku || 'N/A'}</td>
                      <td>
                        <span className="badge badge-light border px-2 py-1">{p.category_name || 'Uncategorized'}</span>
                      </td>
                      <td className="font-weight-bold text-primary">RM{parseFloat(p.price).toFixed(2)}</td>
                      <td>
                        {p.stock === 0 ? (
                          <span className="badge badge-danger px-2.5 py-1 font-weight-bold">Out of Stock (0)</span>
                        ) : p.stock <= 10 ? (
                          <span className="badge badge-warning text-dark px-2.5 py-1 font-weight-bold">Low ({p.stock} left)</span>
                        ) : (
                          <span className="badge badge-success px-2.5 py-1 font-weight-bold">{p.stock} in stock</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge px-2.5 py-1 font-weight-bold ${p.status === 'draft' ? 'badge-warning text-dark' : 'badge-success'}`}>
                          {p.status === 'draft' ? 'Draft' : 'Published'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="d-inline-flex gap-1">
                          <Button
                            size="small"
                            className="btn btn-sm btn-outline-primary font-weight-bold"
                            onClick={() => handleOpenEditModal(p)}
                            title="Edit Product"
                          >
                            <FiEdit className="mr-1" /> Edit
                          </Button>
                          <Button
                            size="small"
                            className="btn btn-sm btn-outline-danger font-weight-bold"
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            title="Delete Product"
                          >
                            <FiTrash2 className="mr-1" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmitForm} className="p-4">
          <h4 className="font-weight-bold mb-4">{editingId ? 'Edit Product' : 'Add New Product'}</h4>

          <div className="row">
            <div className="col-md-8 mb-3">
              <label className="font-weight-bold small text-muted">Product Name <span className="required-star">*</span></label>
              <input
                type="text"
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="font-weight-bold small text-muted">Category <span className="required-star">*</span></label>
              <select
                className="form-control"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                required
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="font-weight-bold small text-muted">Normal Price (RM) <span className="required-star">*</span></label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="font-weight-bold small text-muted">Stock Quantity <span className="required-star">*</span></label>
              <input
                type="number"
                className="form-control"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-4 mb-3">
              <label className="font-weight-bold small text-muted">SKU Code (Unique)</label>
              <input
                type="text"
                className="form-control text-uppercase"
                placeholder="e.g. JD-1001"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="col-md-4 mb-3">
              <label className="font-weight-bold small text-muted">Badge Label</label>
              <select
                className="form-control"
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
              >
                <option value="">None</option>
                <option value="NEW">NEW</option>
                <option value="SALE">SALE</option>
                <option value="HOT">HOT</option>
              </select>
            </div>
            <div className="col-md-4 mb-3">
              <label className="font-weight-bold small text-muted">Publish Status <span className="required-star">*</span></label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="font-weight-bold small text-muted">Product Images <span className="required-star">*</span></label>
            <div>
              {formData.images ? (
                <div className="card p-3 bg-light border">
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {formData.images.split(',').map((imgUrl, idx) => {
                      const cleanUrl = imgUrl.trim();
                      if (!cleanUrl) return null;
                      return (
                        <div key={idx} className="position-relative d-inline-block">
                          <img
                            src={cleanUrl}
                            alt={`Product Preview ${idx + 1}`}
                            style={{ width: 75, height: 75, objectFit: 'cover' }}
                            className="rounded border shadow-sm"
                          />
                          <button
                            type="button"
                            className="btn btn-danger btn-sm position-absolute p-0 rounded-circle d-flex align-items-center justify-content-center"
                            style={{ top: -6, right: -6, width: 22, height: 22, fontSize: 12, lineHeight: 1 }}
                            onClick={() => handleRemoveImage(idx)}
                            title="Remove image"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div>
                    <label className="btn btn-outline-primary btn-sm font-weight-bold cursor-pointer mb-0">
                      <FiPlus className="mr-1" /> {uploading ? 'Uploading More...' : 'Add Image'}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="d-none"
                        onChange={handleProductImageUpload}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="dropzone-box d-block w-100 mb-0">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="d-none"
                    onChange={handleProductImageUpload}
                    disabled={uploading}
                  />
                  <div className="dropzone-icon mx-auto">
                    <FiCloud size={28} />
                  </div>
                  <div className="font-weight-bold text-dark h6 mb-0">
                    {uploading ? 'Uploading Files...' : 'Browse Files to upload'}
                  </div>
                </label>
              )}
            </div>
          </div>

          <div className="mb-3">
            <label className="font-weight-bold small text-muted">Description</label>
            <textarea
              className="form-control"
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            ></textarea>
          </div>

          <div className="d-flex justify-content-end gap-2 pt-3 border-top">
            <Button className="btn btn-secondary mr-2" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="btn btn-primary font-weight-bold px-4">
              {editingId ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Dialog>

      <AlertDialog
        open={alertDialog.open}
        onClose={() => setAlertDialog((prev) => ({ ...prev, open: false }))}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </div>
  );
};

export default ProductList;
