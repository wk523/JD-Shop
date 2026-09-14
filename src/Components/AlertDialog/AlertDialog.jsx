import React from 'react';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiXCircle } from 'react-icons/fi';

const AlertDialog = ({ open, onClose, title = 'Notice', message, type = 'error' }) => {
  if (!open) return null;

  const isSuccess = type === 'success';
  const isWarning = type === 'warning';
  const isInfo = type === 'info';

  const icon = isSuccess ? (
    <FiCheckCircle className="text-success display-4 mb-2" />
  ) : isWarning ? (
    <FiAlertCircle className="text-warning display-4 mb-2" />
  ) : isInfo ? (
    <FiInfo className="text-info display-4 mb-2" />
  ) : (
    <FiXCircle className="text-danger display-4 mb-2" />
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        style: {
          borderRadius: '16px',
          padding: '8px'
        }
      }}
    >
      <div className="p-4 text-center">
        <div className="d-flex justify-content-center">{icon}</div>
        <h4 className="font-weight-bold text-dark mb-2">{title}</h4>
        <p className="text-secondary small mb-4" style={{ fontSize: '14px', lineHeight: '1.5' }}>
          {message}
        </p>
        <Button
          className={`btn ${
            isSuccess ? 'btn-success' : isWarning ? 'btn-warning text-dark' : 'btn-primary'
          } rounded-pill px-4 font-weight-bold shadow-sm`}
          onClick={onClose}
          style={{ minWidth: '120px' }}
          autoFocus
        >
          OK
        </Button>
      </div>
    </Dialog>
  );
};

export default AlertDialog;
