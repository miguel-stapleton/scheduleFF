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
  const [savedSchedules, setSavedSchedules] = useState([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  const handleSave = async () => {
    const defaultName = brideName ? `${brideName} schedule` : 'Untitled Schedule';
    const name = typeof window !== 'undefined'
      ? prompt('Enter a name for this schedule:', defaultName)
      : defaultName;
    if (name && name.trim()) {
      try {
        await onSave(name.trim());
        alert('Schedule saved.');
      } catch (e) {
        alert(`Save failed: ${e?.message || 'Unknown error'}`);
      }
    }
  };

  const handleLoad = (scheduleName) => {
    onLoad(scheduleName);
    setShowLoadMenu(false);
  };

  const toggleLoadMenu = async () => {
    if (!showLoadMenu) {
      setIsLoadingSaved(true);
      try {
        const items = await getSavedSchedules();
        setSavedSchedules(items);
      } catch (e) {
        console.error(e);
        setSavedSchedules([]);
      } finally {
        setIsLoadingSaved(false);
      }
    }
    setShowLoadMenu(!showLoadMenu);
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
                onClick={toggleLoadMenu}
              >
                <img src="/images/openlogo.png" alt="Load Schedule" />
              </button>
              {showLoadMenu && (
                <div className="dropdown-menu">
                  {isLoadingSaved && (
                    <div className="dropdown-item" aria-disabled>Loading...</div>
                  )}
                  {!isLoadingSaved && savedSchedules.length === 0 && (
                    <div className="dropdown-item" aria-disabled>No saved schedules</div>
                  )}
                  {!isLoadingSaved && savedSchedules.length > 0 && savedSchedules.map((item) => (
                    <button
                      key={item.id}
                      className="dropdown-item"
                      onClick={() => handleLoad(item.id)}
                    >
                      {item.name || item?.data?.brideName || new Date(item.savedAt).toLocaleString()}
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
