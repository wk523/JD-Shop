import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { FiShield, FiPlus, FiEdit, FiCheckSquare } from 'react-icons/fi';
import AlertDialog from '../../../Components/AlertDialog/AlertDialog';

const RolesPermissions = () => {
  const [roles, setRoles] = useState([]);
  const [groupedPermissions, setGroupedPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  // Alert Dialog State
  const [alertDialog, setAlertDialog] = useState({ open: false, title: 'Notice', message: '', type: 'error' });
  const showAlert = (message, title = 'Access Denied / Error', type = 'error') => {
    setAlertDialog({ open: true, title, message, type });
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedPermIds, setSelectedPermIds] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiClient.get('/roles'),
        apiClient.get('/roles/permissions')
      ]);

      if (rolesRes.data.success) setRoles(rolesRes.data.roles || []);
      if (permsRes.data.success) setGroupedPermissions(permsRes.data.groupedPermissions || {});
    } catch (err) {
      console.error('Failed to load roles/permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setRoleName('');
    setRoleDesc('');
    setSelectedPermIds([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (r) => {
    setEditingId(r.id);
    setRoleName(r.name);
    setRoleDesc(r.description || '');
    setSelectedPermIds(r.permissions ? r.permissions.map(p => p.id) : []);
    setIsModalOpen(true);
  };

  const handleTogglePermission = (permId) => {
    if (selectedPermIds.includes(permId)) {
      setSelectedPermIds(selectedPermIds.filter(id => id !== permId));
    } else {
      setSelectedPermIds([...selectedPermIds, permId]);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: roleName,
        description: roleDesc,
        permission_ids: selectedPermIds
      };

      if (editingId) {
        await apiClient.put(`/roles/${editingId}`, payload);
      } else {
        await apiClient.post('/roles', payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save role permissions.', 'Action Failed', 'error');
    }
  };

  return (
    <div className="rolesPermissionsPage">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h3 className="font-weight-bold mb-0">Roles & Security Permissions Matrix</h3>
          <p className="text-muted small mb-0">Manage Role-Based Access Control (RBAC) privileges across all modules</p>
        </div>
        <Button
          variant="contained"
          className="btn btn-primary font-weight-bold rounded-pill px-4 shadow-sm"
          onClick={handleOpenAddModal}
        >
          <FiPlus className="mr-1" /> Add Custom Role
        </Button>
      </div>

      {/* Roles List Grid */}
      <div className="row mb-5">
        {loading ? (
          <div className="col-12 text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : (
          roles.map((r) => (
            <div key={r.id} className="col-md-6 col-lg-4 mb-4">
              <div className="card border-0 shadow-sm rounded-lg h-100 bg-white p-4">
                <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                  <div className="d-flex align-items-center">
                    <FiShield className="h3 text-primary mb-0 mr-2" />
                    <h5 className="font-weight-bold mb-0 text-uppercase">{r.name}</h5>
                  </div>
                  <span className="badge badge-light border">{r.user_count || 0} users</span>
                </div>

                <p className="small text-muted mb-3">{r.description || 'No description provided.'}</p>

                <h6 className="font-weight-bold small text-uppercase text-muted mb-2">Granted Permissions ({r.permissions?.length || 0})</h6>
                <div className="d-flex flex-wrap gap-1 mb-4" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                  {r.permissions && r.permissions.length > 0 ? (
                    r.permissions.map((p) => (
                      <span key={p.id} className="badge badge-soft-primary small font-weight-normal mr-1 mb-1">
                        {p.name}
                      </span>
                    ))
                  ) : (
                    <span className="small text-muted font-italic">No permissions assigned.</span>
                  )}
                </div>

                <div className="mt-auto border-top pt-3 text-right">
                  <Button
                    size="small"
                    className="btn btn-outline-primary btn-sm rounded-pill px-3"
                    onClick={() => handleOpenEditModal(r)}
                  >
                    <FiEdit className="mr-1" /> Configure Permissions
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Role & Permissions Matrix Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmitForm} className="p-4">
          <h4 className="font-weight-bold mb-4">{editingId ? `Configure Role: ${roleName}` : 'Create New Security Role'}</h4>

          <div className="row mb-4">
            <div className="col-md-6 mb-3">
              <label className="font-weight-bold small text-muted">Role Name *</label>
              <input
                type="text"
                className="form-control"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="font-weight-bold small text-muted">Description</label>
              <input
                type="text"
                className="form-control"
                value={roleDesc}
                onChange={(e) => setRoleDesc(e.target.value)}
              />
            </div>
          </div>

          <h5 className="font-weight-bold mb-3 border-bottom pb-2">Module Permissions Matrix</h5>

          <div className="row">
            {Object.keys(groupedPermissions).map((moduleName) => (
              <div key={moduleName} className="col-md-6 mb-4">
                <div className="card border p-3 rounded bg-light">
                  <h6 className="font-weight-bold text-uppercase text-primary mb-3">
                    <FiCheckSquare className="mr-1" /> Module: {moduleName}
                  </h6>
                  {groupedPermissions[moduleName].map((p) => {
                    const isChecked = selectedPermIds.includes(p.id);
                    return (
                      <div key={p.id} className="form-check mb-2">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`perm-${p.id}`}
                          checked={isChecked}
                          onChange={() => handleTogglePermission(p.id)}
                        />
                        <label className="form-check-label font-weight-bold text-dark small cursor-pointer" htmlFor={`perm-${p.id}`}>
                          {p.name}
                        </label>
                        <div className="small text-muted">{p.description}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="d-flex justify-content-end gap-2 pt-3 border-top">
            <Button className="btn btn-secondary mr-2" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="btn btn-primary font-weight-bold px-4">
              Save Role & Permissions
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

export default RolesPermissions;
