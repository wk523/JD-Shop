import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { FiPlus, FiTrash2, FiEdit, FiSearch, FiCalendar, FiCloud } from 'react-icons/fi';
import AlertDialog from '../../../Components/AlertDialog/AlertDialog';
import CustomSelect from '../../../Components/CustomSelect/CustomSelect';

const toLocalISOString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const PromotionList = () => {
  const [promotions, setPromotions] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Custom Alert Dialog State
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    title: 'Notice',
    message: '',
    type: 'error'
  });

  const showAlert = (message, title = 'Notice', type = 'error') => {
    setAlertDialog({
      open: true,
      title,
      message,
      type
    });
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const data = new FormData();
    data.append('images', file);

    try {
      const res = await apiClient.post('/upload?folder=banners', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success && res.data.urls && res.data.urls.length > 0) {
        setFormData(prev => ({ ...prev, banner_image: res.data.urls[0] }));
      }
    } catch (err) {
      console.error('Failed to upload campaign banner:', err);
      showAlert('Failed to upload image file.', 'Upload Error', 'error');
    } finally {
      setUploading(false);
    }
  };

  const [formData, setFormData] = useState({
    title: '',
    banner_image: '',
    start_date: toLocalISOString(new Date()),
    end_date: toLocalISOString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    status: 'active'
  });

  // Selected products state map: { [product_id]: { selected: boolean, sale_price: string, discount_percentage: string } }
  const [selectedProductsMap, setSelectedProductsMap] = useState({});
  const [prodSearch, setProdSearch] = useState('');

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/promotions');
      if (res.data.success) {
        setPromotions(res.data.promotions || []);
      }
    } catch (err) {
      console.error('Failed to load promotions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/products?limit=100');
      if (res.data.success) {
        setAllProducts(res.data.products || []);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  useEffect(() => {
    fetchPromotions();
    fetchProducts();
  }, []);

  const [modalProductsList, setModalProductsList] = useState([]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setActiveTab('details');
    setFormData({
      title: '',
      banner_image: '',
      start_date: toLocalISOString(new Date()),
      end_date: toLocalISOString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      status: 'active'
    });

    const initMap = {};
    allProducts.forEach(p => {
      initMap[p.id] = { selected: false, sale_price: '', discount_percentage: '' };
    });
    setSelectedProductsMap(initMap);
    setModalProductsList([...allProducts]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingId(p.id);
    setActiveTab('details');
    setFormData({
      title: p.title,
      banner_image: p.banner_image || '',
      start_date: p.start_date ? toLocalISOString(p.start_date) : '',
      end_date: p.end_date ? toLocalISOString(p.end_date) : '',
      status: p.status
    });

    const initMap = {};
    const selectedIds = new Set();
    if (p.products && Array.isArray(p.products)) {
      p.products.forEach(item => {
        const prodId = item.product_id || item.id;
        if (prodId) {
          selectedIds.add(prodId);
          initMap[prodId] = {
            selected: true,
            sale_price: item.sale_price !== null && item.sale_price !== undefined ? item.sale_price : '',
            discount_percentage: item.discount_percentage !== null && item.discount_percentage !== undefined ? item.discount_percentage : ''
          };
        }
      });
    }

    allProducts.forEach(prod => {
      if (!initMap[prod.id]) {
        initMap[prod.id] = { selected: false, sale_price: '', discount_percentage: '' };
      }
    });

    // Sort initially so selected products are at top when modal opens
    const initialSorted = [...allProducts].sort((a, b) => {
      const aSel = selectedIds.has(a.id);
      const bSel = selectedIds.has(b.id);
      if (aSel && !bSel) return -1;
      if (!aSel && bSel) return 1;
      return 0;
    });

    setSelectedProductsMap(initMap);
    setModalProductsList(initialSorted);
    setIsModalOpen(true);
  };

  const handleToggleProduct = (id) => {
    setSelectedProductsMap(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        selected: !prev[id]?.selected
      }
    }));
  };

  const handlePriceChange = (id, field, val) => {
    setSelectedProductsMap(prev => {
      const current = prev[id] || { selected: false, sale_price: '', discount_percentage: '' };
      const updated = {
        ...current,
        [field]: val
      };

      const hasVal = Boolean(updated.sale_price || updated.discount_percentage);

      return {
        ...prev,
        [id]: {
          ...updated,
          selected: hasVal ? true : current.selected
        }
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Build selected products list
      const productsPayload = [];
      Object.keys(selectedProductsMap).forEach(prodId => {
        const item = selectedProductsMap[prodId];
        if (item.selected) {
          productsPayload.push({
            product_id: parseInt(prodId),
            sale_price: item.sale_price ? parseFloat(item.sale_price) : null,
            discount_percentage: item.discount_percentage ? parseFloat(item.discount_percentage) : null
          });
        }
      });

      const payload = {
        ...formData,
        products: productsPayload
      };

      if (editingId) {
        await apiClient.put(`/promotions/${editingId}`, payload);
      } else {
        await apiClient.post('/promotions', payload);
      }

      setIsModalOpen(false);
      fetchPromotions();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save promotion campaign.', 'Campaign Save Error', 'error');
    }
  };

  const handleDeletePromotion = async (id, title) => {
    if (window.confirm(`Delete promotion campaign "${title}"?`)) {
      try {
        await apiClient.delete(`/promotions/${id}`);
        fetchPromotions();
      } catch (err) {
        showAlert(err.response?.data?.message || 'Failed to delete promotion', 'Delete Error', 'error');
      }
    }
  };

  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'products'

  const selectedCount = Object.values(selectedProductsMap).filter(item => item.selected).length;

  const filteredPromotions = promotions.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const displayedModalProducts = modalProductsList.filter(prod =>
    prod.name.toLowerCase().includes(prodSearch.toLowerCase()) ||
    (prod.sku && prod.sku.toLowerCase().includes(prodSearch.toLowerCase()))
  );

  const getConflictingCampaign = (productId) => {
    if (formData.status !== 'active') return null;
    if (!formData.start_date) return null;

    const sDate = new Date(formData.start_date);
    const eDate = formData.end_date ? new Date(formData.end_date) : null;
    if (isNaN(sDate.getTime())) return null;

    const sTime = sDate.getTime();
    const eTime = eDate && !isNaN(eDate.getTime()) ? eDate.getTime() : Infinity;

    for (const p of promotions) {
      if (p.status !== 'active') continue;
      if (editingId && parseInt(p.id, 10) === parseInt(editingId, 10)) continue;

      const pStart = p.start_date ? new Date(p.start_date) : null;
      const pEnd = p.end_date ? new Date(p.end_date) : null;

      const pStartTime = pStart && !isNaN(pStart.getTime()) ? pStart.getTime() : -Infinity;
      const pEndTime = pEnd && !isNaN(pEnd.getTime()) ? pEnd.getTime() : Infinity;

      // Time Overlap Check: Range A [sTime, eTime] overlaps Range B [pStartTime, pEndTime] if:
      // pStartTime <= eTime AND pEndTime >= sTime
      const isOverlap = (pStartTime <= eTime) && (pEndTime >= sTime);

      if (isOverlap && p.products && Array.isArray(p.products)) {
        const found = p.products.find(item => (parseInt(item.product_id || item.id, 10)) === parseInt(productId, 10));
        if (found) {
          const endDateFormatted = pEnd ? pEnd.toLocaleDateString() : 'Ongoing';
          return {
            title: p.title,
            endStr: endDateFormatted
          };
        }
      }
    }
    return null;
  };

  return (
    <div className="promotionListPage">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h3 className="font-weight-bold mb-0">Promotions & Sales Campaigns</h3>
          <p className="text-muted small mb-0">Manage 9-9 Sales, Flash Sales, banner images, schedules, and promotional pricing</p>
        </div>
        <Button
          variant="contained"
          className="btn btn-primary font-weight-bold rounded-pill px-4 shadow-sm"
          onClick={handleOpenAddModal}
        >
          <FiPlus className="mr-1" /> Create New Campaign
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm p-3 mb-4 rounded-lg bg-white">
        <div className="row align-items-center">
          <div className="col-md-6">
            <div className="admin-search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Search promotion campaigns..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Promotions Datatable */}
      <div className="card border-0 shadow-sm rounded-lg overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="thead-light small text-uppercase">
              <tr>
                <th>Campaign</th>
                <th>Schedule (Start — End)</th>
                <th>Included Products</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                  </td>
                </tr>
              ) : filteredPromotions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">No promotion campaigns created yet.</td>
                </tr>
              ) : (
                filteredPromotions.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        {p.banner_image ? (
                          <img
                            src={p.banner_image}
                            alt={p.title}
                            className="mr-3 rounded border"
                            style={{ width: 60, height: 40, objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            className="mr-3 rounded border bg-light d-flex align-items-center justify-content-center text-muted small"
                            style={{ width: 60, height: 40 }}
                          >
                            <FiCloud size={18} />
                          </div>
                        )}
                        <div>
                          <div className="font-weight-bold text-dark">{p.title}</div>
                          <span className="small text-muted">Campaign ID: #{p.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="small">
                      <div><FiCalendar className="mr-1 text-muted" /> <b>Start:</b> {p.start_date ? new Date(p.start_date).toLocaleString() : 'Immediate'}</div>
                      <div><FiCalendar className="mr-1 text-muted" /> <b>End:</b> {p.end_date ? new Date(p.end_date).toLocaleString() : 'Ongoing'}</div>
                    </td>
                    <td>
                      <span className="badge badge-light border font-weight-bold px-3 py-2">
                        {p.products ? p.products.length : 0} items on sale
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <Button
                        size="small"
                        className="mr-2 text-primary"
                        onClick={() => handleOpenEditModal(p)}
                      >
                        <FiEdit />
                      </Button>
                      <Button
                        size="small"
                        className="text-danger"
                        onClick={() => handleDeletePromotion(p.id, p.title)}
                      >
                        <FiTrash2 />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Campaign Modal - Side Tab Layout */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="lg" fullWidth>
        <form onSubmit={handleSubmit} className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
            <h4 className="font-weight-bold mb-0">{editingId ? 'Edit Promotion Campaign' : 'Create Promotion Campaign'}</h4>
            <button type="button" className="btn-close btn btn-sm btn-light" onClick={() => setIsModalOpen(false)}>✕</button>
          </div>

          <div className="row" style={{ minHeight: '480px' }}>
            {/* Left Side Tabs Navigation */}
            <div className="col-md-3 border-right pr-md-3 mb-3 mb-md-0">
              <div className="nav flex-column nav-pills gap-2">
                <button
                  type="button"
                  className={`nav-link text-left d-flex align-items-center justify-content-between py-3 px-3 font-weight-bold rounded ${activeTab === 'details' ? 'active bg-primary text-white' : 'btn-light text-dark'}`}
                  onClick={() => setActiveTab('details')}
                >
                  <span>📋 Campaign Info</span>
                </button>

                <button
                  type="button"
                  className={`nav-link text-left d-flex align-items-center justify-content-between py-3 px-3 font-weight-bold rounded ${activeTab === 'products' ? 'active bg-primary text-white' : 'btn-light text-dark'}`}
                  onClick={() => setActiveTab('products')}
                >
                  <span>📦 Products</span>
                  <span className={`badge ${activeTab === 'products' ? 'badge-light text-primary' : 'badge-primary text-white'}`}>
                    {selectedCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Right Side Content View */}
            <div className="col-md-9 pl-md-4">
              {activeTab === 'details' && (
                <div>
                  <h5 className="font-weight-bold mb-3 text-primary border-bottom pb-2">Campaign Settings</h5>

                  <div className="row mb-3">
                    <div className="col-md-8">
                      <label className="font-weight-bold small text-muted">Campaign Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 9-9 Mega Sales Day"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="font-weight-bold small text-muted">Status</label>
                      <CustomSelect
                        options={[
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' }
                        ]}
                        value={formData.status}
                        onChange={(val) => {
                          const st = val.target ? val.target.value : val;
                          setFormData(prev => ({ ...prev, status: st }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="font-weight-bold small text-muted">Campaign Banner Image</label>
                    {formData.banner_image ? (
                      <div className="card p-3 bg-light border d-flex flex-row align-items-center justify-content-between">
                        <img
                          src={formData.banner_image}
                          alt="Campaign Banner Preview"
                          style={{ width: 140, height: 80, objectFit: 'cover' }}
                          className="rounded border shadow-sm"
                        />
                        <div className="d-flex gap-2">
                          <label className="btn btn-outline-primary btn-sm font-weight-bold cursor-pointer mb-0 mr-2">
                            <FiPlus className="mr-1" /> {uploading ? 'Uploading...' : 'Change Image'}
                            <input
                              type="file"
                              accept="image/*"
                              className="d-none"
                              onChange={handleBannerUpload}
                              disabled={uploading}
                            />
                          </label>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm font-weight-bold"
                            onClick={() => setFormData(prev => ({ ...prev, banner_image: '' }))}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="dropzone-box d-block w-100 mb-0 border rounded p-4 text-center cursor-pointer bg-light">
                        <input
                          type="file"
                          accept="image/*"
                          className="d-none"
                          onChange={handleBannerUpload}
                          disabled={uploading}
                        />
                        <div className="dropzone-icon mx-auto text-primary mb-2">
                          <FiCloud size={32} />
                        </div>
                        <div className="font-weight-bold text-dark h6 mb-0">
                          {uploading ? 'Uploading Banner...' : 'Click to Upload Banner Image'}
                        </div>
                      </label>
                    )}
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="font-weight-bold small text-muted">Start Date & Time <span className="text-danger">*</span></label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="font-weight-bold small text-muted">End Date & Time <span className="text-danger">*</span></label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'products' && (
                <div>
                  <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                    <h5 className="font-weight-bold mb-0 text-primary">Select Products & Sales Prices</h5>
                    <input
                      type="text"
                      className="form-control form-control-sm w-auto"
                      placeholder="Search products..."
                      value={prodSearch}
                      onChange={(e) => setProdSearch(e.target.value)}
                    />
                  </div>

                  <div className="table-responsive border rounded bg-white" style={{ maxHeight: '430px', overflowY: 'auto' }}>
                    <table className="table table-hover align-middle mb-0 small">
                      <thead className="thead-light sticky-top" style={{ zIndex: 5 }}>
                        <tr>
                          <th style={{ width: '40px' }}>Include</th>
                          <th>Product</th>
                          <th>Normal Price</th>
                          <th style={{ width: '130px' }}>Sales Price (RM)</th>
                          <th style={{ width: '110px' }}>Discount (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayedModalProducts.map((prod) => {
                          const conflictInfo = getConflictingCampaign(prod.id);
                          const isConflict = Boolean(conflictInfo);

                          const isSelected = !isConflict && (selectedProductsMap[prod.id]?.selected || false);
                          const salePrice = selectedProductsMap[prod.id]?.sale_price || '';
                          const discountPct = selectedProductsMap[prod.id]?.discount_percentage || '';
                          const hasSalePrice = salePrice !== '' && salePrice !== null && salePrice !== undefined;
                          const hasDiscountPct = discountPct !== '' && discountPct !== null && discountPct !== undefined;
                          const imgs = Array.isArray(prod.images) ? prod.images : (typeof prod.images === 'string' ? JSON.parse(prod.images || '[]') : []);
                          const thumb = imgs[0] || '';

                          return (
                            <tr
                              key={prod.id}
                              className={isConflict ? 'bg-light text-muted opacity-50' : (isSelected ? 'table-primary font-weight-bold' : '')}
                            >
                              <td className="text-center">
                                <input
                                  type="checkbox"
                                  style={{ width: 18, height: 18, cursor: isConflict ? 'not-allowed' : 'pointer' }}
                                  checked={isSelected}
                                  onChange={() => !isConflict && handleToggleProduct(prod.id)}
                                  disabled={isConflict}
                                  title={isConflict ? `Unavailable: Active in "${conflictInfo.title}" until ${conflictInfo.endStr}` : ''}
                                />
                              </td>
                              <td>
                                <div className="d-flex align-items-center">
                                  {thumb && <img src={thumb} alt={prod.name} className="mr-2 rounded border" style={{ width: 32, height: 32, objectFit: 'cover', opacity: isConflict ? 0.6 : 1 }} />}
                                  <div>
                                    <span className={`d-block ${isConflict ? 'text-muted' : (isSelected ? 'text-primary font-weight-bold' : 'text-dark')}`}>
                                      {prod.name}
                                    </span>
                                    {isConflict ? (
                                      <span className="text-secondary small d-block font-italic mt-1" style={{ fontSize: '11px' }}>
                                        🔒 Active in "{conflictInfo.title}" until {conflictInfo.endStr}
                                      </span>
                                    ) : isSelected && (
                                      <span className="badge badge-success font-weight-normal px-2 py-0 mt-1" style={{ fontSize: '10px' }}>
                                        SELECTED
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="font-weight-bold text-muted">RM{parseFloat(prod.price).toFixed(2)}</td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder={isConflict ? `In promo until ${conflictInfo.endStr}` : "e.g. 45.00"}
                                  className={`form-control form-control-sm ${isSelected && !hasDiscountPct && !isConflict ? 'border-primary bg-white' : ''}`}
                                  value={isConflict ? '' : salePrice}
                                  onChange={(e) => !isConflict && handlePriceChange(prod.id, 'sale_price', e.target.value)}
                                  disabled={isConflict || !isSelected || hasDiscountPct}
                                  title={isConflict ? `Active in "${conflictInfo.title}" until ${conflictInfo.endStr}` : (hasDiscountPct ? 'Disabled because Discount (%) is entered' : '')}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="1"
                                  placeholder={isConflict ? "Unavailable" : "e.g. 15"}
                                  className={`form-control form-control-sm ${isSelected && !hasSalePrice && !isConflict ? 'border-primary bg-white' : ''}`}
                                  value={isConflict ? '' : discountPct}
                                  onChange={(e) => !isConflict && handlePriceChange(prod.id, 'discount_percentage', e.target.value)}
                                  disabled={isConflict || !isSelected || hasSalePrice}
                                  title={isConflict ? `Active in "${conflictInfo.title}" until ${conflictInfo.endStr}` : (hasSalePrice ? 'Disabled because Sales Price is entered' : '')}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-4">
            <span className="small text-muted">
              {selectedCount} product(s) selected for this campaign
            </span>
            <div className="d-flex gap-2">
              <Button className="btn btn-secondary mr-2" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="btn btn-primary font-weight-bold px-4">
                {editingId ? 'Save Campaign Changes' : 'Create Campaign'}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

      {/* Styled Alert Dialog */}
      <AlertDialog
        open={alertDialog.open}
        onClose={() => setAlertDialog(prev => ({ ...prev, open: false }))}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </div>
  );
};

export default PromotionList;
