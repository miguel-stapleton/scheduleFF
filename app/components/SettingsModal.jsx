"use client";
import { useState, useEffect } from 'react';

export default function SettingsModal({ onClose, onSave, currentSettings, durations, onUpdateDurations }) {
  const [formData, setFormData] = useState({
    brideName: '',
    brideHairTwoParts: false,
    brideReadyTime: '16:00',
    touchupDuration: 15,
    weddingDate: '',
    weddingLocation: '',
    timeStartsAt: '06:00',
    timeFinishesAt: '18:00',
    ...currentSettings
  });

  const [durationsData, setDurationsData] = useState({
    bride: { 
      makeup: 90, 
      hair: 90,
      hairPart1: 60,
      hairPart2: 30
    },
    guest: { makeup: 45, hair: 45 },
    ...durations
  });

  useEffect(() => {
    setFormData({
      brideName: '',
      brideHairTwoParts: false,
      brideReadyTime: '16:00',
      touchupDuration: 15,
      weddingDate: '',
      weddingLocation: '',
      timeStartsAt: '06:00',
      timeFinishesAt: '18:00',
      ...currentSettings
    });
    setDurationsData(durations);
  }, [currentSettings, durations]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDurationChange = (category, service, value) => {
    const newDurations = {
      ...durationsData,
      [category]: {
        ...durationsData[category],
        [service]: parseInt(value) || 0
      }
    };
    setDurationsData(newDurations);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('SettingsModal handleSubmit - formData:', formData);
    console.log('SettingsModal handleSubmit - durationsData:', durationsData);
    onUpdateDurations(durationsData);
    onSave(formData);
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
          <h2>Schedule Settings</h2>
          <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="settings-bride-name">Bride's Name:</label>
            <input
              type="text"
              id="settings-bride-name"
              name="brideName"
              value={formData.brideName}
              onChange={handleInputChange}
              placeholder="Enter Bride's Name"
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                id="settings-bride-hair-two-parts"
                name="brideHairTwoParts"
                checked={formData.brideHairTwoParts}
                onChange={handleInputChange}
              />
              Split bride's hair into two parts
            </label>
          </div>
          
          <div className="form-group">
            <label htmlFor="settings-bride-ready-time">Bride Ready Time:</label>
            <input
              type="time"
              id="settings-bride-ready-time"
              name="brideReadyTime"
              value={formData.brideReadyTime}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="settings-touchup-duration">Touchup Duration (minutes):</label>
            <input
              type="number"
              id="settings-touchup-duration"
              name="touchupDuration"
              value={formData.touchupDuration}
              onChange={handleInputChange}
              min="5"
              max="60"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="settings-wedding-date">Wedding Date:</label>
            <input
              type="date"
              id="settings-wedding-date"
              name="weddingDate"
              value={formData.weddingDate}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="settings-wedding-location">Wedding Location:</label>
            <input
              type="text"
              id="settings-wedding-location"
              name="weddingLocation"
              value={formData.weddingLocation}
              onChange={handleInputChange}
              placeholder="Enter Wedding Location"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="settings-time-starts-at">Time Starts At:</label>
            <input
              type="time"
              id="settings-time-starts-at"
              name="timeStartsAt"
              value={formData.timeStartsAt}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="settings-time-finishes-at">Time Finishes At:</label>
            <input
              type="time"
              id="settings-time-finishes-at"
              name="timeFinishesAt"
              value={formData.timeFinishesAt}
              onChange={handleInputChange}
            />
          </div>
          
          <h3>Service Durations</h3>
          
          <div className="duration-group">
            <h4>Bride</h4>
            <div className="form-group">
              <label htmlFor="settings-bride-makeup-duration">Makeup Duration (minutes):</label>
              <input
                type="number"
                id="settings-bride-makeup-duration"
                value={durationsData.bride.makeup}
                onChange={(e) => handleDurationChange('bride', 'makeup', e.target.value)}
                min="30"
                max="180"
              />
            </div>
            {!formData.brideHairTwoParts ? (
              <div className="form-group">
                <label htmlFor="settings-bride-hair-duration">Hair Duration (minutes):</label>
                <input
                  type="number"
                  id="settings-bride-hair-duration"
                  value={durationsData.bride.hair}
                  onChange={(e) => handleDurationChange('bride', 'hair', e.target.value)}
                  min="30"
                  max="180"
                />
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="settings-bride-hair-part1-duration">Hair Duration, Part I (minutes):</label>
                  <input
                    type="number"
                    id="settings-bride-hair-part1-duration"
                    value={durationsData.bride.hairPart1}
                    onChange={(e) => handleDurationChange('bride', 'hairPart1', e.target.value)}
                    min="15"
                    max="120"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="settings-bride-hair-part2-duration">Hair Duration, Part II (minutes):</label>
                  <input
                    type="number"
                    id="settings-bride-hair-part2-duration"
                    value={durationsData.bride.hairPart2}
                    onChange={(e) => handleDurationChange('bride', 'hairPart2', e.target.value)}
                    min="15"
                    max="120"
                  />
                </div>
              </>
            )}
          </div>
          <div className="duration-group">
            <h4>Guests</h4>
            <div className="form-group">
              <label htmlFor="settings-guest-makeup-duration">Makeup Duration (minutes):</label>
              <input
                type="number"
                id="settings-guest-makeup-duration"
                value={durationsData.guest.makeup}
                onChange={(e) => handleDurationChange('guest', 'makeup', e.target.value)}
                min="20"
                max="120"
              />
            </div>
            <div className="form-group">
              <label htmlFor="settings-guest-hair-duration">Hair Duration (minutes):</label>
              <input
                type="number"
                id="settings-guest-hair-duration"
                value={durationsData.guest.hair}
                onChange={(e) => handleDurationChange('guest', 'hair', e.target.value)}
                min="20"
                max="120"
              />
            </div>
          </div>
          </form>
        </div>
        <div className="modal-footer">
          <button type="submit" className="btn btn-primary" onClick={handleSubmit}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
