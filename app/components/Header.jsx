"use client";
import { useState, useEffect } from 'react';
import Title from './Title';

export default function Header({ 
  brideName, 
  weddingDate,
  weddingLocation,
  onOpenGuestModal, 
  onOpenArtistModal, 
  onOpenSettingsModal, 
  onExport, 
  onOpenSaveModal,
  onOpenLoadModal,
  onCropSchedule,
  onUndo 
}) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const onBIP = (e) => {
      // Chrome/Edge fires this when app is installable
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
    };
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);

    // Hide button if already running as installed app
    const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) setCanInstall(false);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setCanInstall(false);
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
              onClick={onOpenSaveModal}
            >
              <img src="/images/savelogo.png" alt="Save Schedule" />
            </button>
            <button 
              className="btn btn-icon-small has-icon" 
              title="Load Schedule"
              onClick={onOpenLoadModal}
            >
              <img src="/images/openlogo.png" alt="Load Schedule" />
            </button>
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
            const [y, m, d] = weddingDate.split('-').map(Number);
            const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
            if (y && m && d) {
              parts.push(`${monthNames[m - 1]} ${d}, ${y}`);
            } else {
              parts.push(weddingDate);
            }
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
