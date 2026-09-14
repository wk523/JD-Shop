import React, { useEffect, useState } from 'react';
import apiClient from '../../../api/apiClient';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { FiEye, FiSearch, FiPrinter, FiCheck, FiX, FiCreditCard, FiCalendar, FiLock, FiRefreshCw, FiThumbsUp, FiThumbsDown, FiImage } from 'react-icons/fi';
import AlertDialog from '../../../Components/AlertDialog/AlertDialog';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Alert Dialog State
  const [alertDialog, setAlertDialog] = useState({ open: false, title: 'Notice', message: '', type: 'error' });
  const showAlert = (message, title = 'Access Denied / Error', type = 'error') => {
    setAlertDialog({ open: true, title, message, type });
  };

  // Selected Order Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [selectedRefundReq, setSelectedRefundReq] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = `/orders/admin/all?status=${activeTab}&payment_status=${paymentStatusFilter}&date_range=${dateRangeFilter}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await apiClient.get(url);
      if (res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      console.error('Failed to load admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab, paymentStatusFilter, dateRangeFilter, search]);

  const handleOpenDetailModal = async (order) => {
    setSelectedOrder(order);
    setSelectedRefundReq(null);
    setAdminNote('');
    try {
      const res = await apiClient.get(`/orders/${order.id}`);
      if (res.data.success) {
        setOrderItems(res.data.items || []);
        setSelectedRefundReq(res.data.refundRequest || null);
      }
    } catch (err) {
      console.error('Failed to load order details:', err);
    }
    setIsModalOpen(true);
  };

  // Confirm Manual Refund Modal state
  const [confirmManualRefundModal, setConfirmManualRefundModal] = useState({
    open: false,
    refundId: null,
    orderId: null,
    newStatus: '',
    newPaymentStatus: '',
    message: ''
  });

  const handleProcessRefund = async (refundId, action, forceManual = false) => {
    try {
      const res = await apiClient.put(`/orders/admin/refunds/${refundId}`, {
        action,
        admin_note: adminNote,
        force_manual: forceManual
      });

      if (res.data.success) {
        setConfirmManualRefundModal({ open: false, refundId: null, orderId: null, newStatus: '', newPaymentStatus: '', message: '' });
        showAlert(res.data.message || `Refund request has been ${action === 'approve' ? 'approved' : 'rejected'} successfully.`, 'Action Successful', 'success');
        setIsModalOpen(false);
        fetchOrders();
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.canForceManual) {
        setConfirmManualRefundModal({
          open: true,
          refundId,
          orderId: null,
          newStatus: '',
          newPaymentStatus: '',
          message: errData.message
        });
      } else {
        showAlert(errData?.message || 'Failed to process refund.', 'Action Failed', 'error');
      }
    }
  };

  const handleUpdateStatus = async (orderId, currentOrderStatus, newStatus, currentPaymentStatus, newPaymentStatus, forceManual = false) => {
    if (currentOrderStatus === 'delivered' && newStatus !== 'delivered') {
      showAlert('This order is already delivered. Order status cannot be changed once delivered.', 'Status Locked', 'warning');
      return;
    }
    if (currentOrderStatus === 'cancelled' && newStatus !== 'cancelled') {
      showAlert('This order is cancelled. Order status cannot be changed once cancelled.', 'Status Locked', 'warning');
      return;
    }
    if (currentPaymentStatus === 'refunded' && newPaymentStatus !== 'refunded') {
      showAlert('This order is refunded. Payment status cannot be changed once refunded.', 'Status Locked', 'warning');
      return;
    }

    try {
      const res = await apiClient.put(`/orders/admin/${orderId}/status`, {
        order_status: newStatus,
        payment_status: newPaymentStatus,
        force_manual: forceManual
      });

      if (res.data.success) {
        setConfirmManualRefundModal({ open: false, refundId: null, orderId: null, newStatus: '', newPaymentStatus: '', message: '' });
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(res.data.order);
        }
        fetchOrders();
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.canForceManual) {
        setConfirmManualRefundModal({
          open: true,
          refundId: null,
          orderId,
          newStatus,
          newPaymentStatus,
          message: errData.message
        });
      } else {
        showAlert(errData?.message || 'Failed to update order status.', 'Action Failed', 'error');
      }
    }
  };

  return (
    <div className="orderListPage">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
        <div>
          <h3 className="font-weight-bold mb-0 text-dark">Customer Orders Management</h3>
          <p className="text-muted small mb-0">Track order fulfillment, update status, and manage customer invoices</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card border-0 shadow-sm p-3 mb-4 rounded-lg bg-white">
        {/* Order Status Tabs */}
        <div className="d-flex flex-wrap gap-2 mb-3 pb-3 border-bottom">
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'refund_requested', 'cancelled'].map((st) => {
            const isActive = activeTab === st;
            const label = st === 'refund_requested' ? 'Refund Requests' : st;
            return (
              <button
                key={st}
                className="btn text-capitalize font-weight-bold btn-sm rounded-pill px-3 py-1 shadow-none"
                style={{
                  backgroundColor: isActive ? (st === 'refund_requested' ? '#dc3545' : '#0d6efd') : '#f8f9fa',
                  color: isActive ? '#ffffff' : '#333333',
                  border: isActive ? (st === 'refund_requested' ? '1px solid #dc3545' : '1px solid #0d6efd') : '1px solid #dcdcdc',
                  boxShadow: isActive ? (st === 'refund_requested' ? '0 2px 6px rgba(220,53,69,0.25)' : '0 2px 6px rgba(13,110,253,0.25)') : 'none',
                  transition: 'all 0.15s ease-in-out',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveTab(st)}
              >
                {st === 'refund_requested' && <FiRefreshCw className="mr-1" size={13} />}
                {label}
              </button>
            );
          })}
        </div>

        {/* Secondary Filters: Payment Status, Date Range & Search */}
        <div className="row g-2 align-items-center">
          <div className="col-lg-3 col-md-4 mb-2 mb-md-0">
            <div className="d-flex align-items-center">
              <FiCreditCard className="mr-2 text-muted" size={16} />
              <select
                className="form-control form-control-sm font-weight-bold rounded-pill"
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
              >
                <option value="all">All Payment Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending Payment</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          <div className="col-lg-3 col-md-4 mb-2 mb-md-0">
            <div className="d-flex align-items-center">
              <FiCalendar className="mr-2 text-muted" size={16} />
              <select
                className="form-control form-control-sm font-weight-bold rounded-pill"
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
          </div>

          <div className="col-lg-6 col-md-4">
            <div className="admin-search-box position-relative">
              <input
                type="text"
                className="form-control pl-5 rounded-pill"
                placeholder="Search by Order #, Customer Name, Email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <FiSearch className="position-absolute text-muted" style={{ left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Datatable */}
      <div className="card border-0 shadow-sm rounded-lg overflow-hidden bg-white p-3">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="thead-light small text-uppercase">
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Total Amount</th>
                <th>Order Status</th>
                <th>Payment Status</th>
                <th>Refund Status</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <p className="mt-2 text-muted small mb-0">Loading orders...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    No customer orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const isDelivered = ord.order_status === 'delivered';
                  const isCancelled = ord.order_status === 'cancelled';

                  return (
                    <tr key={ord.id}>
                      <td className="font-weight-bold text-primary" style={{ minWidth: '110px' }}>
                        {ord.order_number}
                      </td>
                      <td style={{ minWidth: '180px' }}>
                        <div className="font-weight-bold text-dark">{ord.customer_name}</div>
                        <span className="small text-muted">{ord.customer_email}</span>
                      </td>
                      <td className="font-weight-bold text-dark" style={{ minWidth: '120px' }}>
                        RM{parseFloat(ord.total_amount).toFixed(2)}
                      </td>
                      <td style={{ minWidth: '170px' }}>
                        {isDelivered ? (
                          <span
                            className="badge badge-success px-3 py-2 font-weight-bold text-uppercase rounded-pill d-inline-flex align-items-center"
                            title="Order is delivered. Status changes are disabled."
                          >
                            <FiLock className="mr-1" size={12} /> Delivered
                          </span>
                        ) : isCancelled ? (
                          <span
                            className="badge badge-danger px-3 py-2 font-weight-bold text-uppercase rounded-pill d-inline-flex align-items-center"
                            title="Order is cancelled. Status changes are disabled."
                          >
                            <FiLock className="mr-1" size={12} /> Cancelled
                          </span>
                        ) : (
                          <select
                            className="form-control form-control-sm font-weight-bold rounded border-primary bg-light"
                            value={ord.order_status}
                            onChange={(e) =>
                              handleUpdateStatus(ord.id, ord.order_status, e.target.value, ord.payment_status, ord.payment_status)
                            }
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        )}
                      </td>
                      <td style={{ minWidth: '140px' }}>
                        {isCancelled || isDelivered || ord.payment_status === 'refunded' ? (
                          <span className={`badge ${ord.payment_status === 'refunded' ? (ord.stripe_payment_intent ? 'badge-danger' : 'badge-warning text-dark') : ord.payment_status === 'paid' ? 'badge-success' : 'badge-warning text-dark'} px-2.5 py-1 text-uppercase font-weight-bold rounded-pill`}>
                            {ord.payment_status}
                          </span>
                        ) : (
                          <select
                            className="form-control form-control-sm rounded"
                            value={ord.payment_status}
                            onChange={(e) =>
                              handleUpdateStatus(ord.id, ord.order_status, ord.order_status, ord.payment_status, e.target.value)
                            }
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        )}
                      </td>
                      <td style={{ minWidth: '150px' }}>
                        {ord.refund_status === 'requested' ? (
                          <span className="badge badge-warning text-dark px-2.5 py-1 font-weight-bold rounded-pill d-inline-flex align-items-center">
                            <FiRefreshCw className="mr-1" size={12} /> Requested
                          </span>
                        ) : ord.refund_status === 'approved' || ord.payment_status === 'refunded' ? (
                          ord.stripe_payment_intent ? (
                            <span className="badge badge-danger px-2.5 py-1 font-weight-bold rounded-pill d-inline-flex align-items-center">
                              <FiCheck className="mr-1" size={12} /> Refunded (Stripe)
                            </span>
                          ) : (
                            <span className="badge badge-warning text-dark px-2.5 py-1 font-weight-bold rounded-pill d-inline-flex align-items-center border border-warning" style={{ backgroundColor: '#fff3cd' }}>
                              <FiCheck className="mr-1" size={12} /> Manual Refund
                            </span>
                          )
                        ) : ord.refund_status === 'rejected' ? (
                          <span className="badge badge-secondary px-2.5 py-1 font-weight-bold rounded-pill d-inline-flex align-items-center">
                            <FiX className="mr-1" size={12} /> Rejected
                          </span>
                        ) : (
                          <span className="text-muted small">-</span>
                        )}
                      </td>
                      <td className="small text-muted" style={{ minWidth: '140px' }}>
                        {new Date(ord.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="text-right">
                        <Button
                          size="small"
                          className={`btn btn-sm font-weight-bold ${ord.refund_status === 'requested' ? 'btn-warning text-dark' : 'btn-outline-primary'}`}
                          onClick={() => handleOpenDetailModal(ord)}
                        >
                          <FiEye className="mr-1" /> {ord.refund_status === 'requested' ? 'Review Refund' : 'Details'}
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

      {/* Order Details & Invoice Dialog */}
      {selectedOrder && (
        <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth>
          <div className="p-4 bg-white rounded">
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
              <div>
                <h4 className="font-weight-bold mb-0 text-dark">Invoice: {selectedOrder.order_number}</h4>
                <span className="text-muted small">
                  Placed on {new Date(selectedOrder.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
              <Button onClick={() => window.print()} className="btn btn-outline-secondary btn-sm font-weight-bold">
                <FiPrinter className="mr-1" /> Print Invoice
              </Button>
            </div>

            <div className="row mb-4">
              <div className="col-md-6 mb-3 mb-md-0">
                <div className="bg-light p-3 rounded border">
                  <h6 className="font-weight-bold text-uppercase small text-muted mb-2">Customer & Shipping</h6>
                  <div className="font-weight-bold text-dark">{selectedOrder.customer_name}</div>
                  <div className="small text-muted">{selectedOrder.customer_email}</div>
                  {selectedOrder.customer_phone && <div className="small text-secondary">{selectedOrder.customer_phone}</div>}
                  <div className="small text-muted mt-2 pt-2 border-top">
                    <b>Address:</b> {selectedOrder.shipping_address}, {selectedOrder.shipping_city}, {selectedOrder.shipping_country}
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="bg-light p-3 rounded border h-100">
                  <h6 className="font-weight-bold text-uppercase small text-muted mb-2">Fulfillment & Payment</h6>
                  <div className="mb-2">
                    <b>Order Status:</b>{' '}
                    {selectedOrder.order_status === 'delivered' ? (
                      <span className="badge badge-success px-3 py-1 font-weight-bold text-uppercase rounded-pill d-inline-flex align-items-center">
                        <FiLock className="mr-1" size={10} /> Delivered (Locked)
                      </span>
                    ) : selectedOrder.order_status === 'cancelled' ? (
                      <span className="badge badge-danger px-3 py-1 font-weight-bold text-uppercase rounded-pill d-inline-flex align-items-center">
                        <FiLock className="mr-1" size={10} /> Cancelled (Locked)
                      </span>
                    ) : (
                      <span className="badge badge-primary px-3 py-1 text-uppercase font-weight-bold">
                        {selectedOrder.order_status}
                      </span>
                    )}
                  </div>
                  <div>
                    <b>Payment:</b>{' '}
                    <span className={`badge ${selectedOrder.payment_status === 'refunded' ? (selectedOrder.stripe_payment_intent ? 'badge-danger' : 'badge-warning text-dark') : selectedOrder.payment_status === 'paid' ? 'badge-success' : 'badge-secondary'} px-2.5 py-1 text-uppercase font-weight-bold`}>
                      {selectedOrder.payment_method} ({selectedOrder.payment_status === 'refunded' ? (selectedOrder.stripe_payment_intent ? 'refunded' : 'manual refund') : selectedOrder.payment_status})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Refund Request Review Card */}
            {selectedRefundReq && (
              <div className="card border-warning mb-4 shadow-sm rounded-lg overflow-hidden" style={{ backgroundColor: '#fffdf5' }}>
                <div className="card-header bg-warning text-dark font-weight-bold d-flex justify-content-between align-items-center py-2.5 px-3">
                  <div className="d-flex align-items-center gap-2">
                    <FiRefreshCw size={18} className="mr-1" />
                    <span className="h6 mb-0 font-weight-bold">
                      Refund Request Details ({selectedRefundReq.status.toUpperCase()})
                    </span>
                  </div>
                  <span className="small text-muted font-weight-medium">
                    Submitted: {new Date(selectedRefundReq.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="card-body p-3">
                  <div className="row">
                    <div className="col-md-6 mb-3 mb-md-0">
                      <label className="font-weight-bold text-dark small text-uppercase mb-1 d-block">
                        Customer Selected Reason:
                      </label>
                      <div className="badge badge-danger p-2 text-wrap text-left font-weight-bold" style={{ fontSize: '13px' }}>
                        {selectedRefundReq.reason}
                      </div>

                      <label className="font-weight-bold text-dark small text-uppercase mt-3 mb-1 d-block">
                        Customer Comments / Details:
                      </label>
                      <div className="p-2.5 bg-white rounded border small text-dark" style={{ minHeight: '60px' }}>
                        {selectedRefundReq.comment || <i className="text-muted">No details provided.</i>}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="font-weight-bold text-dark small text-uppercase mb-1 d-block">
                        Attached Proof Photos:
                      </label>
                      {(() => {
                        const rawImgs = selectedRefundReq.images;
                        const images = Array.isArray(rawImgs)
                          ? rawImgs
                          : typeof rawImgs === 'string'
                          ? JSON.parse(rawImgs || '[]')
                          : [];

                        if (!images || images.length === 0) {
                          return <div className="text-muted small italic p-2 bg-white rounded border">No photos attached.</div>;
                        }

                        return (
                          <div className="d-flex flex-wrap gap-2 align-items-center">
                            {images.map((imgUrl, idx) => (
                              <div
                                key={idx}
                                className="border rounded p-1 bg-white cursor-pointer shadow-sm position-relative"
                                style={{ width: '75px', height: '75px', cursor: 'pointer' }}
                                onClick={() => setPreviewImage(imgUrl)}
                                title="Click to view large image"
                              >
                                <img src={imgUrl} alt={`Proof ${idx + 1}`} className="w-100 h-100 rounded" style={{ objectFit: 'cover' }} />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Admin Action Controls */}
                  {selectedRefundReq.status === 'pending' && (
                    <div className="border-top pt-3 mt-3">
                      <label className="font-weight-bold text-dark small text-uppercase mb-1 d-block">
                        Admin Resolution Note:
                      </label>
                      <textarea
                        className="form-control mb-3"
                        rows="2"
                        placeholder="Enter note for customer (e.g. Approved refund / Request rejected)..."
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                      />

                      <div className="d-flex justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-danger font-weight-bold rounded-pill px-4 mr-2"
                          onClick={() => handleProcessRefund(selectedRefundReq.id, 'reject')}
                        >
                          <FiThumbsDown className="mr-1" /> Reject Request
                        </button>
                        <button
                          type="button"
                          className="btn btn-success font-weight-bold rounded-pill px-4 shadow-sm"
                          onClick={() => handleProcessRefund(selectedRefundReq.id, 'approve')}
                        >
                          <FiThumbsUp className="mr-1" /> Approve & Refund
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedRefundReq.status !== 'pending' && selectedRefundReq.admin_note && (
                    <div className="mt-3 p-2.5 bg-white rounded border small text-secondary">
                      <b>Admin Decision Note:</b> {selectedRefundReq.admin_note}
                    </div>
                  )}
                </div>
              </div>
            )}

            <h6 className="font-weight-bold text-uppercase small text-muted mb-2">Itemized Breakdown</h6>
            <div className="table-responsive mb-3">
              <table className="table table-bordered mb-0">
                <thead className="thead-light small">
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.id}>
                      <td className="font-weight-bold text-dark">{item.product_name}</td>
                      <td>RM{parseFloat(item.price).toFixed(2)}</td>
                      <td>{item.quantity}</td>
                      <td className="text-right font-weight-bold text-primary">
                        RM{parseFloat(item.total_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-end mb-4">
              <div className="bg-light p-3 rounded border" style={{ minWidth: '240px' }}>
                <div className="d-flex justify-content-between mb-1 small">
                  <span className="text-muted">Subtotal:</span>
                  <b>RM{parseFloat(selectedOrder.subtotal || 0).toFixed(2)}</b>
                </div>
                {parseFloat(selectedOrder.discount || 0) > 0 && (
                  <div className="d-flex justify-content-between mb-1 small text-success">
                    <span>Voucher Applied {selectedOrder.voucher_code ? `(${selectedOrder.voucher_code})` : ''}:</span>
                    <b>-RM{parseFloat(selectedOrder.discount).toFixed(2)}</b>
                  </div>
                )}
                <div className="d-flex justify-content-between mb-1 small">
                  <span className="text-muted">Shipping Fee:</span>
                  <b>RM{parseFloat(selectedOrder.shipping_fee || 0).toFixed(2)}</b>
                </div>
                <hr className="my-2" />
                <div className="d-flex justify-content-between h5 text-primary mb-0 font-weight-bold">
                  <span>Total Paid:</span>
                  <span>RM{parseFloat(selectedOrder.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end pt-3 border-top">
              <Button className="btn btn-secondary px-4" onClick={() => setIsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Proof Photo Lightbox Modal */}
      {previewImage && (
        <Dialog open={Boolean(previewImage)} onClose={() => setPreviewImage(null)} maxWidth="md">
          <div className="p-3 text-center bg-dark text-white position-relative">
            <button
              className="btn btn-sm btn-light rounded-circle position-absolute"
              style={{ top: '10px', right: '10px', zIndex: 10 }}
              onClick={() => setPreviewImage(null)}
            >
              <FiX size={20} />
            </button>
            <img src={previewImage} alt="Proof Large" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
          </div>
        </Dialog>
      )}

      {/* Confirm Manual Refund Dialog */}
      <Dialog
        open={confirmManualRefundModal.open}
        onClose={() => setConfirmManualRefundModal({ open: false, refundId: null, orderId: null, newStatus: '', newPaymentStatus: '', message: '' })}
        maxWidth="sm"
        fullWidth
      >
        <div className="p-4 bg-white rounded text-center">
          <div className="text-warning h2 mb-2">⚠️</div>
          <h5 className="font-weight-bold text-dark mb-2">Stripe Transaction Not Found</h5>
          <p className="text-muted small mb-4">{confirmManualRefundModal.message}</p>
          <div className="d-flex justify-content-center gap-2">
            <Button
              className="btn btn-secondary px-4 rounded-pill mr-2"
              onClick={() => setConfirmManualRefundModal({ open: false, refundId: null, orderId: null, newStatus: '', newPaymentStatus: '', message: '' })}
            >
              Cancel
            </Button>
            <Button
              className="btn btn-warning text-dark font-weight-bold px-4 rounded-pill shadow-sm"
              onClick={() => {
                const { refundId, orderId, newStatus, newPaymentStatus } = confirmManualRefundModal;
                if (refundId) {
                  handleProcessRefund(refundId, 'approve', true);
                } else if (orderId) {
                  handleUpdateStatus(orderId, '', newStatus, '', newPaymentStatus, true);
                }
              }}
            >
              Approve as Manual Refund
            </Button>
          </div>
        </div>
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

export default OrderList;
