"use client";
import { useState, useEffect } from 'react';

export default function GuestModal({ onClose, onAddGuest }) {
  const [formData, setFormData] = useState({
    name: '',
    services: [],
    color: '#ff6b6b'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleServiceChange = (service) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter(s => s !== service)
        : [...prev.services, service]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name.trim() && formData.services.length > 0) {
      onAddGuest(formData);
      setFormData({ name: '', services: [], color: '#ff6b6b' });
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="modal" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-body">
          <span className="close" onClick={onClose}>&times;</span>
          <h2>Add New Guest</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="guest-name">Guest Name:</label>
              <input
                type="text"
                id="guest-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                autoFocus
              />
            </div>
            
            <div className="form-group">
              <label>Services:</label>
              <div className="checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.services.includes('makeup')}
                    onChange={() => handleServiceChange('makeup')}
                  />
                  Makeup
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.services.includes('hair')}
                    onChange={() => handleServiceChange('hair')}
                  />
                  Hair Styling
                </label>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="guest-color">Guest Color:</label>
              <div className="color-input-group">
                <input
                  type="color"
                  id="guest-color"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                />
                <div 
                  className="color-swatch" 
                  style={{ backgroundColor: formData.color }}
                ></div>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={!formData.name.trim() || formData.services.length === 0}
            >
              Add Guest
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
