import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Rating from '@mui/material/Rating';
import { IoBagOutline } from 'react-icons/io5';
import { AiOutlineEye } from 'react-icons/ai';
import { useCart } from '../../context/CartContext';

const ProductCard = ({ product, onQuickView }) => {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);
  const navigate = useNavigate();

  const images = Array.isArray(product.images)
    ? product.images
    : (typeof product.images === 'string' ? JSON.parse(product.images || '[]') : []);

  const primaryImg = images.length > 0 ? images[0] : '';

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const res = await addToCart(product, 1);
    if (res && res.requireLogin) {
      alert(res.message);
      navigate('/sign-in');
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const formatSoldCount = (sales, reviewsCount, productId) => {
    let count = parseInt(sales || 0, 10);
    if (!count && reviewsCount) {
      count = reviewsCount * 12;
    }
    if (!count) {
      count = ((parseInt(productId || 0, 10) * 7) % 15) + 3;
    }

    if (count >= 1000) {
      const kVal = (count / 1000).toFixed(1).replace(/\.0$/, '');
      return `${kVal}k+ Sold`;
    }
    if (count <= 10) {
      return `${count} Sold/Month`;
    }
    return `${count} Sold`;
  };

  return (
    <div className="productCard position-relative shadow-sm rounded overflow-hidden h-100 bg-white">
      {product.badge && (
        <span className={`badge-pill position-absolute ${product.badge.toLowerCase().trim().replace(/\s+/g, '-')}`}>
          {product.badge}
        </span>
      )}

      <div className="imgWrapper position-relative">
        <Link to={`/product/${product.id}`}>
          {primaryImg ? (
            <img src={primaryImg} alt={product.name} className="w-100 product-img" />
          ) : (
            <div className="w-100 product-img bg-light border-bottom d-flex align-items-center justify-content-center text-muted" style={{ minHeight: '180px' }}>
              No Image Available
            </div>
          )}
        </Link>
        <div className="actionsOverlay d-flex flex-column gap-2">
          {onQuickView && (
            <Button
              className="quickViewBtn"
              onClick={(e) => {
                e.preventDefault();
                onQuickView(product);
              }}
              title="Quick View"
            >
              <AiOutlineEye />
            </Button>
          )}
        </div>
      </div>

      <div className="info p-3 d-flex flex-column justify-content-between">
        <div>
          <span className="catName text-uppercase font-weight-bold text-muted mb-1 d-block">
            {product.category_name || 'JD Shop'}
          </span>
          <h5 className="title text-truncate mb-2">
            <Link to={`/product/${product.id}`} className="text-dark">
              {product.name}
            </Link>
          </h5>

          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="d-flex align-items-center">
              <Rating name="read-only" value={parseFloat(product.rating || 5)} precision={0.1} readOnly size="small" />
              <span className="ratingText ml-1 text-muted" style={{ fontSize: '0.8rem' }}>({product.reviews_count || 0})</span>
            </div>
            <span className="soldText text-muted small font-weight-500 ml-2" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
              {formatSoldCount(product.total_sales || product.sold_count, product.reviews_count, product.id)}
            </span>
          </div>
        </div>

        <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top">
          <div className="prices">
            {product.old_price && parseFloat(product.old_price) > parseFloat(product.price) ? (
              <>
                <span className="currentPrice font-weight-bold text-primary mr-2">
                  RM{parseFloat(product.price).toFixed(2)}
                </span>
                <del className="oldPrice text-muted text-decoration-line-through">
                  RM{parseFloat(product.old_price).toFixed(2)}
                </del>
              </>
            ) : (
              <span className="singlePrice font-weight-bold text-secondary">
                RM{parseFloat(product.price).toFixed(2)}
              </span>
            )}
          </div>

          <Button
            className={`addCartBtn btn ${added ? 'btn-success text-white' : 'btn-primary'}`}
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
          >
            <IoBagOutline className="mr-1" />
            {product.stock <= 0 ? 'Out of Stock' : (added ? 'Added!' : 'Add')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
