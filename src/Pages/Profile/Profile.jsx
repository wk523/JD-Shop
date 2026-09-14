import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import {
  FiUser,
  FiMapPin,
  FiLock,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiPhone,
  FiMail,
  FiShield,
  FiUpload
} from 'react-icons/fi';
import { MALAYSIAN_STATES, SUPPORTED_COUNTRIES } from '../../utils/locationData';
import CustomSelect from '../../Components/CustomSelect/CustomSelect';
import './Profile.css';

const Profile = () => {
  const { customer, updateCustomerState } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'addresses', 'security'
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    city: customer?.city || '',
    country: customer?.country || '',
    avatar: customer?.avatar || ''
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Addresses State
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    title: 'Home',
    recipient_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Malaysia',
    is_default: false
  });

  // Update profile form state when customer context updates
  useEffect(() => {
    if (customer) {
      setProfileForm({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        city: customer.city || '',
        country: customer.country || '',
        avatar: customer.avatar || ''
      });
    }
  }, [customer]);

  // Load addresses when addresses tab selected
  useEffect(() => {
    if (customer && activeTab === 'addresses') {
      fetchAddresses();
    }
  }, [activeTab, customer]);

  const fetchAddresses = async () => {
    setAddressesLoading(true);
    try {
      const res = await apiClient.get('/addresses');
      if (res.data.success) {
        setAddresses(res.data.addresses || []);
      }
    } catch (err) {
      console.error('Fetch addresses error:', err);
    } finally {
      setAddressesLoading(false);
    }
  };

  // Handle Avatar Image File Upload
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('images', file);

    setUploadingAvatar(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await apiClient.post('/upload?folder=avatars', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success && res.data.url) {
        setProfileForm(prev => ({ ...prev, avatar: res.data.url }));
        setMsg({ type: 'success', text: 'Profile picture uploaded! Click "Save Profile Changes" to save.' });
      } else {
        setMsg({ type: 'danger', text: res.data.message || 'Image upload failed' });
      }
    } catch (err) {
      setMsg({ type: 'danger', text: 'Error uploading profile image' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!customer) {
    return (
      <div className="container py-5 text-center">
        <div className="card shadow-sm border-0 p-5 max-w-md mx-auto rounded-lg">
          <FiUser size={48} className="text-muted mx-auto mb-3" />
          <h4 className="font-weight-bold">Customer Login Required</h4>
          <p className="text-muted small">Please sign in to view and manage your account profile and addresses.</p>
          <div className="mt-3">
            <Link to="/login" className="btn btn-primary px-4">Sign In Now</Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle Profile Submit
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await apiClient.put('/auth/profile', {
        name: profileForm.name,
        phone: profileForm.phone,
        city: profileForm.city,
        country: profileForm.country,
        avatar: profileForm.avatar
      });

      if (res.data.success) {
        updateCustomerState(res.data.user);
        setMsg({ type: 'success', text: 'Profile information updated successfully!' });
      } else {
        setMsg({ type: 'danger', text: res.data.message || 'Failed to update profile' });
      }
    } catch (err) {
      setMsg({ type: 'danger', text: err.response?.data?.message || 'Server error updating profile' });
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Submit
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMsg({ type: 'danger', text: 'New passwords do not match.' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMsg({ type: 'danger', text: 'New password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (res.data.success) {
        setMsg({ type: 'success', text: 'Password updated successfully!' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMsg({ type: 'danger', text: res.data.message || 'Failed to change password' });
      }
    } catch (err) {
      setMsg({ type: 'danger', text: err.response?.data?.message || 'Error changing password' });
    } finally {
      setLoading(false);
    }
  };

  // Address Modal Helpers
  const handleOpenAddressModal = (addr = null) => {
    setMsg({ type: '', text: '' });
    if (addr) {
      setEditingAddress(addr);
      setAddressForm({
        title: addr.title || 'Home',
        recipient_name: addr.recipient_name || '',
        phone: addr.phone || '',
        address_line1: addr.address_line1 || '',
        address_line2: addr.address_line2 || '',
        city: addr.city || '',
        state: addr.state || '',
        postal_code: addr.postal_code || '',
        country: addr.country || 'Malaysia',
        is_default: addr.is_default || false
      });
    } else {
      setEditingAddress(null);
      setAddressForm({
        title: 'Home',
        recipient_name: customer.name || '',
        phone: customer.phone || '',
        address_line1: '',
        address_line2: '',
        city: customer.city || '',
        state: '',
        postal_code: '',
        country: customer.country || 'Malaysia',
        is_default: addresses.length === 0
      });
    }
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingAddress) {
        const res = await apiClient.put(`/addresses/${editingAddress.id}`, addressForm);
        if (res.data.success) {
          setMsg({ type: 'success', text: 'Address updated successfully!' });
          setShowAddressModal(false);
          fetchAddresses();
        }
      } else {
        const res = await apiClient.post('/addresses', addressForm);
        if (res.data.success) {
          setMsg({ type: 'success', text: 'New address added successfully!' });
          setShowAddressModal(false);
          fetchAddresses();
        }
      }
    } catch (err) {
      setMsg({ type: 'danger', text: err.response?.data?.message || 'Failed to save address' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      const res = await apiClient.delete(`/addresses/${id}`);
      if (res.data.success) {
        setMsg({ type: 'success', text: 'Address removed.' });
        fetchAddresses();
      }
    } catch (err) {
      setMsg({ type: 'danger', text: 'Failed to delete address' });
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      const res = await apiClient.put(`/addresses/${id}/set-default`);
      if (res.data.success) {
        setMsg({ type: 'success', text: 'Default address updated!' });
        fetchAddresses();
      }
    } catch (err) {
      setMsg({ type: 'danger', text: 'Failed to set default address' });
    }
  };

  return (
    <div className="profile-page bg-light py-4">
      <div className="container">
        {/* Header Title Banner */}
        <div className="card border-0 shadow-sm rounded-lg p-4 mb-4 bg-white">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center">
              <div className="avatar-preview-circle mr-3">
                {profileForm.avatar ? (
                  <img src={profileForm.avatar} alt={profileForm.name} className="img-fluid rounded-circle" style={{ width: 64, height: 64, objectFit: 'cover' }} />
                ) : (
                  <div className="avatar-placeholder bg-primary text-white font-weight-bold rounded-circle">
                    {profileForm.name ? profileForm.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-weight-bold mb-1">{profileForm.name}</h3>
                <p className="text-muted small mb-0 d-flex align-items-center gap-2">
                  <FiMail className="mr-1" /> {profileForm.email}
                  <span className="badge badge-success ml-2">Customer Account</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* System Alert Message */}
        {msg.text && (
          <div className={`alert alert-${msg.type} alert-dismissible fade show shadow-sm mb-4`} role="alert">
            <div className="d-flex align-items-center">
              {msg.type === 'success' ? <FiCheckCircle className="mr-2" size={20} /> : <FiAlertCircle className="mr-2" size={20} />}
              <span>{msg.text}</span>
            </div>
            <button type="button" className="close" onClick={() => setMsg({ type: '', text: '' })}>
              <span>&times;</span>
            </button>
          </div>
        )}

        <div className="row">
          {/* Sidebar Nav */}
          <div className="col-lg-3 col-md-4 mb-4">
            <div className="card border-0 shadow-sm rounded-lg p-2 bg-white sticky-top" style={{ top: 90 }}>
              <div className="nav flex-column nav-pills profile-nav">
                <button
                  className={`nav-link text-left border-0 d-flex align-items-center mb-1 ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('profile'); setMsg({ type: '', text: '' }); }}
                >
                  <FiUser className="mr-2" size={18} /> Personal Info
                </button>
                <button
                  className={`nav-link text-left border-0 d-flex align-items-center mb-1 ${activeTab === 'addresses' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('addresses'); setMsg({ type: '', text: '' }); }}
                >
                  <FiMapPin className="mr-2" size={18} /> Address Book ({addresses.length})
                </button>
                <button
                  className={`nav-link text-left border-0 d-flex align-items-center mb-1 ${activeTab === 'security' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('security'); setMsg({ type: '', text: '' }); }}
                >
                  <FiLock className="mr-2" size={18} /> Security & Password
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content Panels */}
          <div className="col-lg-9 col-md-8">
            {/* Tab 1: Personal Info */}
            {activeTab === 'profile' && (
              <div className="card border-0 shadow-sm rounded-lg p-4 bg-white">
                <h5 className="font-weight-bold mb-3 border-bottom pb-2">Personal Information</h5>
                <form onSubmit={handleProfileSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label font-weight-600">Full Name</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label font-weight-600">Email Address (Account ID)</label>
                      <input
                        type="email"
                        className="form-control bg-light"
                        disabled
                        value={profileForm.email}
                      />
                      <small className="text-muted">Email cannot be changed.</small>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label font-weight-600">Phone Number</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="+60 12-345 6789"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label font-weight-600">Profile Picture</label>
                      <div className="d-flex align-items-center gap-3">
                        {profileForm.avatar ? (
                          <img
                            src={profileForm.avatar}
                            alt="Avatar Preview"
                            className="rounded-circle border"
                            style={{ width: 46, height: 46, objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            className="rounded-circle bg-primary text-white font-weight-bold d-flex align-items-center justify-content-center"
                            style={{ width: 46, height: 46 }}
                          >
                            {profileForm.name ? profileForm.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div>
                          <label className="btn btn-outline-primary btn-sm mb-0 mr-2 cursor-pointer">
                            <FiUpload className="mr-1" />
                            {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                            <input
                              type="file"
                              accept="image/*"
                              className="d-none"
                              disabled={uploadingAvatar}
                              onChange={handleAvatarUpload}
                            />
                          </label>
                          {profileForm.avatar && (
                            <button
                              type="button"
                              className="btn btn-link btn-sm text-danger p-0 text-decoration-none"
                              onClick={() => setProfileForm({ ...profileForm, avatar: '' })}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label font-weight-600">City / Region</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Kuala Lumpur"
                        value={profileForm.city}
                        onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label font-weight-600">Country</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Malaysia"
                        value={profileForm.country}
                        onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                      {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 2: Address Book */}
            {activeTab === 'addresses' && (
              <div className="card border-0 shadow-sm rounded-lg p-4 bg-white">
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <div>
                    <h5 className="font-weight-bold mb-0">My Address Book</h5>
                    <p className="text-muted small mb-0">Manage multiple delivery addresses for seamless checkout</p>
                  </div>
                  <button
                    className="btn btn-primary btn-sm d-flex align-items-center"
                    onClick={() => handleOpenAddressModal(null)}
                  >
                    <FiPlus className="mr-1" /> Add New Address
                  </button>
                </div>

                {addressesLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="text-center py-5 border rounded bg-light">
                    <FiMapPin size={40} className="text-muted mb-2" />
                    <h6>No Delivery Addresses Saved</h6>
                    <p className="text-muted small">Save your home, office or shipping location for quicker checkout.</p>
                    <button className="btn btn-outline-primary btn-sm mt-2" onClick={() => handleOpenAddressModal(null)}>
                      <FiPlus className="mr-1" /> Add Address
                    </button>
                  </div>
                ) : (
                  <div className="row">
                    {addresses.map((addr) => (
                      <div key={addr.id} className="col-md-6 mb-3">
                        <div className={`card h-100 border rounded-lg ${addr.is_default ? 'border-primary shadow-sm bg-light-primary' : ''}`}>
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <span className="badge badge-secondary text-uppercase px-2 py-1">{addr.title || 'Address'}</span>
                              {addr.is_default ? (
                                <span className="badge badge-primary px-2 py-1 d-flex align-items-center">
                                  <FiCheckCircle className="mr-1" size={12} /> Default Shipping
                                </span>
                              ) : (
                                <button
                                  className="btn btn-link btn-sm p-0 text-muted small text-decoration-none"
                                  onClick={() => handleSetDefaultAddress(addr.id)}
                                >
                                  Set Default
                                </button>
                              )}
                            </div>

                            <h6 className="font-weight-bold text-dark mb-1">{addr.recipient_name}</h6>
                            <p className="text-muted small mb-2 d-flex align-items-center">
                              <FiPhone className="mr-1" size={14} /> {addr.phone}
                            </p>
                            <p className="small mb-3 text-secondary">
                              {addr.address_line1}
                              {addr.address_line2 && <>, {addr.address_line2}</>}
                              <br />
                              {[addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean).join(', ')}
                            </p>

                            <div className="d-flex justify-content-end gap-2 border-top pt-2">
                              <button
                                className="btn btn-sm btn-outline-secondary mr-2"
                                onClick={() => handleOpenAddressModal(addr)}
                              >
                                <FiEdit2 size={14} className="mr-1" /> Edit
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDeleteAddress(addr.id)}
                              >
                                <FiTrash2 size={14} className="mr-1" /> Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Security */}
            {activeTab === 'security' && (
              <div className="card border-0 shadow-sm rounded-lg p-4 bg-white">
                <h5 className="font-weight-bold mb-3 border-bottom pb-2 d-flex align-items-center">
                  <FiShield className="mr-2 text-primary" /> Change Password
                </h5>
                <form onSubmit={handlePasswordSubmit} className="max-w-lg">
                  <div className="mb-3">
                    <label className="form-label font-weight-600">Current Password</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      placeholder="Enter current password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label font-weight-600">New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label font-weight-600">Confirm New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      required
                      placeholder="Repeat new password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary px-4 mt-2" disabled={loading}>
                    {loading ? 'Updating Password...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Address Modal */}
      {showAddressModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content border-0 shadow-lg rounded-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title font-weight-bold">
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </h5>
                <button type="button" className="close text-white" onClick={() => setShowAddressModal(false)}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleSaveAddress}>
                <div className="modal-body p-4">
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label font-weight-600">Address Label / Title</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Home, Office, Apartment"
                        value={addressForm.title}
                        onChange={(e) => setAddressForm({ ...addressForm, title: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label font-weight-600">Recipient Full Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={addressForm.recipient_name}
                        onChange={(e) => setAddressForm({ ...addressForm, recipient_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label font-weight-600">Contact Phone Number *</label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        placeholder="+60 12-345 6789"
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label font-weight-600">Country *</label>
                      <CustomSelect
                        options={SUPPORTED_COUNTRIES.map(c => ({ value: c.name, label: `${c.flag} ${c.name}` }))}
                        value={addressForm.country || 'Malaysia'}
                        onChange={(c) => {
                          setAddressForm(prev => ({
                            ...prev,
                            country: c,
                            city: c === 'Singapore' ? '' : prev.city
                          }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label font-weight-600">Street Address Line 1 *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="House / Unit No, Building, Street Name"
                      value={addressForm.address_line1}
                      onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label font-weight-600">Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Suite, Floor, Landmark"
                      value={addressForm.address_line2}
                      onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
                    />
                  </div>

                  <div className="row mb-3">
                    {addressForm.country !== 'Singapore' && (
                      <div className="col-md-6">
                        <label className="form-label font-weight-600">State</label>
                        <CustomSelect
                          options={MALAYSIAN_STATES}
                          value={addressForm.state || addressForm.city}
                          placeholder="Select State..."
                          onChange={(val) => {
                            setAddressForm(prev => ({
                              ...prev,
                              state: val,
                              city: val
                            }));
                          }}
                        />
                      </div>
                    )}
                    <div className={addressForm.country === 'Singapore' ? 'col-md-12' : 'col-md-6'}>
                      <label className="form-label font-weight-600">Postal / Zip Code</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addressForm.postal_code}
                        onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-check mb-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="isDefaultCheck"
                      checked={addressForm.is_default}
                      onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                    />
                    <label className="form-check-label font-weight-500" htmlFor="isDefaultCheck">
                      Set as my default shipping address
                    </label>
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddressModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary px-4" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Address'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
