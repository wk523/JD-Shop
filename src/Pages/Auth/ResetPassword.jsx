import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import Logo from '../../assets/images/logo1.png';
import { FiLock, FiKey, FiMail, FiCheckCircle, FiAlertCircle, FiArrowLeft } from 'react-icons/fi';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [token] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setAlert({ type: 'danger', message: 'Passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setAlert({ type: 'danger', message: 'Password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);
    setAlert({ type: '', message: '' });

    try {
      const res = await apiClient.post('/auth/reset-password', {
        email: email ? email.trim() : undefined,
        code: code ? code.trim() : undefined,
        token: token || undefined,
        newPassword
      });

      if (res.data.success) {
        setAlert({
          type: 'success',
          message: res.data.message || 'Password reset successfully! Redirecting to login...'
        });
        setTimeout(() => {
          navigate('/login');
        }, 1800);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password. Code may be invalid or expired.';
      setAlert({ type: 'danger', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage py-5 bg-light min-vh-100 d-flex align-items-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-5 col-lg-4">

            {/* Clean Brand Top Header */}
            <div className="text-center mb-4">
              <Link to="/" className="d-inline-flex align-items-center text-decoration-none">
                <img src={Logo} alt="JD Shop Logo" className="shop-logo mr-2" style={{ height: '40px' }} />
                <span className="h3 mb-0 font-weight-bold text-primary brand-title">JD SHOP</span>
              </Link>
            </div>

            <div className="card border-0 shadow-lg rounded-lg overflow-hidden">
              <div className="card-header bg-primary text-white text-center py-4">
                <h4 className="font-weight-bold mb-1 text-white">Set New Password</h4>
                <span className="small text-white-50">Verification code & password reset</span>
              </div>

              <div className="card-body p-4">
                {alert.message && (
                  <div className={`alert alert-${alert.type} small rounded mb-4 d-flex align-items-center`} role="alert">
                    {alert.type === 'success' ? <FiCheckCircle className="mr-2 flex-shrink-0" /> : <FiAlertCircle className="mr-2 flex-shrink-0" />}
                    <span>{alert.message}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {!token && (
                    <>
                      <div className="form-group mb-3">
                        <label className="font-weight-bold small text-muted">Email Address</label>
                        <div className="position-relative">
                          <FiMail
                            className="position-absolute text-muted"
                            style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 5, fontSize: '18px' }}
                          />
                          <input
                            type="email"
                            className="form-control form-control-lg text-dark"
                            style={{ paddingLeft: '48px', borderRadius: '10px' }}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group mb-3">
                        <label className="font-weight-bold small text-muted">6-Digit Reset Code</label>
                        <div className="position-relative">
                          <FiKey
                            className="position-absolute text-muted"
                            style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 5, fontSize: '18px' }}
                          />
                          <input
                            type="text"
                            className="form-control form-control-lg text-dark font-weight-bold tracking-wider"
                            style={{ paddingLeft: '48px', borderRadius: '10px' }}
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="e.g. 849201"
                            maxLength={6}
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="form-group mb-3">
                    <label className="font-weight-bold small text-muted">New Password</label>
                    <div className="position-relative">
                      <FiLock
                        className="position-absolute text-muted"
                        style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 5, fontSize: '18px' }}
                      />
                      <input
                        type="password"
                        className="form-control form-control-lg text-dark"
                        style={{ paddingLeft: '48px', borderRadius: '10px' }}
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group mb-4">
                    <label className="font-weight-bold small text-muted">Confirm New Password</label>
                    <div className="position-relative">
                      <FiLock
                        className="position-absolute text-muted"
                        style={{ left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 5, fontSize: '18px' }}
                      />
                      <input
                        type="password"
                        className="form-control form-control-lg text-dark"
                        style={{ paddingLeft: '48px', borderRadius: '10px' }}
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary btn-lg w-100 rounded-pill font-weight-bold py-3 mb-3 shadow-sm"
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                        Updating Password...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>

                  <div className="text-center mt-3 pt-2">
                    <Link to="/login" className="text-muted text-decoration-none small font-weight-bold d-inline-flex align-items-center">
                      <FiArrowLeft className="mr-1" /> Return to Sign In
                    </Link>
                  </div>
                </form>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
