import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { FiTag, FiPlus, FiTrash2, FiEdit, FiSearch, FiClock } from 'react-icons/fi';
import { getVoucherExpiryInfo } from '../../../utils/voucherUtils';
import CustomSelect from '../../../Components/CustomSelect/CustomSelect';

const VoucherList = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_spend: 0,
    expiry_date: '',
    usage_limit: 100,
    status: 'active'
  });

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/vouchers');
      if (res.data.success) {
        setVouchers(res.data.vouchers || []);
      }
    } catch (err) {
      console.error('Failed to load vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      code: '',
      discount_type: 'percentage',
      discount_value: 10,
      min_spend: 0,
      expiry_date: '',
      usage_limit: 100,
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (v) => {
    setEditingId(v.id);
    let formattedExpiry = '';
    if (v.expiry_date) {
      const d = new Date(v.expiry_date);
      formattedExpiry = d.toISOString().slice(0, 16); // YYYY-MM-THH:mm for datetime-local
    }
    setFormData({
      code: v.code,
      discount_type: v.discount_type,
      discount_value: v.discount_value,
      min_spend: v.min_spend,
      expiry_date: formattedExpiry,
      usage_limit: v.usage_limit,
      status: v.status
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.put(`/vouchers/${editingId}`, formData);
      } else {
        await apiClient.post('/vouchers', formData);
      }
      setIsModalOpen(false);
      fetchVouchers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save voucher');
    }
  };

  const handleDeleteVoucher = async (id, code) => {
    if (window.confirm(`Are you sure you want to delete voucher "${code}"?`)) {
      try {
        await apiClient.delete(`/vouchers/${id}`);
        fetchVouchers();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete voucher');
      }
    }
  };

  const filteredVouchers = vouchers.filter((v) =>
    v.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="voucherListPage">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h3 className="font-weight-bold mb-0">Discount Vouchers</h3>
          <p className="text-muted small mb-0">Manage promo codes, discount values, minimum spend requirements, and usage limits</p>
        </div>
        <Button
          variant="contained"
          className="btn btn-primary font-weight-bold rounded-pill px-4 shadow-sm"
          onClick={handleOpenAddModal}
        >
          <FiPlus className="mr-1" /> Add New Voucher
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
                placeholder="Search by voucher code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Datatable */}
      <div className="card border-0 shadow-sm rounded-lg overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="thead-light small text-uppercase">
              <tr>
                <th>Voucher Code</th>
                <th>Discount</th>
                <th>Min Spend</th>
                <th>Expiry Status</th>
                <th>Usage Limit</th>
                <th>Times Used</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">No vouchers found.</td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const expiryInfo = getVoucherExpiryInfo(v.expiry_date);
                  return (
                    <tr key={v.id}>
                      <td>
                        <span className="badge badge-dark px-3 py-2 font-weight-bold tracking-wider text-uppercase border">
                          <FiTag className="mr-1 text-warning" /> {v.code}
                        </span>
                      </td>
                      <td className="font-weight-bold text-success">
                        {v.discount_type === 'percentage' ? `${v.discount_value}% OFF` : `RM${parseFloat(v.discount_value).toFixed(2)} OFF`}
                      </td>
                      <td className="small font-weight-bold text-muted">
                        RM{parseFloat(v.min_spend || 0).toFixed(2)}
                      </td>
                      <td>
                        {expiryInfo.text ? (
                          <span className={`badge ${
                            expiryInfo.isExpired ? 'badge-danger' :
                            expiryInfo.isCritical ? 'badge-warning text-dark' : 'badge-info text-white'
                          } px-2 py-1 small`}>
                            <FiClock className="mr-1" /> {expiryInfo.text}
                          </span>
                        ) : (
                          <span className="text-muted small">No Expiry</span>
                        )}
                      </td>
                      <td className="small">{v.usage_limit || 'Unlimited'}</td>
                      <td>
                        <span className="badge badge-light border">{v.times_used || 0} used</span>
                      </td>
                      <td>
                        <span className={`badge ${v.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="text-right">
                        <Button
                          size="small"
                          className="mr-2 text-primary"
                          onClick={() => handleOpenEditModal(v)}
                        >
                          <FiEdit />
                        </Button>
                        <Button
                          size="small"
                          className="text-danger"
                          onClick={() => handleDeleteVoucher(v.id, v.code)}
                        >
                          <FiTrash2 />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit} className="p-4">
          <h4 className="font-weight-bold mb-3">{editingId ? 'Edit Voucher' : 'Create New Voucher'}</h4>

          <div className="mb-3">
            <label className="font-weight-bold small text-muted">Voucher Code <span className="text-danger">*</span></label>
            <input
              type="text"
              className="form-control text-uppercase font-weight-bold"
              placeholder="ENTER VOUCHER CODE"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="font-weight-bold small text-muted">Discount Type</label>
              <CustomSelect
                options={[
                  { value: 'percentage', label: 'Percentage (%)' },
                  { value: 'fixed', label: 'Fixed Amount (RM)' }
                ]}
                value={formData.discount_type}
                onChange={(val) => {
                  const type = val.target ? val.target.value : val;
                  setFormData(prev => ({ ...prev, discount_type: type }));
                }}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="font-weight-bold small text-muted">Discount Value <span className="text-danger">*</span></label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                className="form-control"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="font-weight-bold small text-muted">Minimum Spend (RM)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={formData.min_spend}
                onChange={(e) => setFormData({ ...formData, min_spend: e.target.value })}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="font-weight-bold small text-muted">Usage Limit</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={formData.usage_limit}
                onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="font-weight-bold small text-muted">Expiry Date & Time</label>
              <input
                type="datetime-local"
                className="form-control"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
            <div className="col-md-6 mb-3">
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

          <div className="d-flex justify-content-end gap-2 pt-3 border-top">
            <Button className="btn btn-secondary mr-2" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="btn btn-primary font-weight-bold px-4">
              {editingId ? 'Save Changes' : 'Create Voucher'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default VoucherList;
