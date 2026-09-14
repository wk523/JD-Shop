import React from 'react';
import { Link } from 'react-router-dom';
import { FiPhoneCall, FiMail, FiMapPin, FiShield, FiTruck, FiRefreshCw } from 'react-icons/fi';

const Footer = () => {
  return (
    <footer className="footer bg-dark text-white pt-5 mt-5">
      {/* Features Bar */}
      <div className="container pb-4 border-bottom border-secondary">
        <div className="row text-center text-md-left">
          <div className="col-md-4 mb-3 mb-md-0 d-flex align-items-center justify-content-center justify-content-md-start">
            <FiTruck className="text-primary h1 mb-0 mr-3" />
            <div>
              <h6 className="font-weight-bold mb-0">Free Shipping & Returns</h6>
              <span className="small text-muted">On all orders above RM100</span>
            </div>
          </div>
          <div className="col-md-4 mb-3 mb-md-0 d-flex align-items-center justify-content-center justify-content-md-start">
            <FiShield className="text-primary h1 mb-0 mr-3" />
            <div>
              <h6 className="font-weight-bold mb-0">Secure Payments</h6>
              <span className="small text-muted">100% Protected Checkouts</span>
            </div>
          </div>
          <div className="col-md-4 d-flex align-items-center justify-content-center justify-content-md-start">
            <FiRefreshCw className="text-primary h1 mb-0 mr-3" />
            <div>
              <h6 className="font-weight-bold mb-0">Money Back Guarantee</h6>
              <span className="small text-muted">14 Days Return Policy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="container py-5">
        <div className="row">
          <div className="col-lg-4 mb-4 mb-lg-0">
            <h4 className="font-weight-bold text-primary mb-3">JD SHOP</h4>
            <p className="small text-muted mb-3">
              JD Shop is your premier full-stack eCommerce destination for high-quality fashion, luxury watches, electronics, footwear, and home essentials.
            </p>
            <div className="small text-muted">
              <p className="mb-1"><FiMapPin className="mr-2" /> 123 Shopping Plaza, NY 10001</p>
              <p className="mb-1"><FiPhoneCall className="mr-2" /> +1 (800) 555-JDSHOP</p>
              <p className="mb-0"><FiMail className="mr-2" /> support@jdshop.com</p>
            </div>
          </div>

          <div className="col-6 col-lg-2 mb-4 mb-lg-0">
            <h6 className="font-weight-bold text-uppercase mb-3">Quick Links</h6>
            <ul className="list-unstyled small mb-0">
              <li className="mb-2"><Link to="/" className="text-muted text-decoration-none">Home</Link></li>
              <li className="mb-2"><Link to="/shop" className="text-muted text-decoration-none">Shop Catalog</Link></li>
              <li className="mb-2"><Link to="/cart" className="text-muted text-decoration-none">My Cart</Link></li>
              <li className="mb-2"><Link to="/orders" className="text-muted text-decoration-none">Order History</Link></li>
            </ul>
          </div>

          <div className="col-6 col-lg-2 mb-4 mb-lg-0">
            <h6 className="font-weight-bold text-uppercase mb-3">Customer Service</h6>
            <ul className="list-unstyled small mb-0">
              <li className="mb-2"><span className="text-muted cursor-pointer">Help Center</span></li>
              <li className="mb-2"><span className="text-muted cursor-pointer">Shipping Rates</span></li>
              <li className="mb-2"><span className="text-muted cursor-pointer">Terms & Conditions</span></li>
              <li className="mb-2"><span className="text-muted cursor-pointer">Privacy Policy</span></li>
            </ul>
          </div>

          <div className="col-lg-4">
            <h6 className="font-weight-bold text-uppercase mb-3">Newsletter Subscription</h6>
            <p className="small text-muted mb-3">
              Subscribe to receiving latest product drop updates, seasonal discounts, and promotional vouchers!
            </p>
            <div className="input-group">
              <input type="email" className="form-control form-control-sm" placeholder="Enter your email..." />
              <div className="input-group-append">
                <button className="btn btn-primary btn-sm font-weight-bold">Subscribe</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="bg-secondary py-3 text-center small text-muted">
        <div className="container">
          © {new Date().getFullYear()} <b>JD Shop</b>. Built with React, Node.js & PostgreSQL. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
