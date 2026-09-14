import React, { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import { FiRefreshCw, FiUploadCloud, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import CustomSelect from '../CustomSelect/CustomSelect';

const DELIVERED_REASONS = [
  'Damaged / Defective Item',
  'Received Wrong Item',
  'Item Not as Described',
  'Missing Item / Incomplete Order',
  'Package Delayed / Not Received',
  'Other'
];

const NON_DELIVERED_REASONS = [
  'Package Delayed / Not Received',
  'Other'
];

const RefundModal = ({ open, onClose, order, onSuccess }) => {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reasonError, setReasonError] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setComment('');
      setImages([]);
      setUploading(false);
      setSubmitting(false);
      setError('');
      setReasonError('');
    }
  }, [open, order]);

  if (!order) return null;

  const isDelivered = order.order_status === 'delivered';
  const availableReasons = isDelivered ? DELIVERED_REASONS : NON_DELIVERED_REASONS;

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    setUploading(true);
    setError('');

    try {
      const res = await apiClient.post('/upload/refunds', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        const newUrls = res.data.urls || (res.data.url ? [res.data.url] : []);
        setImages((prev) => [...prev, ...newUrls]);
      }
    } catch (err) {
      console.error('Failed to upload refund proof photo:', err);
      setError(err.response?.data?.message || 'Failed to upload photo attachment.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason) {
      setReasonError('Please select a reason for your refund request.');
      return;
    }

    setSubmitting(true);
    setError('');
    setReasonError('');

    try {
      const res = await apiClient.post(`/orders/${order.id}/request-refund`, {
        reason,
        comment,
        images
      });

      if (res.data.success) {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Failed to submit refund request:', err);
      setError(err.response?.data?.message || 'Failed to submit refund request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <div className="p-4 bg-white rounded">
        {/* Modal Header */}
        <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
          <div className="d-flex align-items-center gap-2">
            <FiRefreshCw className="text-danger h4 mb-0" />
            <div>
              <h5 className="font-weight-bold mb-0 text-dark">Request Order Refund</h5>
              <span className="text-muted small">Order #{order.order_number}</span>
            </div>
          </div>
          <button type="button" className="btn btn-sm btn-light rounded-circle p-1" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="alert alert-danger py-2 small mb-3 d-flex align-items-center">
            <FiAlertCircle className="mr-2 flex-shrink-0" size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Summary Card */}
          <div className="bg-light p-3 rounded mb-3 border">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-muted small">Total Order Value:</span>
              <span className="font-weight-bold text-primary h6 mb-0">
                RM{parseFloat(order.total_amount || 0).toFixed(2)}
              </span>
            </div>
            <div className="d-flex justify-content-between align-items-center small">
              <span className="text-muted">Payment Method & Status:</span>
              <span className="font-weight-medium text-dark text-capitalize">
                {order.payment_method} ({order.payment_status})
              </span>
            </div>
            <div className="d-flex justify-content-between align-items-center small mt-1">
              <span className="text-muted">Fulfillment Status:</span>
              <span className={`font-weight-bold text-capitalize ${isDelivered ? 'text-success' : 'text-primary'}`}>
                {order.order_status}
              </span>
            </div>
          </div>

          {/* Refund Reason */}
          <div className="mb-3">
            <label className="font-weight-bold text-dark small text-uppercase mb-1 d-block">
              Reason for Refund <span className="text-danger">*</span>
            </label>
            <CustomSelect
              options={availableReasons.map((r) => ({ value: r, label: r }))}
              value={reason}
              onChange={(selectedVal) => {
                setReason(selectedVal);
                if (selectedVal) setReasonError('');
              }}
              placeholder="-- Select a reason --"
            />
            {reasonError && <div className="text-danger small mt-1 font-weight-medium">{reasonError}</div>}
          </div>

          {/* Detailed Explanation */}
          <div className="mb-3">
            <label className="font-weight-bold text-dark small text-uppercase mb-1 d-block">
              Detailed Explanation <span className="text-muted font-weight-normal">(Optional)</span>
            </label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="Provide details about why you are requesting a refund..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {/* Proof Photos Attachment */}
          <div className="mb-3">
            <label className="font-weight-bold text-dark small text-uppercase mb-1 d-block">
              Proof Photos <span className="text-muted font-weight-normal">(Optional but recommended)</span>
            </label>

            <div className="d-flex flex-wrap gap-2 align-items-center mb-1">
              {images.map((imgUrl, imgIdx) => (
                <div key={imgIdx} className="position-relative border rounded p-1 bg-light" style={{ width: '70px', height: '70px' }}>
                  <img src={imgUrl} alt={`Proof ${imgIdx + 1}`} className="w-100 h-100 rounded" style={{ objectFit: 'cover' }} />
                  <button
                    type="button"
                    className="btn btn-danger btn-sm position-absolute rounded-circle p-0 d-flex align-items-center justify-content-center"
                    style={{ top: '-6px', right: '-6px', width: '20px', height: '20px' }}
                    onClick={() => handleRemoveImage(imgIdx)}
                    title="Remove Photo"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              ))}

              <label className="btn btn-outline-primary btn-sm rounded d-flex flex-column align-items-center justify-content-center m-0 cursor-pointer" style={{ width: '70px', height: '70px', borderStyle: 'dashed' }}>
                {uploading ? (
                  <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                ) : (
                  <>
                    <FiUploadCloud size={20} className="mb-1" />
                    <span style={{ fontSize: '11px' }}>Add Photo</span>
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="d-none"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            <span className="text-muted small">Upload photos of received packages or damaged items if applicable.</span>
          </div>

          {/* Action Footer */}
          <div className="d-flex justify-content-end gap-2 border-top pt-3 mt-3">
            <Button type="button" className="btn btn-secondary px-4 rounded-pill" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="btn btn-danger px-4 font-weight-bold rounded-pill"
              disabled={submitting || uploading}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                  Submitting...
                </>
              ) : (
                <>
                  <FiCheckCircle className="mr-1" /> Submit Refund Request
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default RefundModal;
