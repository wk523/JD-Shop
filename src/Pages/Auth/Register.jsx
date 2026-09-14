import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../assets/images/logo1.png';
import { FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';
import { MALAYSIAN_STATES, SUPPORTED_COUNTRIES } from '../../utils/locationData';
import CustomSelect from '../../Components/CustomSelect/CustomSelect';

const Register = () => {
  const { customerRegister } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    address: '',
    state: '',
    city: '',
    country: 'Malaysia'
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [phoneCountryCode, setPhoneCountryCode] = useState('+60');
  const [phoneRawNumber, setPhoneRawNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 1. Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.com$/i;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Invalid email address format. Email must contain "@" and end with ".com" (e.g., user@domain.com).');
      return;
    }

    // 2. Password Match Validation
    if (formData.password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    // 3. Phone Number Validation
    const cleanPhone = phoneRawNumber.replace(/[\s-]/g, '');

    if (phoneCountryCode === '+60') {
      // Malaysia (+60): Accept starting with 1 or 01, between 8 and 10 digits (e.g., 183683832 or 0183683832)
      const myPhoneRegex = /^(01|1)[0-9]{7,8}$/;
      if (!myPhoneRegex.test(cleanPhone)) {
        setError('Malaysia (+60) phone number must start with 1 or 01 and contain 8 to 10 digits (e.g., 183683832).');
        return;
      }
    } else if (phoneCountryCode === '+65') {
      // Singapore (+65): Must start with 8 or 9 and be exactly 8 digits long (e.g. 81234567 or 91234567)
      const sgPhoneRegex = /^[89][0-9]{7}$/;
      if (!sgPhoneRegex.test(cleanPhone)) {
        setError('Singapore (+65) phone number must start with "8" or "9" and be exactly 8 digits long (e.g., 81234567).');
        return;
      }
    }

    const formattedNumber = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
    const fullPhoneNumber = `${phoneCountryCode} ${formattedNumber}`;

    setLoading(true);

    try {
      const payload = {
        ...formData,
        phone: fullPhoneNumber
      };

      const res = await customerRegister(payload);
      if (res && res.success) {
        navigate('/');
      } else {
        setError(res?.message || 'Registration failed.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage py-5 bg-light min-vh-100 d-flex align-items-center">
      <div className="container py-3">
        <div className="row justify-content-center">
          <div className="col-md-6">

            {/* Clean Brand Top Header */}
            <div className="text-center mb-4">
              <Link to="/" className="d-inline-flex align-items-center text-decoration-none">
                {/* <img src={Logo} alt="JD Shop Logo" className="shop-logo mr-2" /> */}
                <span className="h3 mb-0 font-weight-bold text-primary brand-title">JD SHOP</span>
              </Link>
            </div>

            <div className="card border-0 shadow-lg overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
              <div className="card-header text-white text-center py-4" style={{ background: 'linear-gradient(135deg, #233a95 0%, #1e40af 100%)' }}>
                <h4 className="font-weight-bold mb-1">Create JD Shop Account</h4>
                <span className="small opacity-85 text-white-50">Join thousands of shoppers in Malaysia & Singapore</span>
              </div>

              <div className="card-body p-4">
                {error && <div className="alert alert-danger small mb-3">{error}</div>}

                <form onSubmit={handleSubmit}>
                  <div className="form-group mb-3">
                    <label className="font-weight-bold small text-muted">Full Name <span className="required-star">*</span></label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-group mb-3">
                    <label className="font-weight-bold small text-muted">Email Address <span className="required-star">*</span></label>
                    <input
                      type="email"
                      name="email"
                      className="form-control"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* Combined Password Section Wrapper */}
                  <div
                    className="password-group-wrapper"
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setShowPassword(false);
                        setShowConfirmPassword(false);
                      }
                    }}
                  >
                    <div className="form-group mb-3">
                      <label className="font-weight-bold small text-muted">Password <span className="required-star">*</span></label>
                      <div className="position-relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          className="form-control"
                          style={{ paddingRight: '42px' }}
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={handleChange}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-link position-absolute text-muted p-0 border-0"
                          style={{ right: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="form-group mb-3">
                      <label className="font-weight-bold small text-muted">Confirm Password <span className="required-star">*</span></label>
                      <div className="position-relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          className="form-control"
                          style={{ paddingRight: '42px' }}
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-link position-absolute text-muted p-0 border-0"
                          style={{ right: '14px', top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Phone Number with Country Code Dropdown */}
                  <div className="form-group mb-3">
                    <label className="font-weight-bold small text-muted">Phone Number <span className="required-star">*</span></label>
                    <div className="d-flex gap-2 align-items-center">
                      <CustomSelect
                        style={{ width: '170px', flexShrink: 0 }}
                        options={SUPPORTED_COUNTRIES.map(c => ({ value: c.code, label: c.label }))}
                        value={phoneCountryCode}
                        onChange={(code) => {
                          setPhoneCountryCode(code);
                          const newCountry = code === '+60' ? 'Malaysia' : 'Singapore';
                          setFormData(prev => ({
                            ...prev,
                            country: newCountry,
                            state: newCountry === 'Singapore' ? '' : prev.state,
                            city: newCountry === 'Singapore' ? '' : prev.city
                          }));
                        }}
                      />
                      <input
                        type="text"
                        className="form-control flex-grow-1"
                        placeholder="Phone number"
                        value={phoneRawNumber}
                        onChange={(e) => setPhoneRawNumber(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className={formData.country === 'Singapore' ? 'col-md-12 mb-3' : 'col-md-6 mb-3'}>
                      <label className="font-weight-bold small text-muted">Country <span className="required-star">*</span></label>
                      <CustomSelect
                        options={SUPPORTED_COUNTRIES.map(c => ({ value: c.name, label: `${c.flag} ${c.name}` }))}
                        value={formData.country}
                        onChange={(selectedCountry) => {
                          const newCode = selectedCountry === 'Singapore' ? '+65' : '+60';
                          setPhoneCountryCode(newCode);
                          setFormData(prev => ({
                            ...prev,
                            country: selectedCountry,
                            state: selectedCountry === 'Singapore' ? '' : prev.state,
                            city: selectedCountry === 'Singapore' ? '' : prev.city
                          }));
                        }}
                      />
                    </div>

                    {formData.country !== 'Singapore' && (
                      <div className="col-md-6 mb-3">
                        <label className="font-weight-bold small text-muted">State</label>
                        <CustomSelect
                          options={MALAYSIAN_STATES}
                          value={formData.state || formData.city}
                          placeholder="Select State..."
                          onChange={(val) => {
                            setFormData(prev => ({
                              ...prev,
                              state: val,
                              city: val
                            }));
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="form-group mb-4">
                    <label className="font-weight-bold small text-muted">Shipping Address</label>
                    <input
                      type="text"
                      name="address"
                      className="form-control"
                      placeholder="Street address, unit number"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 rounded-pill font-weight-bold py-3 mb-3 shadow-sm"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Register Account'}
                  </Button>
                </form>

                <div className="text-center small mt-3">
                  Already registered?{' '}
                  <Link to="/login" className="font-weight-bold text-primary">
                    Sign In Here
                  </Link>
                </div>

                <div className="text-center mt-3 pt-3 border-top">
                  <Link to="/" className="text-muted text-decoration-none small">
                    <FiArrowLeft className="mr-1" /> Return to JD Shop Homepage
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
