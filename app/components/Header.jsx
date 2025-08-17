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
  getSavedSchedules,
  onDeleteSchedule,
  onCropSchedule,
  onUndo 
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

  const handleLoad = (scheduleId) => {
    onLoad(scheduleId);
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

  const handleLoadSchedule = (scheduleId) => {
    onLoad(scheduleId);
    setShowLoadMenu(false);
  };

  const handleDeleteClick = async (e, scheduleId) => {
    e.stopPropagation();
    const ok = typeof window !== 'undefined' ? confirm('Delete this schedule? This cannot be undone.') : true;
    if (!ok) return;
    try {
      await onDeleteSchedule(scheduleId);
      // Optimistically update list without closing the menu
      setSavedSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    } catch (err) {
      alert(err?.message || 'Failed to delete schedule');
    }
  };

  return (
    <header>
      <div className="header-top">
        <div className="header-right">
          <div className="header-top-row">
            <button 
              className="btn btn-settings"
              onClick={onOpenSettingsModal}
            >
              Settings
            </button>
            <button 
              className="btn btn-icon-small has-icon" 
              title="Undo"
              onClick={onUndo}
            >
              <img src="/images/undo.png" alt="Undo" />
            </button>
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
                  {savedSchedules.length === 0 ? (
                    <div className="dropdown-item disabled">No saved schedules</div>
                  ) : (
                    savedSchedules.map((schedule, index) => (
                      <div 
                        key={index} 
                        className="dropdown-item"
                      >
                        <span 
                          className="dropdown-item-name"
                          onClick={() => handleLoadSchedule(schedule.id)}
                        >
                          {schedule.name || `Schedule ${index + 1}`}
                        </span>
                        <button 
                          className="dropdown-item-delete"
                          title="Delete"
                          onClick={(e) => handleDeleteClick(e, schedule.id)}
                          aria-label={`Delete ${schedule.name || `Schedule ${index + 1}`}`}
                          style={{ marginLeft: 8 }}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="header-bottom-row">
            <button 
              className="btn btn-icon-small has-icon" 
              title="Crop Schedule"
              onClick={onCropSchedule}
            >
              <img src="/images/crop.jpg" alt="Crop Schedule" />
            </button>
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
