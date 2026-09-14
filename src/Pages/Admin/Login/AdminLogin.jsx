import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import { FiLock, FiShield, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../../../context/AuthContext';

const AdminLogin = () => {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@jdshop.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await adminLogin(email, password);
      if (res.success) {
        navigate('/admin');
      } else {
        setError(res.message || 'Invalid administrator credentials.');
      }
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to backend server. Please ensure the backend server (port 5001) is running.');
      } else {
        setError(err.response?.data?.message || 'Admin authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adminLoginPage min-vh-100 bg-dark-gradient d-flex align-items-center justify-content-center p-3">
      <div className="card border-0 shadow-2xl rounded-xl overflow-hidden w-100 max-w-450 bg-dark text-white border-secondary">
        <div className="card-header bg-dark-blue border-bottom border-secondary text-center py-4">
          <div className="iconWrapper mb-2">
            <FiShield className="display-4 text-primary" />
          </div>
          <h3 className="font-weight-bold text-white mb-1">JD SHOP ADMIN</h3>
          <span className="small text-muted">Administrative Portal Access</span>
        </div>

        <div className="card-body p-4">
          {error && <div className="alert alert-danger small py-2">{error}</div>}

          <div className="alert alert-secondary small py-2 mb-4 bg-dark-eval border-secondary text-light">
            🔑 <b>Super Admin Demo Credentials:</b><br />
            Email: <code>admin@jdshop.com</code> | Password: <code>admin123</code><br />
            <span className="text-muted mt-1 d-block">Staff: <code>staff@jdshop.com</code> | Password: <code>staff123</code></span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group mb-3">
              <label className="font-weight-bold small text-muted">Administrator Email</label>
              <input
                type="email"
                className="form-control bg-dark border-secondary text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group mb-4">
              <label className="font-weight-bold small text-muted">Password</label>
              <input
                type="password"
                className="form-control bg-dark border-secondary text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="btn btn-primary btn-lg w-100 rounded-pill font-weight-bold py-2 mb-3"
              disabled={loading}
            >
              <FiLock className="mr-2" />
              {loading ? 'Authenticating...' : 'Sign In to Admin Portal'}
            </Button>
          </form>

          <div className="text-center mt-3 border-top border-secondary pt-3">
            <Link to="/" className="text-muted text-decoration-none small">
              <FiArrowLeft className="mr-1" /> Back to Storefront
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
