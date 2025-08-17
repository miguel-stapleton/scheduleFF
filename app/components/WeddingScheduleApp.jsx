"use client";
import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const Header = dynamic(() => import('./Header'), { ssr: false });
const ScheduleGrid = dynamic(() => import('./ScheduleGrid'), { ssr: false });
const GuestModal = dynamic(() => import('./GuestModal'), { ssr: false });
const ArtistModal = dynamic(() => import('./ArtistModal'), { ssr: false });
const SettingsModal = dynamic(() => import('./SettingsModal'), { ssr: false });
const EditBlockModal = dynamic(() => import('./EditBlockModal'), { ssr: false });

// Ordered palette for auto-assigned guest colors
const GUEST_COLORS = [
  '#CC00A0',
  '#008741',
  '#D65F2E',
  '#0047A0',
  '#BC061B',
  '#0087CC',
  '#9D3C0A',
  '#6800BD',
  '#009688',
  '#A66F00',
  '#13431B',
  '#8A1779',
  '#6C740B',
  '#1D178A',
  '#F0005E',
  '#0A114A',
  '#5B8255',
  '#E27C00',
  '#736849',
  '#494E78',
];

export default function WeddingScheduleApp() {
  // Core state
  const [artists, setArtists] = useState({
    makeup: [{ name: 'Make-up Artist', editable: true }],
    hair: [{ name: 'Hairstylist', editable: true }]
  });
  
  const [clients, setClients] = useState([]);
  const [nextGuestColorIndex, setNextGuestColorIndex] = useState(0);
  
  // Unified history system to maintain chronological order
  const [actionHistory, setActionHistory] = useState([]);
  const [brideName, setBrideName] = useState('');
  const [durations, setDurations] = useState({
    bride: { makeup: 90, hair: 90, hairPart1: 60, hairPart2: 30 },
    guest: { makeup: 45, hair: 45 }
  });
  
  const [settings, setSettings] = useState({
    brideHairTwoParts: false,
    brideReadyTime: '16:00',
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

  const [timeSlots, setTimeSlots] = useState([]);
  
  // Initialize time slots on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTimeSlots(generateTimeSlots());
    }
  }, [generateTimeSlots]);

  // Unified history system - saves complete state snapshots
  const saveToHistory = useCallback((actionType, description = '') => {
    const snapshot = {
      timestamp: typeof window !== 'undefined' ? Date.now() : 0,
      actionType,
      description,
      state: {
        clients,
        artists,
        settings,
        brideName
      }
    };
    
    setActionHistory(prev => {
      const newHistory = [...prev, snapshot];
      // Keep only last 15 actions to prevent memory issues
      return newHistory.slice(-15);
    });
  }, [clients, artists, settings, brideName]);

  // Undo functionality - restores previous state in chronological order
  const undoLastChange = useCallback(() => {
    if (actionHistory.length > 0) {
      const lastAction = actionHistory[actionHistory.length - 1];
      const previousState = lastAction.state;
      
      // Restore the complete previous state
      setClients(previousState.clients);
      setArtists(previousState.artists);
      setSettings(previousState.settings);
      setBrideName(previousState.brideName);
      
      // Remove the last action from history
      setActionHistory(prev => prev.slice(0, -1));
    }
  }, [actionHistory]);

  // Update time slots when settings change
  useEffect(() => {
    if (settings.timeStartsAt && settings.timeFinishesAt) {
      const newTimeSlots = generateTimeSlots(settings.timeStartsAt, settings.timeFinishesAt);
      
      // Preserve client positions by mapping to the nearest valid slot
      // Prefer exact previous startTime when available; otherwise, derive from prior index.
      setClients(prevClients => {
        return prevClients.map(client => {
          if (client.artistIndex !== undefined) {
            // Determine previous start time string from either saved startTime or old index
            const previousStartStr = client.startTime ?? (client.timeSlotIndex !== undefined ? timeSlots[client.timeSlotIndex] : undefined);

            // Helper to clamp index within bounds
            const clampIndex = (idx) => Math.max(0, Math.min(newTimeSlots.length - 1, idx));

            if (previousStartStr && newTimeSlots.length > 0) {
              // Prefer exact match
              const exactIdx = newTimeSlots.findIndex(slot => slot === previousStartStr);
              if (exactIdx !== -1) {
                return { ...client, timeSlotIndex: exactIdx, startTime: newTimeSlots[exactIdx] };
              }

              // Otherwise clamp to new range
              const [ph, pm] = previousStartStr.split(':').map(Number);
              if (!Number.isNaN(ph) && !Number.isNaN(pm)) {
                const prevMinutes = ph * 60 + pm;
                const [sh, sm] = newTimeSlots[0].split(':').map(Number);
                const [eh, em] = newTimeSlots[newTimeSlots.length - 1].split(':').map(Number);
                const startMinutes = sh * 60 + sm;
                const endMinutes = eh * 60 + em;

                let targetMinutes = prevMinutes;
                if (prevMinutes < startMinutes) targetMinutes = startMinutes;
                if (prevMinutes > endMinutes) targetMinutes = endMinutes;

                const hourStr = String(Math.floor(targetMinutes / 60)).padStart(2, '0');
                const minuteStr = String(targetMinutes % 60).padStart(2, '0');
                const clampedStr = `${hourStr}:${minuteStr}`;
                let idx = newTimeSlots.findIndex(t => t === clampedStr);
                if (idx === -1) {
                  const diff = targetMinutes - (startMinutes);
                  idx = clampIndex(Math.round(diff / 15));
                }
                return { ...client, timeSlotIndex: idx, startTime: newTimeSlots[idx] };
              }
            }

            // Fallbacks: if we still have a previous index, clamp it; otherwise leave as-is
            if (client.timeSlotIndex !== undefined && newTimeSlots.length > 0) {
              const idx = clampIndex(client.timeSlotIndex);
              return { ...client, timeSlotIndex: idx, startTime: newTimeSlots[idx] };
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
    saveToHistory('addGuest', `Added guest: ${guestData.name}`);
    const baseId = typeof window !== 'undefined' ? Date.now() : 1000000;
    const guestBlocks = [];
    const assignedColor = GUEST_COLORS[nextGuestColorIndex % GUEST_COLORS.length];
    
    // Create makeup block if requested
    if (guestData.services.includes('makeup')) {
      guestBlocks.push({
        id: `${baseId}-makeup`,
        name: guestData.name,
        service: 'makeup',
        type: 'guest',
        color: assignedColor,
        duration: durations.guest.makeup
      });
    }
    
    // Create hair block if requested
    if (guestData.services.includes('hair')) {
      guestBlocks.push({
        id: `${baseId}-hair`,
        name: guestData.name,
        service: 'hair',
        type: 'guest',
        color: assignedColor,
        duration: durations.guest.hair
      });
    }
    
    setClients(prev => [...prev, ...guestBlocks]);
    setNextGuestColorIndex(prev => prev + 1);
    closeModal('guest');
  }, [nextGuestColorIndex, saveToHistory, durations]);

  // Artist management
  const addArtist = useCallback((artistData) => {
    saveToHistory('addArtist', `Added ${artistData.specialty} artist: ${artistData.name}`);
    
    // Update artist list
    setArtists(prev => ({
      ...prev,
      [artistData.specialty]: [
        ...prev[artistData.specialty],
        { name: artistData.name, editable: false }
      ]
    }));
    
    // Update client artistIndex values to account for new column positions
    setClients(prevClients => {
      return prevClients.map(client => {
        if (client.artistIndex !== undefined) {
          // Get current artist arrays
          const currentMakeupCount = artists.makeup.length;
          const currentHairCount = artists.hair.length;
          
          // If adding a makeup artist and this client was assigned to hair artists
          if (artistData.specialty === 'makeup' && client.artistIndex >= currentMakeupCount) {
            // Shift hair artist indices by 1
            return { ...client, artistIndex: client.artistIndex + 1 };
          }
        }
        return client;
      });
    });
    
    closeModal('artist');
  }, [saveToHistory, artists]);

  // Bride blocks management
  const createBrideBlocks = useCallback((name, overrideSettings = null) => {
    const currentSettings = overrideSettings || settings;
    console.log('Creating bride blocks with settings:', currentSettings);
    console.log('Creating bride blocks with durations:', durations);
    
    const brideBlocks = [];
    const brideId = `bride-${typeof window !== 'undefined' ? Date.now() : 2000000}`;
    
    // Makeup block
    brideBlocks.push({
      id: `${brideId}-makeup`,
      name: name,
      service: 'makeup',
      type: 'bride',
      color: '#ffae00',
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
        color: '#ffae00',
        duration: durations.bride.hairPart1 || 60
      });
      brideBlocks.push({
        id: `${brideId}-hair-part2`,
        name: `${name} - Hair Part II`,
        service: 'hair-part2',
        type: 'bride',
        color: '#ffae00',
        duration: durations.bride.hairPart2 || 30
      });
    } else {
      console.log('Creating single hair block');
      brideBlocks.push({
        id: `${brideId}-hair`,
        name: name,
        service: 'hair',
        type: 'bride',
        color: '#ffae00',
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
    const baseId = typeof window !== 'undefined' ? Date.now() : 3000000;
    
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
        color: '#ffae00',
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
      // Preserve existing Arrival blocks; only replace Final touch-ups
      const existingArrivals = prev.filter(c => c.type === 'special' && c.name === 'Arrival + setup');
      const withoutTouchups = prev.filter(c => !(c.type === 'special' && c.name === 'Final touch-ups'));

      // Ensure exactly two Arrival blocks by adding missing ones (do NOT remove placed ones)
      const arrivalsNeeded = Math.max(0, 2 - existingArrivals.length);
      const arrivalsToAdd = [];
      for (let i = 0; i < arrivalsNeeded; i++) {
        arrivalsToAdd.push({
          id: `${baseId}-arrival-${i}`,
          name: 'Arrival + setup',
          service: '',
          type: 'special',
          color: '#808080',
          duration: 15
        });
      }

      const newClients = [...withoutTouchups, ...arrivalsToAdd, ...specialBlocks];
      console.log('Setting clients to:', newClients);
      return newClients;
    });
  }, []);

  // Settings management
  const saveSettings = useCallback((newSettings) => {
    // Save current state to history before applying new settings
    saveToHistory('saveSettings', 'Saved settings changes');
    
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
    
    closeModal('settings');
  }, [clients, brideName, createBrideBlocks, saveToHistory]);

  // Ensure special blocks exist on mount and whenever bride ready time changes
  useEffect(() => {
    createSpecialBlocks(settings.brideReadyTime);
  }, [settings.brideReadyTime, createSpecialBlocks]);

  // Validation check for mismatched service/artist assignments
  const validateServiceAssignments = useCallback(() => {
    const allArtists = [
      ...artists.makeup.map((artist, index) => ({ ...artist, specialty: 'makeup', index })),
      ...artists.hair.map((artist, index) => ({ ...artist, specialty: 'hair', index: index + artists.makeup.length }))
    ];

    console.log('Validation - All artists:', allArtists);

    const mismatches = [];

    clients.forEach(client => {
      console.log('Checking client:', client);
      const hasArtist = client.artistIndex !== undefined;
      const isServiceBlock = client.type === 'guest' || client.type === 'bride';
      if (!hasArtist || !isServiceBlock) return;

      const assignedArtist = allArtists[client.artistIndex];
      console.log('Assigned artist:', assignedArtist);

      if (!assignedArtist) return;

      // Determine service type from 'service' with legacy fallback to 'subtitle'
      let rawService = (client.service || client.subtitle || '').toLowerCase();
      let serviceType = '';
      if (rawService.includes('make')) {
        serviceType = 'makeup';
      } else if (rawService.startsWith('hair') || rawService.includes('hair')) {
        // Covers 'hair', 'hair-part1', 'hair-part2'
        serviceType = 'hair';
      }

      console.log('Derived service type:', serviceType, 'Artist specialty:', assignedArtist.specialty);

      if (!serviceType) return;

      if (serviceType === 'makeup' && assignedArtist.specialty === 'hair') {
        console.log('MISMATCH FOUND: Makeup under hair artist');
        mismatches.push({
          clientName: client.name,
          service: 'makeup',
          artistName: assignedArtist.name,
          artistType: 'hairstylist'
        });
      } else if (serviceType === 'hair' && assignedArtist.specialty === 'makeup') {
        console.log('MISMATCH FOUND: Hair under makeup artist');
        mismatches.push({
          clientName: client.name,
          service: 'hair',
          artistName: assignedArtist.name,
          artistType: 'make-up artist'
        });
      }
    });

    return mismatches;
  }, [clients, artists]);

  // Export functionality
  const exportSchedule = useCallback(async () => {
    console.log('Export validation - Current clients:', clients);
    console.log('Export validation - Current artists:', artists);
    
    // First, validate service assignments
    const mismatches = validateServiceAssignments();
    console.log('Export validation - Mismatches found:', mismatches);
    
    if (mismatches.length > 0) {
      const mismatchMessages = mismatches.map(m => 
        `${m.clientName}'s ${m.service} service is under ${m.artistName}, who is a ${m.artistType}!`
      ).join('\n');
      
      const confirmExport = confirm(`${mismatchMessages}\n\nAre you sure you want to export?`);
      if (!confirmExport) {
        return;
      }
    }

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
  }, [brideName, clients, artists, validateServiceAssignments]);

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
    const incomingSettings = scheduleData.settings || {
      brideHairTwoParts: false,
      brideReadyTime: '16:00',
      weddingDate: '',
      weddingLocation: '',
      timeStartsAt: '06:00',
      timeFinishesAt: '18:00',
    };
    const { touchupDuration, ...sanitizedSettings } = incomingSettings; // drop legacy field
    setSettings(sanitizedSettings);
    setDurations(scheduleData.durations || {
      bride: { makeup: 90, hair: 90, hairPart1: 60, hairPart2: 30 },
      guest: { makeup: 45, hair: 45 },
    });

    // Initialize next guest color index based on number of unique existing guests
    const loadedClients = scheduleData.clients || [];
    const uniqueGuestNames = new Set(
      loadedClients
        .filter(c => c.type === 'guest')
        .map(c => c.name)
    );
    setNextGuestColorIndex(uniqueGuestNames.size);
  }, []);

  const getSavedSchedules = useCallback(async () => {
    const res = await fetch('/api/schedules');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to list schedules');
    }
    return res.json();
  }, []);

  // Delete a saved schedule by ID
  const deleteScheduleById = useCallback(async (scheduleId) => {
    const res = await fetch(`/api/schedules/${scheduleId}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete schedule');
    }
    return res.json().catch(() => ({}));
  }, []);

  // Crop schedule functionality
  const cropSchedule = useCallback(() => {
    // Save current state to history before cropping
    saveToHistory('cropSchedule', 'Cropped schedule time range');
    
    // Find the earliest "Arrival + setup" block
    const arrivalBlocks = clients.filter(c => c.type === 'special' && c.name === 'Arrival + setup' && c.artistIndex !== undefined);
    
    // Find the latest "Final touch-ups" block
    const touchupBlocks = clients.filter(c => c.type === 'special' && c.name === 'Final touch-ups' && c.artistIndex !== undefined);
    
    if (arrivalBlocks.length === 0 || touchupBlocks.length === 0) {
      alert('Cannot crop: Please ensure "Arrival + setup" and "Final touch-ups" blocks are scheduled first.');
      return;
    }
    
    // Calculate earliest arrival time
    let earliestArrivalMinutes = Infinity;
    arrivalBlocks.forEach(block => {
      if (block.startTime) {
        const [hours, minutes] = block.startTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes;
        earliestArrivalMinutes = Math.min(earliestArrivalMinutes, totalMinutes);
      }
    });
    
    // Calculate latest touchup end time
    let latestTouchupEndMinutes = -1;
    touchupBlocks.forEach(block => {
      if (block.endTime) {
        const [hours, minutes] = block.endTime.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes;
        latestTouchupEndMinutes = Math.max(latestTouchupEndMinutes, totalMinutes);
      }
    });
    
    if (earliestArrivalMinutes === Infinity || latestTouchupEndMinutes === -1) {
      alert('Cannot crop: Unable to determine start and end times from scheduled blocks.');
      return;
    }
    
    // Calculate crop times: 15 minutes before arrival, 15 minutes after touchups
    const cropStartMinutes = Math.max(0, earliestArrivalMinutes - 15);
    const cropEndMinutes = latestTouchupEndMinutes + 15;
    
    // Convert back to time strings
    const cropStartHours = Math.floor(cropStartMinutes / 60);
    const cropStartMins = cropStartMinutes % 60;
    const cropStartTime = `${cropStartHours.toString().padStart(2, '0')}:${cropStartMins.toString().padStart(2, '0')}`;
    
    const cropEndHours = Math.floor(cropEndMinutes / 60);
    const cropEndMins = cropEndMinutes % 60;
    const cropEndTime = `${cropEndHours.toString().padStart(2, '0')}:${cropEndMins.toString().padStart(2, '0')}`;
    
    // Update settings with new time range
    setSettings(prev => ({
      ...prev,
      timeStartsAt: cropStartTime,
      timeFinishesAt: cropEndTime
    }));
    
    console.log(`Schedule cropped to: ${cropStartTime} - ${cropEndTime}`);
  }, [clients, saveToHistory]);

  // Click outside handler for modals (excluding settings modal which has its own handler)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target.classList.contains('modal')) {
        // Don't auto-close settings modal - it has its own unsaved changes logic
        if (modals.settings) {
          return;
        }
        closeAllModals();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [modals.settings]);

  const deleteBlock = useCallback((blockToDelete) => {
    saveToHistory('deleteBlock', `Deleted block: ${blockToDelete.name}`);
    const updatedClients = clients.filter(client => client.id !== blockToDelete.id);
    setClients(updatedClients);
    closeEditBlockModal();
  }, [saveToHistory]);

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
        onDeleteSchedule={deleteScheduleById}
        onCropSchedule={cropSchedule}
        onUndo={undoLastChange}
      />
      
      <ScheduleGrid
        timeSlots={timeSlots}
        artists={artists}
        clients={clients}
        onUpdateClients={{
          setClients,
          saveToHistory: saveToHistory
        }}
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
