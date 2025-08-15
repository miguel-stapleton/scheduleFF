"use client";
import { useState } from 'react';
import Title from './Title';

export default function Header({ 
  brideName, 
  weddingDate,
  weddingLocation,
  onOpenGuestModal, 
  onOpenArtistModal, 
  onOpenSettingsModal, 
  onExport, 
  onSave, 
  onLoad, 
  getSavedSchedules 
}) {
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const savedSchedules = getSavedSchedules();

  const handleSave = () => {
    onSave();
  };

  const handleLoad = (scheduleName) => {
    onLoad(scheduleName);
    setShowLoadMenu(false);
  };

  return (
    <header>
      <div className="header-top">
        <div className="header-right">
          <button 
            className="btn btn-settings"
            onClick={onOpenSettingsModal}
          >
            Settings
          </button>
          <div className="schedule-actions">
            <button 
              className="btn btn-icon-small has-icon" 
              title="Save Schedule"
              onClick={handleSave}
            >
              <img src="/images/savelogo.png" alt="Save Schedule" />
            </button>
            <div className="load-dropdown">
              <button 
                className="btn btn-icon-small has-icon" 
                title="Load Schedule"
                onClick={() => setShowLoadMenu(!showLoadMenu)}
              >
                <img src="/images/openlogo.png" alt="Load Schedule" />
              </button>
              {showLoadMenu && savedSchedules.length > 0 && (
                <div className="dropdown-menu">
                  {savedSchedules.map((scheduleName) => (
                    <button
                      key={scheduleName}
                      className="dropdown-item"
                      onClick={() => handleLoad(scheduleName)}
                    >
                      {scheduleName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="title-section">
        <div className="logo-section">
          <img src="/images/FFlogo.jpg" alt="FF Logo" className="app-logo" />
        </div>
        <Title brideName={brideName} />
      </div>
      
      <p className="schedule-subtitle">
        {(() => {
          if (!brideName) return 'Create your perfect wedding day beauty timeline';
          
          const parts = [];
          
          if (weddingDate && weddingDate.trim()) {
            const date = new Date(weddingDate);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            parts.push(date.toLocaleDateString('en-US', options));
          }
          
          if (weddingLocation && weddingLocation.trim()) {
            parts.push(weddingLocation);
          }
          
          return parts.length > 0 ? parts.join(', ') : `Beauty schedule for ${brideName}'s special day`;
        })()}
      </p>
      
      <div className="controls">
        <button 
          className="btn btn-primary"
          onClick={onOpenGuestModal}
        >
          Add Guest
        </button>
        <button 
          className="btn btn-secondary"
          onClick={onOpenArtistModal}
        >
          Add Artist
        </button>
        <button 
          className="btn btn-success"
          onClick={onExport}
        >
          Export Schedule
        </button>
      </div>
    </header>
  );
}
