import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../../api/apiClient';
import { FiDollarSign, FiShoppingBag, FiBox, FiUsers, FiAlertTriangle, FiArrowRight } from 'react-icons/fi';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/analytics/dashboard');
        if (res.data.success) {
          setStats(res.data.stats);
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Computing store metrics...</p>
      </div>
    );
  }

  return (
    <div className="adminDashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="font-weight-bold mb-0 text-dark">Dashboard Overview</h3>
          <p className="text-muted small mb-0">Real-time metrics for JD Shop operations</p>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm rounded-lg p-3 bg-white border-left border-primary border-4">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-uppercase small font-weight-bold text-muted d-block">Total Revenue</span>
                <h3 className="font-weight-bold text-primary mb-0">
                  RM{stats?.totalRevenue ? stats.totalRevenue.toFixed(2) : '0.00'}
                </h3>
              </div>
              <div className="statIcon bg-primary-soft text-primary p-3 rounded-circle">
                <FiDollarSign className="h3 mb-0" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm rounded-lg p-3 bg-white border-left border-success border-4">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-uppercase small font-weight-bold text-muted d-block">Total Orders</span>
                <h3 className="font-weight-bold text-success mb-0">{stats?.totalOrders || 0}</h3>
              </div>
              <div className="statIcon bg-success-soft text-success p-3 rounded-circle">
                <FiShoppingBag className="h3 mb-0" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm rounded-lg p-3 bg-white border-left border-info border-4">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-uppercase small font-weight-bold text-muted d-block">Published Catalog</span>
                <h3 className="font-weight-bold text-info mb-0">{stats?.totalProducts || 0}</h3>
              </div>
              <div className="statIcon bg-info-soft text-info p-3 rounded-circle">
                <FiBox className="h3 mb-0" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-3">
          <div className="card border-0 shadow-sm rounded-lg p-3 bg-white border-left border-warning border-4">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <span className="text-uppercase small font-weight-bold text-muted d-block">Customers</span>
                <h3 className="font-weight-bold text-warning mb-0">{stats?.totalCustomers || 0}</h3>
              </div>
              <div className="statIcon bg-warning-soft text-warning p-3 rounded-circle">
                <FiUsers className="h3 mb-0" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        {/* Recent Orders Table */}
        <div className="col-lg-8 mb-4">
          <div className="card border-0 shadow-sm rounded-lg p-4 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <h5 className="font-weight-bold mb-0">Recent Customer Orders</h5>
              <Link to="/admin/orders" className="btn btn-sm btn-outline-primary rounded-pill font-weight-bold">
                View All Orders <FiArrowRight />
              </Link>
            </div>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="thead-light small text-uppercase">
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Order Status</th>
                    <th>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                    stats.recentOrders.map((ord) => (
                      <tr key={ord.id}>
                        <td className="font-weight-bold text-primary">{ord.order_number}</td>
                        <td>
                          <div className="font-weight-bold text-dark">{ord.customer_name}</div>
                          <span className="small text-muted">{ord.customer_email}</span>
                        </td>
                        <td className="font-weight-bold">RM{parseFloat(ord.total_amount).toFixed(2)}</td>
                        <td>
                          <span className={`badge px-3 py-1.5 font-weight-bold text-uppercase rounded-pill badge-${
                            ord.order_status === 'delivered' ? 'success' :
                            ord.order_status === 'shipped' ? 'info' :
                            ord.order_status === 'processing' ? 'primary' :
                            ord.order_status === 'cancelled' ? 'danger' : 'warning text-dark'
                          }`}>
                            {ord.order_status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge px-2.5 py-1 text-uppercase font-weight-bold badge-${ord.payment_status === 'paid' ? 'success' : 'warning text-dark'}`}>
                            {ord.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">No recent orders.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Low Stock Warning Sidebar */}
        <div className="col-lg-4 mb-4">
          <div className="card border-0 shadow-sm rounded-lg p-4 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <h5 className="font-weight-bold mb-0 text-warning d-flex align-items-center">
                <FiAlertTriangle className="mr-2" /> Low Stock Alerts
              </h5>
              <Link to="/admin/products" className="btn btn-sm btn-link font-weight-bold">Manage</Link>
            </div>

            {stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
              <ul className="list-group list-group-flush">
                {stats.lowStockProducts.map((p) => (
                  <li key={p.id} className="list-group-item px-0 py-2.5 d-flex align-items-center justify-content-between border-bottom">
                    <div>
                      <div className="font-weight-bold text-dark text-truncate" style={{ maxWidth: '180px' }}>
                        {p.name}
                      </div>
                      <span className="small text-muted">SKU: {p.sku || 'N/A'}</span>
                    </div>
                    <span className="badge badge-danger font-weight-bold px-2 py-1">
                      {p.stock} left
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-4 text-success small font-weight-bold">
                ✅ All products have healthy inventory levels!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
