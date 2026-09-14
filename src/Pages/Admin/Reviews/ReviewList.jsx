import React, { useEffect, useState } from 'react';
import Rating from '@mui/material/Rating';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { FiStar, FiSearch, FiTrash2, FiMessageSquare, FiX, FiCheck, FiEye, FiUser, FiShoppingBag, FiCalendar, FiMapPin } from 'react-icons/fi';
import apiClient from '../../../api/apiClient';
import AlertDialog from '../../../Components/AlertDialog/AlertDialog';

const ReviewList = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRatingTab, setSelectedRatingTab] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [viewReview, setViewReview] = useState(null);

  // Alert & Confirmation Dialog
  const [alertDialog, setAlertDialog] = useState({ open: false, title: 'Notice', message: '', type: 'error' });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, reviewId: null });

  const fetchAdminReviews = async () => {
    setLoading(true);
    try {
      let url = `/reviews/admin?search=${encodeURIComponent(search)}`;
      if (selectedRatingTab) url += `&rating=${selectedRatingTab}`;

      const res = await apiClient.get(url);
      if (res.data.success) {
        setReviews(res.data.reviews || []);
      }
    } catch (err) {
      console.error('Failed to load admin reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminReviews();
  }, [search, selectedRatingTab]);

  const handleDeleteReview = async () => {
    if (!deleteConfirm.reviewId) return;

    try {
      const res = await apiClient.delete(`/reviews/admin/${deleteConfirm.reviewId}`);
      if (res.data.success) {
        setAlertDialog({ open: true, title: 'Review Deleted', message: 'Customer review deleted successfully.', type: 'success' });
        fetchAdminReviews();
      }
    } catch (err) {
      console.error('Failed to delete review:', err);
      setAlertDialog({ open: true, title: 'Error', message: err.response?.data?.message || 'Failed to delete review.', type: 'error' });
    } finally {
      setDeleteConfirm({ open: false, reviewId: null });
    }
  };

  return (
    <div className="reviewListPage">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h3 className="font-weight-bold mb-0 text-dark">Product Ratings & Reviews</h3>
          <p className="text-muted small mb-0">Monitor customer feedback, view attached photos, and moderate reviews</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="card border-0 shadow-sm p-3 mb-4 rounded-lg bg-white">
        <div className="row align-items-center">
          <div className="col-lg-8 mb-3 mb-lg-0">
            <div className="d-flex flex-wrap gap-2">
              {[
                { label: 'All Ratings', value: '' },
                { label: '5 Stars ★', value: '5' },
                { label: '4 Stars ★', value: '4' },
                { label: '3 Stars ★', value: '3' },
                { label: '2 Stars ★', value: '2' },
                { label: '1 Star ★', value: '1' }
              ].map((tab) => {
                const isActive = selectedRatingTab === tab.value;
                return (
                  <button
                    key={tab.value}
                    className="btn btn-sm rounded-pill font-weight-bold px-3 py-1 shadow-none"
                    style={{
                      backgroundColor: isActive ? '#0d6efd' : '#f8f9fa',
                      color: isActive ? '#ffffff' : '#333333',
                      border: isActive ? '1px solid #0d6efd' : '1px solid #dcdcdc',
                      boxShadow: isActive ? '0 2px 6px rgba(13,110,253,0.25)' : 'none',
                      transition: 'all 0.15s ease-in-out',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#0d6efd';
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.borderColor = '#0d6efd';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.color = '#333333';
                        e.currentTarget.style.borderColor = '#dcdcdc';
                      }
                    }}
                    onClick={() => setSelectedRatingTab(tab.value)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="col-lg-4">
            <div className="admin-search-box position-relative">
              <input
                type="text"
                className="form-control pl-5 rounded-pill"
                placeholder="Search Product, Customer, Order #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FiSearch className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="card border-0 shadow-sm rounded-lg overflow-hidden bg-white p-3">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2 text-muted">Loading product reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <FiMessageSquare size={40} className="mb-2 text-secondary opacity-50" />
            <h5>No Customer Reviews Found</h5>
            <p className="small mb-0">No reviews matching the search or rating criteria.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="thead-light small text-uppercase">
                <tr>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Order #</th>
                  <th>Rating</th>
                  <th>Comment & Photos</th>
                  <th>Date</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((rev) => {
                  const revImages = Array.isArray(rev.images)
                    ? rev.images
                    : (typeof rev.images === 'string' ? JSON.parse(rev.images || '[]') : []);

                  const prodImgs = Array.isArray(rev.product_images)
                    ? rev.product_images
                    : (typeof rev.product_images === 'string' ? JSON.parse(rev.product_images || '[]') : []);
                  const firstProdImg = prodImgs[0] || '';

                  return (
                    <tr key={rev.id}>
                      <td style={{ minWidth: '200px' }}>
                        <div className="d-flex align-items-center">
                          {firstProdImg ? (
                            <img src={firstProdImg} alt={rev.product_name} className="rounded border mr-2" style={{ width: '40px', height: '40px', objectFit: 'cover' }} />
                          ) : (
                            <div className="rounded border mr-2 bg-light d-flex align-items-center justify-content-center text-muted small" style={{ width: '40px', height: '40px' }}>
                              Item
                            </div>
                          )}
                          <span className="font-weight-bold text-dark text-truncate" style={{ maxWidth: '180px' }}>
                            {rev.product_name || 'Deleted Product'}
                          </span>
                        </div>
                      </td>

                      <td style={{ minWidth: '180px' }}>
                        <div className="font-weight-bold text-dark">{rev.customer_name || 'Anonymous'}</div>
                        <span className="small text-muted">{rev.customer_email}</span>
                      </td>

                      <td>
                        <span className="badge badge-primary px-2 py-1 font-weight-bold">
                          {rev.order_number || `#${rev.order_id}`}
                        </span>
                      </td>

                      <td>
                        <div className="d-flex align-items-center">
                          <Rating value={rev.rating} readOnly size="small" />
                          <span className="ml-1 font-weight-bold text-dark small">({rev.rating}/5)</span>
                        </div>
                      </td>

                      <td style={{ minWidth: '250px' }}>
                        {rev.comment ? (
                          <div className="small text-dark mb-1" style={{ whiteSpace: 'pre-line' }}>{rev.comment}</div>
                        ) : (
                          <span className="text-muted small font-italic">No comment provided</span>
                        )}

                        {revImages.length > 0 && (
                          <div className="d-flex gap-1 flex-wrap mt-1">
                            {revImages.map((img, imgIdx) => (
                              <img
                                key={imgIdx}
                                src={img}
                                alt={`Attachment ${imgIdx + 1}`}
                                className="rounded border cursor-pointer"
                                style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                                onClick={() => setSelectedImage(img)}
                              />
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="small text-muted" style={{ minWidth: '130px' }}>
                        {new Date(rev.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>

                      <td className="text-right">
                        <div className="d-inline-flex gap-1">
                          <Button
                            size="small"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setViewReview(rev)}
                          >
                            <FiEye className="mr-1" /> View
                          </Button>
                          <Button
                            size="small"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => setDeleteConfirm({ open: true, reviewId: rev.id })}
                          >
                            <FiTrash2 className="mr-1" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Review & Order Details Modal */}
      {viewReview && (
        <Dialog open={Boolean(viewReview)} onClose={() => setViewReview(null)} maxWidth="md" fullWidth>
          <div className="p-4 bg-white rounded position-relative">
            {/* Modal Header */}
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
              <div className="d-flex align-items-center gap-2">
                <FiMessageSquare className="text-primary h4 mb-0" />
                <h5 className="font-weight-bold mb-0 text-dark">Review & Order Details</h5>
                {viewReview.order_number && (
                  <span className="badge badge-primary px-3 py-1 font-weight-bold ml-2">
                    {viewReview.order_number}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-light rounded-circle p-1"
                onClick={() => setViewReview(null)}
              >
                <FiX size={20} />
              </button>
            </div>

            <div style={{ maxHeight: '72vh', overflowY: 'auto' }} className="pe-1">
              {/* Product Section with BIGGER Image Size */}
              <div className="card border p-3 mb-4 bg-light rounded-lg shadow-sm">
                <div className="d-flex flex-column flex-sm-row align-items-center align-items-sm-start gap-3">
                  {(() => {
                    const prodImgs = Array.isArray(viewReview.product_images)
                      ? viewReview.product_images
                      : (typeof viewReview.product_images === 'string' ? JSON.parse(viewReview.product_images || '[]') : []);
                    const mainImg = prodImgs[0] || '';
                    return mainImg ? (
                      <img
                        src={mainImg}
                        alt={viewReview.product_name}
                        className="rounded border bg-white shadow-sm flex-shrink-0 cursor-pointer mr-sm-3 mb-2 mb-sm-0"
                        style={{ width: '130px', height: '130px', objectFit: 'cover' }}
                        onClick={() => setSelectedImage(mainImg)}
                        title="Click to view full image"
                      />
                    ) : (
                      <div
                        className="rounded border bg-white shadow-sm flex-shrink-0 mr-sm-3 mb-2 mb-sm-0 d-flex align-items-center justify-content-center text-muted small"
                        style={{ width: '130px', height: '130px' }}
                      >
                        No Image
                      </div>
                    );
                  })()}

                  <div className="flex-grow-1 text-center text-sm-left">
                    <span className="badge badge-secondary mb-2 text-uppercase px-2 py-1 font-weight-bold">
                      {viewReview.product_category || 'Product'}
                    </span>
                    <h4 className="font-weight-bold text-dark mb-1">
                      {viewReview.product_name || 'Deleted Product'}
                    </h4>
                    {viewReview.product_price && (
                      <div className="h5 font-weight-bold text-primary mb-2">
                        RM{parseFloat(viewReview.product_price).toFixed(2)}
                      </div>
                    )}
                    <span className="small text-muted d-block">
                      Product ID: #{viewReview.product_id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer & Order Information Grid */}
              <div className="row mb-4">
                {/* Customer Card */}
                <div className="col-md-6 mb-3 mb-md-0">
                  <div className="card border h-100 p-3 bg-white rounded-lg">
                    <h6 className="font-weight-bold text-muted small text-uppercase mb-3 d-flex align-items-center">
                      <FiUser className="mr-2 text-primary" size={16} /> Customer Information
                    </h6>
                    <div className="d-flex align-items-center mb-2">
                      {viewReview.customer_avatar ? (
                        <img
                          src={viewReview.customer_avatar}
                          alt={viewReview.customer_name}
                          className="rounded-circle border mr-3"
                          style={{ width: '44px', height: '44px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          className="rounded-circle border mr-3 bg-light d-flex align-items-center justify-content-center text-primary font-weight-bold h5 mb-0"
                          style={{ width: '44px', height: '44px' }}
                        >
                          {(viewReview.customer_name || 'A')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-weight-bold text-dark">{viewReview.customer_name || 'Anonymous Customer'}</div>
                        <div className="small text-muted">{viewReview.customer_email || 'No email registered'}</div>
                        {viewReview.customer_phone && (
                          <div className="small text-secondary">Phone: {viewReview.customer_phone}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Details Card */}
                <div className="col-md-6">
                  <div className="card border h-100 p-3 bg-white rounded-lg">
                    <h6 className="font-weight-bold text-muted small text-uppercase mb-3 d-flex align-items-center">
                      <FiShoppingBag className="mr-2 text-primary" size={16} /> Order Details
                    </h6>
                    <div className="small text-dark mb-1">
                      <b>Order Number:</b> <span className="text-primary font-weight-bold">{viewReview.order_number || `#${viewReview.order_id}`}</span>
                    </div>
                    {viewReview.order_created_at && (
                      <div className="small text-dark mb-1">
                        <b>Placed Date:</b> {new Date(viewReview.order_created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    )}
                    {viewReview.order_status && (
                      <div className="small text-dark mb-1">
                        <b>Order Status:</b>{' '}
                        <span className={`badge ${viewReview.order_status === 'delivered' ? 'badge-success' : 'badge-info'} px-2 py-1 text-uppercase`}>
                          {viewReview.order_status}
                        </span>
                      </div>
                    )}
                    {viewReview.order_total_amount && (
                      <div className="small text-dark mb-1">
                        <b>Total Amount Paid:</b> <span className="font-weight-bold text-success">RM{parseFloat(viewReview.order_total_amount).toFixed(2)}</span>
                      </div>
                    )}
                    {(viewReview.shipping_address || viewReview.shipping_city || viewReview.shipping_country) && (
                      <div className="small text-muted mt-2 pt-2 border-top">
                        <FiMapPin className="mr-1 text-secondary" />
                        {[viewReview.shipping_address, viewReview.shipping_city, viewReview.shipping_country].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Rating & Review Feedback Section */}
              <div className="card border p-3 bg-white rounded-lg mb-2">
                <h6 className="font-weight-bold text-muted small text-uppercase mb-3 d-flex align-items-center">
                  <FiStar className="mr-2 text-warning" size={16} /> Customer Review & Rating
                </h6>

                <div className="bg-light p-3 rounded mb-3 border text-center text-sm-left d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <Rating value={viewReview.rating} readOnly size="large" />
                      <span className="font-weight-bold h5 mb-0 text-dark">({viewReview.rating}/5)</span>
                    </div>
                    <div className="small font-weight-bold text-primary mt-1">
                      {viewReview.rating === 5 && '🌟 Exceptional! (5 Stars)'}
                      {viewReview.rating === 4 && '👍 Great Product (4 Stars)'}
                      {viewReview.rating === 3 && '👌 Average / Good (3 Stars)'}
                      {viewReview.rating === 2 && '👎 Below Expectations (2 Stars)'}
                      {viewReview.rating === 1 && '😞 Poor Experience (1 Star)'}
                    </div>
                  </div>

                  <div className="small text-muted text-sm-right">
                    <FiCalendar className="mr-1" /> Submitted on {new Date(viewReview.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>

                {/* Comment Box */}
                <div className="mb-3">
                  <label className="font-weight-bold small text-muted text-uppercase mb-1">Customer Comment</label>
                  <div className="p-3 bg-light rounded border text-dark font-weight-medium" style={{ whiteSpace: 'pre-line', minHeight: '60px' }}>
                    {viewReview.comment ? viewReview.comment : <span className="text-muted font-italic">No comment provided.</span>}
                  </div>
                </div>

                {/* Attached Customer Photos with BIGGER Image Size */}
                {(() => {
                  const revImages = Array.isArray(viewReview.images)
                    ? viewReview.images
                    : (typeof viewReview.images === 'string' ? JSON.parse(viewReview.images || '[]') : []);

                  if (revImages.length === 0) return null;

                  return (
                    <div>
                      <label className="font-weight-bold small text-muted text-uppercase mb-2 d-block">
                        Attached Photos ({revImages.length})
                      </label>
                      <div className="d-flex flex-wrap gap-3">
                        {revImages.map((img, imgIdx) => (
                          <div key={imgIdx} className="position-relative border rounded p-1 bg-light shadow-sm" style={{ width: '110px', height: '110px' }}>
                            <img
                              src={img}
                              alt={`Attachment ${imgIdx + 1}`}
                              className="w-100 h-100 rounded cursor-pointer transition-all"
                              style={{ objectFit: 'cover' }}
                              onClick={() => setSelectedImage(img)}
                              title="Click to expand"
                            />
                          </div>
                        ))}
                      </div>
                      <span className="small text-muted mt-2 d-block">Click photos above to view full-size lightbox preview.</span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="d-flex justify-content-between align-items-center border-top pt-3 mt-3">
              <Button
                size="small"
                className="btn btn-outline-danger font-weight-bold"
                onClick={() => {
                  const rId = viewReview.id;
                  setViewReview(null);
                  setDeleteConfirm({ open: true, reviewId: rId });
                }}
              >
                <FiTrash2 className="mr-1" /> Delete Review
              </Button>
              <Button className="btn btn-secondary px-4" onClick={() => setViewReview(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, reviewId: null })}>
        <div className="p-4 text-center">
          <FiTrash2 className="text-danger mb-3" size={40} />
          <h5 className="font-weight-bold text-dark">Delete Customer Review?</h5>
          <p className="text-muted small">This action cannot be undone. Product average rating will automatically be recalculated.</p>
          <div className="d-flex justify-content-center gap-2 mt-4">
            <Button className="btn btn-secondary" onClick={() => setDeleteConfirm({ open: false, reviewId: null })}>
              Cancel
            </Button>
            <Button className="btn btn-danger font-weight-bold" onClick={handleDeleteReview}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <Dialog open={Boolean(selectedImage)} onClose={() => setSelectedImage(null)} maxWidth="md">
          <div className="position-relative bg-dark p-2 text-center">
            <button
              type="button"
              className="btn btn-dark btn-sm position-absolute rounded-circle p-1"
              style={{ top: '10px', right: '10px', zIndex: 10 }}
              onClick={() => setSelectedImage(null)}
            >
              <FiX size={24} className="text-white" />
            </button>
            <img src={selectedImage} alt="Review Attachment" className="img-fluid rounded" style={{ maxHeight: '80vh', objectFit: 'contain' }} />
          </div>
        </Dialog>
      )}

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

export default ReviewList;
