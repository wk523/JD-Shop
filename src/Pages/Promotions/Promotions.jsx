import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import apiClient from '../../api/apiClient';
import ProductCard from '../../Components/ProductCard/ProductCard';
import ProductModal from '../../Components/ProductModal/ProductModal';
import { FiCalendar, FiArrowRight, FiPercent } from 'react-icons/fi';

const Promotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const res = await apiClient.get('/promotions');
        if (res.data.success) {
          // Only show active promotions with products
          const activePromos = (res.data.promotions || []).filter(
            p => p.status === 'active' && p.products && p.products.length > 0
          );
          setPromotions(activePromos);
        }
      } catch (err) {
        console.error('Failed to load promotions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPromotions();
  }, []);

  return (
    <div className="promotionsPage bg-light py-5" style={{ minHeight: '80vh' }}>
      <div className="container">
        {/* Breadcrumb Header */}
        <div className="mb-4">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb bg-transparent p-0 mb-2 small text-muted">
              <li className="breadcrumb-item"><Link to="/" className="text-muted">Home</Link></li>
              <li className="breadcrumb-item active font-weight-bold text-primary" aria-current="page">Promotions</li>
            </ol>
          </nav>
          <h2 className="font-weight-bold text-dark mb-1 d-flex align-items-center">
            <FiPercent className="mr-2 text-primary" /> Promotions
          </h2>
          <p className="text-muted mb-0">Browse exclusive discount campaigns and flash deals available on JD Shop</p>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2 text-muted">Loading active promotion campaigns...</p>
          </div>
        ) : promotions.length === 0 ? (
          <div className="card border-0 shadow-sm p-5 text-center bg-white rounded-lg my-4">
            <FiPercent size={48} className="text-muted opacity-50 mx-auto mb-3" />
            <h4 className="font-weight-bold text-dark">No Active Promotion Campaigns Right Now</h4>
            <p className="text-secondary small mb-4">Check back soon for upcoming Flash Sales and Mega Shopping Events!</p>
            <div>
              <Link to="/shop" className="btn btn-primary rounded-pill px-4 font-weight-bold">
                Browse All Products
              </Link>
            </div>
          </div>
        ) : (
          <div className="d-flex flex-column gap-5">
            {promotions.map((p) => {
              const displayProducts = (p.products || []).slice(0, 3); // Display 3 items only

              return (
                <div key={p.id} className="card border-0 shadow-sm rounded-lg overflow-hidden bg-white">
                  {/* Campaign Banner Header */}
                  {p.banner_image && (
                    <div className="w-100 overflow-hidden border-bottom" style={{ height: '240px', backgroundColor: '#f8f9fa' }}>
                      <img
                        src={p.banner_image}
                        alt={p.title}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  )}

                  <div className="p-4">
                    {/* Campaign Title & View All Header Row */}
                    <div className="d-flex flex-wrap align-items-center justify-content-between border-bottom pb-3 mb-4 gap-2">
                      <div>
                        <span className="badge badge-danger px-3 py-1 font-weight-bold text-uppercase mb-2">
                          Special Promotion
                        </span>
                        <h3 className="font-weight-bold text-dark mb-1">{p.title}</h3>
                        <div className="small text-muted d-flex align-items-center">
                          <FiCalendar className="mr-1 text-primary" />
                          <span>
                            Start: {p.start_date ? new Date(p.start_date).toLocaleDateString() : 'Now'} — End: {p.end_date ? new Date(p.end_date).toLocaleDateString() : 'Ongoing'}
                          </span>
                        </div>
                      </div>

                      <Link to={`/promotions/${p.id}`} className="text-decoration-none">
                        <Button className="btn btn-outline-primary font-weight-bold rounded-pill px-4">
                          View All Products<FiArrowRight className="ml-1" />
                        </Button>
                      </Link>
                    </div>

                    {/* Products Grid (Max 3 Items) */}
                    <div className="row">
                      {displayProducts.map((prod) => (
                        <div key={prod.id} className="col-12 col-sm-6 col-md-4 mb-3">
                          <ProductCard
                            product={prod}
                            onQuickView={(p) => setSelectedProduct(p)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
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

export default Promotions;
