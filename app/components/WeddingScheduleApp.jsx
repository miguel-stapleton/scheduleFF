"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

const Header = dynamic(() => import('./Header'), { ssr: false });
const ScheduleGrid = dynamic(() => import('./ScheduleGrid'), { ssr: false });
const GuestModal = dynamic(() => import('./GuestModal'), { ssr: false });
const ArtistModal = dynamic(() => import('./ArtistModal'), { ssr: false });
const SettingsModal = dynamic(() => import('./SettingsModal'), { ssr: false });
const EditBlockModal = dynamic(() => import('./EditBlockModal'), { ssr: false });
const SaveScheduleModal = dynamic(() => import('./SaveScheduleModal'), { ssr: false });
const SavedSchedulesModal = dynamic(() => import('./SavedSchedulesModal'), { ssr: false });

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
  // Flag to suppress remap when restoring a snapshot (e.g., undo)
  const isRestoringRef = useRef(false);
  
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
    editBlock: false,
    saveSchedule: false,
    loadSchedules: false,
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
      
      // Restore the complete previous state without triggering remap side-effects
      isRestoringRef.current = true;
      // Set timeSlots directly for the restored settings to match client indices
      const restoredSlots = generateTimeSlots(
        previousState.settings?.timeStartsAt || '06:00',
        previousState.settings?.timeFinishesAt || '18:00'
      );
      setTimeSlots(restoredSlots);
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

      // If we are restoring a snapshot (undo/load), just set slots and skip remap
      if (isRestoringRef.current) {
        setTimeSlots(newTimeSlots);
        isRestoringRef.current = false;
        return;
      }

      // If only extending the end, skip remap entirely to avoid churn.
      if (
        timeSlots.length > 0 &&
        newTimeSlots.length >= timeSlots.length &&
        newTimeSlots[0] === timeSlots[0] &&
        newTimeSlots.slice(0, timeSlots.length).every((t, i) => t === timeSlots[i])
      ) {
        setTimeSlots(newTimeSlots);
        return;
      }

      // Compute deltaSlots between new and old starts; use it to shift indices.
      const toMin = (s) => {
        const [h, m] = (s || '00:00').split(':').map(Number);
        return (h * 60) + m;
      };
      const oldFirst = timeSlots[0];
      const newFirst = newTimeSlots[0];

      // If we have no prior slots, just set and bail.
      if (!oldFirst) {
        setTimeSlots(newTimeSlots);
        return;
      }

      const deltaSlots = Math.round((toMin(newFirst) - toMin(oldFirst)) / 15);

      // Shift all scheduled clients by -deltaSlots to preserve absolute time.
      setClients(prevClients => prevClients.map(client => {
        if (client.artistIndex === undefined || client.timeSlotIndex === undefined) return client;
        const newIdx = Math.max(0, Math.min(newTimeSlots.length - 1, client.timeSlotIndex - deltaSlots));
        return { ...client, timeSlotIndex: newIdx, startTime: newTimeSlots[newIdx] };
      }));

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
    setModals({ guest: false, artist: false, settings: false, editBlock: false, saveSchedule: false, loadSchedules: false });
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

  // Add multiple guests (comma-separated names), each with makeup and hair
  const addMultipleGuests = useCallback((namesString) => {
    const raw = namesString || '';
    const names = raw.split(',').map(n => n.trim()).filter(Boolean);
    if (names.length === 0) return;

    saveToHistory('addMultipleGuests', `Added ${names.length} guests`);

    const baseId = typeof window !== 'undefined' ? Date.now() : 1000000;
    const newBlocks = [];
    names.forEach((name, idx) => {
      const color = GUEST_COLORS[(nextGuestColorIndex + idx) % GUEST_COLORS.length];
      newBlocks.push({
        id: `${baseId + idx}-makeup`,
        name,
        service: 'makeup',
        type: 'guest',
        color,
        duration: durations.guest.makeup
      });
      newBlocks.push({
        id: `${baseId + idx}-hair`,
        name,
        service: 'hair',
        type: 'guest',
        color,
        duration: durations.guest.hair
      });
    });

    setClients(prev => [...prev, ...newBlocks]);
    setNextGuestColorIndex(prev => prev + names.length);
    closeModal('guest');
  }, [durations, nextGuestColorIndex, saveToHistory]);

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

  // Delete artist management
  const deleteArtist = useCallback((specialty, specialtyIndex) => {
    // Prevent deleting the last artist in a specialty
    if (!artists?.[specialty] || artists[specialty].length <= 1) {
      alert(`You must have at least one ${specialty === 'makeup' ? 'make-up artist' : 'hairstylist'}.`);
      return;
    }

    const artistName = artists[specialty][specialtyIndex]?.name || (specialty === 'makeup' ? 'Make-up Artist' : 'Hairstylist');
    const confirmed = confirm(`Delete ${artistName}?\n\nAny scheduled blocks assigned to this artist will be unscheduled.`);
    if (!confirmed) return;

    saveToHistory('deleteArtist', `Deleted ${specialty} artist: ${artistName}`);

    // Compute the global index in the flattened allArtists array
    const removedGlobalIndex = specialty === 'makeup'
      ? specialtyIndex
      : artists.makeup.length + specialtyIndex;

    // Remove the artist from the list
    setArtists(prev => {
      const next = { ...prev };
      next[specialty] = prev[specialty].filter((_, idx) => idx !== specialtyIndex);
      return next;
    });

    // Remap clients: unschedule blocks assigned to removed artist; shift indices after it
    setClients(prevClients => prevClients.map(c => {
      if (c.artistIndex === undefined) return c;
      if (c.artistIndex === removedGlobalIndex) {
        return { ...c, artistIndex: undefined, timeSlotIndex: undefined, startTime: undefined, endTime: undefined, autoPositioned: false };
      }
      if (c.artistIndex > removedGlobalIndex) {
        return { ...c, artistIndex: c.artistIndex - 1 };
      }
      return c;
    }));
  }, [artists, saveToHistory]);

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
        name: name,
        service: 'hair-part1',
        type: 'bride',
        color: '#ffae00',
        duration: durations.bride.hairPart1 || 60
      });
      brideBlocks.push({
        id: `${brideId}-hair-part2`,
        name: name,
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
          ? { ...client, name: brideNameToUse }
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

  // Manually extend the visible end time by one 15-minute slot
  const extendVisibleEnd = useCallback((incrementMinutes = 15) => {
    // Save to history before changing time range
    saveToHistory('extendEnd', `Extended end time by +${incrementMinutes} minutes`);

    const toMin = (s) => {
      const [h, m] = (s || '00:00').split(':').map(Number);
      return (h * 60) + m;
    };
    const toTime = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    setSettings(prev => {
      const currentEnd = toMin(prev.timeFinishesAt || '18:00');
      const added = currentEnd + incrementMinutes;
      // Snap to the next 15-min boundary so a single click always adds a slot
      const snapped = Math.max(0, Math.ceil(added / 15) * 15);
      return { ...prev, timeFinishesAt: toTime(snapped) };
    });
  }, [saveToHistory]);

  // Manually extend the visible start time earlier by one 15-minute slot
  const extendVisibleStart = useCallback((incrementMinutes = 15) => {
    // Save to history before changing time range
    saveToHistory('extendStart', `Extended start time earlier by -${incrementMinutes} minutes`);

    const toMin = (s) => {
      const [h, m] = (s || '00:00').split(':').map(Number);
      return (h * 60) + m;
    };
    const toTime = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    setSettings(prev => {
      const currentStart = toMin(prev.timeStartsAt || '06:00');
      const subtracted = Math.max(0, currentStart - incrementMinutes);
      // Snap down to the previous 15-min boundary
      const snapped = Math.floor(subtracted / 15) * 15;
      return { ...prev, timeStartsAt: toTime(snapped) };
    });
  }, [saveToHistory]);

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

  const updateScheduleById = useCallback(async (scheduleId, scheduleName) => {
    const scheduleData = {
      clients,
      artists,
      settings,
      durations,
      brideName,
    };
    const res = await fetch(`/api/schedules/${scheduleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: scheduleName, data: scheduleData }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update schedule');
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
    // Normalize clients (coerce legacy fields to numbers)
    const normalizedClients = (scheduleData.clients || []).map((c) => {
      const parsedDuration = typeof c.duration === 'string' ? parseInt(c.duration, 10) : c.duration;
      const duration = Number.isFinite(parsedDuration) ? parsedDuration : c.duration;
      const artistIndex = typeof c.artistIndex === 'string' ? parseInt(c.artistIndex, 10) : c.artistIndex;
      const timeSlotIndex = typeof c.timeSlotIndex === 'string' ? parseInt(c.timeSlotIndex, 10) : c.timeSlotIndex;
      return { ...c, duration, artistIndex, timeSlotIndex };
    });
    setClients(normalizedClients);
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
    const defaultDurations = {
      bride: { makeup: 90, hair: 90, hairPart1: 60, hairPart2: 30 },
      guest: { makeup: 45, hair: 45 },
    };
    const incomingDurations = scheduleData.durations || defaultDurations;
    const normNum = (v, d) => {
      const n = typeof v === 'string' ? parseInt(v, 10) : v;
      return Number.isFinite(n) ? n : d;
    };
    const normalizedDurations = {
      bride: {
        makeup: normNum(incomingDurations?.bride?.makeup, defaultDurations.bride.makeup),
        hair: normNum(incomingDurations?.bride?.hair, defaultDurations.bride.hair),
        hairPart1: normNum(incomingDurations?.bride?.hairPart1, defaultDurations.bride.hairPart1),
        hairPart2: normNum(incomingDurations?.bride?.hairPart2, defaultDurations.bride.hairPart2),
      },
      guest: {
        makeup: normNum(incomingDurations?.guest?.makeup, defaultDurations.guest.makeup),
        hair: normNum(incomingDurations?.guest?.hair, defaultDurations.guest.hair),
      }
    };
    setDurations(normalizedDurations);

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
    
    // Crop is independent of brideReadyTime and touch-ups. We don't require
    // specific special blocks to exist for cropping.
    
    // Helpers to resolve minutes from block fields with fallbacks for legacy data
    const resolveStartMinutes = (block) => {
      if (block.startTime) {
        const [h, m] = block.startTime.split(':').map(Number);
        return h * 60 + m;
      }
      if (block.timeSlotIndex !== undefined && timeSlots[block.timeSlotIndex]) {
        const [h, m] = timeSlots[block.timeSlotIndex].split(':').map(Number);
        return h * 60 + m;
      }
      return undefined;
    };

    const resolveEndMinutes = (block) => {
      if (block.endTime) {
        const [h, m] = block.endTime.split(':').map(Number);
        return h * 60 + m;
      }
      const start = resolveStartMinutes(block);
      if (start !== undefined) {
        const dur = typeof block.duration === 'number' ? block.duration : parseInt(block.duration, 10);
        if (Number.isFinite(dur)) {
          return start + dur;
        }
      }
      return undefined;
    };

    // Collect scheduled blocks (assigned to artists)
    const scheduledBlocks = clients.filter(c => c.artistIndex !== undefined);
    if (scheduledBlocks.length === 0) {
      alert('Cannot crop: No scheduled blocks found.');
      return;
    }

    // Find earliest start and latest end across ALL scheduled blocks
    let earliestStartMinutes = Infinity;
    let latestEndMinutes = -1;
    scheduledBlocks.forEach(block => {
      const start = resolveStartMinutes(block);
      if (start !== undefined) {
        earliestStartMinutes = Math.min(earliestStartMinutes, start);
      }
      const end = resolveEndMinutes(block);
      if (end !== undefined) {
        latestEndMinutes = Math.max(latestEndMinutes, end);
      } else if (start !== undefined) {
        // If end cannot be resolved, at least include the start
        latestEndMinutes = Math.max(latestEndMinutes, start);
      }
    });

    if (earliestStartMinutes === Infinity || latestEndMinutes === -1) {
      alert('Cannot crop: Unable to determine start/end times from scheduled blocks.');
      return;
    }

    // Compute crop range per simplified rule
    const cropStartMinutes = Math.max(0, earliestStartMinutes - 15);
    const cropEndMinutes = latestEndMinutes + 15;
    
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
    
    console.log(`[Crop] start=${cropStartTime} end=${cropEndTime} (first-15 / last+15)`);
  }, [clients, timeSlots, saveToHistory]);

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
  }, [clients, saveToHistory]);

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
        onOpenSaveModal={() => openModal('saveSchedule')}
        onOpenLoadModal={() => openModal('loadSchedules')}
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
        onDeleteArtist={deleteArtist}
        durations={durations}
        onOpenEditBlockModal={(block) => { setEditingBlock(block); openModal('editBlock'); }}
        onExtendEnd={extendVisibleEnd}
        onExtendStart={extendVisibleStart}
      />

      {modals.guest && (
        <GuestModal
          onClose={() => closeModal('guest')}
          onAddGuest={addGuest}
          onAddMultipleGuests={addMultipleGuests}
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
          onClose={() => { setEditingBlock(null); closeModal('editBlock'); }}
          onSave={(editedBlock) => { const updated = clients.map(c => c.id === editedBlock.id ? editedBlock : c); setClients(updated); closeModal('editBlock'); }}
          onDelete={(block) => { saveToHistory('deleteBlock', `Deleted block: ${block.name}`); setClients(prev => prev.filter(c => c.id !== block.id)); closeModal('editBlock'); }}
          onDuplicate={(block) => { saveToHistory('duplicateBlock', `Duplicated block: ${block.name}`); const baseId = typeof window !== 'undefined' ? Date.now() : Math.floor(Math.random() * 1e9); const suffix = block.service ? `-${block.service}` : ''; const newBlock = { ...block, id: `${baseId}${suffix}`, artistIndex: undefined, timeSlotIndex: undefined, startTime: undefined, endTime: undefined, autoPositioned: false }; setClients(prev => [...prev, newBlock]); closeModal('editBlock'); }}
        />
      )}

      {modals.saveSchedule && (
        <SaveScheduleModal
          defaultName={brideName ? `${brideName} schedule` : 'Untitled Schedule'}
          onClose={() => closeModal('saveSchedule')}
          getSavedSchedules={getSavedSchedules}
          onSaveNew={async (name) => { const r = await saveSchedule(name); alert('Schedule saved.'); return r; }}
          onOverwrite={async (id, name) => { const r = await updateScheduleById(id, name); alert('Schedule overwritten.'); return r; }}
        />
      )}

      {modals.loadSchedules && (
        <SavedSchedulesModal
          onClose={() => closeModal('loadSchedules')}
          getSavedSchedules={getSavedSchedules}
          onLoadSchedule={async (id) => { await loadScheduleById(id); closeModal('loadSchedules'); }}
          onDeleteSchedule={deleteScheduleById}
        />
      )}
    </div>
  );
}
