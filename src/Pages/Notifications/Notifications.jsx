import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import {
  FiBell,
  FiShoppingBag,
  FiRotateCcw,
  FiTag,
  FiCheck,
  FiCheckCircle,
  FiTrash2,
  FiInbox
} from 'react-icons/fi';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

const Notifications = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all');

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.is_read;
    if (activeTab === 'order') return n.type === 'order';
    if (activeTab === 'refund') return n.type === 'refund';
    if (activeTab === 'promo') return n.type === 'promo';
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'order':
        return <FiShoppingBag className="text-primary" size={22} />;
      case 'refund':
        return <FiRotateCcw className="text-warning" size={22} />;
      case 'promo':
        return <FiTag className="text-danger" size={22} />;
      default:
        return <FiBell className="text-info" size={22} />;
    }
  };

  const getBadgeColor = (type) => {
    switch (type) {
      case 'order':
        return 'primary';
      case 'refund':
        return 'warning';
      case 'promo':
        return 'error';
      default:
        return 'info';
    }
  };

  const handleNotificationClick = (n) => {
    if (!n.is_read) {
      markAsRead(n.id);
    }
    if (n.type === 'order' || n.type === 'refund') {
      navigate('/orders');
    } else if (n.type === 'promo') {
      if (n.reference_id) {
        navigate(`/promotions/${n.reference_id}`);
      } else {
        navigate('/promotions');
      }
    }
  };

  return (
    <div className="notifications-page py-4 bg-light min-vh-100">
      <div className="container">
        {/* Page Header */}
        <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 bg-white p-3 p-md-4 rounded shadow-sm">
          <div className="d-flex align-items-center mb-2 mb-md-0">
            <div className="bg-primary-subtle text-primary p-3 rounded-circle mr-3 d-flex align-items-center justify-content-center" style={{ width: 50, height: 50 }}>
              <FiBell size={26} />
            </div>
            <div>
              <h4 className="mb-1 font-weight-bold text-dark">Notifications</h4>
              <p className="text-muted mb-0 small">
                Stay updated with your orders, refunds, and special promotions.
                {unreadCount > 0 && (
                  <span className="badge badge-danger ml-2 px-2 py-1">
                    {unreadCount} Unread
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<FiCheckCircle />}
                onClick={markAllAsRead}
                className="text-capitalize"
              >
                Mark All as Read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<FiTrash2 />}
                onClick={clearAllNotifications}
                className="text-capitalize ml-2"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="bg-white p-2 rounded shadow-sm mb-4 d-flex flex-wrap gap-2">
          <Button
            variant={activeTab === 'all' ? 'contained' : 'text'}
            color="primary"
            size="small"
            onClick={() => setActiveTab('all')}
            className="rounded-pill px-3"
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={activeTab === 'unread' ? 'contained' : 'text'}
            color="primary"
            size="small"
            onClick={() => setActiveTab('unread')}
            className="rounded-pill px-3"
          >
            Unread ({unreadCount})
          </Button>
          <Button
            variant={activeTab === 'order' ? 'contained' : 'text'}
            color="primary"
            size="small"
            onClick={() => setActiveTab('order')}
            className="rounded-pill px-3"
          >
            Orders ({notifications.filter(n => n.type === 'order').length})
          </Button>
          <Button
            variant={activeTab === 'refund' ? 'contained' : 'text'}
            color="primary"
            size="small"
            onClick={() => setActiveTab('refund')}
            className="rounded-pill px-3"
          >
            Refunds ({notifications.filter(n => n.type === 'refund').length})
          </Button>
          <Button
            variant={activeTab === 'promo' ? 'contained' : 'text'}
            color="primary"
            size="small"
            onClick={() => setActiveTab('promo')}
            className="rounded-pill px-3"
          >
            Promos ({notifications.filter(n => n.type === 'promo').length})
          </Button>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white p-5 rounded shadow-sm text-center my-4">
            <FiInbox size={50} className="text-muted mb-3" />
            <h5 className="text-muted font-weight-bold">No Notifications Found</h5>
            <p className="text-secondary small mb-0">
              You're all caught up! New updates regarding your orders, refunds, or promotions will appear here.
            </p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {filteredNotifications.map((item) => (
              <div
                key={item.id}
                className={`bg-white p-3 p-md-4 rounded shadow-sm border-left-highlight position-relative transition-all ${
                  !item.is_read ? 'bg-light-blue border-left border-primary border-4' : 'border-left border-light'
                }`}
                style={{
                  borderLeftWidth: '4px',
                  borderLeftStyle: 'solid',
                  borderLeftColor: !item.is_read ? '#007bff' : '#e0e0e0',
                  cursor: 'pointer'
                }}
                onClick={() => handleNotificationClick(item)}
              >
                <div className="d-flex align-items-start justify-content-between">
                  <div className="d-flex align-items-start gap-3">
                    <div className="p-3 bg-light rounded-circle d-flex align-items-center justify-content-center mr-3">
                      {getIcon(item.type)}
                    </div>
                    <div>
                      <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                        <h6 className={`mb-0 font-weight-bold ${!item.is_read ? 'text-primary' : 'text-dark'}`}>
                          {item.title}
                        </h6>
                        <Chip
                          label={item.type.toUpperCase()}
                          size="small"
                          color={getBadgeColor(item.type)}
                          style={{ fontSize: '10px', height: '20px' }}
                        />
                        {!item.is_read && (
                          <span className="badge badge-primary px-2 py-1 small">New</span>
                        )}
                      </div>
                      <p className="text-secondary mb-2" style={{ fontSize: '14px', lineHeight: '1.5' }}>
                        {item.message}
                      </p>
                      <small className="text-muted">
                        {new Date(item.created_at).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </small>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {!item.is_read && (
                      <Tooltip title="Mark as Read">
                        <Button
                          size="small"
                          color="primary"
                          style={{ minWidth: 'auto', padding: '6px' }}
                          onClick={() => markAsRead(item.id)}
                        >
                          <FiCheck size={18} />
                        </Button>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <Button
                        size="small"
                        color="error"
                        style={{ minWidth: 'auto', padding: '6px' }}
                        onClick={() => deleteNotification(item.id)}
                      >
                        <FiTrash2 size={18} />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
