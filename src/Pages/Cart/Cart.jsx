import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { FiTrash2, FiArrowLeft, FiShoppingBag, FiTag, FiLogIn, FiCheckCircle, FiCheck, FiX, FiGift, FiPlusCircle, FiClock } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';
import { getVoucherExpiryInfo } from '../../utils/voucherUtils';

const Cart = () => {
  const { customer } = useAuth();
  const {
    cart,
    cartCount,
    selectedCartItems,
    selectedCartTotal,
    selectedItemIds,
    appliedVoucher,
    discountTotal,
    shippingFee,
    grandTotal,
    applyVoucher,
    removeVoucher,
    updateQuantity,
    removeFromCart,
    clearCart,
    toggleSelectItem,
    selectAllItems,
    deselectAllItems,
    isItemSelected
  } = useCart();

  const navigate = useNavigate();

  // Voucher Modal State
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [usedVoucherCodes, setUsedVoucherCodes] = useState([]);
  const [customCode, setCustomCode] = useState('');
  const [modalFeedback, setModalFeedback] = useState({ text: '', isError: false });

  // Open Voucher Selection Modal
  const handleOpenVoucherModal = async () => {
    setIsVoucherModalOpen(true);
    setModalFeedback({ text: '', isError: false });
    setCustomCode('');

    // Load ONLY customer's redeemed saved vouchers
    const voucherStorageKey = customer ? `jdshop_redeemed_vouchers_${customer.id}` : null;
    let userSaved = [];
    if (voucherStorageKey) {
      const saved = localStorage.getItem(voucherStorageKey);
      userSaved = saved ? JSON.parse(saved) : [];
    }

    try {
      if (customer) {
        const usedRes = await apiClient.get(`/vouchers/user-used/${customer.id}`);
        if (usedRes.data.success) {
          setUsedVoucherCodes(usedRes.data.usedCodes || []);
        }
      }

      const res = await apiClient.get('/vouchers');
      if (res.data.success) {
        const sysMap = new Map(res.data.vouchers.map(sv => [sv.code.toUpperCase(), sv]));
        userSaved = userSaved.map(v => {
          const match = sysMap.get(v.code.toUpperCase());
          return match
            ? {
                ...v,
                ...match,
                min_spend: parseFloat(match.min_spend || 0),
                discount_value: parseFloat(match.discount_value || 0)
              }
            : v;
        });
        if (voucherStorageKey) {
          localStorage.setItem(voucherStorageKey, JSON.stringify(userSaved));
        }
      }
    } catch (err) {
      console.error('Failed to match voucher details:', err);
    }

    setAvailableVouchers(userSaved);
  };

  const handleCloseVoucherModal = () => {
    setIsVoucherModalOpen(false);
    setModalFeedback({ text: '', isError: false });
  };

  // Apply selected voucher from modal list
  const handleApplyModalVoucher = async (code) => {
    setModalFeedback({ text: '', isError: false });
    const res = await applyVoucher(code);
    if (res.success) {
      setIsVoucherModalOpen(false);
    } else {
      setModalFeedback({ text: res.message, isError: true });
    }
  };

  // Redeem custom code inside modal
  const handleApplyCustomCodeModal = async (e) => {
    if (e) e.preventDefault();
    if (!customCode.trim()) return;

    setModalFeedback({ text: '', isError: false });
    const codeToApply = customCode.trim().toUpperCase();
    const res = await applyVoucher(codeToApply);

    if (res.success) {
      // Save newly validated voucher to user's wallet
      const voucherStorageKey = customer ? `jdshop_redeemed_vouchers_${customer.id}` : null;
      if (voucherStorageKey) {
        const saved = localStorage.getItem(voucherStorageKey);
        const list = saved ? JSON.parse(saved) : [];
        if (res.voucher && !list.some(v => v.code.toUpperCase() === res.voucher.code.toUpperCase())) {
          const updated = [res.voucher, ...list];
          localStorage.setItem(voucherStorageKey, JSON.stringify(updated));
          setAvailableVouchers(updated);
        }
      }
      setIsVoucherModalOpen(false);
      setCustomCode('');
    } else {
      setModalFeedback({ text: res.message, isError: true });
    }
  };

  const isAllSelected = cart.length > 0 && selectedItemIds.length === cart.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      deselectAllItems();
    } else {
      selectAllItems();
    }
  };

  // Guest view (Not Logged In)
  if (!customer) {
    return (
      <div className="container py-5 text-center my-5">
        <div className="emptyCartIcon mb-3">
          <FiShoppingBag className="display-1 text-muted opacity-50" />
        </div>
        <h3 className="font-weight-bold text-dark mb-2">Please Sign In to Access Your Cart</h3>
        <p className="text-secondary small mb-4">Guest users cannot add or view cart items. Please log in to your account.</p>
        <Link
          to="/sign-in"
          className="btn btn-primary btn-lg rounded-pill px-5 font-weight-bold shadow-sm"
          style={{ backgroundColor: '#0d6efd', color: '#ffffff', border: 'none' }}
        >
          <FiLogIn className="mr-2" /> Sign In / Register Account
        </Link>
      </div>
    );
  }

  // Logged-in Customer with Empty Cart
  if (cart.length === 0) {
    return (
      <div className="container py-5 text-center my-5">
        <div className="emptyCartIcon mb-3">
          <FiShoppingBag className="display-1 text-muted opacity-50" />
        </div>
        <h3 className="font-weight-bold text-dark mb-2">Your Shopping Cart is Empty</h3>
        <p className="text-secondary small mb-4">Looks like you haven't added any items to your bag yet.</p>
        <Link
          to="/shop"
          className="btn btn-primary btn-lg rounded-pill px-5 font-weight-bold shadow-sm"
          style={{ backgroundColor: '#0d6efd', color: '#ffffff', border: 'none' }}
        >
          Start Shopping in JD Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="cartPage py-5 bg-light min-vh-100">
      <div className="container">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h2 className="font-weight-bold text-dark mb-0">Shopping Cart ({cartCount} items)</h2>
          <span className="badge badge-primary px-3 py-2 font-weight-bold rounded-pill">
            {selectedCartItems.length} Selected for Checkout
          </span>
        </div>

        <div className="row">
          {/* Cart Item List */}
          <div className="col-lg-8 mb-4">
            <div className="bg-white rounded shadow-sm p-4">
              <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                <div className="d-flex align-items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    id="selectAllCheckbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="selectAllCheckbox" className="font-weight-bold mb-0 text-dark cursor-pointer">
                    Select All Items ({selectedItemIds.length}/{cart.length})
                  </label>
                </div>
                <Button size="small" onClick={clearCart} className="text-danger font-weight-bold">
                  <FiTrash2 className="mr-1" /> Clear Cart
                </Button>
              </div>

              <div className="table-responsive">
                <table className="table table-borderless align-middle mb-0">
                  <thead>
                    <tr className="text-muted small border-bottom">
                      <th style={{ width: '40px' }}></th>
                      <th>Product</th>
                      <th>Price</th>
                      <th className="text-center">Quantity</th>
                      <th className="text-right">Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item) => {
                      const itemSubtotal = parseFloat(item.price) * item.quantity;
                      const itemId = item.product_id || item.id;
                      const isChecked = isItemSelected(itemId);

                      return (
                        <tr key={itemId} className={`border-bottom ${!isChecked ? 'opacity-50 bg-light' : ''}`}>
                          <td className="align-middle">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectItem(itemId)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ minWidth: '220px' }}>
                            <div className="d-flex align-items-center">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="cart-item-thumb mr-3 rounded border" />
                              ) : (
                                <div className="cart-item-thumb mr-3 rounded border bg-light d-flex align-items-center justify-content-center text-muted small">
                                  No Img
                                </div>
                              )}
                              <div>
                                <Link to={`/product/${itemId}`} className="font-weight-bold text-dark text-decoration-none">
                                  {item.name}
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td className="font-weight-bold">RM{parseFloat(item.price).toFixed(2)}</td>
                          <td>
                            <div className="d-flex align-items-center justify-content-center border rounded w-auto mx-auto bg-white" style={{ maxWidth: '110px' }}>
                              <button
                                className="btn btn-sm btn-link text-dark text-decoration-none px-2 font-weight-bold"
                                onClick={() => updateQuantity(itemId, item.quantity - 1)}
                              >
                                -
                              </button>
                              <span className="px-2 font-weight-bold">{item.quantity}</span>
                              <button
                                className="btn btn-sm btn-link text-dark text-decoration-none px-2 font-weight-bold"
                                onClick={() => updateQuantity(itemId, item.quantity + 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="text-right font-weight-bold text-primary">
                            RM{itemSubtotal.toFixed(2)}
                          </td>
                          <td className="text-right">
                            <button
                              className="btn btn-sm text-danger border-0"
                              onClick={() => removeFromCart(itemId)}
                              title="Remove item"
                            >
                              <FiTrash2 />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
                <Link to="/shop" className="btn btn-outline-secondary font-weight-bold rounded-pill px-4">
                  <FiArrowLeft className="mr-1" /> Continue Shopping
                </Link>
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="col-lg-4">
            <div className="bg-white rounded shadow-sm p-4">
              <h5 className="font-weight-bold mb-3 border-bottom pb-2">Order Summary</h5>

              {/* Voucher Section - Popup Modal Trigger */}
              {appliedVoucher ? (
                <div className="mb-4 bg-light-success p-3 rounded-lg border border-success">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center">
                      <FiCheckCircle className="text-success mr-2 font-weight-bold" size={20} />
                      <span className="font-weight-bold text-success">Voucher Applied</span>
                    </div>
                    <span className="badge badge-success font-weight-bold px-2 py-1 text-uppercase">
                      {appliedVoucher.code}
                    </span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between small text-muted mb-2">
                    <span>Discount Saved:</span>
                    <span className="font-weight-bold text-success">-RM{discountTotal.toFixed(2)}</span>
                  </div>
                  <div className="d-flex gap-2 mt-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm flex-grow-1 font-weight-bold rounded-pill"
                      onClick={handleOpenVoucherModal}
                    >
                      Change Voucher
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm font-weight-bold rounded-pill px-3"
                      onClick={removeVoucher}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <button
                    type="button"
                    className="btn apply-voucher-trigger-btn"
                    onClick={handleOpenVoucherModal}
                  >
                    <FiTag size={18} /> Apply Promo Voucher
                  </button>
                </div>
              )}

              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Selected Subtotal ({selectedCartItems.length} items):</span>
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
                <span>
                  {shippingFee === 0 ? (
                    <span className="text-success font-weight-bold">FREE</span>
                  ) : (
                    `RM${shippingFee.toFixed(2)}`
                  )}
                </span>
              </div>

              {shippingFee > 0 && selectedCartTotal > 0 && (
                <div className="alert alert-info py-2 small mb-3">
                  Add <b>RM{(100 - selectedCartTotal).toFixed(2)}</b> more for Free Delivery!
                </div>
              )}

              <hr />

              <div className="d-flex justify-content-between mb-4 h4">
                <span className="font-weight-bold text-dark">Total Amount:</span>
                <span className="font-weight-bold text-primary">RM{grandTotal.toFixed(2)}</span>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-lg w-100 font-weight-bold rounded-pill py-3 shadow"
                style={{
                  backgroundColor: selectedCartItems.length > 0 ? '#0d6efd' : '#6c757d',
                  borderColor: selectedCartItems.length > 0 ? '#0d6efd' : '#6c757d',
                  color: '#ffffff',
                  fontSize: '16px'
                }}
                disabled={selectedCartItems.length === 0}
                onClick={() => navigate('/checkout')}
              >
                {selectedCartItems.length > 0
                  ? `Proceed to Checkout (${selectedCartItems.length}) →`
                  : 'Select Items to Checkout'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Voucher Selection Modal Dialog */}
      <Dialog
        open={isVoucherModalOpen}
        onClose={handleCloseVoucherModal}
        maxWidth="sm"
        fullWidth
        className="voucherDialogModal"
      >
        <DialogTitle className="border-bottom d-flex align-items-center justify-content-between py-3">
          <div className="d-flex align-items-center">
            <FiGift className="text-primary mr-2" size={22} />
            <span className="font-weight-bold text-dark h5 mb-0">Select Promo Voucher</span>
          </div>
          <button
            className="btn btn-sm text-secondary border-0 p-0"
            onClick={handleCloseVoucherModal}
          >
            <FiX size={22} />
          </button>
        </DialogTitle>

        <DialogContent className="py-4">
          <p className="small text-muted mb-3">
            Select an available voucher from your wallet below or enter a custom promo code.
          </p>

          {modalFeedback.text && (
            <div className={`alert ${modalFeedback.isError ? 'alert-danger' : 'alert-success'} py-2 px-3 small mb-3`}>
              {modalFeedback.text}
            </div>
          )}

          {/* Available Vouchers List */}
          {(() => {
            const unusedVouchers = availableVouchers.filter(v => !usedVoucherCodes.includes(v.code.toUpperCase()));
            if (unusedVouchers.length === 0) {
              return (
                <div className="text-center py-4 bg-light rounded border mb-4">
                  <FiTag size={36} className="text-muted opacity-50 mb-2" />
                  <p className="font-weight-bold mb-1">No saved vouchers found</p>
                  <p className="small text-muted mb-0">Enter a promo code below to claim your discount!</p>
                </div>
              );
            }

            return (
              <div className="d-flex flex-column gap-3 mb-4" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {unusedVouchers.map((v, idx) => {
                  const minSpend = parseFloat(v.min_spend || 0);
                  const isSpendMet = selectedCartTotal >= minSpend;
                  const isApplied = appliedVoucher && appliedVoucher.code.toUpperCase() === v.code.toUpperCase();
                  const expiryInfo = getVoucherExpiryInfo(v.expiry_date);

                  return (
                    <div
                      key={idx}
                      className={`card p-3 rounded-lg border transition-all ${
                        isApplied ? 'border-success bg-light-success shadow-sm' :
                        !isSpendMet ? 'border-light bg-light opacity-75' : 'bg-white shadow-sm hover-shadow'
                      }`}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                            <span className="badge badge-primary font-weight-bold text-uppercase px-2 py-1">
                              {v.code}
                            </span>
                            {expiryInfo.text && (
                              <span className={`badge ${
                                expiryInfo.isExpired ? 'badge-danger' :
                                expiryInfo.isCritical ? 'badge-warning text-dark font-weight-bold' : 'badge-info text-white'
                              } px-2 py-1 small d-flex align-items-center`}>
                                <FiClock className="mr-1" /> {expiryInfo.text}
                              </span>
                            )}
                            {!isSpendMet && (
                              <span className="badge badge-warning text-dark font-weight-bold small">
                                Requires Min. RM{minSpend.toFixed(2)}
                              </span>
                            )}
                          </div>

                          <h6 className="font-weight-bold text-dark mb-0">
                            {v.discount_type === 'percentage'
                              ? `${v.discount_value}% OFF`
                              : `RM${parseFloat(v.discount_value).toFixed(2)} OFF`}
                          </h6>

                          {minSpend > 0 && (
                            <span className="small text-muted d-block">
                              Min. Spend: RM{minSpend.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div>
                          {isApplied ? (
                            <span className="badge badge-success px-3 py-2 font-weight-bold rounded-pill">
                              <FiCheck className="mr-1" /> Applied
                            </span>
                          ) : !isSpendMet ? (
                            <button
                              disabled
                              className="btn btn-secondary btn-sm rounded-pill font-weight-bold px-3"
                            >
                              Min. Spend Unmet
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm rounded-pill font-weight-bold px-4 shadow-sm"
                              style={{ backgroundColor: '#0d6efd', border: 'none' }}
                              onClick={() => handleApplyModalVoucher(v.code)}
                            >
                              Apply
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Custom Promo Code Form */}
          <div className="border-top pt-3">
            <label className="font-weight-bold small text-dark mb-2 d-flex align-items-center">
              <FiPlusCircle className="text-primary mr-1" /> Redeem Voucher Here
            </label>
            <form onSubmit={handleApplyCustomCodeModal} className="d-flex align-items-center gap-2">
              <input
                type="text"
                className="form-control modal-promo-input text-uppercase font-weight-bold flex-grow-1"
                placeholder="ENTER VOUCHER CODE"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              />
              <button
                type="submit"
                className="btn btn-primary modal-promo-btn font-weight-bold px-4 text-nowrap shadow-sm"
                style={{
                  backgroundColor: '#0d6efd',
                  borderColor: '#0d6efd',
                  color: '#ffffff'
                }}
              >
                Redeem Code
              </button>
            </form>
          </div>
        </DialogContent>

        <DialogActions className="border-top px-4 py-3">
          <button
            className="btn btn-outline-secondary font-weight-bold rounded-pill px-4"
            onClick={handleCloseVoucherModal}
          >
            Close
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Cart;
