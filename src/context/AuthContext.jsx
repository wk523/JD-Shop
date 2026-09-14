import React, { createContext, useState, useEffect, useContext } from 'react';
import apiClient from '../api/apiClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(() => {
    const saved = localStorage.getItem('jdshop_customer_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('jdshop_admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [permissions, setPermissions] = useState(() => {
    const saved = localStorage.getItem('jdshop_admin_perms');
    return saved ? JSON.parse(saved) : [];
  });

  const [loading, setLoading] = useState(true);

  // Validate saved sessions on mount
  useEffect(() => {
    const checkSessions = async () => {
      const custToken = localStorage.getItem('jdshop_customer_token');
      const admToken = localStorage.getItem('jdshop_admin_token');

      if (custToken) {
        try {
          const res = await apiClient.get('/auth/me');
          if (res.data.success && res.data.user.user_type === 'customer') {
            setCustomer(res.data.user);
            localStorage.setItem('jdshop_customer_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          localStorage.removeItem('jdshop_customer_token');
          localStorage.removeItem('jdshop_customer_user');
          setCustomer(null);
        }
      }

      if (admToken) {
        try {
          const res = await apiClient.get('/auth/me');
          if (res.data.success && (res.data.user.user_type === 'admin' || res.data.user.user_type === 'staff')) {
            setAdmin(res.data.user);
            setPermissions(res.data.permissions || []);
            localStorage.setItem('jdshop_admin_user', JSON.stringify(res.data.user));
            localStorage.setItem('jdshop_admin_perms', JSON.stringify(res.data.permissions || []));
          }
        } catch (err) {
          localStorage.removeItem('jdshop_admin_token');
          localStorage.removeItem('jdshop_admin_user');
          localStorage.removeItem('jdshop_admin_perms');
          setAdmin(null);
          setPermissions([]);
        }
      }
      setLoading(false);
    };

    checkSessions();
  }, []);

  // Customer Login
  const customerLogin = async (email, password) => {
    const res = await apiClient.post('/auth/customer/login', { email, password });
    if (res.data.success) {
      setCustomer(res.data.user);
      localStorage.setItem('jdshop_customer_token', res.data.token);
      localStorage.setItem('jdshop_customer_user', JSON.stringify(res.data.user));
    }
    return res.data;
  };

  // Customer Register
  const customerRegister = async (formData) => {
    try {
      const res = await apiClient.post('/auth/customer/register', formData);
      if (res.data.success) {
        setCustomer(res.data.user);
        localStorage.setItem('jdshop_customer_token', res.data.token);
        localStorage.setItem('jdshop_customer_user', JSON.stringify(res.data.user));
      }
      return res.data;
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || err.message || 'Failed to create account.'
      };
    }
  };

  // Customer Logout
  const customerLogout = () => {
    setCustomer(null);
    localStorage.removeItem('jdshop_customer_token');
    localStorage.removeItem('jdshop_customer_user');
  };

  // Helper to update customer state locally
  const updateCustomerState = (updatedUserData) => {
    setCustomer(prev => {
      const merged = { ...prev, ...updatedUserData };
      localStorage.setItem('jdshop_customer_user', JSON.stringify(merged));
      return merged;
    });
  };

  // Admin Login
  const adminLogin = async (email, password) => {
    const res = await apiClient.post('/auth/admin/login', { email, password });
    if (res.data.success) {
      setAdmin(res.data.user);
      setPermissions(res.data.permissions || []);
      localStorage.setItem('jdshop_admin_token', res.data.token);
      localStorage.setItem('jdshop_admin_user', JSON.stringify(res.data.user));
      localStorage.setItem('jdshop_admin_perms', JSON.stringify(res.data.permissions || []));
    }
    return res.data;
  };

  // Admin Logout
  const adminLogout = () => {
    setAdmin(null);
    setPermissions([]);
    localStorage.removeItem('jdshop_admin_token');
    localStorage.removeItem('jdshop_admin_user');
    localStorage.removeItem('jdshop_admin_perms');
  };

  // Permission Check Helper
  const hasPermission = (permissionName) => {
    if (!admin) return false;
    if (admin.role_name === 'super_admin') return true;
    return permissions.some(p => p.name === permissionName);
  };

  return (
    <AuthContext.Provider
      value={{
        customer,
        admin,
        permissions,
        loading,
        customerLogin,
        customerRegister,
        customerLogout,
        updateCustomerState,
        adminLogin,
        adminLogout,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
