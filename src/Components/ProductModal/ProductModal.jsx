import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Rating from '@mui/material/Rating';
import { MdClose } from 'react-icons/md';
import { IoBagOutline } from 'react-icons/io5';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';

const ProductModal = ({ product, isOpen, onClose }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  useEffect(() => {
    setActiveImgIndex(0);
  }, [product?.id, isOpen]);

  if (!product) return null;

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

  const handleAdd = async () => {
    const res = await addToCart(product, qty);
    if (res && res.requireLogin) {
      alert(res.message);
      onClose();
      navigate('/sign-in');
      return;
    }
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 1200);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth className="productModal">
      <div className="position-relative p-4">
        <Button className="closeModalBtn position-absolute" onClick={onClose}>
          <MdClose />
        </Button>

        <div className="row align-items-center">
          <div className="col-md-6 mb-3 mb-md-0">
            <div className="modalImgWrapper text-center position-relative d-flex align-items-center justify-content-center border rounded p-2 bg-white overflow-hidden" style={{ minHeight: '300px' }}>
              {currentImg ? (
                <img src={currentImg} alt={product.name} className="img-fluid rounded max-h-350 transition-all" />
              ) : (
                <div className="text-muted p-4">No Image Available</div>
              )}

              {displayImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="btn btn-dark btn-sm position-absolute rounded-circle shadow opacity-75 d-flex align-items-center justify-content-center"
                    style={{ left: '10px', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '36px', zIndex: 10, cursor: 'pointer' }}
                    onClick={handlePrevImg}
                    title="Previous photo"
                  >
                    <FiChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-dark btn-sm position-absolute rounded-circle shadow opacity-75 d-flex align-items-center justify-content-center"
                    style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', width: '36px', height: '36px', zIndex: 10, cursor: 'pointer' }}
                    onClick={handleNextImg}
                    title="Next photo"
                  >
                    <FiChevronRight size={20} />
                  </button>
                  <span className="badge badge-dark position-absolute px-2 py-1 opacity-75" style={{ bottom: '8px', right: '8px', zIndex: 10 }}>
                    {activeImgIndex + 1} / {displayImages.length}
                  </span>
                </>
              )}
            </div>

            {displayImages.length > 1 && (
              <div className="d-flex gap-2 justify-content-center flex-wrap mt-2">
                {displayImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className={`thumb-img rounded cursor-pointer border ${activeImgIndex === idx ? 'border-primary border-3 shadow-sm' : 'opacity-75'}`}
                    style={{ width: '50px', height: '50px', objectFit: 'cover', transition: 'all 0.2s' }}
                    onClick={() => setActiveImgIndex(idx)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="col-md-6">
            <span className="badge badge-secondary mb-2 text-uppercase">{product.category_name || 'JD Shop'}</span>
            <h3 className="mb-2 font-weight-bold">{product.name}</h3>

            <div className="d-flex align-items-center mb-3">
              <Rating value={parseFloat(product.rating || 5)} precision={0.1} readOnly size="small" />
              <span className="ml-2 text-muted">({product.reviews_count || 0} reviews)</span>
              <span className="ml-3 badge badge-success">{product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
            </div>

            <div className="priceWrapper mb-3">
              {product.old_price && parseFloat(product.old_price) > parseFloat(product.price) ? (
                <>
                  <span className="h3 font-weight-bold text-primary mr-3">RM{parseFloat(product.price).toFixed(2)}</span>
                  <del className="h5 text-muted text-decoration-line-through">RM{parseFloat(product.old_price).toFixed(2)}</del>
                </>
              ) : (
                <span className="h3 font-weight-bold text-primary mr-3">RM{parseFloat(product.price).toFixed(2)}</span>
              )}
            </div>

            <p className="text-secondary small mb-4">{product.description}</p>

            <div className="d-flex align-items-center gap-3">
              <div className="qtyBox d-flex align-items-center border rounded">
                <Button onClick={() => setQty(Math.max(1, qty - 1))}>-</Button>
                <span className="px-3 font-weight-bold">{qty}</span>
                <Button onClick={() => setQty(qty + 1)}>+</Button>
              </div>

              <Button
                className={`btn btn-lg flex-grow-1 ${added ? 'btn-success' : 'btn-primary'}`}
                onClick={handleAdd}
                disabled={product.stock <= 0}
              >
                <IoBagOutline className="mr-2" />
                {added ? 'Added to Cart!' : 'Add to Cart'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default ProductModal;
