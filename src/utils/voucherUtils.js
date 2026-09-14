/**
 * Formats a voucher's expiry date into a human-readable relative string.
 * Examples:
 * - "Expires in 1 day 10 hrs"
 * - "Expires in 10 hrs"
 * - "Expires in 45 mins"
 * - "Expired"
 */
export const getVoucherExpiryInfo = (expiryDate) => {
  if (!expiryDate) {
    return { text: null, isExpired: false, isCritical: false };
  }

  const expiry = new Date(expiryDate);
  const now = new Date();

  if (isNaN(expiry.getTime())) {
    return { text: null, isExpired: false, isCritical: false };
  }

  const diffMs = expiry - now;

  if (diffMs <= 0) {
    return { text: 'Expired', isExpired: true, isCritical: true };
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remainingHours = diffHours % 24;
  const remainingMins = diffMinutes % 60;

  let text = '';
  if (diffDays > 0) {
    if (remainingHours > 0) {
      text = `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''} ${remainingHours} hr${remainingHours > 1 ? 's' : ''}`;
    } else {
      text = `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }
  } else if (diffHours > 0) {
    if (remainingMins > 0) {
      text = `Expires in ${diffHours} hr${diffHours > 1 ? 's' : ''} ${remainingMins} min${remainingMins > 1 ? 's' : ''}`;
    } else {
      text = `Expires in ${diffHours} hr${diffHours > 1 ? 's' : ''}`;
    }
  } else {
    text = `Expires in ${Math.max(1, diffMinutes)} min${diffMinutes > 1 ? 's' : ''}`;
  }

  // Critical if less than 24 hours remaining
  const isCritical = diffDays === 0;

  return { text, isExpired: false, isCritical };
};
