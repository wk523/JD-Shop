import React, { useState } from 'react';
import Logo from '../../assets/images/logo1.png';
import { Link, useNavigate } from 'react-router-dom';
import CountryDropdown from '../CountryDropdown/CountryDropdown';
import SearchBox from './SearchBox/SearchBox';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import { FiUser, FiShoppingBag, FiLogOut, FiLock } from 'react-icons/fi';
import { IoBagOutline } from 'react-icons/io5';
import Navigation from './Navigation/Navigation';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const Header = () => {
  const { customer, customerLogout } = useAuth();
  const { cartCount, cartTotal } = useCart();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleOpenUserMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    customerLogout();
    handleCloseUserMenu();
    navigate('/');
  };

  return (
    <>
      <div className="headerWrapper">
        {/* Top Strip */}
        <div className="top-strip bg-blue py-2">
          <div className="container text-center">
            <p className="mb-0 text-white font-weight-500">
              Welcome to <b>JD Shop</b> — Premium Shopping Experience & Free Delivery on orders over RM100!
            </p>
          </div>
        </div>

        {/* Main Header */}
        <header className="header py-3">
          <div className="container">
            <div className="row align-items-center">
              {/* Logo */}
              <div className="logoWrapper col-lg-2 col-xl-2 col-md-3 col-6 d-flex align-items-center">
                <Link to={'/'} className="d-flex align-items-center text-decoration-none">
                  {/* <img src={Logo} alt={'JD Shop Logo'} className="shop-logo mr-2" /> */}
                  <span className="h4 mb-0 font-weight-bold text-primary brand-title">JD SHOP</span>
                </Link>
              </div>

              {/* Location & Search (Desktop) */}
              <div className="col-lg-7 col-xl-8 col-md-6 d-none d-md-flex align-items-center gap-3">
                {/* <CountryDropdown /> */}
                <div className="flex-grow-1">
                  <SearchBox />
                </div>
              </div>

              {/* Account & Cart */}
              <div className="col-lg-3 col-xl-2 col-md-3 col-6 d-flex align-items-center justify-content-end">
                <div className="part3 d-flex align-items-center">
                  {/* User Account Menu */}
                  {customer ? (
                    <>
                      <Button
                        className="p-0 border-0 mr-3 rounded-circle"
                        onClick={handleOpenUserMenu}
                        title={customer.name}
                        style={{ minWidth: 'auto' }}
                      >
                        {customer.avatar ? (
                          <img
                            src={customer.avatar}
                            alt={customer.name}
                            className="rounded-circle shadow-sm"
                            style={{ width: 38, height: 38, objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            className="bg-primary text-white font-weight-bold rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                            style={{ width: 38, height: 38, fontSize: 16 }}
                          >
                            {customer.name ? customer.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                      </Button>
                      <Menu
                        anchorEl={anchorEl}
                        open={openMenu}
                        onClose={handleCloseUserMenu}
                        onClick={handleCloseUserMenu}
                        PaperProps={{
                          elevation: 3,
                          sx: { borderRadius: 2, minWidth: 190, mt: 1.5 }
                        }}
                      >
                        <div className="px-3 py-2 border-bottom d-flex align-items-center">
                          <div className="mr-2">
                            {customer.avatar ? (
                              <img
                                src={customer.avatar}
                                alt={customer.name}
                                className="rounded-circle"
                                style={{ width: 34, height: 34, objectFit: 'cover' }}
                              />
                            ) : (
                              <div
                                className="bg-primary text-white font-weight-bold rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: 34, height: 34, fontSize: 14 }}
                              >
                                {customer.name ? customer.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                            )}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div className="font-weight-bold text-truncate">{customer.name}</div>
                            <div className="small text-muted text-truncate">{customer.email}</div>
                          </div>
                        </div>
                        <MenuItem onClick={() => navigate('/profile')}>
                          <ListItemIcon><FiUser size={18} /></ListItemIcon>
                          My Profile
                        </MenuItem>
                        <MenuItem onClick={() => navigate('/orders')}>
                          <ListItemIcon><FiShoppingBag size={18} /></ListItemIcon>
                          My Orders
                        </MenuItem>
                        <MenuItem onClick={handleLogout} className="text-danger">
                          <ListItemIcon><FiLogOut size={18} color="red" /></ListItemIcon>
                          Logout
                        </MenuItem>
                      </Menu>
                    </>
                  ) : (
                    <Link to="/login" className="mr-3">
                      <Button className="circle" title="Customer Login">
                        <FiUser />
                      </Button>
                    </Link>
                  )}

                  {/* Cart Indicator */}
                  <Link to="/cart" className="text-decoration-none">
                    <div className="cartTab d-flex align-items-center">
                      <span className="price font-weight-bold text-dark mr-2">
                        RM{cartTotal.toFixed(2)}
                      </span>
                      <div className="position-relative">
                        <Button className="circle">
                          <IoBagOutline />
                        </Button>
                        <span className="count d-flex align-items-center justify-content-center">
                          {cartCount}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Mobile Location & Search Row (<768px) */}
            <div className="row mt-3 d-md-none align-items-center">
              <div className="col-12">
                <SearchBox />
              </div>
              {/* <div className="col-12 d-flex justify-content-center">
                <CountryDropdown />
              </div> */}
            </div>
          </div>
        </header>

        {/* Categories Bar */}
        <Navigation />
      </div>
    </>
  );
};

export default Header;