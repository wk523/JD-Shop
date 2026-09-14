import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../../Components/ProductCard/ProductCard';
import ProductModal from '../../Components/ProductModal/ProductModal';
import apiClient from '../../api/apiClient';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [selectedQuickView, setSelectedQuickView] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [featRes, newRes, catRes, promoRes] = await Promise.all([
          apiClient.get('/products?is_featured=true&limit=8'),
          apiClient.get('/products?sort=newest&limit=8'),
          apiClient.get('/categories'),
          apiClient.get('/promotions')
        ]);

        if (featRes.data.success) setFeaturedProducts(featRes.data.products || []);
        if (newRes.data.success) setNewArrivals(newRes.data.products || []);
        if (catRes.data.success) setCategories(catRes.data.categories || []);
        if (promoRes.data.success) {
          const activePromos = (promoRes.data.promotions || []).filter(
            p => p.status === 'active' && p.banner_image
          );
          setPromotions(activePromos);
        }
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto advance promotion banner slide every 5 seconds
  useEffect(() => {
    if (promotions.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prevIndex) => (prevIndex + 1) % promotions.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [promotions.length]);

  const handlePrevBanner = () => {
    setActiveBannerIndex((prev) => (prev === 0 ? promotions.length - 1 : prev - 1));
  };

  const handleNextBanner = () => {
    setActiveBannerIndex((prev) => (prev + 1) % promotions.length);
  };



  return (
    <div className="homePage pb-5">
      {/* Hero Banner Section with Horizontal Swipe Carousel Track */}
      <section
        className="heroBanner text-white position-relative overflow-hidden mb-5"
        style={{
          minHeight: '520px',
          height: '520px'
        }}
      >
        {/* Sliding Track for Banner Slides */}
        <div
          className="d-flex h-100 position-absolute"
          style={{
            width: `${(promotions.length || 1) * 100}%`,
            transform: `translateX(-${(activeBannerIndex * 100) / (promotions.length || 1)}%)`,
            transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)',
            top: 0,
            left: 0,
            bottom: 0
          }}
        >
          {promotions.length > 0 ? (
            promotions.map((p) => (
              <div
                key={p.id}
                className="h-100 position-relative d-flex align-items-center py-5"
                style={{ width: `${100 / promotions.length}%` }}
              >
                {/* Banner Image Background */}
                <img
                  src={p.banner_image}
                  alt={p.title}
                  className="position-absolute w-100 h-100 object-fit-cover"
                  style={{ top: 0, left: 0, zIndex: 1 }}
                />

                {/* Lightened Gradient Overlay */}
                <div
                  className="position-absolute w-100 h-100"
                  style={{
                    top: 0,
                    left: 0,
                    zIndex: 2,
                    background: 'linear-gradient(to right, rgba(15, 23, 42, 0.62) 0%, rgba(15, 23, 42, 0.35) 45%, rgba(15, 23, 42, 0.1) 100%)'
                  }}
                />

                {/* Slide Text Content */}
                <div className="container py-4 position-relative" style={{ zIndex: 3 }}>
                  <div className="row align-items-center">
                    <div className="col-lg-8 col-md-10 py-3">
                      <span className="badge badge-light text-primary px-3 py-2 rounded-pill font-weight-bold text-uppercase mb-3 shadow-sm">
                        {p.discount_percentage ? `🔥 ${parseFloat(p.discount_percentage)}% OFF PROMOTION` : '🔥 SPECIAL PROMOTION'}
                      </span>
                      <h1 className="display-4 font-weight-bold mb-3 text-white">
                        {p.title}
                      </h1>
                      <p className="lead mb-4 text-light" style={{ maxWidth: '650px' }}>
                        {p.description || `Browse exclusive promotional discount campaign available on JD Shop now!`}
                      </p>
                      <div className="d-flex flex-wrap gap-3">
                        <Link
                          to={`/promotions/${p.id}`}
                          className="btn btn-warning btn-lg rounded-pill font-weight-bold px-4 mr-3 shadow"
                        >
                          Shop Now
                        </Link>
                        <Link
                          to="/promotions"
                          className="btn btn-outline-light btn-lg rounded-pill font-weight-bold px-4"
                        >
                          View Featured Deals
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            /* Fallback Slide */
            <div className="w-100 h-100 position-relative d-flex align-items-center py-5">
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80"
                alt="JD Shop Showcase"
                className="position-absolute w-100 h-100 object-fit-cover"
                style={{ top: 0, left: 0, zIndex: 1 }}
              />
              <div
                className="position-absolute w-100 h-100"
                style={{
                  top: 0,
                  left: 0,
                  zIndex: 2,
                  background: 'linear-gradient(to right, rgba(15, 23, 42, 0.62) 0%, rgba(15, 23, 42, 0.35) 45%, rgba(15, 23, 42, 0.1) 100%)'
                }}
              />
              <div className="container py-4 position-relative" style={{ zIndex: 3 }}>
                <div className="row align-items-center">
                  <div className="col-lg-8 col-md-10 py-3">
                    <span className="badge badge-light text-primary px-3 py-2 rounded-pill font-weight-bold text-uppercase mb-3 shadow-sm">
                      🔥 SUMMER SEASON MEGA SALE
                    </span>
                    <h1 className="display-4 font-weight-bold mb-3 text-white">
                      Discover Modern Style & Tech at <span className="text-warning">JD Shop</span>
                    </h1>
                    <p className="lead mb-4 text-light" style={{ maxWidth: '650px' }}>
                      Shop top-rated apparel, luxury watches, noise-canceling headphones, and skincare essentials with fast worldwide shipping.
                    </p>
                    <div className="d-flex flex-wrap gap-3">
                      <Link to="/shop" className="btn btn-warning btn-lg rounded-pill font-weight-bold px-4 mr-3 shadow">
                        Shop Now
                      </Link>
                      <Link to="/shop?is_featured=true" className="btn btn-outline-light btn-lg rounded-pill font-weight-bold px-4">
                        View Featured Deals
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Next and Previous Buttons */}
        {promotions.length > 1 && (
          <>
            <button
              type="button"
              className="btn btn-dark position-absolute rounded-circle shadow d-flex align-items-center justify-content-center"
              style={{
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '44px',
                height: '44px',
                zIndex: 10,
                cursor: 'pointer',
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
              onClick={handlePrevBanner}
              title="Previous promotion"
            >
              <FiChevronLeft size={24} className="text-white" />
            </button>

            <button
              type="button"
              className="btn btn-dark position-absolute rounded-circle shadow d-flex align-items-center justify-content-center"
              style={{
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '44px',
                height: '44px',
                zIndex: 10,
                cursor: 'pointer',
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}
              onClick={handleNextBanner}
              title="Next promotion"
            >
              <FiChevronRight size={24} className="text-white" />
            </button>

            {/* Centered Pagination Dots in Middle Bottom */}
            <div
              className="position-absolute d-flex justify-content-center align-items-center gap-2"
              style={{
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10
              }}
            >
              {promotions.map((p, idx) => (
                <button
                  key={p.id || idx}
                  type="button"
                  onClick={() => setActiveBannerIndex(idx)}
                  className="btn p-0 border-0 shadow-sm"
                  style={{
                    width: idx === activeBannerIndex ? '28px' : '10px',
                    height: '10px',
                    borderRadius: '10px',
                    backgroundColor: idx === activeBannerIndex ? '#ffc107' : 'rgba(255, 255, 255, 0.7)',
                    transition: 'all 0.3s ease-in-out',
                    cursor: 'pointer'
                  }}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Category Quick Browse Grid */}
      <div className="container mb-5">
        <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-2">
          <div>
            <h3 className="font-weight-bold mb-0">Shop by Categories</h3>
            <p className="text-muted small mb-0">Explore our curated collections</p>
          </div>
          <Link to="/shop" className="btn btn-link text-primary font-weight-bold">View All Categories →</Link>
        </div>

        <div className="row">
          {categories.map((cat) => (
            <div key={cat.id} className="col-6 col-md-4 col-lg-2 mb-4">
              <Link to={`/shop?category=${cat.id}`} className="text-decoration-none">
                <div className="categoryCard text-center p-3 rounded bg-white shadow-sm border h-100 hover-lift">
                  <div className="catImgWrapper mb-2 mx-auto rounded-circle overflow-hidden">
                    <img src={cat.image} alt={cat.name} className="w-100 h-100 object-fit-cover" />
                  </div>
                  <h6 className="font-weight-bold text-dark mb-1 text-truncate">{cat.name}</h6>
                  <span className="small text-muted">{cat.product_count || 0} Products</span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Products Section */}
      <div className="container mb-5">
        <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-2">
          <div>
            <h3 className="font-weight-bold mb-0">Featured Products</h3>
            <p className="text-muted small mb-0">Handpicked bestseller items from JD Shop</p>
          </div>
          <Link to="/shop?is_featured=true" className="btn btn-outline-primary btn-sm rounded-pill font-weight-bold px-3">
            Explore All
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-5 text-muted">Loading featured products...</div>
        ) : (
          <div className="row">
            {featuredProducts.map((product) => (
              <div key={product.id} className="col-6 col-md-4 col-lg-3 mb-4">
                <ProductCard product={product} onQuickView={setSelectedQuickView} />
              </div>
            ))}
          </div>
        )}
      </div>   

      {/* New Arrivals Section */}
      <div className="container mb-5">
        <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-2">
          <div>
            <h3 className="font-weight-bold mb-0">New Arrivals</h3>
            <p className="text-muted small mb-0">Fresh additions to our online catalog</p>
          </div>
          <Link to="/shop?sort=newest" className="btn btn-outline-primary btn-sm rounded-pill font-weight-bold px-3">
            See All New Items
          </Link>
        </div>

        <div className="row">
          {newArrivals.map((product) => (
            <div key={product.id} className="col-6 col-md-4 col-lg-3 mb-4">
              <ProductCard product={product} onQuickView={setSelectedQuickView} />
            </div>
          ))}
        </div>
      </div>

      {/* Quick View Modal */}
      {selectedQuickView && (
        <ProductModal
          product={selectedQuickView}
          isOpen={Boolean(selectedQuickView)}
          onClose={() => setSelectedQuickView(null)}
        />
      )}
    </div>
  );
};

export default Home;