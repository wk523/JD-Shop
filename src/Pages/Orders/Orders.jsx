import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { FiPackage, FiTruck, FiCheckCircle, FiClock, FiXCircle, FiStar, FiRefreshCw } from 'react-icons/fi';
import ReviewModal from '../../Components/ReviewModal/ReviewModal';
import RefundModal from '../../Components/RefundModal/RefundModal';

const Orders = () => {
  const { customer } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userReviewsMap, setUserReviewsMap] = useState({});
  const [activeReviewModal, setActiveReviewModal] = useState({
    open: false,
    items: [],
    orderId: null,
    existingReviewsMap: {}
  });
  const [activeRefundModal, setActiveRefundModal] = useState({
    open: false,
    order: null
  });

  const fetchOrdersList = async () => {
    try {
      const res = await apiClient.get('/orders/my-orders');
      if (res.data.success) {
        setOrders(res.data.orders || []);
      }
    } catch (err) {
      console.error('Failed to reload orders:', err);
    }
  };

  const fetchUserReviews = async () => {
    try {
      const res = await apiClient.get('/reviews/my-reviews');
      if (res.data.success) {
        const map = {};
        (res.data.reviews || []).forEach((rev) => {
          map[`${rev.order_id}_${rev.product_id}`] = rev;
        });
        setUserReviewsMap(map);
      }
    } catch (err) {
      console.error('Failed to load user reviews:', err);
    }
  };

  useEffect(() => {
    const fetchOrdersAndVerifySession = async () => {
      if (customer) {
        try {
          const searchParams = new URLSearchParams(window.location.search);
          const sessionId = searchParams.get('session_id');
          const orderId = searchParams.get('order_id');

          if (sessionId) {
            console.log('[VERIFYING STRIPE SESSION]', sessionId, orderId);
            await apiClient.get(`/payment/verify-session/${sessionId}?order_id=${orderId || ''}`);
          }

          await fetchOrdersList();
          await fetchUserReviews();
        } catch (err) {
          console.error('Failed to load or verify orders:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchOrdersAndVerifySession();
  }, [customer]);

  if (!customer) {
    return (
      <div className="container py-5 text-center my-5">
        <h3 className="font-weight-bold text-dark mb-3">Please Sign In to View Your Orders</h3>
        <p className="text-muted mb-4">Log in to track current shipments and review your order history.</p>
        <Link to="/login" className="btn btn-primary btn-lg rounded-pill px-4">Sign In Now</Link>
      </div>
    );
  }

  const renderStatusStepper = (status) => {
    const steps = [
      { key: 'pending', label: 'Placed', icon: <FiClock /> },
      { key: 'processing', label: 'Processing', icon: <FiPackage /> },
      { key: 'shipped', label: 'Shipped', icon: <FiTruck /> },
      { key: 'delivered', label: 'Delivered', icon: <FiCheckCircle /> }
    ];

    if (status === 'cancelled') {
      return (
        <div className="alert alert-danger mb-0 py-2 d-flex align-items-center justify-content-center">
          <FiXCircle className="mr-2" /> Order Cancelled
        </div>
      );
    }

    const currentIdx = steps.findIndex(s => s.key === status);
    const activeIndex = currentIdx === -1 ? 0 : currentIdx;

    return (
      <div className="d-flex align-items-center justify-content-between position-relative my-3 px-3">
        {steps.map((step, idx) => {
          const isDone = idx <= activeIndex;
          return (
            <div key={step.key} className="text-center z-index-1 flex-grow-1">
              <div
                className={`stepper-circle mx-auto rounded-circle d-flex align-items-center justify-content-center mb-1 ${
                  isDone ? 'bg-primary text-white font-weight-bold' : 'bg-light text-muted border'
                }`}
              >
                {step.icon}
              </div>
              <span className={`small ${isDone ? 'font-weight-bold text-primary' : 'text-muted'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="ordersPage py-5 bg-light min-vh-100">
      <div className="container">
        <h2 className="font-weight-bold mb-4">My Orders & Shipments</h2>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2 text-muted">Fetching your order history...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white p-5 text-center rounded shadow-sm">
            <h4 className="font-weight-bold text-muted">No Orders Found</h4>
            <p className="text-secondary small mb-3">You haven't placed any orders with JD Shop yet.</p>
            <Link to="/shop" className="btn btn-primary rounded-pill px-4">Start Shopping</Link>
          </div>
        ) : (
          <div className="row">
            {orders.map((order) => (
              <div key={order.id} className="col-12 mb-4">
                <div className="bg-white rounded shadow-sm p-4 border">
                  {/* Order Header */}
                  <div className="d-flex flex-wrap align-items-center justify-content-between border-bottom pb-3 mb-3">
                    <div>
                      <span className="h5 font-weight-bold text-primary mr-3">{order.order_number}</span>
                      <span className="text-muted small">
                        Placed on {new Date(order.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div>
                      {order.refund_status === 'requested' && (
                        <span className="badge badge-info px-3 py-2 font-weight-bold text-uppercase mr-2 text-white">
                          Refund Requested
                        </span>
                      )}
                      {(order.refund_status === 'approved' || order.payment_status === 'refunded') && (
                        <span className={`badge ${order.stripe_payment_intent ? 'badge-danger' : 'badge-warning text-dark'} px-3 py-2 font-weight-bold text-uppercase mr-2`}>
                          {order.stripe_payment_intent ? 'Refunded (Stripe)' : 'Manual Refund'}
                        </span>
                      )}
                      {order.refund_status === 'rejected' && (
                        <span className="badge badge-secondary px-3 py-2 font-weight-bold text-uppercase mr-2">
                          Refund Rejected
                        </span>
                      )}
                      <span className={`badge ${order.payment_status?.toLowerCase() === 'refunded' ? (order.stripe_payment_intent ? 'badge-danger' : 'badge-warning text-dark') : order.payment_status?.toLowerCase() === 'paid' ? 'badge-success' : 'badge-warning text-dark'} px-3 py-2 font-weight-bold text-uppercase mr-2`}>
                        {order.payment_method} ({order.payment_status?.toLowerCase() === 'refunded' ? (order.stripe_payment_intent ? 'refunded' : 'manual refund') : (order.payment_status || 'pending')})
                      </span>
                      <span className="font-weight-bold text-dark h5 mb-0">
                        RM{parseFloat(order.total_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Stepper Status Bar */}
                  {renderStatusStepper(order.order_status)}

                  {/* Order Items */}
                  <div className="order-items-preview border-top pt-3">
                    <h6 className="font-weight-bold text-muted small text-uppercase mb-3">Order Items</h6>
                    <div className="row">
                      {order.items && order.items.map((item, idx) => (
                        <div key={idx} className="col-12 mb-2">
                          <div className="bg-light p-3 rounded-lg border d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center flex-grow-1 mr-3">
                              {item.product_image ? (
                                <img
                                  src={item.product_image}
                                  alt={item.product_name}
                                  className="cart-item-thumb mr-3 rounded border bg-white"
                                  style={{ width: '54px', height: '54px', objectFit: 'cover' }}
                                />
                              ) : (
                                <div
                                  className="cart-item-thumb mr-3 rounded border bg-white d-flex align-items-center justify-content-center text-muted small"
                                  style={{ width: '54px', height: '54px' }}
                                >
                                  No Img
                                </div>
                              )}
                              <div>
                                <h6 className="font-weight-bold text-dark mb-1">{item.product_name}</h6>
                                <span className="small text-muted font-weight-medium">
                                  {item.quantity} × RM{parseFloat(item.price).toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <span className="font-weight-bold text-primary h6 mb-0">
                              RM{parseFloat(item.total_price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Breakdown Details */}
                  <div className="bg-light p-3 rounded mt-3 border">
                    <h6 className="font-weight-bold text-dark mb-2 small text-uppercase">Payment & Price Details</h6>
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">Original Subtotal:</span>
                      <span className="font-weight-bold">RM{parseFloat(order.subtotal || 0).toFixed(2)}</span>
                    </div>

                    {parseFloat(order.discount || 0) > 0 && (
                      <div className="d-flex justify-content-between small text-success mb-1">
                        <span>
                          Voucher Applied {order.voucher_code ? `(${order.voucher_code})` : ''}:
                        </span>
                        <span className="font-weight-bold">-RM{parseFloat(order.discount).toFixed(2)}</span>
                      </div>
                    )}

                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-muted">Shipping Fee:</span>
                      <span>
                        {parseFloat(order.shipping_fee || 0) === 0 ? (
                          <b className="text-success">FREE</b>
                        ) : (
                          `RM${parseFloat(order.shipping_fee).toFixed(2)}`
                        )}
                      </span>
                    </div>

                    <hr className="my-2" />

                    <div className="d-flex justify-content-between font-weight-bold">
                      <span className="text-dark">
                        {order.payment_status?.toLowerCase() === 'paid' ? 'Total Amount Paid:' : 'Total Amount Payable (Pending Payment):'}
                      </span>
                      <span className="text-primary h6 mb-0">RM{parseFloat(order.total_amount || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Shipping Address Footer */}
                  <div className="bg-light p-3 rounded mt-3 small text-muted d-flex justify-content-between align-items-center">
                    <div>
                      <b>Delivery Address:</b> {order.shipping_address}, {order.shipping_city}, {order.shipping_country}
                    </div>
                    {order.customer_phone && <div><b>Phone:</b> {order.customer_phone}</div>}
                  </div>

                  {/* Action Footer Bar (Rating & Refund) */}
                  {((order.order_status === 'delivered') || (order.payment_status === 'paid' && order.order_status !== 'cancelled')) && (() => {
                    const orderItems = order.items || [];
                    const totalItems = orderItems.length;
                    const existingReviewsMap = {};
                    let ratedCount = 0;

                    orderItems.forEach((item) => {
                      const rev = userReviewsMap[`${order.id}_${item.product_id}`];
                      if (rev) {
                        existingReviewsMap[item.product_id] = rev;
                        ratedCount += 1;
                      }
                    });

                    const hasRatedAny = ratedCount > 0;
                    const isAllRated = totalItems > 0 && ratedCount === totalItems;
                    const buttonLabel = isAllRated
                      ? (totalItems > 1 ? `View Reviews (${ratedCount}/${totalItems})` : 'View Product Review')
                      : (ratedCount > 0
                          ? `Rate Remaining (${totalItems - ratedCount}/${totalItems})`
                          : (totalItems > 1 ? 'Rate Products' : 'Rate Product'));

                    return (
                      <div className="d-flex justify-content-end align-items-center flex-wrap gap-2 mt-3 pt-3 border-top">
                        {/* Refund Action (Only allowed if order not cancelled AND user has NOT rated any products in this order) */}
                        {order.order_status !== 'cancelled' && (
                          <>
                            {order.refund_status === 'requested' ? (
                              <span className="badge badge-info px-3 py-2 font-weight-bold text-uppercase text-white mr-2">
                                Refund Pending Review
                              </span>
                            ) : order.refund_status === 'approved' || order.payment_status === 'refunded' ? (
                              <span className={`badge ${order.stripe_payment_intent ? 'badge-danger' : 'badge-warning text-dark'} px-3 py-2 font-weight-bold text-uppercase mr-2`}>
                                {order.stripe_payment_intent ? 'Refund Approved (Stripe)' : 'Manual Refund Completed'}
                              </span>
                            ) : !hasRatedAny ? (
                              <button
                                type="button"
                                className="btn btn-outline-danger font-weight-bold rounded-pill shadow-sm d-inline-flex align-items-center transition-all mr-2"
                                style={{ padding: '8px 20px', fontSize: '14px', cursor: 'pointer' }}
                                onClick={() => setActiveRefundModal({ open: true, order })}
                              >
                                <FiRefreshCw className="mr-2" size={16} />
                                <span>{order.refund_status === 'rejected' ? 'Re-request Refund' : 'Request Refund'}</span>
                              </button>
                            ) : null}
                          </>
                        )}

                        {/* Rating Action */}
                        {order.order_status === 'delivered' && (
                          <button
                            type="button"
                            className={`btn font-weight-bold rounded-pill shadow-sm d-inline-flex align-items-center transition-all ${
                              isAllRated
                                ? 'btn-outline-warning text-dark border-2 bg-white'
                                : 'btn-warning text-dark'
                            }`}
                            style={{
                              padding: '9px 24px',
                              fontSize: '14px',
                              boxShadow: '0 4px 10px rgba(255, 193, 7, 0.4)',
                              cursor: 'pointer'
                            }}
                            onClick={() =>
                              setActiveReviewModal({
                                open: true,
                                items: orderItems,
                                orderId: order.id,
                                existingReviewsMap
                              })
                            }
                          >
                            <FiStar
                              className="mr-2"
                              size={18}
                              style={{ fill: isAllRated ? '#ffc107' : '#212529' }}
                            />
                            <span>{buttonLabel}</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {activeReviewModal.items && activeReviewModal.items.length > 0 && (
        <ReviewModal
          open={activeReviewModal.open}
          onClose={() => setActiveReviewModal((prev) => ({ ...prev, open: false }))}
          items={activeReviewModal.items}
          orderId={activeReviewModal.orderId}
          existingReviewsMap={activeReviewModal.existingReviewsMap}
          onSuccess={() => {
            fetchUserReviews();
          }}
        />
      )}

      {/* Refund Modal */}
      {activeRefundModal.order && (
        <RefundModal
          open={activeRefundModal.open}
          onClose={() => setActiveRefundModal((prev) => ({ ...prev, order: null }))}
          order={activeRefundModal.order}
          onSuccess={() => {
            fetchOrdersList();
          }}
        />
      )}
    </div>
  );
};

export default Orders;
