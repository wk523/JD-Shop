import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Rating from '@mui/material/Rating';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { IoBagOutline } from 'react-icons/io5';
import { FiTruck, FiShield, FiRefreshCw, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import apiClient from '../../api/apiClient';
import { useCart } from '../../context/CartContext';
import ProductCard from '../../Components/ProductCard/ProductCard';

const ProductDetails = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(true);

  const [reviews, setReviews] = useState([]);
  const [selectedReviewImage, setSelectedReviewImage] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/products/${id}`);
        if (res.data.success) {
          const prod = res.data.product;
          setProduct(prod);
          setRelatedProducts(res.data.relatedProducts || []);
          setActiveImgIndex(0);
        }

        // Fetch customer reviews
        const revRes = await apiClient.get(`/reviews/product/${id}`);
        if (revRes.data.success) {
          setReviews(revRes.data.reviews || []);
        }
      } catch (err) {
        console.error('Failed to load product details or reviews:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-5 container">
        <h3>Product not found</h3>
        <Link to="/shop" className="btn btn-primary mt-3">Back to Shop Catalog</Link>
      </div>
    );
  }

  const rawImages = Array.isArray(product.images)
    ? product.images
    : (typeof product.images === 'string' ? JSON.parse(product.images || '[]') : []);

  const displayImages = rawImages;
  const currentImg = displayImages[activeImgIndex] || displayImages[0] || '';

  const handlePrevImg = () => {
    setActiveImgIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1));
  };

  const handleNextImg = () => {
    setActiveImgIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1));
  };

  const handleAddToCart = async () => {
    const res = await addToCart(product, qty);
    if (res && res.requireLogin) {
      alert(res.message);
      navigate('/sign-in');
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="productDetailsPage py-5 bg-light">
      <div className="container">
        {/* Main Product Section */}
        <div className="bg-white rounded p-4 shadow-sm mb-5">
          <div className="row">
            {/* Gallery */}
            <div className="col-lg-6 mb-4 mb-lg-0">
              <div className="mainImageWrapper text-center border rounded p-3 mb-3 bg-white position-relative d-flex align-items-center justify-content-center overflow-hidden" style={{ minHeight: '360px' }}>
                {currentImg ? (
                  <img src={currentImg} alt={product.name} className="img-fluid max-h-400 rounded transition-all" />
                ) : (
                  <div className="text-muted p-5">No Image Available</div>
                )}

                {displayImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="btn btn-dark btn-sm position-absolute rounded-circle shadow opacity-75 d-flex align-items-center justify-content-center"
                      style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', width: '40px', height: '40px', zIndex: 10, cursor: 'pointer' }}
                      onClick={handlePrevImg}
                      title="Previous photo"
                    >
                      <FiChevronLeft size={22} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-dark btn-sm position-absolute rounded-circle shadow opacity-75 d-flex align-items-center justify-content-center"
                      style={{ right: '12px', top: '50%', transform: 'translateY(-50%)', width: '40px', height: '40px', zIndex: 10, cursor: 'pointer' }}
                      onClick={handleNextImg}
                      title="Next photo"
                    >
                      <FiChevronRight size={22} />
                    </button>
                    <span className="badge badge-dark position-absolute px-2 py-1 opacity-75" style={{ bottom: '12px', right: '12px', zIndex: 10 }}>
                      {activeImgIndex + 1} / {displayImages.length}
                    </span>
                  </>
                )}
              </div>
              {displayImages.length > 1 && (
                <div className="d-flex gap-2 justify-content-center flex-wrap">
                  {displayImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className={`thumb-img rounded cursor-pointer border ${activeImgIndex === idx ? 'border-primary border-3 shadow-sm' : 'opacity-75'}`}
                      style={{ width: '64px', height: '64px', objectFit: 'cover', transition: 'all 0.2s' }}
                      onClick={() => setActiveImgIndex(idx)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="col-lg-6">
              <span className="badge badge-primary text-uppercase mb-2 px-3 py-1">
                {product.category_name || 'JD Shop'}
              </span>
              <h2 className="font-weight-bold mb-2">{product.name}</h2>

              <div className="d-flex align-items-center mb-3">
                <Rating value={parseFloat(product.rating || 5)} precision={0.1} readOnly />
                <span className="ml-2 font-weight-bold">{product.rating}</span>
                <span className="ml-2 text-muted">({product.reviews_count || 0} customer reviews)</span>
                <span className="ml-auto badge badge-success px-3 py-1 font-weight-bold">
                  SKU: {product.sku || 'JD-ITEM'}
                </span>
              </div>

              <div className="priceBox mb-3 p-3 bg-light rounded d-flex align-items-center">
                {product.old_price && parseFloat(product.old_price) > parseFloat(product.price) ? (
                  <>
                    <span className="display-5 font-weight-bold text-primary mr-3">
                      RM{parseFloat(product.price).toFixed(2)}
                    </span>
                    <del className="h4 text-muted oldPrice text-decoration-line-through">
                      RM{parseFloat(product.old_price).toFixed(2)}
                    </del>
                  </>
                ) : (
                  <span className="display-5 font-weight-bold text-secondary">
                    RM{parseFloat(product.price).toFixed(2)}
                  </span>
                )}
                {product.badge && (
                  <span className={`badge ml-auto font-weight-bold px-3 py-2 text-white ${
                    product.badge.toUpperCase().trim() === 'NEW' ? 'bg-success' :
                    product.badge.toUpperCase().trim() === 'SALE' ? 'bg-danger' :
                    'bg-warning text-dark'
                  }`}>
                    {product.badge}
                  </span>
                )}
              </div>

              <p className="text-secondary mb-4 lead small">{product.description}</p>

              <div className="stockStatus mb-4">
                <span className="font-weight-bold">Availability: </span>
                {product.stock > 0 ? (
                  <span className="text-success font-weight-bold">In Stock ({product.stock} units available)</span>
                ) : (
                  <span className="text-danger font-weight-bold">Out of Stock</span>
                )}
              </div>

              {/* Quantity & Add to Cart */}
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="qtyPicker d-flex align-items-center border rounded bg-white">
                  <Button onClick={() => setQty(Math.max(1, qty - 1))}>-</Button>
                  <span className="px-4 font-weight-bold h5 mb-0">{qty}</span>
                  <Button onClick={() => setQty(qty + 1)}>+</Button>
                </div>

                <Button
                  className={`btn btn-lg flex-grow-1 ${added ? 'btn-success text-white' : 'btn-primary'}`}
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                >
                  <IoBagOutline className="mr-2 h4 mb-0" />
                  {product.stock <= 0 ? 'Out of Stock' : (added ? 'Added to Shopping Bag!' : 'Add to Cart')}
                </Button>
              </div>

              {/* Guarantees */}
              <div className="row text-muted border-top pt-3 small">
                <div className="col-4 d-flex align-items-center">
                  <FiTruck className="text-primary mr-2" /> Free Delivery over RM100
                </div>
                <div className="col-4 d-flex align-items-center">
                  <FiShield className="text-primary mr-2" /> Authentic Guarantee
                </div>
                <div className="col-4 d-flex align-items-center">
                  <FiRefreshCw className="text-primary mr-2" /> 30-Day Easy Returns
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div className="bg-white rounded p-4 shadow-sm mb-5">
          <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-4">
            <h4 className="font-weight-bold mb-0 text-dark">Customer Ratings & Reviews</h4>
            <div className="d-flex align-items-center">
              <Rating value={parseFloat(product.rating || 5)} precision={0.1} readOnly size="medium" />
              <span className="ml-2 font-weight-bold h5 mb-0 text-dark">{product.rating || '5.0'}</span>
              <span className="ml-2 text-muted small">({reviews.length} verified reviews)</span>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-4 text-muted bg-light rounded border">
              <p className="mb-0">No customer reviews yet. Be the first to purchase and review this item!</p>
            </div>
          ) : (
            <div className="reviewsList d-flex flex-column gap-3">
              {reviews.map((rev) => {
                const revImages = Array.isArray(rev.images)
                  ? rev.images
                  : (typeof rev.images === 'string' ? JSON.parse(rev.images || '[]') : []);

                return (
                  <div key={rev.id} className="p-3 border rounded bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="d-flex align-items-center gap-2">
                        {rev.user_avatar ? (
                          <img src={rev.user_avatar} alt={rev.user_name} className="rounded-circle border" style={{ width: '36px', height: '36px', objectFit: 'cover' }} />
                        ) : (
                          <div className="rounded-circle bg-primary text-white font-weight-bold d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                            {rev.user_name ? rev.user_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                        )}
                        <div>
                          <div className="font-weight-bold text-dark small mb-0">{rev.user_name || 'Verified Customer'}</div>
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            {new Date(rev.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <Rating value={rev.rating} readOnly size="small" />
                    </div>

                    {rev.comment && (
                      <p className="text-secondary mb-2 small" style={{ whiteSpace: 'pre-line' }}>
                        {rev.comment}
                      </p>
                    )}

                    {revImages.length > 0 && (
                      <div className="d-flex gap-2 flex-wrap mt-2">
                        {revImages.map((img, imgIdx) => (
                          <img
                            key={imgIdx}
                            src={img}
                            alt={`Review ${imgIdx + 1}`}
                            className="rounded border cursor-pointer hover-shadow"
                            style={{ width: '64px', height: '64px', objectFit: 'cover', transition: 'transform 0.15s' }}
                            onClick={() => setSelectedReviewImage(img)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Image Preview Lightbox Dialog */}
        {selectedReviewImage && (
          <Dialog open={Boolean(selectedReviewImage)} onClose={() => setSelectedReviewImage(null)} maxWidth="md">
            <div className="position-relative bg-dark p-2 text-center">
              <button
                type="button"
                className="btn btn-dark btn-sm position-absolute rounded-circle p-1"
                style={{ top: '10px', right: '10px', zIndex: 10 }}
                onClick={() => setSelectedReviewImage(null)}
              >
                <FiX size={24} className="text-white" />
              </button>
              <img src={selectedReviewImage} alt="Review attachment" className="img-fluid rounded" style={{ maxHeight: '80vh', objectFit: 'contain' }} />
            </div>
          </Dialog>
        )}

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h4 className="font-weight-bold mb-4">You May Also Like</h4>
            <div className="row">
              {relatedProducts.map((rel) => (
                <div key={rel.id} className="col-6 col-md-3 mb-4">
                  <ProductCard product={rel} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
