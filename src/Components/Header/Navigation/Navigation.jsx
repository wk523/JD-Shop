import React from 'react';
import Button from '@mui/material/Button';
import { Link } from 'react-router-dom';
import { FiTag } from 'react-icons/fi';

const Navigation = () => {
  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Promotions', path: '/promotions' },
    { label: 'Shop All Products', path: '/shop' }
  ];

  return (
    <nav className="border-top py-2 bg-white">
      <div className="container">
        <div className="d-flex align-items-center justify-content-start overflow-x-auto py-1">
          <ul className="list list-inline mb-0 d-flex align-items-center gap-3 flex-nowrap text-nowrap">
            {navItems.map((item, index) => (
              <li key={index} className="list-inline-item">
                <Link to={item.path} className="text-decoration-none">
                  <Button className="nav-btn">{item.label}</Button>
                </Link>
              </li>
            ))}
            <li className="list-inline-item">
              <Link to="/vouchers" className="text-decoration-none">
                <Button className="nav-btn text-primary font-weight-bold">
                  <FiTag className="mr-1" /> Vouchers
                </Button>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;