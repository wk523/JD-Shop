import React, { useState, useEffect } from 'react';
import apiClient from '../../../api/apiClient';
import {
  FiMail,
  FiServer,
  FiLock,
  FiUser,
  FiCheckCircle,
  FiAlertCircle,
  FiSend,
  FiSave,
  FiRefreshCw,
  FiShield,
  FiCreditCard,
  FiKey,
  FiSliders
} from 'react-icons/fi';

const EmailSettings = () => {
  const [activeTab, setActiveTab] = useState('email');

  // SMTP Form State
  const [smtpData, setSmtpData] = useState({
    smtp_host: 'sandbox.smtp.mailtrap.io',
    smtp_port: 2525,
    smtp_user: 'e216f3f32c57a6',
    smtp_pass: '2ea6a6f6f20a60',
    smtp_secure: false,
    smtp_from_name: 'JD Shop',
    smtp_from_email: 'from@example.com'
  });

  // Stripe Form State
  const [stripeData, setStripeData] = useState({
    stripe_secret_key: '',
    stripe_publishable_key: ''
  });

  const [loading, setLoading] = useState(true);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [savingStripe, setSavingStripe] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('to@example.com');

  const [alert, setAlert] = useState({ type: '', message: '' });
  const [testResult, setTestResult] = useState(null);

  // Fetch current System Settings (SMTP + Stripe)
  const fetchAllSettings = async () => {
    setLoading(true);
    setAlert({ type: '', message: '' });
    try {
      const [smtpRes, stripeRes] = await Promise.all([
        apiClient.get('/settings/smtp'),
        apiClient.get('/settings/stripe')
      ]);

      if (smtpRes.data.success && smtpRes.data.settings) {
        setSmtpData(smtpRes.data.settings);
      }
      if (stripeRes.data.success && stripeRes.data.settings) {
        setStripeData(stripeRes.data.settings);
      }
    } catch (err) {
      console.error('Fetch System settings error:', err);
      const msg = err.response?.data?.message || 'Failed to load system settings from server.';
      setAlert({ type: 'danger', message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const handleSmtpChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSmtpData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleStripeChange = (e) => {
    const { name, value } = e.target;
    setStripeData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Save SMTP Settings
  const handleSmtpSubmit = async (e) => {
    e.preventDefault();
    setSavingSmtp(true);
    setAlert({ type: '', message: '' });
    setTestResult(null);

    try {
      const res = await apiClient.put('/settings/smtp', smtpData);
      if (res.data.success) {
        setSmtpData(res.data.settings);
        setAlert({ type: 'success', message: 'SMTP email server settings saved to database successfully!' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save SMTP settings.';
      setAlert({ type: 'danger', message: msg });
    } finally {
      setSavingSmtp(false);
    }
  };

  // Save Stripe Settings
  const handleStripeSubmit = async (e) => {
    e.preventDefault();
    setSavingStripe(true);
    setAlert({ type: '', message: '' });

    try {
      const res = await apiClient.put('/settings/stripe', stripeData);
      if (res.data.success) {
        setStripeData(res.data.settings);
        setAlert({ type: 'success', message: 'Stripe API keys updated and saved to database successfully!' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save Stripe API keys.';
      setAlert({ type: 'danger', message: msg });
    } finally {
      setSavingStripe(false);
    }
  };

  // Test Connection & Send Test Email
  const handleTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmail || !testEmail.trim()) {
      setTestResult({ success: false, message: 'Please enter a valid recipient email address for testing.' });
      return;
    }

    setTestingEmail(true);
    setTestResult(null);

    try {
      const res = await apiClient.post('/settings/smtp/test', {
        targetEmail: testEmail.trim()
      });

      setTestResult({
        success: res.data.success,
        message: res.data.message
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'SMTP connection test failed. Please check host, port, and credentials.';
      setTestResult({
        success: false,
        message: msg
      });
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="emailSettingsPage container-fluid py-2">
      {/* Header Banner */}
      <div className="d-flex align-items-center justify-content-between mb-4 bg-white p-4 rounded shadow-sm border">
        <div>
          <h4 className="font-weight-bold text-dark mb-1 d-flex align-items-center">
            <FiSliders className="mr-2 text-primary" /> System & Gateway Settings
          </h4>
          <p className="text-muted small mb-0">
            Manage live SMTP server parameters and Stripe Payment API Keys directly from the Admin Panel.
          </p>
        </div>
        <div>
          <button
            onClick={fetchAllSettings}
            disabled={loading}
            className="btn btn-outline-secondary btn-sm rounded-pill px-3 font-weight-bold"
          >
            <FiRefreshCw className={`mr-1 ${loading ? 'spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {alert.message && (
        <div className={`alert alert-${alert.type} alert-dismissible fade show rounded shadow-sm`} role="alert">
          {alert.type === 'success' ? <FiCheckCircle className="mr-2 mb-1" /> : <FiAlertCircle className="mr-2 mb-1" />}
          {alert.message}
          <button type="button" className="close" onClick={() => setAlert({ type: '', message: '' })}>
            <span>&times;</span>
          </button>
        </div>
      )}

      {/* Settings Nav Tabs */}
      <div className="mb-4">
        <ul className="nav nav-pills bg-white p-2 rounded shadow-sm border gap-2">
          <li className="nav-item">
            <button
              className={`nav-link font-weight-bold d-flex align-items-center ${activeTab === 'email' ? 'active bg-primary text-white' : 'text-dark'}`}
              onClick={() => setActiveTab('email')}
            >
              <FiMail className="mr-2" /> Email (SMTP) Server
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link font-weight-bold d-flex align-items-center ${activeTab === 'stripe' ? 'active bg-primary text-white' : 'text-dark'}`}
              onClick={() => setActiveTab('stripe')}
            >
              <FiCreditCard className="mr-2" /> Stripe Payment Gateway
            </button>
          </li>
        </ul>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading Settings...</span>
          </div>
          <p className="mt-3 text-muted">Retrieving server configuration...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: EMAIL SMTP SETTINGS */}
          {activeTab === 'email' && (
            <div className="row">
              <div className="col-lg-7 mb-4">
                <div className="card border-0 shadow-sm rounded-lg overflow-hidden">
                  <div className="card-header bg-dark text-white py-3 px-4 d-flex align-items-center justify-content-between">
                    <h6 className="mb-0 font-weight-bold d-flex align-items-center">
                      <FiServer className="mr-2 text-info" /> SMTP Server Credentials
                    </h6>
                    <span className="badge badge-info px-2 py-1 font-weight-normal text-uppercase">
                      Mailtrap Sandbox Supported
                    </span>
                  </div>

                  <form onSubmit={handleSmtpSubmit} className="card-body p-4">
                    <div className="form-row">
                      <div className="form-group col-md-8 mb-3">
                        <label className="font-weight-bold text-dark small">
                          <FiServer className="mr-1 text-muted" /> SMTP Host Name
                        </label>
                        <input
                          type="text"
                          className="form-control rounded"
                          name="smtp_host"
                          value={smtpData.smtp_host || ''}
                          onChange={handleSmtpChange}
                          placeholder="e.g. sandbox.smtp.mailtrap.io"
                          required
                        />
                      </div>

                      <div className="form-group col-md-4 mb-3">
                        <label className="font-weight-bold text-dark small">Port</label>
                        <input
                          type="number"
                          className="form-control rounded"
                          name="smtp_port"
                          value={smtpData.smtp_port || 2525}
                          onChange={handleSmtpChange}
                          placeholder="2525 / 587 / 465"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group col-md-6 mb-3">
                        <label className="font-weight-bold text-dark small">
                          <FiUser className="mr-1 text-muted" /> SMTP Username
                        </label>
                        <input
                          type="text"
                          className="form-control rounded"
                          name="smtp_user"
                          value={smtpData.smtp_user || ''}
                          onChange={handleSmtpChange}
                          placeholder="e.g. e216f3f32c57a6"
                        />
                      </div>

                      <div className="form-group col-md-6 mb-3">
                        <label className="font-weight-bold text-dark small">
                          <FiLock className="mr-1 text-muted" /> SMTP Password / API Key
                        </label>
                        <input
                          type="password"
                          className="form-control rounded"
                          name="smtp_pass"
                          value={smtpData.smtp_pass || ''}
                          onChange={handleSmtpChange}
                          placeholder="e.g. 2ea6a6f6f20a60"
                        />
                      </div>
                    </div>

                    <hr className="my-4" />

                    <h6 className="font-weight-bold text-dark mb-3">Sender Identity & Security</h6>

                    <div className="form-row">
                      <div className="form-group col-md-6 mb-3">
                        <label className="font-weight-bold text-dark small">From Sender Name</label>
                        <input
                          type="text"
                          className="form-control rounded"
                          name="smtp_from_name"
                          value={smtpData.smtp_from_name || ''}
                          onChange={handleSmtpChange}
                          placeholder="e.g. JD Shop"
                        />
                      </div>

                      <div className="form-group col-md-6 mb-3">
                        <label className="font-weight-bold text-dark small">From Sender Email</label>
                        <input
                          type="email"
                          className="form-control rounded"
                          name="smtp_from_email"
                          value={smtpData.smtp_from_email || ''}
                          onChange={handleSmtpChange}
                          placeholder="e.g. from@example.com"
                        />
                      </div>
                    </div>

                    <div className="form-group mb-4">
                      <div className="custom-control custom-checkbox">
                        <input
                          type="checkbox"
                          className="custom-control-input"
                          id="smtp_secure"
                          name="smtp_secure"
                          checked={Boolean(smtpData.smtp_secure)}
                          onChange={handleSmtpChange}
                        />
                        <label className="custom-control-label small font-weight-bold text-dark" htmlFor="smtp_secure">
                          Use SSL/TLS Security (Enable for port 465)
                        </label>
                      </div>
                    </div>

                    <div className="d-flex justify-content-end">
                      <button
                        type="submit"
                        disabled={savingSmtp}
                        className="btn btn-primary px-4 rounded-pill font-weight-bold shadow-sm"
                      >
                        {savingSmtp ? (
                          <>
                            <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                            Saving Settings...
                          </>
                        ) : (
                          <>
                            <FiSave className="mr-2" /> Save SMTP Settings
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Side Testing Panel */}
              <div className="col-lg-5 mb-4">
                <div className="card border-0 shadow-sm rounded-lg overflow-hidden mb-4">
                  <div className="card-header bg-primary text-white py-3 px-4">
                    <h6 className="mb-0 font-weight-bold d-flex align-items-center">
                      <FiSend className="mr-2" /> Test Email Connection
                    </h6>
                  </div>

                  <div className="card-body p-4">
                    <p className="small text-muted mb-3">
                      Send a test message using your current saved SMTP credentials to verify connectivity and deliverability.
                    </p>

                    <form onSubmit={handleTestEmail}>
                      <div className="form-group mb-3">
                        <label className="font-weight-bold text-dark small">Recipient Email Address</label>
                        <input
                          type="email"
                          className="form-control rounded"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          placeholder="to@example.com"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={testingEmail}
                        className="btn btn-outline-primary btn-block rounded-pill font-weight-bold"
                      >
                        {testingEmail ? (
                          <>
                            <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                            Sending Test Email...
                          </>
                        ) : (
                          <>
                            <FiSend className="mr-2" /> Send Test Email
                          </>
                        )}
                      </button>
                    </form>

                    {testResult && (
                      <div
                        className={`mt-4 p-3 rounded border ${
                          testResult.success ? 'bg-light-success border-success text-success' : 'bg-light-danger border-danger text-danger'
                        }`}
                      >
                        <div className="d-flex align-items-center font-weight-bold small mb-1">
                          {testResult.success ? <FiCheckCircle className="mr-2" /> : <FiAlertCircle className="mr-2" />}
                          {testResult.success ? 'SMTP Connection Successful' : 'SMTP Test Failed'}
                        </div>
                        <div className="small text-dark" style={{ wordBreak: 'break-word' }}>
                          {testResult.message}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Email Features Summary Box */}
                <div className="card border-0 shadow-sm rounded-lg bg-white p-4">
                  <h6 className="font-weight-bold text-dark mb-3 d-flex align-items-center">
                    <FiShield className="mr-2 text-indigo" /> Automated Email Triggers
                  </h6>
                  <ul className="list-unstyled small text-muted mb-0 gap-2 d-flex flex-column">
                    <li className="d-flex align-items-center">
                      <span className="badge badge-pill badge-success mr-2">1</span> Order Receipt & Summary
                    </li>
                    <li className="d-flex align-items-center">
                      <span className="badge badge-pill badge-warning text-white mr-2">2</span> Password Reset Code & Admin Reset Notice
                    </li>
                    <li className="d-flex align-items-center">
                      <span className="badge badge-pill badge-info mr-2">3</span> Payment Success Verification
                    </li>
                    <li className="d-flex align-items-center">
                      <span className="badge badge-pill badge-secondary mr-2">4</span> Refund Processed & Approved Notice
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STRIPE PAYMENT GATEWAY SETTINGS */}
          {activeTab === 'stripe' && (
            <div className="row">
              <div className="col-lg-8 mb-4">
                <div className="card border-0 shadow-sm rounded-lg overflow-hidden">
                  <div className="card-header bg-dark text-white py-3 px-4 d-flex align-items-center justify-content-between">
                    <h6 className="mb-0 font-weight-bold d-flex align-items-center">
                      <FiCreditCard className="mr-2 text-warning" /> Stripe API Key Configuration
                    </h6>
                    <span className="badge badge-warning text-dark px-2 py-1 font-weight-normal text-uppercase">
                      Live / Test Keys
                    </span>
                  </div>

                  <form onSubmit={handleStripeSubmit} className="card-body p-4">
                    <div className="form-group mb-4">
                      <label className="font-weight-bold text-dark small">
                        <FiKey className="mr-1 text-muted" /> Stripe Secret Key (`STRIPE_SECRET_KEY`)
                      </label>
                      <input
                        type="password"
                        className="form-control rounded font-weight-bold"
                        name="stripe_secret_key"
                        value={stripeData.stripe_secret_key || ''}
                        onChange={handleStripeChange}
                        placeholder="sk_test_..."
                        required
                      />
                      <small className="form-text text-muted">
                        Used on backend server for payment intents, checkout session verification, and processing automated refunds.
                      </small>
                    </div>

                    <div className="form-group mb-4">
                      <label className="font-weight-bold text-dark small">
                        <FiKey className="mr-1 text-muted" /> Stripe Publishable Key (`STRIPE_PUBLISHABLE_KEY`)
                      </label>
                      <input
                        type="text"
                        className="form-control rounded"
                        name="stripe_publishable_key"
                        value={stripeData.stripe_publishable_key || ''}
                        onChange={handleStripeChange}
                        placeholder="pk_test_..."
                        required
                      />
                      <small className="form-text text-muted">
                        Used by storefront checkout elements to securely process credit card transactions.
                      </small>
                    </div>

                    <div className="d-flex justify-content-end">
                      <button
                        type="submit"
                        disabled={savingStripe}
                        className="btn btn-primary px-4 rounded-pill font-weight-bold shadow-sm"
                      >
                        {savingStripe ? (
                          <>
                            <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                            Saving Stripe Keys...
                          </>
                        ) : (
                          <>
                            <FiSave className="mr-2" /> Save Stripe Credentials
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="col-lg-4 mb-4">
                <div className="card border-0 shadow-sm rounded-lg bg-white p-4">
                  <h6 className="font-weight-bold text-dark mb-3 d-flex align-items-center">
                    <FiShield className="mr-2 text-primary" /> Stripe Integration Overview
                  </h6>
                  <p className="small text-muted mb-3">
                    Stripe handles secure customer card payments, checkout verification, and automated refund processing for your eCommerce platform.
                  </p>

                  <div className="alert alert-info small mb-0">
                    💡 <b>Tip:</b> Changes saved here take effect immediately for all new payment checkout sessions without requiring server restarts.
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EmailSettings;
