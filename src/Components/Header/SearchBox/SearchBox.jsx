import React, { useState, useEffect, useRef } from 'react';
import Button from "@mui/material/Button";
import { IoIosSearch } from "react-icons/io";
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../api/apiClient';

const SearchBox = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.trim().length >= 2) {
        try {
          const res = await apiClient.get(`/products?search=${encodeURIComponent(searchTerm)}&limit=5`);
          if (res.data.success) {
            setResults(res.data.products || []);
            setIsOpen(true);
          }
        } catch (err) {
          console.error('Search error:', err);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle Outside Click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setIsOpen(false);
      navigate(`/shop?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleSelectProduct = (productId) => {
    setIsOpen(false);
    setSearchTerm('');
    navigate(`/product/${productId}`);
  };

  return (
    <div className='headerSearch position-relative' ref={searchRef}>
      <form onSubmit={handleSearchSubmit} className="d-flex w-100 h-100">
        <input
          type='text'
          placeholder='Search for products in JD Shop...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.trim().length >= 2 && setIsOpen(true)}
        />
        <Button type="submit"><IoIosSearch /></Button>
      </form>

      {/* Live Search Suggestions Dropdown */}
      {isOpen && (
        <div className="searchDropdown shadow-lg bg-white rounded position-absolute w-100 mt-2 z-index-1000 p-2">
          {results.length > 0 ? (
            <ul className="list-unstyled mb-0">
              {results.map((product) => {
                const images = Array.isArray(product.images)
                  ? product.images
                  : (typeof product.images === 'string' ? JSON.parse(product.images || '[]') : []);
                const primaryImg = images[0] || '';

                return (
                  <li
                    key={product.id}
                    className="p-2 border-bottom d-flex align-items-center cursor-pointer search-item-hover"
                    onClick={() => handleSelectProduct(product.id)}
                  >
                    {primaryImg ? (
                      <img src={primaryImg} alt={product.name} className="search-thumb mr-3 rounded" />
                    ) : (
                      <div className="search-thumb mr-3 rounded border bg-light d-flex align-items-center justify-content-center text-muted small" style={{ width: 40, height: 40 }}>
                        No Img
                      </div>
                    )}
                    <div className="flex-grow-1">
                      <div className="font-weight-bold text-dark text-truncate">{product.name}</div>
                      <span className="small text-muted">{product.category_name || 'JD Shop'}</span>
                    </div>
                    <span className="font-weight-bold text-primary mr-2">RM{parseFloat(product.price).toFixed(2)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-3 text-center text-muted small">
              No products found for "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBox;