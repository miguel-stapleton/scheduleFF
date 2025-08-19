"use client";
import { useState, useEffect, useRef } from 'react';

export default function EditBlockModal({ block, onClose, onSave, onDelete, onDuplicate }) {
  const [formData, setFormData] = useState({
    name: '',
    duration: 45,
    color: '#cccccc'
  });

  useEffect(() => {
    if (block) {
      setFormData({
        name: block.name || '',
        duration: block.duration || 45,
        color: block.color || '#cccccc'
      });
    }
  }, [block]);

  const colorInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duration' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name.trim() && formData.duration > 0) {
      onSave({
        ...block,
        name: formData.name.trim(),
        duration: formData.duration,
        color: formData.color
      });
    }
  };

  const handleDelete = () => {
    onDelete(block);
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(block);
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

  if (!block) return null;

  return (
    <div className="modal" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-body">
          <span className="close" onClick={onClose}>&times;</span>
          <h2>Edit Block</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="edit-block-name">Name:</label>
              <input
                type="text"
                id="edit-block-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                autoFocus
                placeholder="Enter name"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="edit-block-duration">Duration (minutes):</label>
              <input
                type="number"
                id="edit-block-duration"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                min="5"
                max="300"
                step="5"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-block-color">Colour:</label>
              <div className="color-input-group">
                <button
                  type="button"
                  className="color-swatch"
                  style={{ backgroundColor: formData.color }}
                  onClick={() => colorInputRef.current && colorInputRef.current.click()}
                  aria-label="Choose colour"
                  title="Choose colour"
                />
                <input
                  type="color"
                  id="edit-block-color"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  ref={colorInputRef}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Service:</label>
              <span className="service-display">{block.service}</span>
            </div>
            
            <div className="form-group">
              <label>Type:</label>
              <span className="type-display">{block.type}</span>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-warning" onClick={handleDuplicate}>
            Duplicate
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            Delete
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" onClick={handleSubmit}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

