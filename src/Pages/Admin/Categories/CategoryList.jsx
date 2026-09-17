import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { FiPlus, FiEdit, FiTrash2, FiCloud } from 'react-icons/fi';
import AlertDialog from '../../../Components/AlertDialog/AlertDialog';
import CustomSelect from '../../../Components/CustomSelect/CustomSelect';

const CategoryList = () => {
  const [categories, setCategories] = useState([]);
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
    image: '',
    status: 'published'
  });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/categories?all=true');
      if (res.data.success) {
        setCategories(res.data.categories || []);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleImageFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const data = new FormData();
    data.append('images', files[0]);

    setUploading(true);
    try {
      const res = await apiClient.post('/upload?folder=categories', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success && res.data.url) {
        setFormData((prev) => ({ ...prev, image: res.data.url }));
      }
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to upload image.', 'Upload Error', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      image: '',
      status: 'published'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c) => {
    setEditingId(c.id);
    setFormData({
      name: c.name,
      description: c.description || '',
      image: c.image || '',
      status: c.status === 'draft' ? 'draft' : 'published'
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await apiClient.put(`/categories/${editingId}`, formData);
      } else {
        await apiClient.post('/categories', formData);
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      showAlert(err.response?.data?.message || 'Failed to save category.', 'Action Failed', 'error');
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete category "${name}"?`)) {
      try {
        await apiClient.delete(`/categories/${id}`);
        fetchCategories();
      } catch (err) {
        showAlert(err.response?.data?.message || 'Failed to delete category.', 'Action Failed', 'error');
      }
    }
  };

  return (
    <div className="categoryListPage">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h3 className="font-weight-bold mb-0">Product Categories</h3>
          <p className="text-muted small mb-0">Manage catalog taxonomy and navigation categories</p>
        </div>
        <Button
          variant="contained"
          className="btn btn-primary font-weight-bold rounded-pill px-4 shadow-sm"
          onClick={handleOpenAddModal}
        >
          <FiPlus className="mr-1" /> Add Category
        </Button>
      </div>

      {/* Categories Datatable */}
      <div className="card border-0 shadow-sm rounded-lg overflow-hidden bg-white">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="thead-light small text-uppercase">
              <tr>
                <th>Category</th>
                <th>Slug</th>
                <th>Product Count</th>
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
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-4 text-muted">No categories found.</td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="d-flex align-items-center">
                        {c.image ? (
                          <img src={c.image} alt={c.name} className="cart-item-thumb mr-3 rounded border" />
                        ) : (
                          <div className="cart-item-thumb mr-3 rounded border bg-light d-flex align-items-center justify-content-center text-muted small">
                            <FiCloud size={16} />
                          </div>
                        )}
                        <div>
                          <div className="font-weight-bold text-dark">{c.name}</div>
                          <span className="small text-muted">{c.description}</span>
                        </div>
                      </div>
                    </td>
                    <td className="small font-weight-bold text-muted">{c.slug}</td>
                    <td>
                      <span className="badge badge-info px-3 py-1 font-weight-bold">
                        {c.product_count || 0} items
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${c.status === 'draft' ? 'badge-warning' : 'badge-success'}`}>
                        {c.status === 'draft' ? 'Draft' : 'Published'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="d-inline-flex gap-1">
                        <Button
                          size="small"
                          className="btn btn-sm btn-outline-primary font-weight-bold"
                          onClick={() => handleOpenEditModal(c)}
                          title="Edit Category"
                        >
                          <FiEdit className="mr-1" /> Edit
                        </Button>
                        <Button
                          size="small"
                          className="btn btn-sm btn-outline-danger font-weight-bold"
                          onClick={() => handleDeleteCategory(c.id, c.name)}
                          title="Delete Category"
                        >
                          <FiTrash2 className="mr-1" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Category Modal */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmitForm} className="p-4">
          <h4 className="font-weight-bold mb-4">{editingId ? 'Edit Category' : 'Add New Category'}</h4>

          <div className="mb-3">
            <label className="font-weight-bold small text-muted">Category Name <span className="required-star">*</span></label>
            <input
              type="text"
              className="form-control"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="mb-3">
            <label className="font-weight-bold small text-muted">Category Image / Banner</label>
            <div>
              {formData.image ? (
                <div className="card p-3 bg-light border">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <img
                      src={formData.image}
                      alt="Category Preview"
                      style={{ width: 75, height: 75, objectFit: 'cover' }}
                      className="rounded border shadow-sm"
                    />
                    <div className="flex-grow-1 text-truncate small text-muted font-weight-bold">{formData.image}</div>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => setFormData({ ...formData, image: '' })}
                    >
                      Remove
                    </button>
                  </div>

                  <div>
                    <label className="btn btn-outline-primary btn-sm font-weight-bold cursor-pointer mb-0">
                      <FiPlus className="mr-1" /> {uploading ? 'Uploading Image...' : 'Add Image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="d-none"
                        onChange={handleImageFileUpload}
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
                    className="d-none"
                    onChange={handleImageFileUpload}
                    disabled={uploading}
                  />
                  <div className="dropzone-icon mx-auto">
                    <FiCloud size={28} />
                  </div>
                  <div className="font-weight-bold text-dark h6 mb-0">
                    {uploading ? 'Uploading File...' : 'Browse Files to upload'}
                  </div>
                </label>
              )}
            </div>
          </div>

          <div className="mb-3">
            <label className="font-weight-bold small text-muted">Publish Status <span className="required-star">*</span></label>
            <CustomSelect
              options={[
                { value: 'published', label: 'Published' },
                { value: 'draft', label: 'Draft' }
              ]}
              value={formData.status}
              onChange={(val) => {
                const st = val.target ? val.target.value : val;
                setFormData(prev => ({ ...prev, status: st }));
              }}
            />
          </div>

          <div className="mb-4">
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
              {editingId ? 'Save Changes' : 'Create Category'}
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

export default CategoryList;
