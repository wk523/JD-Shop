import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import { FiCheckCircle, FiAlertCircle, FiClock, FiLock } from 'react-icons/fi';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement
} from '@stripe/react-stripe-js';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';
import { MALAYSIAN_STATES, SUPPORTED_COUNTRIES } from '../../utils/locationData';
import CustomSelect from '../../Components/CustomSelect/CustomSelect';

// Dynamic Stripe Promise loaded inside Checkout component based on Admin Settings

const ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#32325d',
      lineHeight: '26px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
};

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();

  const {
    selectedCartItems,
    selectedCartTotal,
    appliedVoucher,
    discountTotal,
    shippingFee,
    grandTotal,
    removePurchasedItems,
    refreshCart
  } = useCart();
  const { customer } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customer_name: customer ? customer.name : '',
    customer_email: customer ? customer.email : '',
    customer_phone: customer ? (customer.phone || '') : '',
    shipping_address: customer ? (customer.address || '') : '',
    shipping_city: customer ? (customer.city || '') : '',
    shipping_country: customer ? (customer.country || 'Malaysia') : 'Malaysia',
    shipping_postal_code: '50000',
    payment_method: 'Credit / Debit Card (Stripe)',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isCanceled = searchParams.get('canceled') === 'true';
    const orderId = searchParams.get('order_id');

    if (isCanceled) {
      setError('❌ Payment was failed or declined. Your order was not placed and items remain in your cart.');
      if (orderId) {
        console.log('[CHECKOUT ROLLBACK] Cleaning up canceled order:', orderId);
        apiClient.delete(`/orders/cancel-failed-order/${orderId}`)
          .finally(() => {
            refreshCart();
          });
      } else {
        refreshCart();
      }
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    console.log('[CHECKOUT INIT]', {
      customer: formData.customer_name,
      email: formData.customer_email,
      payment_method: formData.payment_method,
      grandTotal,
      selectedCartItemsCount: selectedCartItems?.length
    });

    if (!formData.customer_name || !formData.customer_email || !formData.shipping_address) {
      setError('Please fill in all required shipping fields.');
      return;
    }

    if (!selectedCartItems || selectedCartItems.length === 0) {
      setError('No items selected for checkout.');
      return;
    }

    const purchasedProductIds = selectedCartItems.map(item => item.product_id || item.id);

    setLoading(true);
    setError('');

    if (formData.payment_method === 'Credit / Debit Card (Stripe)') {
      if (!stripe || !elements) {
        setError('Stripe payment system is loading. Please try again in a few seconds.');
        setLoading(false);
        return;
      }

      const cardNumberElement = elements.getElement(CardNumberElement);
      if (!cardNumberElement) {
        setError('Please enter valid credit/debit card details.');
        setLoading(false);
        return;
      }

      let createdOrder = null;
      try {
        // Step 1: Create Order in DB as Pending
        console.log('[CHECKOUT STEP 1] Creating pending order record...');
        const orderPayload = {
          ...formData,
          discount: discountTotal,
          voucher_code: appliedVoucher ? appliedVoucher.code : null,
          payment_method: 'Credit / Debit Card (Stripe)',
          payment_status: 'pending',
          order_status: 'pending',
          items: selectedCartItems.map(item => ({
            product_id: item.product_id || item.id,
            quantity: item.quantity
          }))
        };

        const orderRes = await apiClient.post('/orders', orderPayload);
        if (!orderRes.data.success || !orderRes.data.order) {
          throw new Error(orderRes.data.message || 'Failed to place order record.');
        }

        createdOrder = orderRes.data.order;
        console.log('[CHECKOUT STEP 1 SUCCESS] Order created:', createdOrder.order_number);

        // Step 2: Create Stripe Payment Intent for exact grandTotal
        console.log('[CHECKOUT STEP 2] Creating Stripe PaymentIntent for RM', grandTotal);
        const intentRes = await apiClient.post('/payment/create-payment-intent', {
          amount: grandTotal,
          currency: 'myr',
          order_number: createdOrder.order_number,
          order_id: createdOrder.id
        });

        if (!intentRes.data.success || !intentRes.data.clientSecret) {
          throw new Error(intentRes.data.message || 'Failed to initialize Stripe payment intent.');
        }

        const { clientSecret } = intentRes.data;

        // Step 3: Confirm Card Payment (3DS modal opens directly on page)
        console.log('[CHECKOUT STEP 3] Confirming Stripe card payment...');
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardNumberElement,
            billing_details: {
              name: formData.customer_name,
              email: formData.customer_email,
              phone: formData.customer_phone || undefined
            }
          }
        });

        if (result.error) {
          console.log('[CHECKOUT PAYMENT DECLINED/FAILED]', result.error.message);
          // Rollback failed order record from DB
          if (createdOrder?.id) {
            await apiClient.delete(`/orders/cancel-failed-order/${createdOrder.id}`);
          }
          setError(`❌ Payment was failed or declined (${result.error.message}). Your order was not placed and items remain in your cart.`);
          refreshCart();
          setLoading(false);
        } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
          console.log('[CHECKOUT PAYMENT SUCCEEDED]', result.paymentIntent.id);
          // Confirm payment in DB & update status to paid
          const confirmRes = await apiClient.post('/payment/confirm-intent', {
            paymentIntentId: result.paymentIntent.id,
            order_id: createdOrder.id
          });

          if (confirmRes.data.success) {
            setOrderSuccess(confirmRes.data.order || { ...createdOrder, payment_status: 'paid', order_status: 'processing' });
            removePurchasedItems(purchasedProductIds);
          } else {
            setError(confirmRes.data.message || 'Payment completed, but order status failed to update.');
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('[CHECKOUT STRIPE ERROR]', err);
        if (createdOrder?.id) {
          await apiClient.delete(`/orders/cancel-failed-order/${createdOrder.id}`);
        }
        setError(err.response?.data?.message || err.message || 'Payment failed. Items remain in your cart.');
        refreshCart();
        setLoading(false);
      }
    } else {
      // Cash On Delivery Flow
      try {
        console.log('[CHECKOUT COD] Placing Cash On Delivery Order...');
        const orderPayload = {
          ...formData,
          discount: discountTotal,
          voucher_code: appliedVoucher ? appliedVoucher.code : null,
          payment_method: 'Cash On Delivery',
          payment_status: 'pending',
          order_status: 'pending',
          items: selectedCartItems.map(item => ({
            product_id: item.product_id || item.id,
            quantity: item.quantity
          }))
        };

        const orderRes = await apiClient.post('/orders', orderPayload);
        if (orderRes.data.success) {
          console.log('[CHECKOUT COD SUCCESS]', orderRes.data.order);
          setOrderSuccess(orderRes.data.order);
          removePurchasedItems(purchasedProductIds);
        } else {
          console.error('[CHECKOUT COD ERROR]', orderRes.data.message);
          setError(orderRes.data.message || 'Failed to place order.');
        }
      } catch (err) {
        console.error('[CHECKOUT COD CATCH ERROR]', err);
        setError(err.response?.data?.message || 'Server error during order processing.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (orderSuccess) {
    const isPaid = orderSuccess.payment_status?.toLowerCase() === 'paid';

    return (
      <div className="container py-5 text-center my-5">
        <div className={`display-1 mb-3 ${isPaid ? 'text-success' : 'text-warning'}`}>
          {isPaid ? <FiCheckCircle /> : <FiClock />}
        </div>
        <h2 className="font-weight-bold text-dark mb-2">
          {isPaid ? 'Order Confirmed & Paid!' : 'Order Placed (Payment Pending)'}
        </h2>
        <p className="lead text-muted mb-3">
          Thank you, <b>{orderSuccess.customer_name}</b>. Your order <b>{orderSuccess.order_number}</b> has been received.
        </p>

        <div className="col-md-6 mx-auto mb-4 bg-white p-4 rounded shadow-sm border">
          <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
            <span className="text-muted">Total Amount:</span>
            <span className="font-weight-bold text-primary">RM{parseFloat(orderSuccess.total_amount).toFixed(2)}</span>
          </div>
          <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
            <span className="text-muted">Payment Method:</span>
            <span className="font-weight-bold">{orderSuccess.payment_method}</span>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted">Payment Status:</span>
            <span className={`badge px-3 py-1 font-weight-bold ${isPaid ? 'badge-success' : 'badge-warning text-dark'}`}>
              {isPaid ? 'PAID' : 'PENDING'}
            </span>
          </div>
        </div>

        <div className="d-flex justify-content-center gap-3" style={{ gap: '15px' }}>
          <Button
            className="btn btn-primary btn-lg rounded-pill px-4"
            style={{ backgroundColor: '#0d6efd', color: '#ffffff', border: 'none', fontWeight: 'bold' }}
            onClick={() => navigate('/orders')}
          >
            Track My Orders
          </Button>
          <Button
            className="btn btn-secondary btn-lg rounded-pill px-4"
            style={{ backgroundColor: '#6c757d', color: '#ffffff', border: 'none', fontWeight: 'bold' }}
            onClick={() => navigate('/shop')}
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkoutPage py-5 bg-light min-vh-100">
      <div className="container">
        <h2 className="font-weight-bold mb-4">Checkout & Order Placement</h2>

        {error && <div className="alert alert-danger mb-4 d-flex align-items-center"><FiAlertCircle className="mr-2 h4 mb-0" /> {error}</div>}

        <form onSubmit={handlePlaceOrder}>
          <div className="row">
            {/* Delivery & Shipping Form */}
            <div className="col-lg-7 mb-4">
              <div className="bg-white rounded shadow-sm p-4 mb-4">
                <h5 className="font-weight-bold mb-3 border-bottom pb-2">1. Contact & Delivery Information</h5>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">Full Name <span className="required-star">*</span></label>
                    <input
                      type="text"
                      name="customer_name"
                      className="form-control"
                      value={formData.customer_name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">Email Address <span className="required-star">*</span></label>
                    <input
                      type="email"
                      name="customer_email"
                      className="form-control"
                      value={formData.customer_email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">Phone Number</label>
                    <input
                      type="text"
                      name="customer_phone"
                      className="form-control"
                      value={formData.customer_phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="font-weight-bold small text-muted">Country <span className="required-star">*</span></label>
                    <CustomSelect
                      options={SUPPORTED_COUNTRIES.map(c => ({ value: c.name, label: `${c.flag} ${c.name}` }))}
                      value={formData.shipping_country || 'Malaysia'}
                      onChange={(c) => {
                        setFormData(prev => ({
                          ...prev,
                          shipping_country: c,
                          shipping_city: c === 'Singapore' ? '' : prev.shipping_city
                        }));
                      }}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="font-weight-bold small text-muted">Street Address <span className="required-star">*</span></label>
                  <input
                    type="text"
                    name="shipping_address"
                    className="form-control"
                    placeholder="House number and street name"
                    value={formData.shipping_address}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="row">
                  {formData.shipping_country !== 'Singapore' && (
                    <div className="col-md-6 mb-3">
                      <label className="font-weight-bold small text-muted">State</label>
                      <CustomSelect
                        options={MALAYSIAN_STATES}
                        value={formData.shipping_state || formData.shipping_city}
                        placeholder="Select State..."
                        onChange={(val) => {
                          setFormData(prev => ({
                            ...prev,
                            shipping_state: val,
                            shipping_city: val
                          }));
                        }}
                      />
                    </div>
                  )}
                  <div className={formData.shipping_country === 'Singapore' ? 'col-md-12 mb-3' : 'col-md-6 mb-3'}>
                    <label className="font-weight-bold small text-muted">Postal / ZIP Code</label>
                    <input
                      type="text"
                      name="shipping_postal_code"
                      className="form-control"
                      value={formData.shipping_postal_code}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="mb-0">
                  <label className="font-weight-bold small text-muted">Order Notes (Optional)</label>
                  <textarea
                    name="notes"
                    className="form-control"
                    rows="2"
                    placeholder="Special instructions for delivery..."
                    value={formData.notes}
                    onChange={handleChange}
                  ></textarea>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded shadow-sm p-4">
                <h5 className="font-weight-bold mb-3 border-bottom pb-2">2. Payment Method</h5>

                {/* Credit / Debit Card (Stripe) Option */}
                <div className="form-check p-3 border rounded mb-3 bg-light">
                  <input
                    className="form-check-input ml-1"
                    type="radio"
                    name="payment_method"
                    id="stripe-hosted"
                    value="Credit / Debit Card (Stripe)"
                    checked={formData.payment_method === 'Credit / Debit Card (Stripe)'}
                    onChange={handleChange}
                  />
                  <label className="form-check-label font-weight-bold ml-4 text-dark" htmlFor="stripe-hosted">
                    💳 Pay with Credit / Debit Card (Stripe Sandbox)
                  </label>
                  <p className="small text-muted mb-2 ml-4">
                    Enter card details directly below. 3DS authentication modal will process right on this page.
                  </p>

                  {formData.payment_method === 'Credit / Debit Card (Stripe)' && (
                    <div className="ml-4 mt-3 bg-white p-3 rounded border shadow-sm">
                      <div className="mb-3">
                        <label className="small font-weight-bold text-muted d-block">Card Number</label>
                        <div className="form-control d-flex align-items-center" style={{ height: '46px', padding: '0 14px' }}>
                          <div className="w-100">
                            <CardNumberElement options={ELEMENT_OPTIONS} />
                          </div>
                        </div>
                      </div>

                      <div className="row">
                        <div className="col-6 mb-3">
                          <label className="small font-weight-bold text-muted d-block">Expiry Date</label>
                          <div className="form-control d-flex align-items-center" style={{ height: '46px', padding: '0 14px' }}>
                            <div className="w-100">
                              <CardExpiryElement options={ELEMENT_OPTIONS} />
                            </div>
                          </div>
                        </div>
                        <div className="col-6 mb-3">
                          <label className="small font-weight-bold text-muted d-block">CVC / CVV</label>
                          <div className="form-control d-flex align-items-center" style={{ height: '46px', padding: '0 14px' }}>
                            <div className="w-100">
                              <CardCvcElement options={ELEMENT_OPTIONS} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="alert alert-info py-2 px-3 mb-0 small">
                        <FiLock className="mr-1" /> <b>Test Cards for 3DS authentication:</b> Use <code>4000 0000 0000 3220</code> or <code>4000 0024 0000 3155</code> with any future expiry date (e.g. 12/28) and CVC (123). Click <b>FAIL</b> to test declined payment or <b>COMPLETE</b> to test success.
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-check p-3 border rounded bg-light">
                  <input
                    className="form-check-input ml-1"
                    type="radio"
                    name="payment_method"
                    id="cod"
                    value="Cash On Delivery"
                    checked={formData.payment_method === 'Cash On Delivery'}
                    onChange={handleChange}
                  />
                  <label className="form-check-label font-weight-bold ml-4 text-dark" htmlFor="cod">
                    💵 Cash on Delivery (COD)
                  </label>
                  <p className="small text-muted mb-0 ml-4">Pay cash when order arrives (Status: Pending).</p>
                </div>
              </div>
            </div>

            {/* Order Review Sidebar */}
            <div className="col-lg-5">
              <div className="bg-white rounded shadow-sm p-4">
                <h5 className="font-weight-bold mb-3 border-bottom pb-2">Order Review ({selectedCartItems?.length || 0} items)</h5>

                <div className="checkout-items-list mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {selectedCartItems?.map((item) => (
                    <div key={item.product_id || item.id} className="d-flex align-items-center mb-3 border-bottom pb-2">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="search-thumb mr-3 rounded border" />
                      ) : (
                        <div className="search-thumb mr-3 rounded border bg-light d-flex align-items-center justify-content-center text-muted small">
                          No Img
                        </div>
                      )}
                      <div className="flex-grow-1">
                        <h6 className="mb-0 font-weight-bold text-truncate">{item.name}</h6>
                        <span className="small text-muted">Qty: {item.quantity} × RM{parseFloat(item.price).toFixed(2)}</span>
                      </div>
                      <span className="font-weight-bold">RM{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Selected Subtotal:</span>
                  <span className="font-weight-bold">RM{selectedCartTotal.toFixed(2)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="d-flex justify-content-between mb-2 text-success">
                    <span>Voucher Discount ({appliedVoucher?.code}):</span>
                    <span className="font-weight-bold">-RM{discountTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Shipping Fee:</span>
                  <span>{shippingFee === 0 ? <b className="text-success">FREE</b> : `RM${shippingFee.toFixed(2)}`}</span>
                </div>

                <hr />

                <div className="d-flex justify-content-between mb-4 h4">
                  <span className="font-weight-bold text-dark">Total Amount:</span>
                  <span className="font-weight-bold text-primary">RM{grandTotal.toFixed(2)}</span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg w-100 font-weight-bold rounded-pill py-3 shadow"
                  style={{ backgroundColor: '#0d6efd', border: 'none', fontSize: '16px' }}
                  disabled={loading}
                >
                  {loading
                    ? 'Processing Payment...'
                    : formData.payment_method === 'Credit / Debit Card (Stripe)'
                      ? `Pay RM${grandTotal.toFixed(2)} with Stripe →`
                      : 'Confirm & Place Order →'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const Checkout = () => {
  const [stripePromise, setStripePromise] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStripeConfig = async () => {
      try {
        const res = await apiClient.get('/payment/config');
        if (isMounted) {
          const key = (res.data.success && res.data.publishableKey && res.data.publishableKey !== 'pk_test_placeholder')
            ? res.data.publishableKey
            : (process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');
          
          setStripePromise(loadStripe(key));
        }
      } catch (err) {
        console.error('Failed to load Stripe publishable key:', err);
        if (isMounted) {
          setStripePromise(loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'));
        }
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    };

    fetchStripeConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loadingConfig) {
    return (
      <div className="py-5 text-center min-vh-50 d-flex flex-column align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-3 text-muted font-weight-500">Initializing checkout & payment system...</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
};

export default Checkout;
