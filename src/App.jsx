import React, { createContext, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';

import Header from './Components/Header/Header';
import Footer from './Components/Footer/Footer';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// Customer Storefront Pages
import Home from './Pages/Home/Home';
import Shop from './Pages/Shop/Shop';
import ProductDetails from './Pages/ProductDetails/ProductDetails';
import Cart from './Pages/Cart/Cart';
import Checkout from './Pages/Checkout/Checkout';
import Orders from './Pages/Orders/Orders';
import Vouchers from './Pages/Vouchers/Vouchers';
import Promotions from './Pages/Promotions/Promotions';
import PromotionDetails from './Pages/Promotions/PromotionDetails';
import Profile from './Pages/Profile/Profile';
import Login from './Pages/Auth/Login';
import Register from './Pages/Auth/Register';
import ForgotPassword from './Pages/Auth/ForgotPassword';
import ResetPassword from './Pages/Auth/ResetPassword';

// Admin Portal Pages
import AdminLogin from './Pages/Admin/Login/AdminLogin';
import AdminLayout from './Pages/Admin/Layout/AdminLayout';
import AdminDashboard from './Pages/Admin/Dashboard/Dashboard';
import ProductList from './Pages/Admin/Products/ProductList';
import CategoryList from './Pages/Admin/Categories/CategoryList';
import OrderList from './Pages/Admin/Orders/OrderList';
import StaffList from './Pages/Admin/Staff/StaffList';
import RolesPermissions from './Pages/Admin/Roles/RolesPermissions';
import CustomersList from './Pages/Admin/Customers/CustomersList';
import PromotionList from './Pages/Admin/Promotions/PromotionList';
import VoucherList from './Pages/Admin/Vouchers/VoucherList';
import ReviewList from './Pages/Admin/Reviews/ReviewList';
import EmailSettings from './Pages/Admin/Settings/EmailSettings';

export const MyContext = createContext();

// Layout Wrapper to render Header/Footer only on main customer pages (excluding auth & admin pages)
const AppRoutes = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAuthRoute = ['/login', '/register', '/forgot-password', '/reset-password'].includes(location.pathname);
  const hideHeaderFooter = isAdminRoute || isAuthRoute;

  return (
    <>
      {!hideHeaderFooter && <Header />}
      <Routes>
        {/* Customer Storefront Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/vouchers" element={<Vouchers />} />
        <Route path="/promotions" element={<Promotions />} />
        <Route path="/promotions/:id" element={<PromotionDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Admin Portal Authentication */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin Portal Protected Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<ProductList />} />
          <Route path="categories" element={<CategoryList />} />
          <Route path="orders" element={<OrderList />} />
          <Route path="reviews" element={<ReviewList />} />
          <Route path="customers" element={<CustomersList />} />
          <Route path="promotions" element={<PromotionList />} />
          <Route path="vouchers" element={<VoucherList />} />
          <Route path="staff" element={<StaffList />} />
          <Route path="roles" element={<RolesPermissions />} />
          <Route path="settings" element={<EmailSettings />} />
        </Route>
      </Routes>
      {!hideHeaderFooter && <Footer />}
    </>
  );
};

function App() {
  const defaultLocations = [
    { country: 'Singapore' },
    { country: 'Kuala Lumpur (Malaysia)' },
    { country: 'Penang (Malaysia)' },
    { country: 'Johor Bahru (Malaysia)' },
    { country: 'Shah Alam (Malaysia)' },
    { country: 'Petaling Jaya (Malaysia)' },
    { country: 'Ipoh (Malaysia)' },
    { country: 'Melaka (Malaysia)' },
    { country: 'Kota Kinabalu (Malaysia)' },
    { country: 'Kuching (Malaysia)' },
    { country: 'Seremban (Malaysia)' },
    { country: 'Kuantan (Malaysia)' },
    { country: 'Cyberjaya (Malaysia)' }
  ];

  const [countryList] = useState(defaultLocations);
  const [selectedCountry, setSelectedCountry] = useState('Kuala Lumpur (Malaysia)');

  const values = {
    countryList,
    setSelectedCountry,
    selectedCountry
  };

  return (
    <BrowserRouter>
      <MyContext.Provider value={values}>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </MyContext.Provider>
    </BrowserRouter>
  );
}

export default App;
