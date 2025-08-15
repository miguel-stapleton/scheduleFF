"use client";
import { useState, useEffect } from 'react';

export default function ArtistModal({ onClose, onAddArtist }) {
  const [formData, setFormData] = useState({
    name: '',
    specialty: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name.trim() && formData.specialty) {
      onAddArtist(formData);
      setFormData({ name: '', specialty: '' });
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
      <div className="modal-content" style={{ padding: '30px' }}>
        <span className="close" onClick={onClose}>&times;</span>
        <h2>Add New Artist</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="artist-name">Artist Name:</label>
            <input
              type="text"
              id="artist-name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="artist-specialty">Specialty:</label>
            <select
              id="artist-specialty"
              name="specialty"
              value={formData.specialty}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Specialty</option>
              <option value="makeup">Makeup</option>
              <option value="hair">Hair Styling</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={!formData.name.trim() || !formData.specialty}
          >
            Add Artist
          </button>
        </form>
      </div>
    </div>
  );
}
