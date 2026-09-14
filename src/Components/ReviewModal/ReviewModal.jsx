import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import Rating from '@mui/material/Rating';
import Button from '@mui/material/Button';
import { FiStar, FiUploadCloud, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import apiClient from '../../api/apiClient';

const ReviewModal = ({ open, onClose, items = [], orderId, existingReviewsMap = {}, onSuccess }) => {
  // Format: { [product_id]: { rating: 0, comment: '', images: [] } }
  const [reviewsData, setReviewsData] = useState({});
  // Per-product validation errors: { [product_id]: string }
  const [itemErrors, setItemErrors] = useState({});
  // Per-product upload spinner map: { [product_id]: boolean }
  const [uploadingMap, setUploadingMap] = useState({});

  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    if (open && items && items.length > 0) {
      const initialReviews = {};
      items.forEach((item) => {
        const existing = existingReviewsMap[item.product_id];
        if (existing) {
          const imgs = Array.isArray(existing.images)
            ? existing.images
            : typeof existing.images === 'string'
            ? JSON.parse(existing.images || '[]')
            : [];
          initialReviews[item.product_id] = {
            rating: existing.rating || 0,
            comment: existing.comment || '',
            images: imgs,
            isSubmitted: true
          };
        } else {
          initialReviews[item.product_id] = {
            rating: 0,
            comment: '',
            images: [],
            isSubmitted: false
          };
        }
      });
      setReviewsData(initialReviews);
      setItemErrors({});
      setUploadingMap({});
      setGlobalError('');
    }
  }, [open, items, existingReviewsMap]);

  if (!items || items.length === 0) return null;

  const unsubmittedItems = items.filter((item) => !existingReviewsMap[item.product_id]);
  const allSubmitted = unsubmittedItems.length === 0;

  const handleRatingChange = (productId, newRating) => {
    setReviewsData((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        rating: newRating || 0
      }
    }));

    if (newRating && newRating >= 1) {
      setItemErrors((prev) => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
      setGlobalError('');
    }
  };

  const handleCommentChange = (productId, newComment) => {
    setReviewsData((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        comment: newComment
      }
    }));
  };

  const handleFileUpload = async (productId, e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    setUploadingMap((prev) => ({ ...prev, [productId]: true }));
    setGlobalError('');

    try {
      const res = await apiClient.post('/upload/reviews', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        const newUrls = res.data.urls || (res.data.url ? [res.data.url] : []);
        setReviewsData((prev) => ({
          ...prev,
          [productId]: {
            ...(prev[productId] || {}),
            images: [...(prev[productId]?.images || []), ...newUrls]
          }
        }));
      }
    } catch (err) {
      console.error('Failed to upload review image:', err);
      setGlobalError(err.response?.data?.message || 'Failed to upload photo attachment.');
    } finally {
      setUploadingMap((prev) => ({ ...prev, [productId]: false }));
    }
  };

  const handleRemoveImage = (productId, indexToRemove) => {
    setReviewsData((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        images: (prev[productId]?.images || []).filter((_, idx) => idx !== indexToRemove)
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (allSubmitted) {
      onClose();
      return;
    }

    // MANDATORY VALIDATION: Ensure every unsubmitted product has a rating (1-5 stars)
    const newErrors = {};
    let hasValidationError = false;

    unsubmittedItems.forEach((item) => {
      const itemData = reviewsData[item.product_id] || {};
      const rating = itemData.rating;
      if (!rating || rating < 1 || rating > 5) {
        newErrors[item.product_id] = 'Rating is required. Please tap stars (1 to 5) to rate this product.';
        hasValidationError = true;
      }
    });

    if (hasValidationError) {
      setItemErrors(newErrors);
      setGlobalError('Please select a star rating (1 to 5 stars) for all products before submitting.');
      return;
    }

    setSubmitting(true);
    setGlobalError('');

    try {
      for (const item of unsubmittedItems) {
        const data = reviewsData[item.product_id] || {};
        const payload = {
          order_id: orderId,
          product_id: item.product_id,
          rating: data.rating,
          comment: data.comment || '',
          images: data.images || []
        };
        await apiClient.post('/reviews', payload);
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to submit review(s):', err);
      setGlobalError(err.response?.data?.message || 'Failed to submit review(s). Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = (val) => {
    switch (val) {
      case 5: return '🌟 Exceptional! (5 Stars)';
      case 4: return '👍 Great Product (4 Stars)';
      case 3: return '👌 Average / Good (3 Stars)';
      case 2: return '👎 Below Expectations (2 Stars)';
      case 1: return '😞 Poor Experience (1 Star)';
      default: return null;
    }
  };

  const isAnyUploading = Object.values(uploadingMap).some(Boolean);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <div className="p-4 bg-white rounded">
        {/* Modal Header */}
        <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
          <div className="d-flex align-items-center gap-2">
            <FiStar className="text-warning h4 mb-0" />
            <h5 className="font-weight-bold mb-0 text-dark">
              {allSubmitted
                ? 'Your Product Review(s)'
                : items.length > 1
                ? 'Rate & Review Order Products'
                : 'Rate & Review Product'}
            </h5>
          </div>
          <button type="button" className="btn btn-sm btn-light rounded-circle p-1" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        {/* Global Error Alert */}
        {globalError && (
          <div className="alert alert-danger py-2 small mb-3 d-flex align-items-center">
            <FiAlertCircle className="mr-2 flex-shrink-0" size={18} />
            <span>{globalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="pe-1" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
            {items.map((item, idx) => {
              const existingRev = existingReviewsMap[item.product_id];
              const isSubmitted = Boolean(existingRev);
              const data = reviewsData[item.product_id] || {};
              const errorMsg = itemErrors[item.product_id];
              const isUploading = uploadingMap[item.product_id] || false;

              return (
                <div
                  key={item.product_id || idx}
                  className={`card mb-4 border ${
                    errorMsg ? 'border-danger shadow-sm' : isSubmitted ? 'border-success bg-light' : 'bg-white'
                  } rounded-lg`}
                >
                  <div className="card-header bg-light d-flex align-items-center justify-content-between p-3 border-bottom">
                    <div className="d-flex align-items-center flex-grow-1 mr-3">
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          className="rounded border mr-3 bg-white"
                          style={{ width: '54px', height: '54px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          className="rounded border mr-3 bg-white d-flex align-items-center justify-content-center text-muted small"
                          style={{ width: '54px', height: '54px' }}
                        >
                          No Img
                        </div>
                      )}
                      <div>
                        <h6 className="font-weight-bold text-dark mb-1">{item.product_name}</h6>
                        <span className="small text-muted font-weight-medium">
                          Price: RM{parseFloat(item.price || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {isSubmitted && (
                      <span className="badge badge-success px-3 py-2 font-weight-bold d-inline-flex align-items-center">
                        <FiCheckCircle className="mr-1" /> Submitted
                      </span>
                    )}
                  </div>

                  <div className="card-body p-3">
                    {/* Star Rating Picker (REQUIRED) */}
                    <div className={`p-3 rounded border mb-3 text-center ${errorMsg ? 'bg-light-danger border-danger' : 'bg-light'}`}>
                      <label className="font-weight-bold text-secondary d-block mb-1 small text-uppercase">
                        Product Rating <span className="text-danger">*</span>
                      </label>

                      <Rating
                        name={`rating-${item.product_id}`}
                        value={data.rating || 0}
                        precision={1}
                        size="large"
                        readOnly={isSubmitted}
                        onChange={(e, newValue) => handleRatingChange(item.product_id, newValue)}
                      />

                      <div className="mt-1 font-weight-bold text-primary small">
                        {getRatingLabel(data.rating)}
                        {!data.rating && !isSubmitted && (
                          <span className={`${errorMsg ? 'text-danger font-weight-bold' : 'text-muted font-weight-normal'}`}>
                            Tap stars above to rate (1 to 5 stars)
                          </span>
                        )}
                      </div>

                      {/* Explicit Validation Error Message */}
                      {errorMsg && (
                        <div className="text-danger font-weight-bold small mt-2 d-flex align-items-center justify-content-center">
                          <FiAlertCircle className="mr-1" /> {errorMsg}
                        </div>
                      )}
                    </div>

                    {/* Review / Comment Textarea */}
                    <div className="mb-3">
                      <label className="font-weight-bold text-dark small text-uppercase mb-1 d-block">
                        Your Review / Feedback <span className="text-muted font-weight-normal">(Optional)</span>
                      </label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder={
                          isSubmitted
                            ? 'No comment provided.'
                            : 'What did you like or dislike about this product? Share quality, sizing, or performance details...'
                        }
                        value={data.comment || ''}
                        readOnly={isSubmitted}
                        onChange={(e) => !isSubmitted && handleCommentChange(item.product_id, e.target.value)}
                      />
                    </div>

                    {/* Photo Attachments */}
                    {((data.images && data.images.length > 0) || !isSubmitted) && (
                      <div>
                        <label className="font-weight-bold text-dark small text-uppercase mb-1 d-block">
                          {isSubmitted ? 'Photo Attachment(s)' : 'Add Photo Attachment(s) (Optional)'}
                        </label>

                        <div className="d-flex flex-wrap gap-2 align-items-center mb-1">
                          {(data.images || []).map((imgUrl, imgIdx) => (
                            <div key={imgIdx} className="position-relative border rounded p-1 bg-light" style={{ width: '64px', height: '64px' }}>
                              <img src={imgUrl} alt={`Attachment ${imgIdx + 1}`} className="w-100 h-100 rounded" style={{ objectFit: 'cover' }} />
                              {!isSubmitted && (
                                <button
                                  type="button"
                                  className="btn btn-danger btn-sm position-absolute rounded-circle p-0 d-flex align-items-center justify-content-center"
                                  style={{ top: '-6px', right: '-6px', width: '20px', height: '20px' }}
                                  onClick={() => handleRemoveImage(item.product_id, imgIdx)}
                                  title="Remove Photo"
                                >
                                  <FiX size={12} />
                                </button>
                              )}
                            </div>
                          ))}

                          {!isSubmitted && (
                            <label className="btn btn-outline-primary btn-sm rounded d-flex flex-column align-items-center justify-content-center m-0 cursor-pointer" style={{ width: '64px', height: '64px', borderStyle: 'dashed' }}>
                              {isUploading ? (
                                <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                              ) : (
                                <>
                                  <FiUploadCloud size={18} className="mb-1" />
                                  <span style={{ fontSize: '10px' }}>Upload</span>
                                </>
                              )}
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="d-none"
                                onChange={(e) => handleFileUpload(item.product_id, e)}
                                disabled={isUploading}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dialog Action Footer */}
          <div className="d-flex justify-content-end gap-2 border-top pt-3 mt-2">
            {allSubmitted ? (
              <Button type="button" className="btn btn-primary px-4 font-weight-bold" onClick={onClose}>
                Close
              </Button>
            ) : (
              <>
                <Button type="button" className="btn btn-secondary px-4" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="btn btn-primary px-4 font-weight-bold"
                  disabled={submitting || isAnyUploading}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FiCheckCircle className="mr-1" /> Submit Review{unsubmittedItems.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default ReviewModal;
