"use client";
import { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import ScheduleGrid from './ScheduleGrid';
import GuestModal from './GuestModal';
import ArtistModal from './ArtistModal';
import SettingsModal from './SettingsModal';
import EditBlockModal from './EditBlockModal';

export default function WeddingScheduleApp() {
  // Core state
  const [artists, setArtists] = useState({
    makeup: [{ name: 'Make-up Artist', editable: true }],
    hair: [{ name: 'Hairstylist', editable: true }]
  });
  
  const [clients, setClients] = useState([]);
  const [brideName, setBrideName] = useState('');
  const [durations, setDurations] = useState({
    bride: { makeup: 90, hair: 90, hairPart1: 60, hairPart2: 30 },
    guest: { makeup: 45, hair: 45 }
  });
  
  const [settings, setSettings] = useState({
    brideHairTwoParts: false,
    brideReadyTime: '16:00',
    touchupDuration: 15,
    weddingDate: '',
    weddingLocation: '',
    timeStartsAt: '06:00',
    timeFinishesAt: '18:00'
  });

  // Modal states
  const [modals, setModals] = useState({
    guest: false,
    artist: false,
    settings: false,
    editBlock: false
  });

  const [editingBlock, setEditingBlock] = useState(null);

  // Time slots generation
  const generateTimeSlots = useCallback((startTime = '06:00', endTime = '18:00') => {
    const slots = [];
    
    // Parse start and end times
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    // Convert to total minutes for easier calculation
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    // Generate slots in 15-minute intervals
    for (let totalMinutes = startTotalMinutes; totalMinutes <= endTotalMinutes; totalMinutes += 15) {
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      
      // Format as HH:MM for consistent parsing
      const hourStr = hour.toString().padStart(2, '0');
      const minuteStr = minute.toString().padStart(2, '0');
      slots.push(`${hourStr}:${minuteStr}`);
    }
    return slots;
  }, []);

  const [timeSlots, setTimeSlots] = useState(() => generateTimeSlots());

  // Update time slots when settings change
  useEffect(() => {
    if (settings.timeStartsAt && settings.timeFinishesAt) {
      const newTimeSlots = generateTimeSlots(settings.timeStartsAt, settings.timeFinishesAt);
      
      // Preserve client positions by mapping from startTime to new timeSlotIndex
      setClients(prevClients => {
        return prevClients.map(client => {
          if (client.timeSlotIndex !== undefined && client.startTime) {
            // Find the new index for this client's start time
            const newTimeSlotIndex = newTimeSlots.findIndex(slot => slot === client.startTime);
            if (newTimeSlotIndex !== -1) {
              return { ...client, timeSlotIndex: newTimeSlotIndex };
            } else {
              // If the time slot no longer exists, move client back to unscheduled
              const { timeSlotIndex, startTime, artistIndex, ...unscheduledClient } = client;
              return unscheduledClient;
            }
          }
          return client;
        });
      });
      
      setTimeSlots(newTimeSlots);
    }
  }, [settings.timeStartsAt, settings.timeFinishesAt, generateTimeSlots]);

  // Modal handlers
  const openModal = (modalType) => {
    setModals(prev => ({ ...prev, [modalType]: true }));
  };

  const closeModal = (modalType) => {
    setModals(prev => ({ ...prev, [modalType]: false }));
  };

  const closeAllModals = () => {
    setModals({ guest: false, artist: false, settings: false, editBlock: false });
  };

  // Guest management
  const addGuest = useCallback((guestData) => {
    const baseId = Date.now();
    const guestBlocks = [];
    
    // Create a separate block for each service
    guestData.services.forEach((service, index) => {
      const block = {
        id: `${baseId}-${service}`,
        name: guestData.name,
        service: service,
        type: 'guest',
        color: guestData.color,
        duration: durations.guest[service] || 45
      };
      guestBlocks.push(block);
    });
    
    setClients(prev => [...prev, ...guestBlocks]);
    closeModal('guest');
  }, [durations]);

  // Artist management
  const addArtist = useCallback((artistData) => {
    setArtists(prev => ({
      ...prev,
      [artistData.specialty]: [
        ...prev[artistData.specialty],
        { name: artistData.name, editable: false }
      ]
    }));
    closeModal('artist');
  }, []);

  // Bride blocks management
  const createBrideBlocks = useCallback((name, overrideSettings = null) => {
    const currentSettings = overrideSettings || settings;
    console.log('Creating bride blocks with settings:', currentSettings);
    console.log('Creating bride blocks with durations:', durations);
    
    const brideBlocks = [];
    const brideId = `bride-${Date.now()}`;
    
    // Makeup block
    brideBlocks.push({
      id: `${brideId}-makeup`,
      name: name,
      service: 'makeup',
      type: 'bride',
      color: '#ffd700',
      duration: durations.bride.makeup
    });

    // Hair block(s)
    console.log('Hair splitting enabled:', currentSettings.brideHairTwoParts);
    if (currentSettings.brideHairTwoParts) {
      console.log('Creating two hair blocks');
      brideBlocks.push({
        id: `${brideId}-hair-part1`,
        name: `${name} - Hair Part I`,
        service: 'hair-part1',
        type: 'bride',
        color: '#ffd700',
        duration: durations.bride.hairPart1 || 60
      });
      brideBlocks.push({
        id: `${brideId}-hair-part2`,
        name: `${name} - Hair Part II`,
        service: 'hair-part2',
        type: 'bride',
        color: '#ffd700',
        duration: durations.bride.hairPart2 || 30
      });
    } else {
      console.log('Creating single hair block');
      brideBlocks.push({
        id: `${brideId}-hair`,
        name: name,
        service: 'hair',
        type: 'bride',
        color: '#ffd700',
        duration: durations.bride.hair
      });
    }

    console.log('Final bride blocks:', brideBlocks);
    setClients(prev => [
      ...prev.filter(c => c.type !== 'bride'),
      ...brideBlocks
    ]);
  }, [durations, settings]);

  // Create special blocks for bride ready time
  const createSpecialBlocks = useCallback((brideReadyTime) => {
    console.log('createSpecialBlocks called with:', brideReadyTime);
    if (!brideReadyTime) return;
    
    const specialBlocks = [];
    const baseId = Date.now();
    
    // Create two "Arrival + setup" blocks (grey) - flexible positioning
    for (let i = 0; i < 2; i++) {
      specialBlocks.push({
        id: `${baseId}-arrival-${i}`,
        name: 'Arrival + setup',
        service: '',
        type: 'special',
        color: '#808080',
        duration: 15
      });
    }
    
    // Create two "final touch-ups" blocks (bride yellow) - auto-positioned
    // Calculate start time: 15 minutes before bride ready time
    const [hours, minutes] = brideReadyTime.split(':').map(Number);
    const brideReadyMinutes = hours * 60 + minutes;
    const touchupStartMinutes = brideReadyMinutes - 15;
    const touchupStartHours = Math.floor(touchupStartMinutes / 60);
    const touchupStartMins = touchupStartMinutes % 60;
    const touchupStartTime = `${touchupStartHours.toString().padStart(2, '0')}:${touchupStartMins.toString().padStart(2, '0')}`;
    
    console.log('Calculated touchup start time:', touchupStartTime, 'for bride ready time:', brideReadyTime);
    
    for (let i = 0; i < 2; i++) {
      const touchupBlock = {
        id: `${baseId}-touchup-${i}`,
        name: 'Final touch-ups',
        service: '',
        type: 'special',
        color: '#ffd700',
        duration: 15,
        startTime: touchupStartTime,
        endTime: brideReadyTime,
        autoPositioned: true // Flag to indicate this block should be auto-positioned
      };
      console.log('Creating final touch-up block:', touchupBlock);
      specialBlocks.push(touchupBlock);
    }
    
    console.log('All special blocks created:', specialBlocks);
    
    setClients(prev => {
      const filtered = prev.filter(c => c.type !== 'special');
      const newClients = [...filtered, ...specialBlocks];
      console.log('Setting clients to:', newClients);
      return newClients;
    });
  }, []);

  // Settings management
  const saveSettings = useCallback((newSettings) => {
    console.log('saveSettings called with:', newSettings);
    const { brideName: newBrideName, ...otherSettings } = newSettings;
    console.log('Extracted brideName:', newBrideName);
    console.log('Other settings:', otherSettings);
    
    // Update settings and bride name
    setSettings(prev => {
      const updated = { ...prev, ...otherSettings };
      console.log('Updated settings state:', updated);
      return updated;
    });
    setBrideName(newBrideName);
    
    // Handle bride blocks - always recreate them to ensure proper hair splitting
    const existingBrideBlocks = clients.filter(c => c.type === 'bride');
    const hasHairParts = existingBrideBlocks.some(b => 
      b.service === 'hair-part1' || b.service === 'hair-part2'
    );
    
    // Use existing bride name if newBrideName is empty
    const brideNameToUse = newBrideName || brideName || 'Bride';
    console.log('Bride name to use:', brideNameToUse);
    
    // If hair splitting setting changed or no bride blocks exist, recreate them
    if (existingBrideBlocks.length === 0 || 
        (otherSettings.brideHairTwoParts && !hasHairParts) || 
        (!otherSettings.brideHairTwoParts && hasHairParts)) {
      console.log('Recreating bride blocks due to hair splitting change');
      setClients(prev => prev.filter(c => c.type !== 'bride'));
      // Use setTimeout to ensure durations state is updated first, and pass the new settings
      setTimeout(() => createBrideBlocks(brideNameToUse, otherSettings), 100);
    } else if (newBrideName && existingBrideBlocks.length > 0) {
      // Just update the name if bride blocks exist and only name changed
      console.log('Updating existing bride block names');
      setClients(prev => prev.map(client => 
        client.type === 'bride' 
          ? { ...client, name: client.service.includes('part') 
              ? `${brideNameToUse} - ${client.service === 'hair-part1' ? 'Hair Part I' : client.service === 'hair-part2' ? 'Hair Part II' : client.service}`
              : brideNameToUse 
            }
          : client
      ));
    }
    
    // Create special blocks for bride ready time
    createSpecialBlocks(otherSettings.brideReadyTime);
    
    closeModal('settings');
  }, [clients, createBrideBlocks, createSpecialBlocks]);

  // Export functionality
  const exportSchedule = useCallback(async () => {
    try {
      // Import dom-to-image dynamically
      const domtoimage = (await import('dom-to-image')).default;
      
      // Add export class to hide buttons during capture
      document.body.classList.add('exporting');
      
      // Wait for fonts to load and styles to apply
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Capture the container element
      const element = document.querySelector('.container');
      if (!element) {
        console.error('Container element not found');
        return;
      }
      
      // Ensure fonts are loaded before capture
      await document.fonts.ready;
      
      // Use dom-to-image for better font rendering
      const dataUrl = await domtoimage.toJpeg(element, {
        quality: 0.9,
        bgcolor: '#ffffff',
        width: element.offsetWidth * 2,
        height: element.offsetHeight * 2,
        style: {
          transform: 'scale(2)',
          transformOrigin: 'top left'
        }
      });
      
      // Create download link
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `wedding-schedule-${brideName || 'untitled'}-${new Date().toISOString().split('T')[0]}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      // Remove export class to restore buttons
      document.body.classList.remove('exporting');
    }
  }, [brideName]);

  // Save/Load functionality (MongoDB via API)
  const saveSchedule = useCallback(async (scheduleName) => {
    const scheduleData = {
      clients,
      artists,
      settings,
      durations,
      brideName,
    };
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: scheduleName, data: scheduleData }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save schedule');
    }
    return res.json();
  }, [clients, artists, settings, durations, brideName]);

  const loadScheduleById = useCallback(async (scheduleId) => {
    const res = await fetch(`/api/schedules/${scheduleId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to load schedule');
    }
    const payload = await res.json();
    const scheduleData = payload?.data || {};
    setClients(scheduleData.clients || []);
    setArtists(scheduleData.artists || {
      makeup: [{ name: 'Make-up Artist', editable: true }],
      hair: [{ name: 'Hairstylist', editable: true }],
    });
    setBrideName(scheduleData.brideName || '');
    setSettings(scheduleData.settings || {
      brideHairTwoParts: false,
      brideReadyTime: '16:00',
      touchupDuration: 15,
      weddingDate: '',
      weddingLocation: '',
      timeStartsAt: '06:00',
      timeFinishesAt: '18:00',
    });
    setDurations(scheduleData.durations || {
      bride: { makeup: 90, hair: 90, hairPart1: 60, hairPart2: 30 },
      guest: { makeup: 45, hair: 45 },
    });
  }, []);

  const getSavedSchedules = useCallback(async () => {
    const res = await fetch('/api/schedules');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to list schedules');
    }
    return res.json();
  }, []);

  // Click outside handler for modals
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.classList.contains('modal')) {
        closeAllModals();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const deleteBlock = useCallback((blockToDelete) => {
    const updatedClients = clients.filter(client => client.id !== blockToDelete.id);
    setClients(updatedClients);
    closeEditBlockModal();
  }, [clients]);

  const saveEditedBlock = useCallback((editedBlock) => {
    const updatedClients = clients.map(client => 
      client.id === editedBlock.id ? editedBlock : client
    );
    setClients(updatedClients);
    closeEditBlockModal();
  }, [clients]);

  const openEditBlockModal = (block) => {
    setEditingBlock(block);
    openModal('editBlock');
  };

  const closeEditBlockModal = () => {
    setEditingBlock(null);
    closeModal('editBlock');
  };

  return (
    <div className="container">
      <Header
        brideName={brideName}
        weddingDate={settings.weddingDate}
        weddingLocation={settings.weddingLocation}
        onOpenGuestModal={() => openModal('guest')}
        onOpenArtistModal={() => openModal('artist')}
        onOpenSettingsModal={() => openModal('settings')}
        onExport={exportSchedule}
        onSave={saveSchedule}
        onLoad={loadScheduleById}
        getSavedSchedules={getSavedSchedules}
      />
      
      <ScheduleGrid
        timeSlots={timeSlots}
        artists={artists}
        clients={clients}
        onUpdateClients={setClients}
        onUpdateArtists={setArtists}
        durations={durations}
        onOpenEditBlockModal={openEditBlockModal}
      />

      {modals.guest && (
        <GuestModal
          onClose={() => closeModal('guest')}
          onAddGuest={addGuest}
        />
      )}

      {modals.artist && (
        <ArtistModal
          onClose={() => closeModal('artist')}
          onAddArtist={addArtist}
        />
      )}

      {modals.settings && (
        <SettingsModal
          onClose={() => closeModal('settings')}
          onSave={saveSettings}
          currentSettings={{
            brideName,
            ...settings
          }}
          durations={durations}
          onUpdateDurations={setDurations}
        />
      )}

      {modals.editBlock && (
        <EditBlockModal
          block={editingBlock}
          onClose={closeEditBlockModal}
          onSave={saveEditedBlock}
          onDelete={deleteBlock}
        />
      )}
    </div>
  );
}
