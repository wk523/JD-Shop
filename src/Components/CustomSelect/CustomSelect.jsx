import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';
import './CustomSelect.css';

const CustomSelect = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select option...',
  className = '',
  style = {},
  disabled = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  pill = false,
  name = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalize options array
  const formattedOptions = options.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return { 
        value: opt.value ?? opt.code ?? opt.id ?? opt.name, 
        label: opt.label ?? opt.name ?? String(opt.value), 
        flag: opt.flag 
      };
    }
    return { value: opt, label: opt };
  });

  const selectedOption = formattedOptions.find(opt => String(opt.value) === String(value));

  const handleSelect = (optionValue) => {
    if (disabled) return;
    if (typeof onChange === 'function') {
      const eventObj = {
        target: { name: name || '', value: optionValue },
        value: optionValue,
        toString: () => String(optionValue)
      };
      onChange(eventObj);
    }
    setIsOpen(false);
  };

  const isSmall = size === 'sm' || size === 'small';
  const isPill = pill || className.includes('rounded-pill');

  return (
    <div 
      className={`custom-select-container ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''} ${isSmall ? 'is-sm' : ''} ${isPill ? 'is-pill' : ''} ${className}`} 
      ref={dropdownRef} 
      style={style}
    >
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="custom-select-value">
          {selectedOption ? (
            <span className="d-flex align-items-center" style={{ gap: '8px' }}>
              {selectedOption.flag && <span className="custom-select-flag">{selectedOption.flag}</span>}
              <span>{selectedOption.label}</span>
            </span>
          ) : (
            <span className="custom-select-placeholder">{placeholder}</span>
          )}
        </span>
        <FiChevronDown className={`custom-select-arrow ${isOpen ? 'arrow-up' : ''}`} />
      </button>

      {isOpen && (
        <div className="custom-select-dropdown">
          <div className="custom-select-options">
            {formattedOptions.length === 0 ? (
              <div className="custom-select-empty">No options available</div>
            ) : (
              formattedOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={opt.value}
                    className={`custom-select-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <span className="d-flex align-items-center" style={{ gap: '8px' }}>
                      {opt.flag && <span className="custom-select-flag">{opt.flag}</span>}
                      <span>{opt.label}</span>
                    </span>
                    {isSelected && <FiCheck className="custom-select-check" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
