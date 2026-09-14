import React from 'react';
import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  FiGrid,
  FiBox,
  FiFolder,
  FiShoppingBag,
  FiStar,
  FiUsers,
  FiShield,
  FiLogOut,
  FiExternalLink,
  FiUserCheck,
  FiPercent,
  FiTag,
  FiMail
} from 'react-icons/fi';

const AdminLayout = () => {
  const { admin, adminLogout, hasPermission } = useAuth();
  const navigate = useNavigate();

  if (!admin) {
    return (
      <div className="container py-5 text-center my-5">
        <h3 className="font-weight-bold text-danger">Access Denied</h3>
        <p className="text-muted">You must log in with administrator privileges to access this area.</p>
        <Link to="/admin/login" className="btn btn-primary btn-lg rounded-pill mt-3 px-4">
          Go to Admin Login
        </Link>
      </div>
    );
  }

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  return (
    <div className="adminLayout d-flex bg-light min-vh-100">
      {/* Dark Sidebar Navigation */}
      <aside className="adminSidebar bg-dark-blue text-white p-3 d-flex flex-column" style={{ width: '260px', minWidth: '260px', flexShrink: 0, minHeight: '100vh' }}>
        <div className="sidebarBrand border-bottom border-secondary pb-3 mb-4 text-center">
          <h4 className="font-weight-bold text-primary mb-0">JD SHOP</h4>
          <span className="small text-muted text-uppercase tracking-wider">Admin Control Panel</span>
        </div>

        <nav className="nav flex-column gap-1 flex-grow-1">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `nav-link d-flex align-items-center py-2.5 px-3 rounded text-white ${isActive ? 'bg-primary font-weight-bold' : 'hover-dark-item'}`
            }
          >
            <FiGrid className="mr-3" /> Dashboard
          </NavLink>

          {hasPermission('products:read') && (
            <NavLink
              to="/admin/products"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center py-2.5 px-3 rounded text-white ${isActive ? 'bg-primary font-weight-bold' : 'hover-dark-item'}`
              }
            >
              <FiBox className="mr-3" /> Products
            </NavLink>
          )}

          {hasPermission('categories:read') && (
            <NavLink
              to="/admin/categories"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center py-2.5 px-3 rounded text-white ${isActive ? 'bg-primary font-weight-bold' : 'hover-dark-item'}`
              }
            >
              <FiFolder className="mr-3" /> Categories
            </NavLink>
          )}

          {hasPermission('orders:read') && (
            <NavLink
              to="/admin/orders"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center py-2.5 px-3 rounded text-white ${isActive ? 'bg-primary font-weight-bold' : 'hover-dark-item'}`
              }
            >
              <FiShoppingBag className="mr-3" /> Customer Orders
            </NavLink>
          )}

          <NavLink
            to="/admin/reviews"
            className={({ isActive }) =>
              `nav-link d-flex align-items-center py-2.5 px-3 rounded text-white ${isActive ? 'bg-primary font-weight-bold' : 'hover-dark-item'}`
            }
          >
            <FiStar className="mr-3" /> Product Reviews
          </NavLink>

          <NavLink
            to="/admin/customers"
            className={({ isActive }) =>
              `nav-link d-flex align-items-center py-2.5 px-3 rounded text-white ${isActive ? 'bg-primary font-weight-bold' : 'hover-dark-item'}`
            }
          >
            <FiUsers className="mr-3" /> Customers
          </NavLink>

          <NavLink
            to="/admin/promotions"
            className={({ isActive }) =>
              `nav-link d-flex align-items-center py-2.5 px-3 rounded text-white ${isActive ? 'bg-primary font-weight-bold' : 'hover-dark-item'}`
            }
          >
            <FiPercent className="mr-3" /> Promotions
          </NavLink>

          <NavLink
            to="/admin/vouchers"
            className={({ isActive }) =>
              `nav-link d-flex align-items-center py-2.5 px-3 rounded text-white ${isActive ? 'bg-primary font-weight-bold' : 'hover-dark-item'}`
            }
          >
            <FiTag className="mr-3" /> Vouchers
          </NavLink>

          {hasPermission('staff:manage') && (
            <NavLink
              to="/admin/staff"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center py-2.5 px-3 rounded text-white ${isActive ? 'bg-primary font-weight-bold' : 'hover-dark-item'}`
              }
            >
              <FiUserCheck className="mr-3" /> Staff & Admins
            </NavLink>
          )}

          {hasPermission('roles:manage') && (
            <NavLink
              to="/admin/roles"
              className={({ isActive }) =>
                `nav-link d-flex align-items-center py-2.5 px-3 rounded text-white ${isActive ? 'bg-primary font-weight-bold' : 'hover-dark-item'}`
              }
            >
              <FiShield className="mr-3" /> Roles & Permissions
            </NavLink>
          )}

          <NavLink
            to="/admin/settings"
            className={({ isActive }) =>
              `nav-link d-flex align-items-center py-2.5 px-3 rounded text-white ${isActive ? 'bg-primary font-weight-bold' : 'hover-dark-item'}`
            }
          >
            <FiMail className="mr-3" /> Email Settings
          </NavLink>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebarFooter border-top border-secondary pt-3 mt-auto">
          <div className="small text-muted mb-2">
            Logged in as: <br />
            <strong className="text-white">{admin.name}</strong>
          </div>
          <button onClick={handleLogout} className="btn btn-outline-danger btn-sm w-100 rounded-pill font-weight-bold">
            <FiLogOut className="mr-1" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="adminMain flex-grow-1 d-flex flex-column overflow-hidden" style={{ minWidth: 0 }}>
        {/* Admin Header Topbar */}
        <header className="adminTopbar bg-white border-bottom py-3 px-4 d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <h5 className="font-weight-bold mb-0 text-dark">Management Console</h5>
            <span className="badge badge-primary ml-3 px-3 py-1 font-weight-bold text-uppercase">
              {admin.role_name || 'ADMIN'}
            </span>
          </div>

          <div className="d-flex align-items-center gap-3">
            <Link to="/" target="_blank" className="btn btn-outline-primary btn-sm rounded-pill font-weight-bold">
              <FiExternalLink className="mr-1" /> View Live Storefront
            </Link>
          </div>
        </header>

        {/* Dynamic Nested Content */}
        <main className="adminContent p-4 flex-grow-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
