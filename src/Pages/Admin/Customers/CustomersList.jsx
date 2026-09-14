import React, { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import apiClient from '../../../api/apiClient';
import {
  FiSearch,
  FiMail,
  FiPhone,
  FiMapPin,
  FiPlus,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle
} from 'react-icons/fi';

const CustomersList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    country: 'Malaysia',
    status: 'active',
    avatar: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    city: '',
    country: '',
    status: 'active',
    avatar: ''
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/customers');
      if (res.data.success) {
        setCustomers(res.data.customers || []);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search));

    const matchesStatus =
      statusFilter === 'all' || (c.status && c.status.toLowerCase() === statusFilter.toLowerCase());

    return matchesSearch && matchesStatus;
  });

  // Handle View Details
  const handleOpenDetailModal = async (cust) => {
    setSelectedCustomer(cust);
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      const res = await apiClient.get(`/customers/${cust.id}`);
      if (res.data.success) {
        setCustomerDetail(res.data.customer);
      }
    } catch (err) {
      console.error('Fetch customer detail failed:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // Handle Open Create Modal
  const handleOpenCreateModal = () => {
    setCreateForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      city: '',
      country: 'Malaysia',
      status: 'active',
      avatar: ''
    });
    setShowCreateModal(true);
  };

  // Handle Submit Create Customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await apiClient.post('/customers', createForm);
      if (res.data.success) {
        setMsg({ type: 'success', text: 'New customer account created successfully!' });
        setShowCreateModal(false);
        fetchCustomers();
      } else {
        setMsg({ type: 'danger', text: res.data.message || 'Failed to create customer' });
      }
    } catch (err) {
      setMsg({ type: 'danger', text: err.response?.data?.message || 'Server error creating customer' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Open Edit Modal
  const handleOpenEditModal = (cust) => {
    setSelectedCustomer(cust);
    setEditForm({
      name: cust.name || '',
      email: cust.email || '',
      password: '',
      phone: cust.phone || '',
      city: cust.city || '',
      country: cust.country || '',
      status: cust.status || 'active',
      avatar: cust.avatar || ''
    });
    setShowEditModal(true);
  };

  // Handle Submit Edit Customer
  const handleEditCustomer = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setActionLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await apiClient.put(`/customers/${selectedCustomer.id}`, editForm);
      if (res.data.success) {
        setMsg({ type: 'success', text: `Customer #${selectedCustomer.id} updated successfully!` });
        setShowEditModal(false);
        fetchCustomers();
      } else {
        setMsg({ type: 'danger', text: res.data.message || 'Failed to update customer' });
      }
    } catch (err) {
      setMsg({ type: 'danger', text: err.response?.data?.message || 'Error updating customer' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Customer
  const handleDeleteCustomer = async (cust) => {
    if (!window.confirm(`Are you sure you want to permanently delete customer "${cust.name}"?`)) return;
    try {
      const res = await apiClient.delete(`/customers/${cust.id}`);
      if (res.data.success) {
        setMsg({ type: 'success', text: `Customer #${cust.id} deleted successfully.` });
        fetchCustomers();
      } else {
        setMsg({ type: 'danger', text: res.data.message || 'Failed to delete customer' });
      }
    } catch (err) {
      setMsg({ type: 'danger', text: err.response?.data?.message || 'Error deleting customer' });
    }
  };

  return (
    <div className="customersListPage">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-weight-bold mb-0">Customer Accounts</h3>
          <p className="text-muted small mb-0">View registered shoppers, manage contact profiles, addresses, and status</p>
        </div>
        <Button
          variant="contained"
          className="btn btn-primary font-weight-bold rounded-pill px-4 shadow-sm"
          onClick={handleOpenCreateModal}
        >
          <FiPlus className="mr-1" /> Add New Customer
        </Button>
      </div>

      {/* Alert Banner */}
      {msg.text && (
        <div className={`alert alert-${msg.type} alert-dismissible fade show shadow-sm mb-4`} role="alert">
          <div className="d-flex align-items-center">
            {msg.type === 'success' ? <FiCheckCircle className="mr-2" size={18} /> : <FiAlertCircle className="mr-2" size={18} />}
            <span>{msg.text}</span>
          </div>
          <button type="button" className="close" onClick={() => setMsg({ type: '', text: '' })}>
            <span>&times;</span>
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card border-0 shadow-sm p-3 mb-4 rounded-lg bg-white">
        <div className="row align-items-center">
          <div className="col-md-7 mb-2 mb-md-0">
            <div className="admin-search-box">
              <FiSearch className="search-icon" />
              <input
                type="text"
                className="form-control"
                placeholder="Search customers by name, email or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-5 d-flex justify-content-md-end align-items-center">
            <label className="mr-2 mb-0 small font-weight-bold text-muted">Status:</label>
            <select
              className="form-control custom-select w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive / Deactivated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Datatable */}
      <div className="card border-0 shadow-sm rounded-lg overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="thead-light small text-uppercase">
              <tr>
                <th>Customer Name</th>
                <th>Contact Info</th>
                <th>Location</th>
                <th>Total Orders</th>
                <th>Total Spent</th>
                <th>Status</th>
                <th>Registered Date</th>
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
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-muted">No matching customers found.</td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="avatar-circle mr-3 rounded-circle overflow-hidden d-flex align-items-center justify-content-center shadow-sm" style={{ width: 40, height: 40, flexShrink: 0, backgroundColor: '#007bff' }}>
                          {c.avatar ? (
                            <img src={c.avatar} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div className="w-100 h-100 text-white font-weight-bold d-flex align-items-center justify-content-center">
                              {c.name ? c.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-weight-bold text-dark">{c.name}</div>
                          <span className="small text-muted">ID: #{c.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="small">
                      <div className="d-flex align-items-center text-dark mb-1">
                        <FiMail className="mr-1 text-muted" /> {c.email}
                      </div>
                      {c.phone && (
                        <div className="d-flex align-items-center text-muted">
                          <FiPhone className="mr-1" /> {c.phone}
                        </div>
                      )}
                    </td>
                    <td className="small">
                      {c.city || c.country ? (
                        <div className="d-flex align-items-center text-secondary">
                          <FiMapPin className="mr-1" /> {[c.city, c.country].filter(Boolean).join(', ')}
                        </div>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-light border font-weight-bold px-2 py-1">
                        {c.order_count || 0} orders
                      </span>
                    </td>
                    <td className="font-weight-bold text-success">
                      RM{parseFloat(c.total_spent || 0).toFixed(2)}
                    </td>
                    <td>
                      <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                        {c.status || 'Active'}
                      </span>
                    </td>
                    <td className="small text-muted">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-info"
                          title="View Details"
                          onClick={() => handleOpenDetailModal(c)}
                        >
                          <FiEye size={15} />
                        </button>
                        <button
                          className="btn btn-outline-primary"
                          title="Edit Customer"
                          onClick={() => handleOpenEditModal(c)}
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          className="btn btn-outline-danger"
                          title="Delete Customer"
                          onClick={() => handleDeleteCustomer(c)}
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE CUSTOMER MODAL */}
      {showCreateModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title font-weight-bold">Add New Customer Account</h5>
                <button type="button" className="close text-white" onClick={() => setShowCreateModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleCreateCustomer}>
                <div className="modal-body p-4">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label font-weight-600">Full Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="John Doe"
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label font-weight-600">Email Address *</label>
                      <input
                        type="email"
                        className="form-control"
                        required
                        placeholder="john@example.com"
                        value={createForm.email}
                        onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label font-weight-600">Password *</label>
                      <input
                        type="password"
                        className="form-control"
                        required
                        placeholder="At least 6 characters"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label font-weight-600">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="+60 12-345 6789"
                        value={createForm.phone}
                        onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label font-weight-600">City</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Kuala Lumpur"
                        value={createForm.city}
                        onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label font-weight-600">Country</label>
                      <input
                        type="text"
                        className="form-control"
                        value={createForm.country}
                        onChange={(e) => setCreateForm({ ...createForm, country: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label font-weight-600">Account Status</label>
                      <select
                        className="form-control custom-select"
                        value={createForm.status}
                        onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive / Deactivated</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary px-4" disabled={actionLoading}>
                    {actionLoading ? 'Creating...' : 'Create Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {showEditModal && selectedCustomer && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title font-weight-bold">Edit Customer #{selectedCustomer.id}</h5>
                <button type="button" className="close text-white" onClick={() => setShowEditModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleEditCustomer}>
                <div className="modal-body p-4">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label font-weight-600">Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label font-weight-600">Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        required
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label font-weight-600">Reset Password (Optional)</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Leave blank to keep unchanged"
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label font-weight-600">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label className="form-label font-weight-600">City</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label font-weight-600">Country</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.country}
                        onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label font-weight-600">Status</label>
                      <select
                        className="form-control custom-select"
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary px-4" disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIEW CUSTOMER DETAIL MODAL */}
      {showDetailModal && selectedCustomer && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-xl">
            <div className="modal-content border-0 shadow-lg rounded-lg">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title font-weight-bold">
                  Customer Profile: {selectedCustomer.name} (ID: #{selectedCustomer.id})
                </h5>
                <button type="button" className="close text-white" onClick={() => setShowDetailModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body p-4 bg-light">
                {detailLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                  </div>
                ) : customerDetail ? (
                  <div className="row">
                    {/* Left Column: Account info & Stats */}
                    <div className="col-md-4 mb-3">
                      <div className="card border-0 shadow-sm p-3 mb-3 bg-white rounded-lg">
                        <div className="text-center mb-3">
                          <div className="avatar-circle rounded-circle mx-auto mb-2 overflow-hidden d-flex align-items-center justify-content-center shadow-sm" style={{ width: 64, height: 64, fontSize: 24, backgroundColor: '#007bff' }}>
                            {customerDetail.avatar ? (
                              <img src={customerDetail.avatar} alt={customerDetail.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div className="w-100 h-100 text-white font-weight-bold d-flex align-items-center justify-content-center">
                                {customerDetail.name ? customerDetail.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                            )}
                          </div>
                          <h5 className="font-weight-bold mb-0">{customerDetail.name}</h5>
                          <span className={`badge ${customerDetail.status === 'active' ? 'badge-success' : 'badge-secondary'} mt-1`}>
                            {customerDetail.status || 'active'}
                          </span>
                        </div>
                        <ul className="list-group list-group-flush small">
                          <li className="list-group-item px-0 d-flex align-items-center justify-content-between">
                            <span className="text-muted"><FiMail className="mr-1" /> Email:</span>
                            <span className="font-weight-bold text-dark">{customerDetail.email}</span>
                          </li>
                          <li className="list-group-item px-0 d-flex align-items-center justify-content-between">
                            <span className="text-muted"><FiPhone className="mr-1" /> Phone:</span>
                            <span className="font-weight-bold text-dark">{customerDetail.phone || 'N/A'}</span>
                          </li>
                          <li className="list-group-item px-0 d-flex align-items-center justify-content-between">
                            <span className="text-muted"><FiMapPin className="mr-1" /> Location:</span>
                            <span className="font-weight-bold text-dark">
                              {[customerDetail.city, customerDetail.country].filter(Boolean).join(', ') || 'N/A'}
                            </span>
                          </li>
                          <li className="list-group-item px-0 d-flex align-items-center justify-content-between">
                            <span className="text-muted">Registered:</span>
                            <span className="text-dark">{new Date(customerDetail.created_at).toLocaleDateString()}</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Right Column: Addresses & Orders */}
                    <div className="col-md-8">
                      {/* Address List */}
                      <div className="card border-0 shadow-sm p-3 mb-3 bg-white rounded-lg">
                        <h6 className="font-weight-bold text-uppercase text-muted border-bottom pb-2 mb-3">
                          Saved Address Book ({customerDetail.addresses?.length || 0})
                        </h6>
                        {customerDetail.addresses?.length === 0 ? (
                          <p className="text-muted small mb-0">No addresses saved for this customer.</p>
                        ) : (
                          <div className="row">
                            {customerDetail.addresses.map((addr) => (
                              <div key={addr.id} className="col-md-6 mb-2">
                                <div className="p-2 border rounded bg-light small">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <strong className="text-dark">{addr.title || 'Address'}</strong>
                                    {addr.is_default && <span className="badge badge-primary">Default</span>}
                                  </div>
                                  <div>{addr.recipient_name} ({addr.phone})</div>
                                  <div className="text-muted">
                                    {addr.address_line1}, {[addr.city, addr.country].filter(Boolean).join(', ')}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Orders List */}
                      <div className="card border-0 shadow-sm p-3 bg-white rounded-lg">
                        <h6 className="font-weight-bold text-uppercase text-muted border-bottom pb-2 mb-3">
                          Order History ({customerDetail.orders?.length || 0})
                        </h6>
                        {customerDetail.orders?.length === 0 ? (
                          <p className="text-muted small mb-0">No order history recorded.</p>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-sm align-middle mb-0 small">
                              <thead>
                                <tr>
                                  <th>Order #</th>
                                  <th>Date</th>
                                  <th>Status</th>
                                  <th>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {customerDetail.orders.map((ord) => (
                                  <tr key={ord.id}>
                                    <td className="font-weight-bold text-primary">{ord.order_number}</td>
                                    <td>{new Date(ord.created_at).toLocaleDateString()}</td>
                                    <td>
                                      <span className="badge badge-info">{ord.order_status}</span>
                                    </td>
                                    <td className="font-weight-bold text-success">
                                      RM{parseFloat(ord.total_amount).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted">Failed to load customer profile details.</div>
                )}
              </div>
              <div className="modal-footer bg-white">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersList;
