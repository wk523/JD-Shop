import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../assets/images/logo1.png';
import { FiArrowLeft } from 'react-icons/fi';

const Login = () => {
  const { customerLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('customer@jdshop.com');
  const [password, setPassword] = useState('customer123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await customerLogin(email, password);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.message || 'Invalid email or password.');
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to backend server. Please ensure the backend server (port 5001) is running.');
      } else {
        setError(err.response?.data?.message || 'Failed to log in.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage py-5 bg-light min-vh-100 d-flex align-items-center">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-5">

            {/* Clean Brand Top Header */}
            <div className="text-center mb-4">
              <Link to="/" className="d-inline-flex align-items-center text-decoration-none">
                <img src={Logo} alt="JD Shop Logo" className="shop-logo mr-2" />
                <span className="h3 mb-0 font-weight-bold text-primary brand-title">JD SHOP</span>
              </Link>
            </div>

            <div className="card border-0 shadow-lg rounded-lg overflow-hidden">
              <div className="card-header bg-primary text-white text-center py-4">
                <h4 className="font-weight-bold mb-0">Customer Sign In</h4>
                <span className="small text-white-50">Welcome back! Access your orders & profile</span>
              </div>

              <div className="card-body p-4">
                {error && <div className="alert alert-danger small mb-3">{error}</div>}

                <div className="alert alert-info small py-2 mb-4">
                  💡 <b>Demo Customer Credentials:</b><br />
                  Email: <code>customer@jdshop.com</code> | Password: <code>customer123</code>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="form-group mb-3">
                    <label className="font-weight-bold small text-muted">Email Address</label>
                    <input
                      type="email"
                      className="form-control form-control-lg text-dark"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="font-weight-bold small text-muted mb-0">Password</label>
                      <Link to="/forgot-password" className="small text-primary font-weight-bold text-decoration-none">
                        Forgot Password?
                      </Link>
                    </div>
                    <input
                      type="password"
                      className="form-control form-control-lg text-dark"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 rounded-pill font-weight-bold py-3 mb-3 shadow-sm"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>

                <div className="text-center small mt-3">
                  Don't have a JD Shop account?{' '}
                  <Link to="/register" className="font-weight-bold text-primary">
                    Create Account
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

export default Login;
