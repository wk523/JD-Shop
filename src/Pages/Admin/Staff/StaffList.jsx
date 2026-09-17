import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { FiUserPlus, FiEdit, FiTrash2, FiShield } from 'react-icons/fi';
import AlertDialog from '../../../Components/AlertDialog/AlertDialog';
import CustomSelect from '../../../Components/CustomSelect/CustomSelect';

const StaffList = () => {
  const [staffList, setStaffList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

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
    email: '',
    password: '',
    phone: '',
    role_id: '',
    status: 'active'
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/staff');
      if (res.data.success) {
        setStaffList(res.data.staff || []);
      }
    } catch (err) {
      console.error('Failed to load staff members:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await apiClient.get('/roles');
      if (res.data.success) {
        setRoles(res.data.roles || []);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  useEffect(() => {
    fetchStaff();
    fetchRoles();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      role_id: roles.length > 0 ? roles[0].id : '',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s) => {
    setEditingId(s.id);
    setFormData({
      name: s.name,
      email: s.email,
      password: '', // Leave blank unless updating
      phone: s.phone || '',
      role_id: s.role_id || '',
      status: s.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.put(`/staff/${editingId}`, formData);
      } else {
        await apiClient.post('/staff', formData);
      }

      setIsModalOpen(false);
      fetchStaff();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save staff account.', 'Action Failed', 'error');
    }
  };

  const handleDeleteStaff = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove staff member "${name}"?`)) {
      try {
        await apiClient.delete(`/staff/${id}`);
        fetchStaff();
      } catch (err) {
        showAlert(err.response?.data?.message || 'Failed to delete staff member.', 'Action Failed', 'error');
      }
    }
  };

  return (
    <div className="staffListPage">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h3 className="font-weight-bold mb-0">Staff & Admin User Accounts</h3>
          <p className="text-muted small mb-0">Manage internal team members, store managers, and system administrators</p>
        </div>
        <Button
          variant="contained"
          className="btn btn-primary font-weight-bold rounded-pill px-4 shadow-sm"
          onClick={handleOpenAddModal}
        >
          <FiUserPlus className="mr-1" /> Add New Staff
        </Button>
      </div>

      {/* Staff Datatable */}
      <div className="card border-0 shadow-sm rounded-lg overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="thead-light small text-uppercase">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Assigned Role</th>
                <th>Status</th>
                <th>Date Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">No staff accounts found.</td>
                </tr>
              ) : (
                staffList.map((s) => (
                  <tr key={s.id}>
                    <td className="font-weight-bold text-dark">{s.name}</td>
                    <td className="small text-muted">{s.email}</td>
                    <td className="small">{s.phone || 'N/A'}</td>
                    <td>
                      <span className="badge badge-primary px-3 py-1 font-weight-bold text-uppercase">
                        <FiShield className="mr-1" /> {s.role_name || 'STAFF'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${s.status === 'active' ? 'success' : 'secondary'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="small text-muted">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="text-right">
                      <Button
                        size="small"
                        className="mr-2 text-primary"
                        onClick={() => handleOpenEditModal(s)}
                        title="Edit Staff"
                      >
                        <FiEdit />
                      </Button>
                      <Button
                        size="small"
                        className="text-danger"
                        onClick={() => handleDeleteStaff(s.id, s.name)}
                        title="Remove Staff"
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

      {/* Add / Edit Staff Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitForm} className="p-4">
          <h4 className="font-weight-bold mb-4">{editingId ? 'Edit Staff Account' : 'Add New Staff Member'}</h4>

          <div className="mb-3">
            <label className="font-weight-bold small text-muted">Full Name <span className="required-star">*</span></label>
            <input
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="mb-3">
            <label className="font-weight-bold small text-muted">Email Address <span className="required-star">*</span></label>
            <input
              type="email"
              className="form-control"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={Boolean(editingId)}
            />
          </div>

          <div className="mb-3">
            <label className="font-weight-bold small text-muted">
              {editingId ? 'New Password (leave blank to keep current)' : <>Password (Hashed with Bcrypt) <span className="required-star">*</span></>}
            </label>
            <input
              type="password"
              className="form-control"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingId}
            />
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="font-weight-bold small text-muted">Phone Number</label>
              <input
                type="text"
                className="form-control"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="font-weight-bold small text-muted">Assigned Security Role <span className="required-star">*</span></label>
              <CustomSelect
                options={[
                  { value: '', label: 'Select Role' },
                  ...roles.map(r => ({ value: r.id, label: `${r.name.toUpperCase()} - ${r.description}` }))
                ]}
                value={formData.role_id}
                onChange={(val) => {
                  const roleId = val.target ? val.target.value : val;
                  setFormData(prev => ({ ...prev, role_id: roleId }));
                }}
                placeholder="Select Role"
              />
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 pt-3 border-top">
            <Button className="btn btn-secondary mr-2" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="btn btn-primary font-weight-bold px-4">
              {editingId ? 'Save Changes' : 'Create Staff Member'}
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

export default StaffList;
