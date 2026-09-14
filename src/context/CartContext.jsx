import React, { createContext, useState, useEffect, useContext } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from './AuthContext';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { customer } = useAuth();
  const [cart, setCart] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [appliedVoucher, setAppliedVoucher] = useState(null);

  const fetchDBCart = async () => {
    if (customer) {
      try {
        const res = await apiClient.get('/cart');
        if (res.data.success) {
          const items = res.data.items || [];
          setCart(items);
          // Do not default select all items - start unselected
          setSelectedItemIds(prev => {
            const validIds = items.map(item => item.product_id || item.id);
            return prev.filter(id => validIds.includes(id));
          });
        }
      } catch (err) {
        console.error('Failed to sync DB cart:', err);
        setCart([]);
        setSelectedItemIds([]);
      }
    } else {
      // Guest user has empty cart
      setCart([]);
      setSelectedItemIds([]);
      setAppliedVoucher(null);
    }
  };

  // Sync cart from backend when customer changes
  useEffect(() => {
    fetchDBCart();
  }, [customer]);

  // Reset applied voucher when user changes
  useEffect(() => {
    setAppliedVoucher(null);
  }, [customer?.id]);

  // Keep selected item IDs valid when cart items change
  useEffect(() => {
    if (cart.length > 0) {
      setSelectedItemIds(prev => {
        const validIds = cart.map(item => item.product_id || item.id);
        return prev.filter(id => validIds.includes(id));
      });
    } else {
      setSelectedItemIds([]);
    }
  }, [cart]);

  // Add Item to Cart (Only logged-in customers allowed)
  const addToCart = async (product, quantity = 1) => {
    if (!customer) {
      return {
        success: false,
        requireLogin: true,
        message: 'Please sign in to your account to add items to your cart!'
      };
    }

    try {
      await apiClient.post('/cart', { product_id: product.id, quantity });
      const res = await apiClient.get('/cart');
      if (res.data.success) {
        const items = res.data.items || [];
        setCart(items);
        // Do not auto-select added item - keep it unticked until customer selects it
      }
      return { success: true, message: 'Item added to cart!' };
    } catch (err) {
      console.error('DB cart error:', err);
      return { success: false, message: 'Failed to add item to cart.' };
    }
  };

  // Update Quantity
  const updateQuantity = async (productId, newQty) => {
    if (newQty <= 0) {
      return removeFromCart(productId);
    }

    if (!customer) return;

    try {
      const item = cart.find(i => (i.product_id || i.id) === productId);
      if (item && item.id) {
        await apiClient.put(`/cart/${item.id}`, { quantity: newQty });
        const res = await apiClient.get('/cart');
        if (res.data.success) {
          setCart(res.data.items || []);
        }
      }
    } catch (err) {
      console.error('DB cart update error:', err);
    }
  };

  // Remove Item
  const removeFromCart = async (productId) => {
    if (!customer) return;

    try {
      const item = cart.find(i => (i.product_id || i.id) === productId);
      if (item && item.id) {
        await apiClient.delete(`/cart/${item.id}`);
        const res = await apiClient.get('/cart');
        if (res.data.success) {
          const updatedItems = res.data.items || [];
          setCart(updatedItems);
          setSelectedItemIds(prev => prev.filter(id => id !== productId));
        }
      }
    } catch (err) {
      console.error('DB cart remove error:', err);
    }
  };

  // Clear Cart
  const clearCart = async () => {
    if (customer) {
      try {
        await apiClient.delete('/cart/clear');
      } catch (err) {
        console.error('DB cart clear error:', err);
      }
    }
    setCart([]);
    setSelectedItemIds([]);
    setAppliedVoucher(null);
  };

  // Remove specific purchased items from cart
  const removePurchasedItems = async (productIds = []) => {
    if (!productIds || productIds.length === 0) {
      return clearCart();
    }

    if (customer) {
      try {
        await apiClient.post('/cart/remove-items', { product_ids: productIds });
      } catch (err) {
        console.error('DB remove purchased items error:', err);
      }
    }

    setCart(prev => prev.filter(item => !productIds.includes(item.product_id || item.id)));
    setSelectedItemIds(prev => prev.filter(id => !productIds.includes(id)));
    setAppliedVoucher(null);
  };

  // Item Selection Helpers
  const toggleSelectItem = (productId) => {
    setSelectedItemIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectAllItems = () => {
    setSelectedItemIds(cart.map(item => item.product_id || item.id));
  };

  const deselectAllItems = () => {
    setSelectedItemIds([]);
  };

  const isItemSelected = (productId) => {
    return selectedItemIds.includes(productId);
  };

  // Filter selected cart items
  const selectedCartItems = cart.filter(item => selectedItemIds.includes(item.product_id || item.id));

  // Computed Values based strictly on selected items
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const selectedCartCount = selectedCartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
  const selectedCartTotal = selectedCartItems.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);

  // Apply Voucher Code
  const applyVoucher = async (code) => {
    if (selectedCartTotal <= 0) {
      return { success: false, message: 'Please select items in your cart to apply a voucher.' };
    }

    try {
      const res = await apiClient.post('/vouchers/validate', {
        code,
        cartTotal: selectedCartTotal,
        userId: customer ? customer.id : null
      });
      if (res.data.success) {
        setAppliedVoucher(res.data.voucher);
        return { success: true, message: res.data.message };
      }
    } catch (err) {
      setAppliedVoucher(null);
      return { success: false, message: err.response?.data?.message || 'Failed to apply voucher code.' };
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
  };

  const discountTotal = appliedVoucher
    ? Math.min(selectedCartTotal, parseFloat(appliedVoucher.discountAmount || 0))
    : 0;

  const shippingFee = selectedCartTotal > 100 || selectedCartTotal === 0 ? 0.00 : 7.00;
  const grandTotal = Math.max(0, selectedCartTotal - discountTotal + shippingFee);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        selectedCartItems,
        selectedCartCount,
        selectedCartTotal,
        selectedItemIds,
        appliedVoucher,
        discountTotal,
        shippingFee,
        grandTotal,
        applyVoucher,
        removeVoucher,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        removePurchasedItems,
        refreshCart: fetchDBCart,
        toggleSelectItem,
        selectAllItems,
        deselectAllItems,
        isItemSelected
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
