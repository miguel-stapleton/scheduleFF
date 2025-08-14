class WeddingScheduleApp {
    constructor() {
        this.artists = {
            makeup: [{ name: 'Make-up Artist', editable: true }],
            hair: [{ name: 'Hairstylist', editable: true }]
        };
        this.clients = [];
        this.timeSlots = this.generateTimeSlots();
        this.draggedElement = null;
        this.durations = {
            bride: { makeup: 90, hair: 90 },
            guest: { makeup: 45, hair: 45 }
        };
        
        this.init();
    }

    init() {
        this.renderTimeSlots();
        this.renderArtists();
        this.populateExistingSchedules();
        this.populateLoadSchedules();
        
        // Apply custom icons to save/load buttons first
        this.setScheduleIcons('images/savelogo.png', 'images/openlogo.png');
        
        // Setup event listeners after icons are set
        this.setupEventListeners();
    }

    // Helper function to replace button text with custom icons
    setButtonIcon(buttonId, iconPath) {
        const button = document.getElementById(buttonId);
        if (button && iconPath) {
            // Find the span with btn-text class and replace its content
            const textSpan = button.querySelector('.btn-text');
            if (textSpan) {
                const img = document.createElement('img');
                img.src = iconPath;
                img.alt = button.title || textSpan.textContent;
                img.style.width = '16px';
                img.style.height = '16px';
                
                // Replace text content with icon
                textSpan.innerHTML = '';
                textSpan.appendChild(img);
                button.classList.add('has-icon');
            }
        }
    }

    // Method to set both save and load icons at once
    setScheduleIcons(saveIconPath, loadIconPath) {
        this.setButtonIcon('save-btn', saveIconPath);
        this.setButtonIcon('load-btn', loadIconPath);
    }

    generateTimeSlots() {
        const slots = [];
        for (let hour = 6; hour <= 18; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const time = new Date();
                time.setHours(hour, minute, 0, 0);
                slots.push(time.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                }));
            }
        }
        return slots;
    }

    setupEventListeners() {
        // Modal controls
        const clientModal = document.getElementById('add-client-modal');
        const artistModal = document.getElementById('artist-modal');
        const settingsModal = document.getElementById('settings-modal');
        const addClientBtn = document.getElementById('add-client-btn');
        const addArtistBtn = document.getElementById('add-artist-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const exportBtn = document.getElementById('export-btn');
        const closeBtns = document.querySelectorAll('.close');

        addClientBtn.addEventListener('click', () => {
            clientModal.style.display = 'block';
            this.updateColorSwatch(); // Update swatch when modal opens
        });
        
        // Color picker change listener
        document.getElementById('client-color').addEventListener('input', () => {
            this.updateColorSwatch();
        });
        
        // Add Guest button in modal
        document.getElementById('add-guest-btn').addEventListener('click', () => {
            this.addClient();
        });
        
        // Bride hair two-parts checkbox
        document.getElementById('settings-bride-hair-two-parts').addEventListener('change', (e) => {
            this.toggleBrideHairTwoParts(e.target.checked);
        });

        // Bride ready time input - automatically reposition touchup blocks when changed
        document.getElementById('settings-bride-ready-time').addEventListener('input', () => {
            this.positionTouchupBlocks();
        });

        addArtistBtn.addEventListener('click', () => {
            artistModal.style.display = 'block';
        });
        
        if (settingsBtn && settingsModal) {
            settingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Settings button clicked!');
                try {
                    this.loadSettingsToModal();
                    settingsModal.style.display = 'block';
                    console.log('Settings modal display set to block');
                } catch (error) {
                    console.error('Error opening settings modal:', error);
                }
            });
            console.log('Settings button event listener added successfully');
        } else {
            console.error('Settings button or modal not found!', { settingsBtn, settingsModal });
        }

        exportBtn.addEventListener('click', () => {
            this.exportSchedule();
        });

        // Save and Load buttons
        const saveBtn = document.getElementById('save-btn');
        const loadBtn = document.getElementById('load-btn');
        const saveModal = document.getElementById('save-modal');
        const loadModal = document.getElementById('load-modal');

        console.log('Save/Load button elements:', { saveBtn, loadBtn, saveModal, loadModal });

        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                console.log('Save button clicked!');
                e.preventDefault();
                this.openSaveModal();
            });
            console.log('Save button event listener added');
        } else {
            console.error('Save button not found!');
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', (e) => {
                console.log('Load button clicked!');
                e.preventDefault();
                this.openLoadModal();
            });
            console.log('Load button event listener added');
        } else {
            console.error('Load button not found!');
        }

        // Save schedule button in modal
        document.getElementById('save-schedule-btn').addEventListener('click', () => {
            this.saveSchedule();
        });

        // Close load modal button
        document.getElementById('close-load-modal').addEventListener('click', () => {
            loadModal.style.display = 'none';
        });

        closeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Form submissions
        document.getElementById('client-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addClient();
        });

        document.getElementById('artist-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addArtist();
        });
        
        document.getElementById('save-settings-btn').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                this.saveSettings();
            } catch (error) {
                console.error('Error while saving settings:', error);
            } finally {
                const modal = document.getElementById('settings-modal');
                if (modal) modal.style.display = 'none';
            }
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    renderTimeSlots() {
        const timeSlotsContainer = document.getElementById('time-slots');
        timeSlotsContainer.innerHTML = '';
        
        this.timeSlots.forEach(time => {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            slot.textContent = time;
            timeSlotsContainer.appendChild(slot);
        });
    }

    renderArtists() {
        const artistsContainer = document.getElementById('artists-container');
        
        // Save existing client blocks before clearing
        const existingBlocks = [];
        document.querySelectorAll('.client-block').forEach(block => {
            const timeBlock = block.parentElement;
            existingBlocks.push({
                block: block.cloneNode(true),
                specialty: timeBlock.dataset.specialty,
                artistIndex: parseInt(timeBlock.dataset.artistIndex),
                timeIndex: parseInt(timeBlock.dataset.timeIndex)
            });
        });
        
        artistsContainer.innerHTML = '';
        
        let columnIndex = 0;
        
        // Render makeup artists first
        this.artists.makeup.forEach((artist, index) => {
            const column = this.createArtistColumn(artist, 'makeup', columnIndex, index);
            artistsContainer.appendChild(column);
            columnIndex++;
        });
        
        // Then render hair artists
        this.artists.hair.forEach((artist, index) => {
            const column = this.createArtistColumn(artist, 'hair', columnIndex, index);
            artistsContainer.appendChild(column);
            columnIndex++;
        });
        
        // Restore client blocks to their positions
        existingBlocks.forEach(({ block, specialty, artistIndex, timeIndex }) => {
            const targetTimeBlock = document.querySelector(
                `.time-block[data-specialty="${specialty}"][data-artist-index="${artistIndex}"][data-time-index="${timeIndex}"]`
            );
            if (targetTimeBlock) {
                targetTimeBlock.appendChild(block);
                this.setupBlockDragEvents(block);
            }
        });
    }
    
    createArtistColumn(artist, specialty, columnIndex, artistIndex) {
        const column = document.createElement('div');
        column.className = 'artist-column';
        column.dataset.specialty = specialty;
        column.dataset.artistIndex = artistIndex;
        column.dataset.columnIndex = columnIndex;

        const header = document.createElement('div');
        header.className = `artist-header ${specialty}`;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = artist.name;
        input.placeholder = specialty === 'makeup' ? 'Make-up Artist' : 'Hairstylist';
        input.addEventListener('change', (e) => {
            this.artists[specialty][artistIndex].name = e.target.value;
        });
        input.addEventListener('blur', (e) => {
            if (!e.target.value.trim()) {
                e.target.value = specialty === 'makeup' ? 'Make-up Artist' : 'Hairstylist';
                this.artists[specialty][artistIndex].name = e.target.value;
            }
        });
        
        header.appendChild(input);

        const schedule = document.createElement('div');
        schedule.className = 'artist-schedule';

        this.timeSlots.forEach((time, timeIndex) => {
            const timeBlock = document.createElement('div');
            timeBlock.className = 'time-block';
            timeBlock.dataset.timeIndex = timeIndex;
            timeBlock.dataset.specialty = specialty;
            timeBlock.dataset.artistIndex = artistIndex;
            timeBlock.dataset.columnIndex = columnIndex;
            
            // Set up drop events for drag-and-drop functionality
            this.setupDropEvents(timeBlock);
            
            schedule.appendChild(timeBlock);
        });

        column.appendChild(header);
        column.appendChild(schedule);
        return column;
    }

    updateScheduleTitle() {
        const brideName = document.getElementById('settings-bride-name').value;
        const weddingDate = document.getElementById('settings-wedding-date').value;
        const location = document.getElementById('settings-location').value;
        
        const title = document.getElementById('schedule-title');
        const subtitle = document.getElementById('schedule-subtitle');
        
        const titleText = brideName.trim() ? `${brideName}'s Wedding Schedule` : 'Wedding Day Beauty Schedule';
        title.textContent = titleText;
        document.title = titleText;
        
        let subtitleText = '';
        if (weddingDate) {
            const date = new Date(weddingDate);
            subtitleText += date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
        }
        if (location.trim()) {
            if (subtitleText) subtitleText += '. ';
            subtitleText += `Location: ${location}`;
        }
        
        subtitle.textContent = subtitleText;
    }
    
    updateDurations() {
        this.durations.bride.makeup = parseInt(document.getElementById('settings-bride-makeup-duration').value);
        this.durations.bride.hair = parseInt(document.getElementById('settings-bride-hair-duration').value);
        this.durations.guest.makeup = parseInt(document.getElementById('settings-guest-makeup-duration').value);
        this.durations.guest.hair = parseInt(document.getElementById('settings-guest-hair-duration').value);
        
        // Update existing blocks
        document.querySelectorAll('.client-block').forEach(block => {
            const clientId = block.dataset.clientId;
            const client = this.clients.find(c => c.id == clientId);
            if (client) {
                const duration = this.durations[client.type][client.service];
                
                // Calculate height based on duration (each 15-minute slot is 30px high)
                const timeBlockHeight = 30;
                const durationIn15MinSlots = Math.ceil(duration / 15);
                block.style.height = `${durationIn15MinSlots * timeBlockHeight}px`;
                
                client.duration = duration;
                
                // Update time display
                const timeBlock = block.parentElement;
                if (timeBlock && timeBlock.classList.contains('time-block')) {
                    this.updateBlockTime(block, timeBlock);
                }
            }
        });
    }
    
    updateBlockTime(clientBlock, timeBlock) {
        const timeIndex = parseInt(timeBlock.dataset.timeIndex);
        const clientId = clientBlock.dataset.clientId;
        const client = this.clients.find(c => c.id == clientId);
        
        if (client && timeIndex >= 0) {
            const startTime = this.timeSlots[timeIndex];
            const durationInMinutes = client.duration;
            const durationIn15MinSlots = Math.ceil(durationInMinutes / 15);
            const endTimeIndex = timeIndex + durationIn15MinSlots;
            
            let endTime;
            if (endTimeIndex < this.timeSlots.length) {
                endTime = this.timeSlots[endTimeIndex];
            } else {
                // Calculate end time manually if it goes beyond available slots
                const startTimeObj = this.parseTimeString(startTime);
                const endTimeObj = new Date(startTimeObj.getTime() + (durationInMinutes * 60000));
                endTime = endTimeObj.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                });
            }
            
            const timeDiv = clientBlock.querySelector('.client-time');
            if (timeDiv) {
                timeDiv.textContent = `${this.formatTimeRange(startTime)}-${this.formatTimeRange(endTime)}`;
            }
        }
    }
    
    parseTimeString(timeString) {
        const [time, period] = timeString.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        const date = new Date();
        let hour24 = hours;
        
        if (period === 'PM' && hours !== 12) {
            hour24 += 12;
        } else if (period === 'AM' && hours === 12) {
            hour24 = 0;
        }
        
        date.setHours(hour24, minutes, 0, 0);
        return date;
    }
    
    formatTimeRange(timeString) {
        // Convert "7:00 AM" to "7:00" format for time ranges
        return timeString.replace(/\s(AM|PM)/, '');
    }
    
    loadSettingsToModal() {
        // Load current values into settings modal
        document.getElementById('settings-bride-name').value = document.getElementById('settings-bride-name').value || '';
        document.getElementById('settings-wedding-date').value = document.getElementById('settings-wedding-date').value || '';
        document.getElementById('settings-location').value = document.getElementById('settings-location').value || '';
        document.getElementById('settings-bride-ready-time').value = document.getElementById('settings-bride-ready-time').value || '11:00';
        
        // Load duration values
        document.getElementById('settings-bride-makeup-duration').value = this.durations.bride.makeup;
        document.getElementById('settings-bride-hair-duration').value = this.durations.bride.hair;
        document.getElementById('settings-guest-makeup-duration').value = this.durations.guest.makeup;
        document.getElementById('settings-guest-hair-duration').value = this.durations.guest.hair;
        
        // Load checkbox state and trigger toggle
        const checkbox = document.getElementById('settings-bride-hair-two-parts');
        this.toggleBrideHairTwoParts(checkbox.checked);
    }
    
    saveSettings() {
        console.log('=== SAVE SETTINGS CALLED ===');
        
        // Check if bride's name was just added
        const brideName = document.getElementById('settings-bride-name').value.trim();
        const existingBrideBlocks = this.clients.filter(c => c.type === 'bride');
        
        // If bride's name is entered and no bride blocks exist, create them
        if (brideName && existingBrideBlocks.length === 0) {
            this.createBrideBlocks(brideName);
        }
        // If bride blocks exist and name is still there, check if hair setting changed
        else if (brideName && existingBrideBlocks.length > 0) {
            const isTwoParts = document.getElementById('settings-bride-hair-two-parts').checked;
            const hasHairParts = existingBrideBlocks.some(b => b.service === 'hair-part1' || b.service === 'hair-part2');
            
            // If setting changed, recreate bride blocks
            if ((isTwoParts && !hasHairParts) || (!isTwoParts && hasHairParts)) {
                this.removeBrideBlocks();
                this.createBrideBlocks(brideName);
            }
        }
        
        // Update durations
        this.updateDurations();
        
        // Update schedule title
        this.updateScheduleTitle();
        
        // Reposition touchup blocks based on bride ready time
        console.log('About to call positionTouchupBlocks...');
        this.positionTouchupBlocks();
        
        // Close modal
        document.getElementById('settings-modal').style.display = 'none';
    }
    
    removeBrideBlocks() {
        // Remove bride blocks from clients array (including setup and touchup blocks)
        this.clients = this.clients.filter(c => c.type !== 'bride' && c.type !== 'setup' && c.type !== 'touchup');
        
        // Remove bride blocks from DOM
        document.querySelectorAll('.client-block').forEach(block => {
            const clientId = block.dataset.clientId;
            const client = this.clients.find(c => c.id == clientId);
            if (!client) {
                block.remove();
            }
        });
    }

    positionTouchupBlocks() {
        console.log('Positioning touchup blocks...');
        const brideReadyTimeInput = document.getElementById('settings-bride-ready-time');
        console.log('Bride ready time input element:', brideReadyTimeInput);
        const brideReadyTime = brideReadyTimeInput ? brideReadyTimeInput.value : null;
        console.log('Bride ready time value:', brideReadyTime);
        console.log('Input element current value:', brideReadyTimeInput?.value);
        if (!brideReadyTime) {
            console.log('No bride ready time found, exiting...');
            return;
        }

        // Convert bride ready time to minutes from start of day
        const [hours, minutes] = brideReadyTime.split(':').map(Number);
        const brideReadyMinutes = hours * 60 + minutes;
        console.log('Bride ready minutes:', brideReadyMinutes);

        // Find all touchup blocks
        const touchupClients = this.clients.filter(c => c.type === 'touchup');
        console.log('Found touchup clients:', touchupClients.length);
        
        // First, remove all existing touchup blocks from the DOM
        document.querySelectorAll('.client-block').forEach(block => {
            const clientId = block.dataset.clientId;
            const client = this.clients.find(c => c.id == clientId);
            if (client && client.type === 'touchup') {
                console.log('Removing existing touchup block:', client.name);
                block.remove();
            }
        });
        
        touchupClients.forEach(client => {
            // Calculate the start time for the touchup block (15 minutes before ready time)
            const touchupStartMinutes = brideReadyMinutes - 15;
            console.log('Touchup start minutes:', touchupStartMinutes);
            
            // Find the corresponding time slot
            const targetTimeSlot = this.findTimeSlotByMinutes(touchupStartMinutes);
            console.log('Target time slot:', targetTimeSlot);
            if (targetTimeSlot) {
                console.log('Repositioning client to time slot:', client.name, targetTimeSlot);
                this.repositionTouchupBlock(client, targetTimeSlot);
            } else {
                console.log('No matching time slot found for minutes:', touchupStartMinutes);
            }
        });
    }

    findTimeSlotByMinutes(targetMinutes) {
        // Convert target minutes to time string format matching the generated time slots
        const hours = Math.floor(targetMinutes / 60);
        const minutes = targetMinutes % 60;
        
        // Create a Date object to format it the same way as generateTimeSlots()
        const time = new Date();
        time.setHours(hours, minutes, 0, 0);
        const timeString = time.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        console.log('Looking for time slot:', timeString);
        console.log('Available time slots:', this.timeSlots.slice(0, 5), '... (showing first 5)');
        
        // Find the matching time slot
        const foundSlot = this.timeSlots.find(slot => slot === timeString);
        console.log('Found slot:', foundSlot);
        return foundSlot;
    }

    moveClientToTimeSlot(client, timeSlot) {
        console.log('moveClientToTimeSlot called for:', client.name, 'to slot:', timeSlot);
        
        // Find the client block in the DOM
        const clientBlock = document.querySelector(`[data-client-id="${client.id}"]`);
        console.log('Found client block:', clientBlock);
        if (!clientBlock) {
            console.log('No client block found for ID:', client.id);
            return;
        }

        // Determine which artist column this client should be in
        const targetSpecialty = client.specialty || (client.service.includes('hair') ? 'hair' : 'makeup');
        console.log('Target specialty:', targetSpecialty);
        const artistColumns = document.querySelectorAll('.artist-schedule');
        console.log('Found artist columns:', artistColumns.length);
        
        // Find the correct artist column (makeup = first, hair = second)
        const targetColumnIndex = targetSpecialty === 'makeup' ? 0 : 1;
        const targetColumn = artistColumns[targetColumnIndex];
        console.log('Target column index:', targetColumnIndex, 'Target column:', targetColumn);
        
        if (targetColumn) {
            // Find the time block for the target time slot
            const timeIndex = this.timeSlots.indexOf(timeSlot);
            console.log('Time slot index:', timeIndex);
            const timeBlocks = targetColumn.querySelectorAll('.time-block');
            console.log('Time blocks in column:', timeBlocks.length);
            const targetTimeBlock = timeBlocks[timeIndex];
            console.log('Target time block:', targetTimeBlock);
            
            if (targetTimeBlock) {
                // Remove any existing client block in that time slot
                const existingBlock = targetTimeBlock.querySelector('.client-block');
                if (existingBlock && existingBlock !== clientBlock) {
                    console.log('Removing existing block:', existingBlock);
                    existingBlock.remove();
                }
                
                // Move the touchup block to the target time slot
                console.log('Moving block to target time slot');
                targetTimeBlock.appendChild(clientBlock);
                this.updateBlockTime(clientBlock, targetTimeBlock);
                console.log('Block moved successfully');
            } else {
                console.log('No target time block found for index:', timeIndex);
            }
        } else {
            console.log('No target column found');
        }
    }

    repositionTouchupBlock(client, targetTimeSlot) {
        console.log('repositionTouchupBlock called for:', client.name, 'to slot:', targetTimeSlot);
        
        // Determine which artist column this client should be in
        const targetSpecialty = client.specialty || (client.service.includes('hair') ? 'hair' : 'makeup');
        console.log('Target specialty:', targetSpecialty);
        const artistColumns = document.querySelectorAll('.artist-schedule');
        
        // Find the correct artist column (makeup = first, hair = second)
        const targetColumnIndex = targetSpecialty === 'makeup' ? 0 : 1;
        const targetColumn = artistColumns[targetColumnIndex];
        console.log('Target column index:', targetColumnIndex);
        
        if (targetColumn) {
            // Find the time block for the target time slot
            const timeIndex = this.timeSlots.indexOf(targetTimeSlot);
            console.log('Time slot index:', timeIndex);
            const timeBlocks = targetColumn.querySelectorAll('.time-block');
            const targetTimeBlock = timeBlocks[timeIndex];
            console.log('Target time block found:', !!targetTimeBlock);
            
            if (targetTimeBlock) {
                // Remove any existing client block in that time slot
                const existingBlock = targetTimeBlock.querySelector('.client-block');
                if (existingBlock) {
                    console.log('Removing existing block in target slot');
                    existingBlock.remove();
                }
                
                // Create a new block for this touchup client
                const block = document.createElement('div');
                block.className = 'client-block';
                block.draggable = true;
                block.dataset.clientId = client.id;
                block.style.backgroundColor = client.color;
                
                // Calculate height based on duration (15 minutes = 1 slot = 30px)
                const timeBlockHeight = 30;
                const durationIn15MinSlots = Math.ceil(client.duration / 15);
                block.style.height = `${durationIn15MinSlots * timeBlockHeight}px`;
                
                // Create name div (no service abbreviation for touchup blocks)
                const nameDiv = document.createElement('div');
                nameDiv.className = 'client-name';
                nameDiv.textContent = client.name; // "Final Touch-ups"
                
                // Create time div
                const timeDiv = document.createElement('div');
                timeDiv.className = 'client-time';
                
                block.appendChild(nameDiv);
                block.appendChild(timeDiv);
                
                // Add to target time block
                targetTimeBlock.appendChild(block);
                this.updateBlockTime(block, targetTimeBlock);
                this.setupBlockDragEvents(block);
                
                console.log('Touchup block repositioned successfully');
            } else {
                console.log('No target time block found for index:', timeIndex);
            }
        } else {
            console.log('No target column found');
        }
    }
    
    createBrideBlocks(brideName) {
        // Generate a nice color for the bride (gold/champagne)
        const brideColor = '#d4af37';
        const setupColor = '#808080'; // Grey color for arrival + setup
        
        // Create arrival + setup block for makeup artist
        const makeupSetupClient = {
            id: Date.now() + Math.random() + 0.1,
            name: 'Arrival + Setup',
            service: 'setup',
            type: 'setup',
            color: setupColor,
            duration: 15,
            specialty: 'makeup' // Track which artist this is for
        };
        
        // Create makeup block for bride
        const makeupClient = {
            id: Date.now() + Math.random(),
            name: brideName,
            service: 'makeup',
            type: 'bride',
            color: brideColor,
            duration: this.durations.bride.makeup
        };
        
        // Create final touch-ups block for makeup artist
        const makeupTouchupClient = {
            id: Date.now() + Math.random() + 0.2,
            name: 'Final Touch-ups',
            service: 'touchup',
            type: 'touchup',
            color: brideColor,
            duration: 15,
            specialty: 'makeup' // Track which artist this is for
        };
        
        // Add makeup artist blocks to clients array and create visual blocks
        this.clients.push(makeupSetupClient);
        this.clients.push(makeupClient);
        this.clients.push(makeupTouchupClient);
        this.createClientBlock(makeupSetupClient);
        this.createClientBlock(makeupClient);
        this.createClientBlock(makeupTouchupClient);
        
        // Create arrival + setup block for hair artist
        const hairSetupClient = {
            id: Date.now() + Math.random() + 0.3,
            name: 'Arrival + Setup',
            service: 'setup',
            type: 'setup',
            color: setupColor,
            duration: 15,
            specialty: 'hair' // Track which artist this is for
        };
        
        // Check if bride's hair is done in two parts
        const isTwoParts = document.getElementById('settings-bride-hair-two-parts').checked;
        
        // Add hair setup block
        this.clients.push(hairSetupClient);
        this.createClientBlock(hairSetupClient);
        
        if (isTwoParts) {
            // Create two hair blocks for bride
            const hairPart1Client = {
                id: Date.now() + Math.random() + 1,
                name: brideName,
                service: 'hair-part1',
                type: 'bride',
                color: brideColor,
                duration: parseInt(document.getElementById('settings-bride-hair-part1-duration').value) || 60
            };
            
            const hairPart2Client = {
                id: Date.now() + Math.random() + 2,
                name: brideName,
                service: 'hair-part2',
                type: 'bride',
                color: brideColor,
                duration: parseInt(document.getElementById('settings-bride-hair-part2-duration').value) || 30
            };
            
            // Add to clients array and create visual blocks
            this.clients.push(hairPart1Client);
            this.clients.push(hairPart2Client);
            this.createClientBlock(hairPart1Client);
            this.createClientBlock(hairPart2Client);
        } else {
            // Create single hair block for bride
            const hairClient = {
                id: Date.now() + Math.random() + 1,
                name: brideName,
                service: 'hair',
                type: 'bride',
                color: brideColor,
                duration: this.durations.bride.hair
            };
            
            // Add to clients array and create visual block
            this.clients.push(hairClient);
            this.createClientBlock(hairClient);
        }
        
        // Create final touch-ups block for hair artist
        const hairTouchupClient = {
            id: Date.now() + Math.random() + 0.4,
            name: 'Final Touch-ups',
            service: 'touchup',
            type: 'touchup',
            color: brideColor,
            duration: 15,
            specialty: 'hair' // Track which artist this is for
        };
        
        // Add hair touchup block
        this.clients.push(hairTouchupClient);
        this.createClientBlock(hairTouchupClient);
        
        // Automatically position all touchup blocks based on bride ready time
        setTimeout(() => {
            this.positionTouchupBlocks();
        }, 100); // Small delay to ensure DOM is ready
    }

    addClient() {
        const name = document.getElementById('client-name').value;
        const makeupChecked = document.getElementById('makeup').checked;
        const hairChecked = document.getElementById('hair').checked;
        const color = document.getElementById('client-color').value;

        if (!name || (!makeupChecked && !hairChecked)) {
            alert('Please enter a name and select at least one service');
            return;
        }

        const services = [];
        if (makeupChecked) services.push('makeup');
        if (hairChecked) services.push('hair');

        services.forEach(service => {
            const duration = this.durations.guest[service]; // Always use guest durations
            const client = {
                id: Date.now() + Math.random(),
                name,
                service,
                type: 'guest', // Always set as guest
                color,
                duration
            };

            this.clients.push(client);
            this.createClientBlock(client);
        });
        
        // Reset form and close modal
        document.getElementById('client-form').reset();
        document.getElementById('add-client-modal').style.display = 'none';
    }
    
    updateColorSwatch() {
        const colorInput = document.getElementById('client-color');
        const colorSwatch = document.getElementById('color-swatch');
        if (colorInput && colorSwatch) {
            colorSwatch.style.backgroundColor = colorInput.value;
        }
    }
    
    toggleBrideHairTwoParts(isChecked) {
        const singleRow = document.getElementById('bride-hair-single-row');
        const part1Row = document.getElementById('bride-hair-part1-row');
        const part2Row = document.getElementById('bride-hair-part2-row');
        
        if (isChecked) {
            singleRow.style.display = 'none';
            part1Row.style.display = 'block';
            part2Row.style.display = 'block';
        } else {
            singleRow.style.display = 'block';
            part1Row.style.display = 'none';
            part2Row.style.display = 'none';
        }
    }

    addArtist() {
        const name = document.getElementById('artist-name').value;
        const specialty = document.getElementById('artist-specialty').value;

        if (!name || !specialty) {
            alert('Please fill in all required fields');
            return;
        }

        this.artists[specialty].push({ name, editable: true });
        this.renderArtists();
        this.setupDragAndDrop();
        
        // Reset form and close modal
        document.getElementById('artist-form').reset();
        document.getElementById('artist-modal').style.display = 'none';
    }

    createClientBlock(client) {
        const block = document.createElement('div');
        block.className = 'client-block';
        block.draggable = true;
        block.dataset.clientId = client.id;
        block.style.backgroundColor = client.color;
        
        // Calculate height based on duration (each 15-minute slot is 30px high)
        const timeBlockHeight = 30; // Height of each 15-minute time block
        const durationIn15MinSlots = Math.ceil(client.duration / 15);
        block.style.height = `${durationIn15MinSlots * timeBlockHeight}px`;

        let serviceAbbrev;
        if (client.service === 'makeup') {
            serviceAbbrev = '(MU)';
        } else if (client.service === 'hair-part1') {
            serviceAbbrev = '(H-I)';
        } else if (client.service === 'hair-part2') {
            serviceAbbrev = '(H-II)';
        } else {
            serviceAbbrev = '(H)';
        }
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'client-name';
        nameDiv.textContent = `${client.name} ${serviceAbbrev}`;

        const timeDiv = document.createElement('div');
        timeDiv.className = 'client-time';
        timeDiv.textContent = 'Not scheduled';

        block.appendChild(nameDiv);
        block.appendChild(timeDiv);

        // Add to first available artist column temporarily
        const firstColumn = document.querySelector('.artist-schedule');
        if (firstColumn) {
            const firstTimeBlock = firstColumn.querySelector('.time-block');
            firstTimeBlock.appendChild(block);
            this.updateBlockTime(block, firstTimeBlock);
        }

        this.setupBlockDragEvents(block);
    }

    createClientBlockForRestore(client) {
        const block = document.createElement('div');
        block.className = 'client-block';
        block.draggable = true;
        block.dataset.clientId = client.id;
        block.style.backgroundColor = client.color;
        
        // Calculate height based on duration (each 15-minute slot is 30px high)
        const timeBlockHeight = 30; // Height of each 15-minute time block
        const durationIn15MinSlots = Math.ceil(client.duration / 15);
        block.style.height = `${durationIn15MinSlots * timeBlockHeight}px`;

        let serviceAbbrev;
        if (client.service === 'makeup') {
            serviceAbbrev = '(MU)';
        } else if (client.service === 'hair-part1') {
            serviceAbbrev = '(H-I)';
        } else if (client.service === 'hair-part2') {
            serviceAbbrev = '(H-II)';
        } else {
            serviceAbbrev = '(H)';
        }
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'client-name';
        nameDiv.textContent = `${client.name} ${serviceAbbrev}`;

        const timeDiv = document.createElement('div');
        timeDiv.className = 'client-time';
        timeDiv.textContent = 'Not scheduled';

        block.appendChild(nameDiv);
        block.appendChild(timeDiv);

        // Set up drag events for restored blocks
        this.setupBlockDragEvents(block);
        
        return block;
    }

    setupDragAndDrop() {
        // Setup drag events for existing client blocks
        document.querySelectorAll('.client-block').forEach(block => {
            this.setupBlockDragEvents(block);
        });

        // Setup drop events for time blocks
        document.querySelectorAll('.time-block').forEach(block => {
            this.setupDropEvents(block);
        });
    }

    setupBlockDragEvents(block) {
        console.log('Setting up drag events for block:', block);
        
        block.addEventListener('dragstart', (e) => {
            console.log('Drag started for block:', e.target);
            this.draggedElement = e.target;
            e.target.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        block.addEventListener('dragend', (e) => {
            console.log('Drag ended for block:', e.target);
            e.target.classList.remove('dragging');
            this.draggedElement = null;
        });
        
        // Test if the block is actually draggable
        console.log('Block draggable attribute:', block.draggable);
        console.log('Block has drag event listeners attached');
    }

    setupDropEvents(timeBlock) {
        timeBlock.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            timeBlock.classList.add('drag-over');
        });

        timeBlock.addEventListener('dragleave', (e) => {
            timeBlock.classList.remove('drag-over');
        });

        timeBlock.addEventListener('drop', (e) => {
            e.preventDefault();
            timeBlock.classList.remove('drag-over');
            
            if (this.draggedElement && this.draggedElement !== timeBlock) {
                // Remove from current position
                this.draggedElement.remove();
                
                // Add to new position
                timeBlock.appendChild(this.draggedElement);
                
                // Update the time display on the block
                this.updateBlockTime(this.draggedElement, timeBlock);
            }
        });
    }

    exportSchedule() {
        const scheduleData = {
            artists: this.artists,
            clients: this.clients,
            assignments: this.getScheduleAssignments()
        };

        const dataStr = JSON.stringify(scheduleData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'wedding-schedule.json';
        link.click();
        
        URL.revokeObjectURL(url);
    }

    getScheduleAssignments() {
        const assignments = [];
        
        document.querySelectorAll('.time-block').forEach(timeBlock => {
            const clientBlock = timeBlock.querySelector('.client-block');
            if (clientBlock) {
                const specialty = timeBlock.dataset.specialty;
                const artistIndex = parseInt(timeBlock.dataset.artistIndex);
                const timeIndex = parseInt(timeBlock.dataset.timeIndex);
                const clientId = clientBlock.dataset.clientId;
                const client = this.clients.find(c => c.id == clientId);
                const artist = this.artists[specialty][artistIndex];
                
                assignments.push({
                    clientId,
                    clientName: client ? client.name : 'Unknown',
                    service: client ? client.service : 'Unknown',
                    clientType: client ? client.type : 'Unknown',
                    specialty,
                    artistIndex,
                    timeSlot: this.timeSlots[timeIndex],
                    artistName: artist ? artist.name : 'Unknown'
                });
            }
        });
        
        return assignments;
    }

    buildSchedule() {
        console.log('buildSchedule method called');
        // Rebuild the entire schedule display
        this.renderTimeSlots();
        this.renderArtists();
        console.log('buildSchedule method completed');
    }

    // Save and Load Schedule Methods
    openSaveModal() {
        const saveModal = document.getElementById('save-modal');
        this.populateExistingSchedules();
        saveModal.style.display = 'block';
    }

    openLoadModal() {
        const loadModal = document.getElementById('load-modal');
        this.populateLoadSchedules();
        loadModal.style.display = 'block';
    }

    populateExistingSchedules() {
        const schedulesList = document.getElementById('schedules-list');
        const savedSchedules = this.getSavedSchedules();
        
        schedulesList.innerHTML = '';
        
        if (savedSchedules.length === 0) {
            schedulesList.innerHTML = '<p style="color: #666; font-style: italic;">No saved schedules yet.</p>';
            return;
        }

        savedSchedules.forEach(schedule => {
            const scheduleDiv = document.createElement('div');
            scheduleDiv.className = 'schedule-item';
            scheduleDiv.innerHTML = `
                <div class="schedule-info">
                    <div class="schedule-name">${schedule.name}</div>
                    <div class="schedule-date">Saved: ${new Date(schedule.savedAt).toLocaleDateString()}</div>
                </div>
                <div class="schedule-actions">
                    <button class="btn btn-danger btn-small delete-schedule-btn" data-schedule-id="${schedule.id}">Delete</button>
                </div>
            `;
            
            // Add event listener for the delete button
            const deleteBtn = scheduleDiv.querySelector('.delete-schedule-btn');
            deleteBtn.addEventListener('click', () => {
                console.log('Delete button clicked for schedule:', schedule.id);
                this.deleteSchedule(schedule.id);
            });
            
            schedulesList.appendChild(scheduleDiv);
        });
    }

    populateLoadSchedules() {
        const loadSchedulesList = document.getElementById('load-schedules-list');
        const noSchedulesDiv = document.getElementById('no-schedules');
        const savedSchedules = this.getSavedSchedules();
        
        loadSchedulesList.innerHTML = '';
        
        if (savedSchedules.length === 0) {
            noSchedulesDiv.style.display = 'block';
            return;
        }

        noSchedulesDiv.style.display = 'none';
        
        savedSchedules.forEach(schedule => {
            const scheduleDiv = document.createElement('div');
            scheduleDiv.className = 'schedule-item';
            scheduleDiv.innerHTML = `
                <div class="schedule-info">
                    <div class="schedule-name">${schedule.name}</div>
                    <div class="schedule-date">Saved: ${new Date(schedule.savedAt).toLocaleDateString()}</div>
                    <div class="schedule-date">Bride: ${schedule.data.brideName || 'Not set'}</div>
                </div>
                <div class="schedule-actions">
                    <button class="btn btn-primary btn-small load-schedule-btn" data-schedule-id="${schedule.id}">Load</button>
                    <button class="btn btn-danger btn-small delete-schedule-btn" data-schedule-id="${schedule.id}">Delete</button>
                </div>
            `;
            
            // Add event listeners for the buttons
            const loadBtn = scheduleDiv.querySelector('.load-schedule-btn');
            const deleteBtn = scheduleDiv.querySelector('.delete-schedule-btn');
            
            loadBtn.addEventListener('click', () => {
                console.log('Load button clicked for schedule:', schedule.id);
                this.loadSchedule(schedule.id);
            });
            
            deleteBtn.addEventListener('click', () => {
                console.log('Delete button clicked for schedule:', schedule.id);
                this.deleteSchedule(schedule.id);
            });
            
            loadSchedulesList.appendChild(scheduleDiv);
        });
    }

    saveSchedule() {
        const scheduleName = document.getElementById('save-schedule-name').value.trim();
        
        if (!scheduleName) {
            alert('Please enter a schedule name.');
            return;
        }

        const scheduleData = {
            brideName: document.getElementById('settings-bride-name').value,
            weddingDate: document.getElementById('settings-wedding-date').value,
            location: document.getElementById('settings-location').value,
            brideReadyTime: document.getElementById('settings-bride-ready-time').value,
            durations: this.durations,
            artists: this.artists,
            clients: this.clients,
            assignments: this.getScheduleAssignments(),
            brideHairTwoParts: document.getElementById('settings-bride-hair-two-parts').checked
        };

        const schedule = {
            id: Date.now().toString(),
            name: scheduleName,
            data: scheduleData,
            savedAt: new Date().toISOString()
        };

        const savedSchedules = this.getSavedSchedules();
        savedSchedules.push(schedule);
        localStorage.setItem('weddingSchedules', JSON.stringify(savedSchedules));

        alert(`Schedule "${scheduleName}" saved successfully!`);
        document.getElementById('save-modal').style.display = 'none';
        document.getElementById('save-schedule-name').value = '';
    }

    loadSchedule(scheduleId) {
        console.log('loadSchedule called with ID:', scheduleId);
        const savedSchedules = this.getSavedSchedules();
        console.log('Found saved schedules:', savedSchedules.length);
        const schedule = savedSchedules.find(s => s.id === scheduleId);
        
        if (!schedule) {
            console.error('Schedule not found for ID:', scheduleId);
            alert('Schedule not found.');
            return;
        }
        
        console.log('Loading schedule:', schedule.name);

        const data = schedule.data;
        
        // Restore data
        console.log('Restoring wedding details...');
        document.getElementById('settings-bride-name').value = data.brideName || '';
        document.getElementById('settings-wedding-date').value = data.weddingDate || '';
        document.getElementById('settings-location').value = data.location || '';
        document.getElementById('settings-bride-ready-time').value = data.brideReadyTime || '';
        document.getElementById('settings-bride-hair-two-parts').checked = data.brideHairTwoParts || false;
        
        // Restore durations
        console.log('Restoring durations...');
        this.durations = data.durations || this.durations;
        
        // Restore artists and clients
        console.log('Restoring artists and clients...');
        this.artists = data.artists || this.artists;
        this.clients = data.clients || [];
        console.log('Loaded artists:', this.artists);
        console.log('Loaded clients:', this.clients);
        console.log('Loaded client IDs:', this.clients.map(c => ({ id: c.id, name: c.name, service: c.service })));
        
        // Handle bride hair two parts setting
        const brideHairTwoParts = data.brideHairTwoParts || false;
        this.toggleBrideHairTwoParts(brideHairTwoParts);
        
        // Rebuild the schedule
        console.log('Rebuilding schedule...');
        this.buildSchedule();
        this.updateScheduleTitle();
        console.log('Schedule rebuilt');
        
        // Restore assignments
        if (data.assignments) {
            console.log('Restoring assignments:', data.assignments);
            setTimeout(() => {
                this.restoreAssignments(data.assignments);
                console.log('Assignments restored');
            }, 100);
        } else {
            console.log('No assignments to restore');
        }

        document.getElementById('load-modal').style.display = 'none';
        alert(`Schedule "${schedule.name}" loaded successfully!`);
    }

    restoreAssignments(assignments) {
        console.log('Restoring assignments:', assignments);
        
        // Clear all existing client blocks first
        document.querySelectorAll('.client-block').forEach(block => {
            console.log('Removing existing block:', block);
            block.remove();
        });
        
        const timeBlocks = document.querySelectorAll('.time-block');
        console.log('Found time blocks:', timeBlocks.length);
        
        assignments.forEach(assignment => {
            console.log('Processing assignment:', assignment);
            
            // Try to find client by ID first
            let client = this.clients.find(c => c.id == assignment.clientId);
            
            // If not found by ID, try to find by name and service as fallback
            if (!client) {
                client = this.clients.find(c => 
                    c.name === assignment.clientName && 
                    c.service === assignment.service
                );
                console.log('Client found by name/service fallback:', client);
            }
            
            if (!client) {
                console.warn('Client not found for assignment:', assignment);
                console.warn('Available clients:', this.clients.map(c => ({ id: c.id, name: c.name, service: c.service })));
                console.warn('Looking for:', { id: assignment.clientId, name: assignment.clientName, service: assignment.service });
                return;
            }
            
            const targetTimeBlock = Array.from(timeBlocks).find(block => {
                const timeIndex = parseInt(block.dataset.timeIndex);
                const specialty = block.dataset.specialty;
                const artistIndex = parseInt(block.dataset.artistIndex);
                
                return this.timeSlots[timeIndex] === assignment.timeSlot &&
                       specialty === assignment.specialty &&
                       artistIndex === assignment.artistIndex;
            });
            
            if (targetTimeBlock) {
                console.log('Found target time block for:', assignment.timeSlot);
                
                // Remove any existing client block in this time slot
                const existingBlock = targetTimeBlock.querySelector('.client-block');
                if (existingBlock) {
                    console.log('Removing existing block in time slot');
                    existingBlock.remove();
                }
                
                // Create and add the client block
                console.log('Creating client block for restore:', client);
                const clientBlock = this.createClientBlockForRestore(client);
                console.log('Created client block:', clientBlock);
                console.log('Client block draggable:', clientBlock.draggable);
                
                targetTimeBlock.appendChild(clientBlock);
                this.updateBlockTime(clientBlock, targetTimeBlock);
                
                console.log('Client block restored for:', client.name);
                
                // Double-check that drag events are working
                setTimeout(() => {
                    console.log('Checking block after append:', clientBlock);
                    console.log('Block still draggable:', clientBlock.draggable);
                    console.log('Block parent:', clientBlock.parentElement);
                }, 50);
            } else {
                console.warn('Time block not found for time slot:', assignment.timeSlot);
            }
        });
        
        console.log('All assignments restored');
        
        // Final check of all restored blocks
        setTimeout(() => {
            const restoredBlocks = document.querySelectorAll('.client-block');
            console.log('Final check - restored blocks count:', restoredBlocks.length);
            restoredBlocks.forEach((block, index) => {
                console.log(`Block ${index}: draggable=${block.draggable}, hasEventListeners=${block._hasEventListeners || 'unknown'}`);
            });
        }, 100);
    }

    deleteSchedule(scheduleId) {
        if (!confirm('Are you sure you want to delete this schedule?')) {
            return;
        }

        const savedSchedules = this.getSavedSchedules();
        const filteredSchedules = savedSchedules.filter(s => s.id !== scheduleId);
        localStorage.setItem('weddingSchedules', JSON.stringify(filteredSchedules));
        
        // Refresh the lists
        this.populateExistingSchedules();
        this.populateLoadSchedules();
        
        alert('Schedule deleted successfully!');
    }

    getSavedSchedules() {
        const saved = localStorage.getItem('weddingSchedules');
        return saved ? JSON.parse(saved) : [];
    }
}

// Initialize the app when the page loads
let scheduler; // Global variable for HTML onclick handlers
function initScheduler() {
    if (window.__schedulerInitialized) return;
    window.__schedulerInitialized = true;
    scheduler = new WeddingScheduleApp();
    window.scheduler = scheduler;
    console.log('Scheduler initialized:', scheduler);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScheduler);
} else {
    // DOMContentLoaded already fired; init immediately
    initScheduler();
}
