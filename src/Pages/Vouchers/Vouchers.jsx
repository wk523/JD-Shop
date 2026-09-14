import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import { FiTag, FiGift, FiCheckCircle, FiPlusCircle, FiShoppingBag, FiCheck, FiClock } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { getVoucherExpiryInfo } from '../../utils/voucherUtils';

const Vouchers = () => {
  const [inputCode, setInputCode] = useState('');
  const [feedback, setFeedback] = useState({ text: '', isError: false });
  const { applyVoucher, appliedVoucher } = useCart();
  const { customer } = useAuth();
  const navigate = useNavigate();

  const voucherStorageKey = customer ? `jdshop_redeemed_vouchers_${customer.id}` : null;

  const [redeemedVouchers, setRedeemedVouchers] = useState([]);

  const [usedVoucherCodes, setUsedVoucherCodes] = useState([]);

  const [activeTab, setActiveTab] = useState('All');

  const activeVouchers = redeemedVouchers.filter(v => !usedVoucherCodes.includes(v.code.toUpperCase()));
  const usedVouchersList = redeemedVouchers.filter(v => usedVoucherCodes.includes(v.code.toUpperCase()));

  const getDisplayedVouchers = () => {
    if (activeTab === 'Used') {
      return usedVouchersList;
    }
    if (activeTab === 'Expiring') {
      return [...activeVouchers].sort((a, b) => {
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date) - new Date(b.expiry_date);
      });
    }
    // Default: 'All' -> Active vouchers at top, Used vouchers at bottom
    return [...activeVouchers, ...usedVouchersList];
  };

  const displayedVouchers = getDisplayedVouchers();

  useEffect(() => {
    const loadVouchersWithDetails = async () => {
      if (voucherStorageKey && customer) {
        const saved = localStorage.getItem(voucherStorageKey);
        let list = saved ? JSON.parse(saved) : [];

        try {
          const usedRes = await apiClient.get(`/vouchers/user-used/${customer.id}`);
          if (usedRes.data.success) {
            setUsedVoucherCodes(usedRes.data.usedCodes || []);
          }

          const res = await apiClient.get('/vouchers');
          if (res.data.success) {
            const sysMap = new Map(res.data.vouchers.map(sv => [sv.code.toUpperCase(), sv]));
            list = list.map(v => {
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
              localStorage.setItem(voucherStorageKey, JSON.stringify(list));
            }
          }
        } catch (err) {
          console.error('Error fetching voucher details:', err);
        }

        setRedeemedVouchers(list);
      } else {
        setRedeemedVouchers([]);
        setUsedVoucherCodes([]);
      }
    };

    loadVouchersWithDetails();
  }, [voucherStorageKey, customer]);

  const handleRedeemVoucher = async (e) => {
    if (e) e.preventDefault();
    if (!customer) {
      setFeedback({ text: 'Please sign in to redeem and save vouchers to your wallet!', isError: true });
      return;
    }

    const codeToRedeem = inputCode.trim().toUpperCase();
    if (!codeToRedeem) return;

    // Check if already redeemed
    if (redeemedVouchers.some(v => v.code === codeToRedeem)) {
      setFeedback({ text: `Voucher "${codeToRedeem}" is already saved in your wallet!`, isError: true });
      return;
    }

    try {
      const res = await apiClient.post('/vouchers/validate', { code: codeToRedeem, cartTotal: 1000 });
      if (res.data.success) {
        const newVoucher = res.data.voucher;
        const updated = [newVoucher, ...redeemedVouchers];
        setRedeemedVouchers(updated);
        if (voucherStorageKey) {
          localStorage.setItem(voucherStorageKey, JSON.stringify(updated));
        }
        setInputCode('');
        setFeedback({ text: `Success! Voucher "${codeToRedeem}" redeemed and saved to your wallet!`, isError: false });
        applyVoucher(codeToRedeem);
      }
    } catch (err) {
      setFeedback({ text: err.response?.data?.message || 'Invalid or expired voucher code.', isError: true });
    }
  };

  const handleApplyToCart = (code) => {
    applyVoucher(code);
    navigate('/cart');
  };

  return (
    <div className="vouchersPage bg-light py-5" style={{ minHeight: '80vh' }}>
      <div className="container">
        {/* Breadcrumb Header */}
        <div className="col-lg-8 col-md-10 mx-auto px-0 mb-4">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb bg-transparent p-0 mb-2 small text-muted">
              <li className="breadcrumb-item"><Link to="/" className="text-muted">Home</Link></li>
              <li className="breadcrumb-item active font-weight-bold text-primary" aria-current="page">Vouchers & Coupons</li>
            </ol>
          </nav>
          <h2 className="font-weight-bold text-dark mb-1 d-flex align-items-center">
            <FiGift className="mr-2 text-primary" /> Vouchers & Discount Wallet
          </h2>
          <p className="text-muted mb-0">Enter your promotional voucher code below to redeem discounts for your orders</p>
        </div>

        <div className="col-lg-8 col-md-10 mx-auto px-0">
          {/* Voucher Code Redemption Card */}
          <div className="card border-0 shadow-sm rounded-lg p-4 bg-white mb-4">
            <div className="d-flex align-items-center mb-3">
              <div className="p-3 rounded-circle mr-3 text-primary" style={{ backgroundColor: '#eef2ff' }}>
                <FiTag size={24} />
              </div>
              <div>
                <h5 className="font-weight-bold text-dark mb-0">Redeem Voucher Code</h5>
                <span className="small text-muted">Have a promo code? Enter it below</span>
              </div>
            </div>

            <form onSubmit={handleRedeemVoucher}>
              <div className="mb-3">
                <label className="font-weight-bold small text-muted mb-2">Enter Promo Code</label>
                <div className="d-flex flex-column flex-sm-row align-items-center gap-2">
                  <input
                    type="text"
                    className="form-control redeemInput font-weight-bold text-uppercase flex-grow-1"
                    placeholder="ENTER VOUCHER CODE"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  />
                  <button
                    className="btn btn-primary redeemBtn font-weight-bold px-4 text-nowrap"
                    type="submit"
                  >
                    <FiPlusCircle className="mr-2" /> Redeem Code
                  </button>
                </div>
              </div>
            </form>

            {feedback.text && (
              <div className={`small p-3 rounded mt-2 ${feedback.isError ? 'alert alert-danger mb-0' : 'alert alert-success mb-0'}`}>
                {feedback.text}
              </div>
            )}
          </div>

          {/* My Redeemed Vouchers Wallet */}
          <div className="card border-0 shadow-sm rounded-lg p-4 bg-white">
            <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
              <h5 className="font-weight-bold text-dark mb-0 d-flex align-items-center">
                <FiCheckCircle className="mr-2 text-success" /> Your Redeemed Vouchers
              </h5>
              <span className="badge badge-primary px-3 py-2 font-weight-bold rounded-pill">
                {redeemedVouchers.length} Saved
              </span>
            </div>

            {/* Filter Tabs Header */}
            <div className="d-flex align-items-center gap-2 mb-3">
              {[
                { id: 'All', label: 'All', count: redeemedVouchers.length },
                { id: 'Expiring', label: 'Expiring', count: activeVouchers.length },
                { id: 'Used', label: 'Used', count: usedVouchersList.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`btn btn-sm font-weight-bold px-3 py-1 rounded-pill transition-all ${
                    activeTab === tab.id
                      ? 'btn-primary shadow-sm'
                      : 'btn-outline-secondary border-0 bg-light text-dark'
                  }`}
                  style={
                    activeTab === tab.id
                      ? { backgroundColor: '#0d6efd', borderColor: '#0d6efd', color: '#ffffff' }
                      : { color: '#495057' }
                  }
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            {displayedVouchers.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <FiTag size={42} className="mb-2 text-muted opacity-50" />
                <p className="font-weight-bold mb-1">
                  {activeTab === 'Used'
                    ? 'No used vouchers found'
                    : activeTab === 'Expiring'
                    ? 'No expiring vouchers found'
                    : 'No redeemed vouchers yet'}
                </p>
                <p className="small text-muted mb-0">
                  {activeTab === 'All'
                    ? 'Enter a code above to claim your voucher!'
                    : `You have no vouchers under the "${activeTab}" filter.`}
                </p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {displayedVouchers.map((v, idx) => {
                  const isApplied = appliedVoucher && appliedVoucher.code.toUpperCase() === v.code.toUpperCase();
                  const isUsed = usedVoucherCodes.includes(v.code.toUpperCase());
                  const expiryInfo = getVoucherExpiryInfo(v.expiry_date);

                  return (
                    <div key={idx} className={`card border p-3 rounded-lg position-relative ${isApplied ? 'border-success bg-light-success' : isUsed ? 'border-secondary bg-light opacity-50' : 'bg-light'}`}>
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                            <span className={`badge ${isUsed ? 'badge-secondary' : 'badge-success'} px-2 py-1 font-weight-bold text-uppercase`}>
                              {v.code} {isUsed ? '(Used)' : ''}
                            </span>
                            {expiryInfo.text && (
                              <span className={`badge ${
                                expiryInfo.isExpired ? 'badge-danger' :
                                expiryInfo.isCritical ? 'badge-warning text-dark font-weight-bold' : 'badge-info text-white'
                              } px-2 py-1 small d-flex align-items-center`}>
                                <FiClock className="mr-1" /> {expiryInfo.text}
                              </span>
                            )}
                          </div>
                          <h5 className="font-weight-bold text-dark mb-0">
                            {v.discount_type === 'percentage' ? `${v.discount_value}% OFF` : `RM${parseFloat(v.discount_value).toFixed(2)} OFF`}
                          </h5>
                          {v.min_spend > 0 && (
                            <span className="small text-muted d-block">Min. Spend: RM{parseFloat(v.min_spend).toFixed(2)}</span>
                          )}
                        </div>

                        <div className="d-flex gap-2">
                          {isApplied ? (
                            <span className="badge badge-success px-3 py-2 font-weight-bold">
                              <FiCheck className="mr-1" /> Active in Cart
                            </span>
                          ) : isUsed ? (
                            <span className="badge badge-secondary px-3 py-2 font-weight-bold">
                              Used
                            </span>
                          ) : (
                            <Button
                              className="btn btn-primary btn-sm font-weight-bold rounded-pill px-3"
                              onClick={() => handleApplyToCart(v.code)}
                            >
                              <FiShoppingBag className="mr-1" /> Use in Cart
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Vouchers;
