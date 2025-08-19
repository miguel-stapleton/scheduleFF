"use client";
import { useState, useCallback, useRef, useEffect } from 'react';

export default function ScheduleGrid({ timeSlots, artists, clients, onUpdateClients, onUpdateArtists, durations, onOpenEditBlockModal, onExtendEnd, onExtendStart }) {
  const [draggedClient, setDraggedClient] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [panelHeight, setPanelHeight] = useState(200);
  const gridRef = useRef(null);
  const unscheduledClientsPanelRef = useRef(null);
  // Touch DnD state
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const touchDraggedClientRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const touchLastPosRef = useRef({ x: 0, y: 0 });
  const ignoreNextClickRef = useRef(false);
  const isTouchDevice = typeof window !== 'undefined' && (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));

  // Calculate time slot height (assuming each slot is 15 minutes)
  const timeSlotHeight = 30; // pixels per 15-minute slot

  // Get all artist columns
  const allArtists = [
    ...artists.makeup.map(artist => ({ ...artist, specialty: 'makeup' })),
    ...artists.hair.map(artist => ({ ...artist, specialty: 'hair' }))
  ];

  // Handle drag start
  const handleDragStart = useCallback((e, client) => {
    setDraggedClient(client);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    // Ensure cross-browser drag works (Safari/Firefox sometimes require data)
    try { e.dataTransfer.setData('text/plain', String(client.id)); } catch {}
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  // Handle drag over
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Save to unified history before drag operations
  const saveToHistory = useCallback(() => {
    // This will be passed down from parent component
    if (onUpdateClients.saveToHistory) {
      onUpdateClients.saveToHistory('dragBlock', 'Moved block');
    }
  }, [onUpdateClients]);

  // Handle drop
  const handleDrop = useCallback((e, artistIndex, timeSlotIndex) => {
    e.preventDefault();
    saveToHistory();
    
    if (!draggedClient) return;

    const updatedClients = clients.map(client => {
      if (client.id === draggedClient.id) {
        return {
          ...client,
          artistIndex,
          timeSlotIndex,
          startTime: timeSlots[timeSlotIndex],
          // Mark as manually positioned to prevent auto-placement overrides
          autoPositioned: false,
          // Clear any fixed endTime (e.g., brideReadyTime) so duration drives the block end
          endTime: undefined
        };
      }
      return client;
    });

    onUpdateClients.setClients(updatedClients);
    setDraggedClient(null);
  }, [draggedClient, clients, timeSlots, onUpdateClients]);

  // ----- Touch DnD helpers -----
  const clamp = useCallback((n, min, max) => Math.max(min, Math.min(max, n)), []);

  const findArtistIndexAtPoint = useCallback((x, y) => {
    if (!gridRef.current) return -1;
    const el = document.elementFromPoint(x, y);
    if (!el) return -1;
    const columns = Array.from(gridRef.current.querySelectorAll('.artist-column'));
    return columns.findIndex(col => col.contains(el));
  }, []);

  const findTimeIndexAtPoint = useCallback((x, y, artistIndex) => {
    if (!gridRef.current) return -1;
    const columns = Array.from(gridRef.current.querySelectorAll('.artist-column'));
    const column = columns[artistIndex];
    if (!column) return -1;
    const schedule = column.querySelector('.artist-schedule');
    if (!schedule) return -1;
    const rect = schedule.getBoundingClientRect();
    const yRel = y - rect.top;
    const idx = Math.floor(yRel / timeSlotHeight);
    return clamp(idx, 0, timeSlots.length - 1);
  }, [clamp, timeSlotHeight, timeSlots.length]);

  const startTouchDrag = useCallback((client) => {
    setIsTouchDragging(true);
    touchDraggedClientRef.current = client;
  }, []);

  const handleTouchStart = useCallback((e, client) => {
    if (!isTouchDevice) return;
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    touchStartPosRef.current = { x: t.clientX, y: t.clientY };
    touchLastPosRef.current = { x: t.clientX, y: t.clientY };
    touchDraggedClientRef.current = client;
    // Record offset from touch point to block's top-left so movement is relative
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({ x: t.clientX - rect.left, y: t.clientY - rect.top });
    // Long-press to avoid interfering with scroll/tap
    longPressTimerRef.current = setTimeout(() => {
      startTouchDrag(client);
    }, 200);
  }, [isTouchDevice, startTouchDrag]);

  const handleTouchMove = useCallback((e) => {
    if (!isTouchDevice) return;
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    touchLastPosRef.current = { x: t.clientX, y: t.clientY };
    const dx = Math.abs(t.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(t.clientY - touchStartPosRef.current.y);
    // If user scrolls before long-press, cancel drag start
    if (!isTouchDragging && (dx > 10 || dy > 10)) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      return; // Allow scroll
    }
    if (isTouchDragging) {
      // Prevent page scroll while dragging
      try { e.preventDefault(); } catch {}
    }
  }, [isTouchDevice, isTouchDragging]);

  const handleTouchEnd = useCallback((e) => {
    if (!isTouchDevice) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (!isTouchDragging) {
      // Not a drag; allow the click handler to open edit modal
      touchDraggedClientRef.current = null;
      return;
    }
    // Commit drop
    const { x, y } = touchLastPosRef.current;
    const artistIndex = findArtistIndexAtPoint(x, y);
    if (artistIndex === -1) {
      // No valid drop target
      setIsTouchDragging(false);
      touchDraggedClientRef.current = null;
      return;
    }
    // Adjust Y by the recorded touch-to-block offset so drop is relative
    const timeSlotIndex = findTimeIndexAtPoint(x, y - dragOffset.y, artistIndex);
    const dragged = touchDraggedClientRef.current;
    if (dragged && timeSlotIndex >= 0) {
      const updatedClients = clients.map(client => {
        if (client.id === dragged.id) {
          return {
            ...client,
            artistIndex,
            timeSlotIndex,
            startTime: timeSlots[timeSlotIndex],
            autoPositioned: false,
            endTime: undefined
          };
        }
        return client;
      });
      onUpdateClients.setClients(updatedClients);
      // Avoid triggering click after drag
      ignoreNextClickRef.current = true;
      setTimeout(() => { ignoreNextClickRef.current = false; }, 0);
    }
    setIsTouchDragging(false);
    touchDraggedClientRef.current = null;
  }, [clients, dragOffset.y, findArtistIndexAtPoint, findTimeIndexAtPoint, isTouchDevice, onUpdateClients, timeSlots]);

  // Container-level drag handlers so tall blocks don't block underlying slots
  const handleContainerDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleContainerDrop = useCallback((e, artistIndex) => {
    e.preventDefault();
    if (!draggedClient) return;
    const rect = e.currentTarget.getBoundingClientRect();
    // Use relative offset so the block's top remains offset by the same distance it was grabbed
    let offsetY = e.clientY - rect.top - dragOffset.y;
    if (Number.isNaN(offsetY)) offsetY = 0;
    let index = Math.floor(offsetY / timeSlotHeight);
    // Clamp to valid range
    index = Math.max(0, Math.min(timeSlots.length - 1, index));
    // Reuse existing drop logic
    handleDrop(e, artistIndex, index);
  }, [draggedClient, dragOffset.y, timeSlotHeight, timeSlots, handleDrop]);

  // Get client blocks positioned in the grid
  const getPositionedClients = useCallback(() => {
    return clients.filter(client => 
      client.artistIndex !== undefined && client.timeSlotIndex !== undefined
    );
  }, [clients]);

  // Get unscheduled clients
  const getUnscheduledClients = useCallback(() => {
    return clients.filter(client => {
      const isUnscheduled = (client.artistIndex === undefined || client.timeSlotIndex === undefined) && !client.autoPositioned;
      if (!isUnscheduled) return false;
      // Do not show Arrival blocks in unscheduled if they still have an artist assigned
      if (client.type === 'special' && client.name === 'Arrival + setup' && client.artistIndex !== undefined) {
        return false;
      }
      return true;
    });
  }, [clients]);

  // Calculate duration in slots
  const getDurationInSlots = useCallback((client) => {
    const duration = client.duration || durations[client.type]?.[client.service] || 45;
    return Math.ceil(duration / 15);
  }, [durations]);

  const getTimeRange = useCallback((client) => {
    if (client.timeSlotIndex === undefined) {
      // Unscheduled block - show duration
      const duration = client.duration || durations[client.type]?.[client.service] || 45;
      return `${duration}min`;
    }
    
    // Scheduled block - show time range
    const startTime = timeSlots[client.timeSlotIndex];
    const duration = client.duration || durations[client.type]?.[client.service] || 45;
    
    if (!startTime) {
      return `${duration}min`;
    }
    
    // Calculate end time
    const [startHour, startMinute] = startTime.split(':').map(Number);
    
    if (isNaN(startHour) || isNaN(startMinute)) {
      return `${duration}min`;
    }
    
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = startTotalMinutes + duration;
    const endHour = Math.floor(endTotalMinutes / 60);
    const endMinute = endTotalMinutes % 60;
    
    // Format times
    const formatTime = (hour, minute) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      let displayHour = hour;
      if (hour > 12) {
        displayHour = hour - 12;
      } else if (hour === 0) {
        displayHour = 12;
      }
      return `${displayHour}:${minute.toString().padStart(2, '0')}${period}`;
    };
    
    return `${formatTime(startHour, startMinute)}-${formatTime(endHour, endMinute)}`;
  }, [durations, timeSlots]);


  const handleResizeStart = useCallback((e) => {
    console.log('Drag started');
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPanel(true);
    setDragOffset({ y: e.clientY });
  }, []);

  const handleResize = useCallback((e) => {
    if (isDraggingPanel) {
      console.log('Dragging, current height:', panelHeight);
      e.preventDefault();
      const deltaY = e.clientY - dragOffset.y;
      const newHeight = Math.max(100, Math.min(400, panelHeight + deltaY));
      setPanelHeight(newHeight);
      setDragOffset({ y: e.clientY });
    }
  }, [isDraggingPanel, dragOffset, panelHeight]);

  const handleResizeEnd = useCallback(() => {
    setIsDraggingPanel(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleResizeEnd);
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleResize, handleResizeEnd]);

  // Auto-position final touch-ups blocks
  useEffect(() => {
    const autoPositionedClients = clients.filter(client => client.autoPositioned && client.artistIndex === undefined);
    console.log('Auto-positioned clients needing placement:', autoPositionedClients);
    console.log('Available time slots:', timeSlots);
    console.log('Available artists:', allArtists);
    
    if (autoPositionedClients.length === 0 || allArtists.length === 0) return;

    const updatedClients = [...clients];
    let hasChanges = false;

    autoPositionedClients.forEach(client => {
      if (client.startTime) {
        console.log('Processing auto-positioned client:', client);
        console.log('Looking for time slot:', client.startTime);
        
        // Find the time slot index for the start time
        const timeSlotIndex = timeSlots.findIndex(slot => {
          console.log('Comparing slot:', slot, 'with startTime:', client.startTime);
          return slot === client.startTime;
        });
        console.log('Time slot index for', client.startTime, ':', timeSlotIndex);
        
        if (timeSlotIndex !== -1) {
          // Try to find an available artist slot
          for (let artistIndex = 0; artistIndex < allArtists.length; artistIndex++) {
            const artist = allArtists[artistIndex];
            console.log('Checking artist:', artist);
            if (artist.specialty === 'makeup' || artist.specialty === 'hair') {
              // Check if this slot is available
              const isSlotTaken = updatedClients.some(c => 
                c.artistIndex === artistIndex && 
                c.timeSlotIndex === timeSlotIndex &&
                c.id !== client.id
              );
              
              console.log('Slot taken check for artist', artistIndex, 'at time', timeSlotIndex, ':', isSlotTaken);
              
              if (!isSlotTaken) {
                console.log('Auto-positioning client to artist', artistIndex, 'at time slot', timeSlotIndex);
                const clientIndex = updatedClients.findIndex(c => c.id === client.id);
                if (clientIndex !== -1) {
                  updatedClients[clientIndex] = {
                    ...client,
                    artistIndex: artistIndex,
                    timeSlotIndex: timeSlotIndex
                  };
                  hasChanges = true;
                  break; // Found a slot, move to next client
                }
              }
            }
          }
        } else {
          console.log('Time slot not found! Available slots:', timeSlots);
        }
      }
    });

    if (hasChanges) {
      console.log('Updating clients with auto-positioned blocks');
      onUpdateClients.setClients(updatedClients);
    }
  }, [clients, timeSlots, artists, onUpdateClients]);

  return (
    <div className="schedule-container">
      {/* Time Column */}
      <div className="time-column">
        <div className="time-header" style={{ position: 'relative' }}>
          <img src="/images/clock.png" alt="Clock" />
          <button
            type="button"
            onClick={() => onExtendStart && onExtendStart(15)}
            title="Extend start time earlier by 15 minutes"
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 28,
              height: 28,
              borderRadius: 14,
              border: '1px solid #ccc',
              background: '#f8f8f8',
              cursor: 'pointer',
              lineHeight: '26px',
              textAlign: 'center',
              fontWeight: 600
            }}
          >
            +
          </button>
        </div>
        <div className="time-slots">
          {timeSlots.map((time, index) => (
            <div key={index} className="time-slot" style={{ height: timeSlotHeight }}>
              {time}
            </div>
          ))}
        </div>
        <div style={{ padding: '4px 8px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => onExtendEnd && onExtendEnd(15)}
            title="Extend end time by 15 minutes"
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              border: '1px solid #ccc',
              background: '#f8f8f8',
              cursor: 'pointer',
              lineHeight: '26px',
              textAlign: 'center',
              fontWeight: 600
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Artists Container */}
      <div className="artists-container" ref={gridRef}>
        {allArtists.map((artist, artistIndex) => (
          <div key={`${artist.specialty}-${artistIndex}`} className="artist-column" style={{ flex: '1 1 0', minWidth: 0 }}>
            <div className={`artist-header ${artist.specialty}`}>
              <input
                type="text"
                value={artist.name}
                placeholder={artist.specialty === 'makeup' ? 'Make-up Artist' : 'Hairstylist'}
                onChange={(e) => {
                  const updatedArtists = { ...artists };
                  const specialtyIndex = artist.specialty === 'makeup' ? 
                    artistIndex : 
                    artistIndex - artists.makeup.length;
                  
                  updatedArtists[artist.specialty] = [...updatedArtists[artist.specialty]];
                  updatedArtists[artist.specialty][specialtyIndex] = { ...artist, name: e.target.value };
                  onUpdateArtists(updatedArtists);
                }}
                onBlur={(e) => {
                  if (!e.target.value.trim()) {
                    const defaultName = artist.specialty === 'makeup' ? 'Make-up Artist' : 'Hairstylist';
                    const updatedArtists = { ...artists };
                    const specialtyIndex = artist.specialty === 'makeup' ? 
                      artistIndex : 
                      artistIndex - artists.makeup.length;
                    
                    updatedArtists[artist.specialty] = [...updatedArtists[artist.specialty]];
                    updatedArtists[artist.specialty][specialtyIndex] = { ...artist, name: defaultName };
                    onUpdateArtists(updatedArtists);
                  }
                }}
              />
            </div>
            
            <div
              className="artist-schedule"
              onDragOver={handleContainerDragOver}
              onDrop={(e) => handleContainerDrop(e, artistIndex)}
            >
              {timeSlots.map((time, timeSlotIndex) => (
                <div
                  key={timeSlotIndex}
                  className="schedule-slot"
                  style={{ height: timeSlotHeight }}
                >
                  {/* Render client blocks that start at this time slot */}
                  {getPositionedClients()
                    .filter(client =>
                      client.artistIndex === artistIndex &&
                      client.timeSlotIndex === timeSlotIndex
                    )
                    .map(client => {
                      const durationSlots = getDurationInSlots(client);
                      return (
                        <div
                          key={client.id}
                          className={`client-block ${client.type} ${durationSlots <= 1 ? 'small' : durationSlots <= 2 ? 'medium' : ''}`}
                          style={{
                            backgroundColor: client.color,
                            height: durationSlots * timeSlotHeight - 2,
                            position: 'absolute',
                            width: 'calc(100% - 4px)',
                            margin: '1px 2px',
                            zIndex: 10
                          }}
                          draggable
                          onDragStart={(e) => handleDragStart(e, client)}
                          onTouchStart={(e) => handleTouchStart(e, client)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                          onDragOver={(e) => { e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch {} }}
                          onClick={(e) => { if (ignoreNextClickRef.current) { e.preventDefault(); e.stopPropagation(); return; } onOpenEditBlockModal(client); }}
                          title={`${client.name} - ${client.service} (${client.duration || durations[client.type]?.[client.service] || 45} min)\nClick to edit`}
                        >
                          {client.type === 'special' ? (
                            <div className="client-inline">
                              <div className="client-name">{client.name}</div>
                              <div className="client-time-range">{getTimeRange(client)}</div>
                            </div>
                          ) : (
                            <>
                              <div className="client-title">
                                <div className="client-name">{client.name}</div>
                                <div className="client-service">{client.service}</div>
                              </div>
                              <div className="client-time-range">{getTimeRange(client)}</div>
                            </>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Unscheduled Clients */}
      {getUnscheduledClients().length > 0 && (
        <div 
          className="unscheduled-clients" 
          ref={unscheduledClientsPanelRef} 
          style={{ height: `${panelHeight}px` }}
        >
          <div 
            className="resize-handle" 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              height: '20px', 
              cursor: 'ns-resize',
              background: 'rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 101
            }} 
            onMouseDown={handleResizeStart}
          >
            <div style={{
              width: '60px',
              height: '6px',
              background: '#666',
              borderRadius: '3px'
            }} />
          </div>
          <h3 style={{ marginTop: '25px' }}>Unscheduled Clients</h3>
          <div className="client-list">
            {getUnscheduledClients().map(client => (
              <div
                key={client.id}
                className={`client-block ${client.type} unscheduled`}
                style={{ backgroundColor: client.color }}
                draggable
                onDragStart={(e) => handleDragStart(e, client)}
                onTouchStart={(e) => handleTouchStart(e, client)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={(e) => { if (ignoreNextClickRef.current) { e.preventDefault(); e.stopPropagation(); return; } onOpenEditBlockModal(client); }}
                title={`${client.name} - ${client.service} (${client.duration || durations[client.type]?.[client.service] || 45} min)\nClick to edit or drag to schedule`}
              >
                <div className="client-info">
                  <div className="client-name">{client.name}</div>
                  <div className="client-service">{client.service}</div>
                  <div className="client-duration">
                    {client.duration || durations[client.type]?.[client.service] || 45}min
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
