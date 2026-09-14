import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../../api/apiClient';
import ProductCard from '../../Components/ProductCard/ProductCard';
import ProductModal from '../../Components/ProductModal/ProductModal';
import { FiCalendar, FiArrowLeft, FiTag } from 'react-icons/fi';

const PromotionDetails = () => {
  const { id } = useParams();
  const [promotion, setPromotion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const fetchPromotionDetails = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`/promotions/${id}`);
        if (res.data.success) {
          setPromotion(res.data.promotion);
        }
      } catch (err) {
        console.error('Failed to load promotion details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotionDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Loading campaign products...</p>
      </div>
    );
  }

  if (!promotion) {
    return (
      <div className="container py-5 text-center my-5">
        <h3 className="font-weight-bold text-dark">Promotion Campaign Not Found</h3>
        <p className="text-muted mb-4">The requested sales promotion campaign could not be found or has ended.</p>
        <Link to="/promotions" className="btn btn-primary rounded-pill px-4">
          Back to All Promotions
        </Link>
      </div>
    );
  }

  const products = promotion.products || [];

  return (
    <div className="promotionDetailsPage bg-light py-5" style={{ minHeight: '80vh' }}>
      <div className="container">
        {/* Breadcrumb Header */}
        <div className="mb-4">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb bg-transparent p-0 mb-2 small text-muted">
              <li className="breadcrumb-item"><Link to="/" className="text-muted">Home</Link></li>
              <li className="breadcrumb-item"><Link to="/promotions" className="text-muted">Promotions</Link></li>
              <li className="breadcrumb-item active font-weight-bold text-primary" aria-current="page">{promotion.title}</li>
            </ol>
          </nav>
          <Link to="/promotions" className="btn btn-sm btn-outline-secondary font-weight-bold mb-3">
            <FiArrowLeft className="mr-1" /> Back to All Promotions
          </Link>
        </div>

        {/* Campaign Hero Card */}
        <div className="card border-0 shadow-sm rounded-lg overflow-hidden bg-white mb-5">
          {promotion.banner_image && (
            <div className="w-100 overflow-hidden border-bottom" style={{ height: '280px', backgroundColor: '#f8f9fa' }}>
              <img
                src={promotion.banner_image}
                alt={promotion.title}
                className="w-100 h-100"
                style={{ objectFit: 'cover' }}
              />
            </div>
          )}

          <div className="p-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 border-bottom pb-3 mb-3">
              <div>
                <span className="badge badge-danger px-3 py-1 font-weight-bold text-uppercase mb-2">
                  <FiTag className="mr-1" /> Promotional Campaign
                </span>
                <h1 className="font-weight-bold text-dark mb-1">{promotion.title}</h1>
                <div className="small text-muted d-flex align-items-center">
                  <FiCalendar className="mr-1 text-primary" />
                  <span>
                    Valid From: <b>{promotion.start_date ? new Date(promotion.start_date).toLocaleString() : 'Immediate'}</b> — Until: <b>{promotion.end_date ? new Date(promotion.end_date).toLocaleString() : 'Ongoing'}</b>
                  </span>
                </div>
              </div>

              <div>
                <span className="badge badge-primary px-3 py-2 font-weight-bold h5 mb-0">
                  {products.length} Items Included
                </span>
              </div>
            </div>

            <p className="text-muted mb-0">
              Enjoy exclusive discounted sales prices and promotional offers on all included items below!
            </p>
          </div>
        </div>

        {/* Full Campaign Product Grid */}
        <h4 className="font-weight-bold text-dark mb-4">Included Products in "{promotion.title}"</h4>

        {products.length === 0 ? (
          <div className="bg-white p-5 text-center rounded shadow-sm">
            <p className="text-muted mb-0">No items assigned to this promotion campaign yet.</p>
          </div>
        ) : (
          <div className="row">
            {products.map((prod) => (
              <div key={prod.id} className="col-12 col-sm-6 col-md-4 col-lg-3 mb-4">
                <ProductCard
                  product={prod}
                  onQuickView={(p) => setSelectedProduct(p)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isOpen={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default PromotionDetails;
