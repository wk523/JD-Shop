import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProductCard from '../../Components/ProductCard/ProductCard';
import ProductModal from '../../Components/ProductModal/ProductModal';
import apiClient from '../../api/apiClient';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import { FiFilter, FiRefreshCw, FiChevronDown, FiClock, FiTrendingUp, FiArrowUp, FiArrowDown, FiStar, FiCheck } from 'react-icons/fi';

const Shop = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const initialCategory = queryParams.get('category') || '';
  const initialCategorySlug = queryParams.get('category_slug') || '';
  const initialSearch = queryParams.get('search') || '';
  const initialFeatured = queryParams.get('is_featured') || '';
  const initialSort = queryParams.get('sort') || 'newest';

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortOption, setSortOption] = useState(initialSort);
  const [sortAnchorEl, setSortAnchorEl] = useState(null);
  const [selectedQuickView, setSelectedQuickView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const sortOptions = [
    { value: 'newest', label: 'Newest Arrivals', icon: <FiClock size={16} /> },
    { value: 'top_sales', label: 'Top Sale', icon: <FiTrendingUp size={16} className="text-danger" /> },
    { value: 'price_asc', label: 'Price: Low to High', icon: <FiArrowUp size={16} /> },
    { value: 'price_desc', label: 'Price: High to Low', icon: <FiArrowDown size={16} /> },
    { value: 'rating', label: 'Highest Rated', icon: <FiStar size={16} className="text-warning" /> }
  ];

  // Sync state with URL params
  useEffect(() => {
    setSelectedCategory(queryParams.get('category') || '');
    setSearchQuery(queryParams.get('search') || '');
  }, [location.search]);

  // Fetch Categories for Sidebar
  useEffect(() => {
    const fetchCat = async () => {
      try {
        const res = await apiClient.get('/categories');
        if (res.data.success) setCategories(res.data.categories || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    fetchCat();
  }, []);

  // Fetch Filtered Products
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let url = `/products?sort=${sortOption}`;
        if (selectedCategory) url += `&category=${selectedCategory}`;
        if (initialCategorySlug) url += `&category_slug=${initialCategorySlug}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        if (initialFeatured) url += `&is_featured=${initialFeatured}`;
        if (minPrice) url += `&min_price=${minPrice}`;
        if (maxPrice) url += `&max_price=${maxPrice}`;

        const res = await apiClient.get(url);
        if (res.data.success) {
          setProducts(res.data.products || []);
          setTotalCount(res.data.total || 0);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory, searchQuery, minPrice, maxPrice, sortOption, location.search]);

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setSortOption('newest');
    navigate('/shop');
  };

  return (
    <div className="shopPage py-4 bg-light min-vh-100">
      <div className="container">
        {/* Breadcrumb & Header */}
        <div className="d-flex align-items-center justify-content-between mb-4 bg-white p-3 rounded shadow-sm">
          <div>
            <h2 className="font-weight-bold mb-0">Shop Catalog</h2>
            <span className="text-muted small">
              Showing {products.length} of {totalCount} products
              {searchQuery && ` for "${searchQuery}"`}
            </span>
          </div>
        </div>

        <div className="row">
          {/* Sidebar Filter */}
          <div className="col-lg-3 mb-4">
            <div className="filterSidebar bg-white p-4 rounded shadow-sm border">
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                <h5 className="font-weight-bold mb-0"><FiFilter className="mr-2" /> Filters</h5>
                <Button size="small" onClick={handleResetFilters} className="text-danger small">
                  <FiRefreshCw className="mr-1" /> Reset
                </Button>
              </div>

              {/* Sort By Filter */}
              <div className="mb-4">
                <h6 className="font-weight-bold text-uppercase small text-muted mb-2">Sort By</h6>
                <Button
                  className="w-100 d-flex align-items-center justify-content-between py-2 px-3 bg-white border text-dark font-weight-500 rounded-lg custom-sort-btn"
                  onClick={(e) => setSortAnchorEl(e.currentTarget)}
                  style={{
                    borderRadius: '10px',
                    borderColor: '#cbd5e1',
                    textTransform: 'none',
                    fontSize: '0.88rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    backgroundColor: '#fff'
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    {sortOptions.find((o) => o.value === sortOption)?.icon}
                    <span className="font-weight-600 text-dark">
                      {sortOptions.find((o) => o.value === sortOption)?.label || 'Newest Arrivals'}
                    </span>
                  </div>
                  <FiChevronDown className="text-muted ml-2" size={16} />
                </Button>

                <Menu
                  anchorEl={sortAnchorEl}
                  open={Boolean(sortAnchorEl)}
                  onClose={() => setSortAnchorEl(null)}
                  PaperProps={{
                    elevation: 4,
                    sx: {
                      borderRadius: 3,
                      mt: 1,
                      minWidth: 220,
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.04)',
                      padding: '4px 0'
                    }
                  }}
                >
                  {sortOptions.map((option) => {
                    const isSelected = sortOption === option.value;
                    return (
                      <MenuItem
                        key={option.value}
                        selected={isSelected}
                        onClick={() => {
                          setSortOption(option.value);
                          setSortAnchorEl(null);
                        }}
                        sx={{
                          py: 1.2,
                          px: 2,
                          fontSize: '0.88rem',
                          fontWeight: isSelected ? 600 : 400,
                          color: isSelected ? 'primary.main' : 'text.primary',
                          borderRadius: 2,
                          mx: 1,
                          my: 0.3,
                          transition: 'all 0.15s ease',
                          '&.Mui-selected': {
                            backgroundColor: 'rgba(25, 118, 210, 0.08)',
                            '&:hover': {
                              backgroundColor: 'rgba(25, 118, 210, 0.14)',
                            }
                          },
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          }
                        }}
                      >
                        <ListItemIcon sx={{ color: isSelected ? 'primary.main' : 'text.secondary', minWidth: 28 }}>
                          {option.icon}
                        </ListItemIcon>
                        <span className="flex-grow-1" style={{ fontSize: '0.88rem' }}>{option.label}</span>
                        {isSelected && <FiCheck className="text-primary ml-2" size={16} />}
                      </MenuItem>
                    );
                  })}
                </Menu>
              </div>

              {/* Category Filter */}
              <div className="mb-4">
                <h6 className="font-weight-bold text-uppercase small text-muted mb-2">Categories</h6>
                <div className="list-group list-group-flush">
                  <button
                    className={`list-group-item list-group-item-action border-0 px-0 py-1 d-flex justify-content-between align-items-center ${
                      selectedCategory === '' ? 'font-weight-bold text-primary' : 'text-dark'
                    }`}
                    onClick={() => setSelectedCategory('')}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      className={`list-group-item list-group-item-action border-0 px-0 py-1 d-flex justify-content-between align-items-center ${
                        selectedCategory === String(cat.id) ? 'font-weight-bold text-primary' : 'text-dark'
                      }`}
                      onClick={() => setSelectedCategory(String(cat.id))}
                    >
                      {cat.name}
                      <span className="badge badge-light text-muted">{cat.product_count || 0}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="mb-4">
                <h6 className="font-weight-bold text-uppercase small text-muted mb-2">Price Range (RM)</h6>
                <div className="d-flex gap-2 align-items-center">
                  <input
                    type="number"
                    placeholder="Min"
                    className="form-control form-control-sm"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className="form-control form-control-sm"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="col-lg-9">
            {loading ? (
              <div className="text-center py-5 bg-white rounded shadow-sm">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-2 text-muted">Loading product catalog...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-5 bg-white rounded shadow-sm p-4">
                <h4 className="font-weight-bold text-muted">No products found</h4>
                <p className="text-secondary small mb-3">Try adjusting your filters or search terms.</p>
                <Button className="btn btn-primary" onClick={handleResetFilters}>Reset All Filters</Button>
              </div>
            ) : (
              <div className="row">
                {products.map((product) => (
                  <div key={product.id} className="col-6 col-md-4 mb-4">
                    <ProductCard product={product} onQuickView={setSelectedQuickView} />
                  </div>
                ))}
              </div>
            )}
          </div>
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

export default Shop;
