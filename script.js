const brokerUrl = 'wss://broker.emqx.io:8084/mqtt'; 
const clientId = 'SamuraiIoT_' + Math.random().toString(16).substr(2, 6);
const TOPIC_PREFIX = 'hazu_samurai_iot_999';

const regionData = {
    jakarta:      { name: 'Jakarta',        lat: -6.2088,   lon: 106.8456, tz: 'Asia/Jakarta' },
    bandung:      { name: 'Bandung',        lat: -6.9175,   lon: 107.6191, tz: 'Asia/Jakarta' },
    bekasi:       { name: 'Bekasi',         lat: -6.2383,   lon: 106.9756, tz: 'Asia/Jakarta' },
    depok:        { name: 'Depok',          lat: -6.4025,   lon: 106.7942, tz: 'Asia/Jakarta' },
    bogor:        { name: 'Bogor',          lat: -6.5971,   lon: 106.8060, tz: 'Asia/Jakarta' },
    semarang:     { name: 'Semarang',       lat: -6.9667,   lon: 110.4167, tz: 'Asia/Jakarta' },
    surakarta:    { name: 'Surakarta',      lat: -7.5755,   lon: 110.8243, tz: 'Asia/Jakarta' },
    surabaya:     { name: 'Surabaya',       lat: -7.2575,   lon: 112.7521, tz: 'Asia/Jakarta' },
    malang:       { name: 'Malang',         lat: -7.9666,   lon: 112.6326, tz: 'Asia/Jakarta' },
    yogyakarta:   { name: 'Yogyakarta',     lat: -7.7956,   lon: 110.3695, tz: 'Asia/Jakarta' },
    serang:       { name: 'Serang',         lat: -6.1154,   lon: 106.1503, tz: 'Asia/Jakarta' },
    tangerang:    { name: 'Tangerang',      lat: -6.1783,   lon: 106.6319, tz: 'Asia/Jakarta' },
    medan:        { name: 'Medan',          lat: 3.5952,    lon: 98.6722,  tz: 'Asia/Jakarta' },
    padang:       { name: 'Padang',         lat: -0.9471,   lon: 100.4172, tz: 'Asia/Jakarta' },
    pekanbaru:    { name: 'Pekanbaru',      lat: 0.5071,    lon: 101.4478, tz: 'Asia/Jakarta' },
    batam:        { name: 'Batam',          lat: 1.0456,    lon: 104.0305, tz: 'Asia/Jakarta' },
    palembang:    { name: 'Palembang',      lat: -2.9909,   lon: 104.7565, tz: 'Asia/Jakarta' },
    bandarlampung:{ name: 'Bandar Lampung', lat: -5.4297,   lon: 105.2611, tz: 'Asia/Jakarta' },
    denpasar:     { name: 'Denpasar',       lat: -8.6705,   lon: 115.2126, tz: 'Asia/Makassar' },
    mataram:      { name: 'Mataram',        lat: -8.5833,   lon: 116.1167, tz: 'Asia/Makassar' },
    kupang:       { name: 'Kupang',         lat: -10.1772,  lon: 123.6070, tz: 'Asia/Makassar' },
    banjarmasin:  { name: 'Banjarmasin',    lat: -3.3186,   lon: 114.5936, tz: 'Asia/Makassar' },
    samarinda:    { name: 'Samarinda',      lat: -0.5022,   lon: 117.1536, tz: 'Asia/Makassar' },
    balikpapan:   { name: 'Balikpapan',     lat: -1.2379,   lon: 116.8529, tz: 'Asia/Makassar' },
    makassar:     { name: 'Makassar',       lat: -5.1477,   lon: 119.4327, tz: 'Asia/Makassar' },
    manado:       { name: 'Manado',         lat: 1.4748,    lon: 124.8421, tz: 'Asia/Makassar' },
    ambon:        { name: 'Ambon',          lat: -3.6556,   lon: 128.1908, tz: 'Asia/Jayapura' },
    jayapura:     { name: 'Jayapura',       lat: -2.5337,   lon: 140.7186, tz: 'Asia/Jayapura' }
};

let currentRegionKey = 'makassar';

document.addEventListener('DOMContentLoaded', () => {
    const clientIdDisplay = document.getElementById('client-id-display');
    if(clientIdDisplay) clientIdDisplay.textContent = clientId;
    
    detectClientDeviceType();
    loadSavedSettings();
    loadSavedDevices();

    updateDateTime();
    setInterval(updateDateTime, 1000);
    fetchWeather();
});

function detectClientDeviceType() {
    const deviceTypeDisplay = document.getElementById('device-type-display');
    const deviceIconEl = document.getElementById('device-type-icon');
    if (!deviceTypeDisplay) return;

    const ua = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth <= 768;

    if (isMobile) {
        deviceTypeDisplay.textContent = 'Mobile Phone (Smartphone)';
        if (deviceIconEl) deviceIconEl.textContent = '📱';
    } else {
        deviceTypeDisplay.textContent = 'Laptop / Desktop Computer';
        if (deviceIconEl) deviceIconEl.textContent = '💻';
    }
}

const mqttStatusEl = document.getElementById('mqtt-status');
if(mqttStatusEl) {
    mqttStatusEl.textContent = 'Connecting...';
    mqttStatusEl.style.color = '#f87171';
}

const client = mqtt.connect(brokerUrl, {
    clientId: clientId,
    clean: true,
    connectTimeout: 5000
});

client.on('connect', () => {
    if(mqttStatusEl) {
        mqttStatusEl.textContent = 'Connected (Cloud)';
        mqttStatusEl.style.color = '#4ade80';
    }
    console.log("[MQTT] Connected with ID:", clientId);
    addLog('Successfully connected to Cloud MQTT Broker.');
    showToast('Connected to Cloud MQTT Broker', 'success');
    
    client.subscribe(`${TOPIC_PREFIX}/#`, { qos: 0 });
});

client.on('error', (err) => {
    if(mqttStatusEl) {
        mqttStatusEl.textContent = 'Connection Failed';
        mqttStatusEl.style.color = '#f87171';
    }
    console.error("[MQTT] Error:", err);
    addLog('MQTT Connection Error: ' + err.message);
    showToast('MQTT Connection Error', 'warning');
    client.end();
});

client.on('message', (topic, payload) => {
    const message = payload.toString();
    console.log(`[MQTT RECEIVED] Topic: ${topic} | Message: ${message}`);
    
    const parts = topic.split('/');
    const category = parts[1]; 
    const target = parts[2];   

    if (category === 'manage' && target === 'list') {
        try {
            const serverDevices = JSON.parse(message);
            if (Array.isArray(serverDevices)) {
                localStorage.setItem('samurai_custom_devices', JSON.stringify(serverDevices));
                loadSavedDevices();
                addLog(`[Sync] Device list synchronized from cloud.`);
            }
        } catch (e) {
            console.error("Invalid device list JSON");
        }
    }

    if (category === 'control') {
        let cleanTarget = target ? target.replace(/_/g, ' ').toLowerCase() : '';
        
        let activeSaved = localStorage.getItem('samurai_active_states');
        let activeSet = activeSaved ? new Set(JSON.parse(activeSaved)) : new Set();

        document.querySelectorAll('.device-item').forEach(item => {
            const spanText = item.querySelector('span');
            if (spanText) {
                const cleanName = spanText.textContent.replace(/🏮\s*/g, '').trim().toLowerCase();
                if (cleanName === cleanTarget) {
                    const icon = item.querySelector('.status-icon');
                    if (message === 'ON' && !item.classList.contains('active')) {
                        item.classList.add('active');
                        if(icon) icon.textContent = '🔵';
                        activeSet.add(cleanName);
                        addLog(`[Sync] Device "${cleanName}" turned ON.`);
                    } else if (message === 'OFF' && item.classList.contains('active')) {
                        item.classList.remove('active');
                        if(icon) icon.textContent = '⚪';
                        activeSet.delete(cleanName);
                        addLog(`[Sync] Device "${cleanName}" turned OFF.`);
                    }
                }
            }
        });
        localStorage.setItem('samurai_active_states', JSON.stringify(Array.from(activeSet)));
    }

    if (category === 'settings') {
        if (target === 'title') {
            const headerTitle = document.getElementById('header-main-title');
            if (headerTitle) headerTitle.textContent = message;
            localStorage.setItem('samurai_title', message);
            const welcomeInput = document.getElementById('welcomeInput');
            if (welcomeInput) welcomeInput.value = message;
            showToast('Welcome title updated', 'info');
        } else if (target === 'theme') {
            if (message === 'light') {
                document.body.classList.add('light-mode');
                localStorage.setItem('samurai_theme', 'light');
                const themeSelect = document.getElementById('themeSelect');
                if (themeSelect) themeSelect.value = 'light';
            } else {
                document.body.classList.remove('light-mode');
                localStorage.setItem('samurai_theme', 'dark');
                const themeSelect = document.getElementById('themeSelect');
                if (themeSelect) themeSelect.value = 'dark';
            }
        } else if (target === 'wallpaper') {
            const videoElement = document.getElementById('wallpaperVideo');
            const sourceElement = document.getElementById('videoSource');
            const wallpaperCard = document.querySelector('.wallpaper-card');
            
            if (message === 'off') {
                if(wallpaperCard) wallpaperCard.style.display = 'none';
                localStorage.setItem('samurai_wallpaper_status', 'off');
                const statusSelect = document.getElementById('wallpaperStatusSelect');
                if (statusSelect) statusSelect.value = 'off';
            } else {
                if(wallpaperCard) wallpaperCard.style.display = 'block';
                if(sourceElement && videoElement) {
                    sourceElement.src = message;
                    videoElement.load();
                }
                localStorage.setItem('samurai_wallpaper_status', 'on');
                localStorage.setItem('samurai_wallpaper_url', message);
            }
        } else if (target === 'region') {
            if (regionData[message]) {
                currentRegionKey = message;
                localStorage.setItem('samurai_region', message);
                const regionSelect = document.getElementById('regionSelect');
                if (regionSelect) regionSelect.value = message;
                fetchWeather();
                updateDateTime();
                addLog(`[Sync] Region changed to ${regionData[message].name}.`);
                showToast(`Region synced: ${regionData[message].name}`, 'info');
            }
        }
    }

    if (category === 'rfid' || topic.endsWith('/rfid')) {
        updateRfidCardStatus(message);
    }
});

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3500);
}

function updateRfidCardStatus(cardInfo) {
    const statusEl = document.getElementById('rfid-card-status');
    const badgeEl = document.getElementById('rfid-badge');
    if (!statusEl || !badgeEl) return;

    if (!cardInfo || cardInfo === 'idle' || cardInfo === 'none') {
        statusEl.textContent = 'Waiting for RFID scan...';
        badgeEl.textContent = 'Standby';
        badgeEl.className = 'rfid-badge idle';
    } else {
        statusEl.textContent = `${cardInfo}`;
        badgeEl.textContent = 'Active / Access Granted';
        badgeEl.className = 'rfid-badge active';
        addLog(`RFID Card Scanned: <b>${cardInfo}</b>`);
        showToast(`RFID Card Detected: ${cardInfo}`, 'success');
    }
}

const addModal = document.getElementById('addModal');
const settingsModal = document.getElementById('settingsModal');

function switchView(viewName, element) {
    document.querySelectorAll('.sidebar .menu-item').forEach(item => {
        item.classList.remove('active');
    });
    if (element && !element.classList.contains('settings')) {
        element.classList.add('active');
    }

    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });

    const targetView = document.getElementById(viewName + '-view');
    if (targetView) {
        targetView.classList.add('active');
    }
}

function addLog(actionMessage) {
    const logList = document.getElementById('logList');
    if(!logList) return;
    
    const now = new Date();
    const reg = regionData[currentRegionKey];
    
    const dateStr = now.toLocaleDateString('en-GB', { timeZone: reg.tz, day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-GB', { timeZone: reg.tz, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    logItem.innerHTML = `<span>${actionMessage}</span> <span class="log-time">${dateStr}, ${timeStr}</span>`;
    
    logList.prepend(logItem);
}

function toggleDevice(element, deviceName) {
    element.classList.toggle('active');

    const icon = element.querySelector('.status-icon');
    let state = 'OFF';
    
    let activeSaved = localStorage.getItem('samurai_active_states');
    let activeSet = activeSaved ? new Set(JSON.parse(activeSaved)) : new Set();
    const cleanName = deviceName.toLowerCase();

    if (element.classList.contains('active')) {
        if(icon) icon.textContent = '🔵';
        state = 'ON';
        activeSet.add(cleanName);
        addLog(`Device <b>${deviceName}</b> turned ON.`);
        showToast(`Device "${deviceName}" turned ON`, 'success');
    } else {
        if(icon) icon.textContent = '⚪';
        state = 'OFF';
        activeSet.delete(cleanName);
        addLog(`Device <b>${deviceName}</b> turned OFF.`);
        showToast(`Device "${deviceName}" turned OFF`, 'info');
    }

    localStorage.setItem('samurai_active_states', JSON.stringify(Array.from(activeSet)));

    if (client.connected) {
        const topic = `${TOPIC_PREFIX}/control/${deviceName.toLowerCase().replace(/\s+/g, '_')}`;
        client.publish(topic, state, { qos: 0, retain: true });
    }
}

function deleteDevice(event, deviceName) {
    event.stopPropagation(); 
    if (!confirm(`Are you sure you want to delete device "${deviceName}"?`)) return;

    let saved = localStorage.getItem('samurai_custom_devices');
    let devices = saved ? JSON.parse(saved) : ['Main Light'];
    devices = devices.filter(d => d.toLowerCase() !== deviceName.toLowerCase());
    localStorage.setItem('samurai_custom_devices', JSON.stringify(devices));

    let activeSaved = localStorage.getItem('samurai_active_states');
    let activeSet = activeSaved ? new Set(JSON.parse(activeSaved)) : new Set();
    activeSet.delete(deviceName.toLowerCase());
    localStorage.setItem('samurai_active_states', JSON.stringify(Array.from(activeSet)));

    loadSavedDevices();
    addLog(`Device deleted: <b>${deviceName}</b>.`);
    showToast(`Device "${deviceName}" deleted`, 'warning');

    if (client.connected) {
        client.publish(`${TOPIC_PREFIX}/manage/list`, JSON.stringify(devices), { qos: 0, retain: true });
        
        const topicControl = `${TOPIC_PREFIX}/control/${deviceName.toLowerCase().replace(/\s+/g, '_')}`;
        client.publish(topicControl, '', { qos: 0, retain: true });
    }
}

function loadSavedDevices() {
    let saved = localStorage.getItem('samurai_custom_devices');
    let devices = saved ? JSON.parse(saved) : ['Main Light']; 
    if (!saved) {
        localStorage.setItem('samurai_custom_devices', JSON.stringify(devices));
    }

    let activeSaved = localStorage.getItem('samurai_active_states');
    let activeSet = activeSaved ? new Set(JSON.parse(activeSaved)) : new Set();

    const deviceGrid = document.getElementById('deviceGrid');
    if (!deviceGrid) return;
    const addBtnItem = deviceGrid.querySelector('.add-btn');

    deviceGrid.querySelectorAll('.device-item:not(.add-btn)').forEach(el => el.remove());

    devices.forEach(deviceName => {
        const cleanName = deviceName.toLowerCase();
        const isActive = activeSet.has(cleanName);

        const newCard = document.createElement('div');
        newCard.className = isActive ? 'device-item active' : 'device-item';
        newCard.setAttribute('onclick', `toggleDevice(this, '${deviceName}')`);
        newCard.innerHTML = `<span>🏮 ${deviceName}</span> <div class="device-actions"><span class="status-icon">${isActive ? '🔵' : '⚪'}</span><button class="btn-delete-device" onclick="deleteDevice(event, '${deviceName}')" title="Delete Device">❌</button></div>`;
        
        if (addBtnItem) {
            deviceGrid.insertBefore(newCard, addBtnItem);
        } else {
            deviceGrid.appendChild(newCard);
        }
    });
}

function loadSavedSettings() {
    const savedRegion = localStorage.getItem('samurai_region');
    if (savedRegion && regionData[savedRegion]) {
        currentRegionKey = savedRegion;
        const regionSelect = document.getElementById('regionSelect');
        if (regionSelect) regionSelect.value = savedRegion;
    }

    const savedTitle = localStorage.getItem('samurai_title');
    if (savedTitle) {
        const headerTitle = document.getElementById('header-main-title');
        if (headerTitle) headerTitle.textContent = savedTitle;
        const welcomeInput = document.getElementById('welcomeInput');
        if (welcomeInput) welcomeInput.value = savedTitle;
    }

    const savedTheme = localStorage.getItem('samurai_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = 'light';
    }

    const wallpaperStatus = localStorage.getItem('samurai_wallpaper_status');
    const wallpaperCard = document.querySelector('.wallpaper-card');
    if (wallpaperStatus === 'off') {
        if (wallpaperCard) wallpaperCard.style.display = 'none';
        const statusSelect = document.getElementById('wallpaperStatusSelect');
        if (statusSelect) statusSelect.value = 'off';
    } else {
        const savedUrl = localStorage.getItem('samurai_wallpaper_url');
        if (savedUrl) {
            const videoElement = document.getElementById('wallpaperVideo');
            const sourceElement = document.getElementById('videoSource');
            if (sourceElement && videoElement) {
                sourceElement.src = savedUrl;
                videoElement.load();
            }
            const fileSelect = document.getElementById('wallpaperFileSelect');
            if (fileSelect) fileSelect.value = savedUrl;
        }
    }
}

function openAddModal() {
    if(addModal) addModal.style.display = 'flex';
}

function closeAddModal() {
    if(addModal) addModal.style.display = 'none';
    const input = document.getElementById('deviceNameInput');
    if(input) input.value = '';
}

function confirmAddDevice() {
    const input = document.getElementById('deviceNameInput');
    if(!input) return;
    const deviceName = input.value.trim();
    if (!deviceName) {
        alert('Device name cannot be empty!');
        return;
    }

    let saved = localStorage.getItem('samurai_custom_devices');
    let devices = saved ? JSON.parse(saved) : ['Main Light'];
    
    if (devices.some(d => d.toLowerCase() === deviceName.toLowerCase())) {
        alert('Device already exists!');
        return;
    }

    devices.push(deviceName);
    localStorage.setItem('samurai_custom_devices', JSON.stringify(devices));

    loadSavedDevices();
    addLog(`New device added: <b>${deviceName}</b>.`);
    showToast(`Device "${deviceName}" successfully added`, 'success');

    if (client.connected) {
        client.publish(`${TOPIC_PREFIX}/manage/list`, JSON.stringify(devices), { qos: 0, retain: true });
        client.publish(`${TOPIC_PREFIX}/control/${deviceName.toLowerCase().replace(/\s+/g, '_')}`, 'OFF', { qos: 0, retain: true });
    }

    closeAddModal();
}

function openSettings() {
    const regionSelect = document.getElementById('regionSelect');
    if(regionSelect) regionSelect.value = currentRegionKey;
    if(settingsModal) settingsModal.style.display = 'flex';
}

function closeSettings() {
    if(settingsModal) settingsModal.style.display = 'none';
}

function saveSettings() {
    const newTitleInput = document.getElementById('welcomeInput');
    if (newTitleInput && newTitleInput.value.trim()) {
        const newTitle = newTitleInput.value.trim();
        const headerTitle = document.getElementById('header-main-title');
        if(headerTitle) headerTitle.textContent = newTitle;
        localStorage.setItem('samurai_title', newTitle);
        addLog(`Welcome title changed to: "${newTitle}".`);
        showToast('Settings saved successfully', 'success');

        if (client.connected) {
            client.publish(`${TOPIC_PREFIX}/settings/title`, newTitle, { qos: 0, retain: true });
        }
    }

    const regionSelect = document.getElementById('regionSelect');
    if (regionSelect && regionSelect.value && regionData[regionSelect.value]) {
        currentRegionKey = regionSelect.value;
        localStorage.setItem('samurai_region', currentRegionKey);
        const regName = regionData[currentRegionKey].name;
        addLog(`Active region changed to: <b>${regName}</b>.`);
        updateDateTime();
        fetchWeather();

        if (client.connected) {
            client.publish(`${TOPIC_PREFIX}/settings/region`, currentRegionKey, { qos: 0, retain: true });
        }
    }

    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        const themeVal = themeSelect.value;
        if (themeVal === 'light') {
            document.body.classList.add('light-mode');
            localStorage.setItem('samurai_theme', 'light');
            addLog(`Theme changed to: <b>Light Mode</b>.`);
        } else {
            document.body.classList.remove('light-mode');
            localStorage.setItem('samurai_theme', 'dark');
            addLog(`Theme changed to: <b>Dark Mode</b>.`);
        }

        if (client.connected) {
            client.publish(`${TOPIC_PREFIX}/settings/theme`, themeVal, { qos: 0, retain: true });
        }
    }

    const wallpaperStatusSelect = document.getElementById('wallpaperStatusSelect');
    const wallpaperCard = document.querySelector('.wallpaper-card');
    if (wallpaperStatusSelect && wallpaperCard) {
        const statusVal = wallpaperStatusSelect.value;
        if (statusVal === 'off') {
            wallpaperCard.style.display = 'none';
            localStorage.setItem('samurai_wallpaper_status', 'off');
            addLog(`Live Wallpaper disabled.`);
            if (client.connected) client.publish(`${TOPIC_PREFIX}/settings/wallpaper`, 'off', { qos: 0, retain: true });
        } else {
            wallpaperCard.style.display = 'block';
            localStorage.setItem('samurai_wallpaper_status', 'on');
            addLog(`Live Wallpaper enabled.`);
        }
    }

    const wallpaperFileSelect = document.getElementById('wallpaperFileSelect');
    if (wallpaperFileSelect && wallpaperStatusSelect.value !== 'off') {
        const selectedVideoUrl = wallpaperFileSelect.value;
        const videoElement = document.getElementById('wallpaperVideo');
        const sourceElement = document.getElementById('videoSource');

        if(sourceElement && videoElement) {
            sourceElement.src = selectedVideoUrl;
            videoElement.load();
        }

        localStorage.setItem('samurai_wallpaper_url', selectedVideoUrl);
        const selectedText = wallpaperFileSelect.options[wallpaperFileSelect.selectedIndex].text;
        addLog(`Wallpaper changed to: <b>${selectedText}</b>.`);

        if (client.connected) {
            client.publish(`${TOPIC_PREFIX}/settings/wallpaper`, selectedVideoUrl, { qos: 0, retain: true });
        }
    }

    closeSettings();
}

function updateDateTime() {
    const dateElement = document.querySelector('.date-text');
    const clockElement = document.querySelector('.clock-text');
    if(!dateElement || !clockElement) return;

    const reg = regionData[currentRegionKey];
    const now = new Date();
    
    const dateOptions = { timeZone: reg.tz, weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
    dateElement.textContent = now.toLocaleDateString('en-GB', dateOptions);
    
    const timeOptions = { timeZone: reg.tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    clockElement.textContent = now.toLocaleTimeString('en-GB', timeOptions);
}

function getWeatherInfo(code) {
    let icon = '☀️';
    let desc = 'CERAH';
    if (code >= 1 && code <= 3) { icon = '⛅'; desc = 'BERAWAN'; }
    else if (code >= 51 && code <= 67) { icon = '🌧️'; desc = 'HUJAN'; }
    else if (code >= 95) { icon = '⚡'; desc = 'BADAI'; }
    return { icon, desc };
}

async function fetchWeather() {
    const weatherBox = document.querySelector('.weather-box');
    const forecastGrid = document.getElementById('forecastGrid');
    if(!weatherBox || !forecastGrid) return;
    
    const reg = regionData[currentRegionKey];
    weatherBox.textContent = `${reg.name} ⛅ Memuat...`;
    
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${reg.lat}&longitude=${reg.lon}&current=temperature_2m,weathercode&daily=temperature_2m_max,weathercode&timezone=auto`);
        const data = await response.json();
        
        const currentTemp = Math.round(data.current.temperature_2m);
        const currentWeatherCode = data.current.weathercode;
        const currentInfo = getWeatherInfo(currentWeatherCode);

        // Header menampilkan data cuaca real-time saat ini
        weatherBox.textContent = `${reg.name} ${currentInfo.icon} ${currentTemp}°C`;

        forecastGrid.innerHTML = '';
        const daily = data.daily;
        
        for (let i = 0; i < 5; i++) {
            const dateObj = new Date(daily.time[i]);
            const dayName = i === 0 ? 'HARI INI' : dateObj.toLocaleDateString('id-ID', { weekday: 'short' }).toUpperCase();
            
            // Indeks ke-0 (Hari Ini) disamakan dengan suhu dan kondisi saat ini agar sinkron sempurna dengan header
            const temp = i === 0 ? currentTemp : Math.round(daily.temperature_2m_max[i]);
            const code = i === 0 ? currentWeatherCode : daily.weathercode[i];
            const info = getWeatherInfo(code);

            const card = document.createElement('div');
            card.className = 'forecast-card';
            card.innerHTML = `
                <span class="forecast-day">${dayName}</span>
                <span class="forecast-icon">${info.icon}</span>
                <span class="forecast-temp">${temp}°C</span>
                <span class="forecast-desc">${info.desc}</span>
            `;
            forecastGrid.appendChild(card);
        }
    } catch (error) {
        weatherBox.textContent = `${reg.name} ⛅ 28°C`;
        forecastGrid.innerHTML = '<div style="grid-column: span 5; text-align: center; font-size: 11px; color: #9ca3af; padding: 20px;">Gagal memuat perkiraan cuaca wilayah.</div>';
    }
}
