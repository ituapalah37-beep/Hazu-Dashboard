Menambahkan fungsi `detectClientDeviceType()` untuk mendeteksi apakah browser dijalankan dari ponsel (HP) atau komputer/laptop[cite: 1].

```javascript
// --- KONFIGURASI MQTT CLOUD (Topik Unik Privat) ---
const brokerUrl = 'wss://broker.emqx.io:8084/mqtt'; 
const clientId = 'SamuraiIoT_' + Math.random().toString(16).substr(2, 6);

// Gunakan topik unik agar tidak bertabrakan dengan pengguna lain di broker publik
const TOPIC_PREFIX = 'hazu_samurai_iot_999';

document.addEventListener('DOMContentLoaded', () => {
    const clientIdDisplay = document.getElementById('client-id-display');
    if(clientIdDisplay) clientIdDisplay.textContent = clientId;
    
    // Deteksi tipe perangkat klien (HP / Laptop)
    detectClientDeviceType();

    // Muat semua pengaturan & perangkat tersimpan dari LocalStorage
    loadSavedSettings();
    loadSavedDevices();

    updateDateTime();
    setInterval(updateDateTime, 1000);
    fetchWeather();
});

// --- FUNGSI DETEKSI TIPE PERANGKAT (HP / LAPTOP) ---
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
    
    // Subscribe ke topik privat Anda
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

// Sinkronisasi Pesan Masuk (Perangkat, Pengaturan, & RFID)
client.on('message', (topic, payload) => {
    const message = payload.toString();
    console.log(`[MQTT RECEIVED] Topic: ${topic} | Message: ${message}`);
    
    const parts = topic.split('/');
    const category = parts[1]; // 'control', 'settings', atau 'rfid'
    const target = parts[2];   // nama perangkat, jenis setting, atau rfid status

    // 1. Jika pesan kontrol perangkat
    if (category === 'control') {
        let found = false;
        document.querySelectorAll('.device-item').forEach(item => {
            const spanText = item.querySelector('span');
            if (spanText) {
                const cleanName = spanText.textContent.replace(/🏮\s*/g, '').trim().toLowerCase();
                if (cleanName === target.replace(/_/g, ' ')) {
                    found = true;
                    const icon = item.querySelector('.status-icon');
                    if (message === 'ON' && !item.classList.contains('active')) {
                        item.classList.add('active');
                        if(icon) icon.textContent = '🔵';
                        addLog(`[Sync] Device activated from another source.`);
                        showToast(`Device "${cleanName}" turned ON`, 'info');
                    } else if (message === 'OFF' && item.classList.contains('active')) {
                        item.classList.remove('active');
                        if(icon) icon.textContent = '⚪';
                        addLog(`[Sync] Device deactivated from another source.`);
                        showToast(`Device "${cleanName}" turned OFF`, 'info');
                    }
                }
            }
        });

        // Buat otomatis jika perangkat belum ada di layar
        if (!found && target) {
            const formattedName = target.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const deviceGrid = document.querySelector('.device-grid');
            const addBtnItem = document.querySelector('.add-btn');

            if (deviceGrid && addBtnItem) {
                const newCard = document.createElement('div');
                newCard.className = message === 'ON' ? 'device-item active' : 'device-item';
                newCard.setAttribute('onclick', `toggleDevice(this, '${formattedName}')`);
                newCard.innerHTML = `<span>🏮 ${formattedName}</span> <span class="status-icon">${message === 'ON' ? '🔵' : '⚪'}</span>`;
                
                deviceGrid.insertBefore(newCard, addBtnItem);
                
                let saved = localStorage.getItem('samurai_custom_devices');
                let devices = saved ? JSON.parse(saved) : [];
                if (!devices.includes(formattedName)) {
                    devices.push(formattedName);
                    localStorage.setItem('samurai_custom_devices', JSON.stringify(devices));
                }
                addLog(`[Sync] New device <b>${formattedName}</b> added automatically.`);
                showToast(`New device added: ${formattedName}`, 'success');
            }
        }
    }

    // 2. Jika pesan pengaturan disinkronkan
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
        }
    }

    // 3. Jika pesan status RFID card masuk
    if (category === 'rfid' || topic.endsWith('/rfid')) {
        updateRfidCardStatus(message);
    }
});

// --- FUNGSI NOTIFIKASI POP-UP (TOAST) ---
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

// --- FUNGSI UPDATE STATUS KARTU AKSES RFID ---
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

const regionData = {
    jakarta:    { name: 'Jakarta',    lat: -6.2088,   lon: 106.8456, tz: 'Asia/Jakarta' },
    bandung:    { name: 'Bandung',    lat: -6.9175,   lon: 107.6191, tz: 'Asia/Jakarta' },
    surabaya:   { name: 'Surabaya',   lat: -7.2575,   lon: 112.7521, tz: 'Asia/Jakarta' },
    makassar:   { name: 'Makassar',   lat: -5.1477,   lon: 119.4327, tz: 'Asia/Makassar' },
    denpasar:   { name: 'Denpasar',   lat: -8.6705,   lon: 115.2126, tz: 'Asia/Makassar' },
    jayapura:   { name: 'Jayapura',   lat: -2.5337,   lon: 140.7186, tz: 'Asia/Jayapura' }
};

let currentRegionKey = 'makassar';

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
    
    if (element.classList.contains('active')) {
        if(icon) icon.textContent = '🔵';
        state = 'ON';
        addLog(`Device <b>${deviceName}</b> turned ON.`);
        showToast(`Device "${deviceName}" turned ON`, 'success');
    } else {
        if(icon) icon.textContent = '⚪';
        state = 'OFF';
        addLog(`Device <b>${deviceName}</b> turned OFF.`);
        showToast(`Device "${deviceName}" turned OFF`, 'info');
    }

    if (client.connected) {
        const topic = `${TOPIC_PREFIX}/control/${deviceName.toLowerCase().replace(/\s+/g, '_')}`;
        client.publish(topic, state, { qos: 0, retain: true });
    }
}

// Memuat Perangkat Tersimpan dari LocalStorage
function loadSavedDevices() {
    const saved = localStorage.getItem('samurai_custom_devices');
    if (saved) {
        const devices = JSON.parse(saved);
        const deviceGrid = document.querySelector('.device-grid');
        const addBtnItem = document.querySelector('.add-btn');
        
        devices.forEach(deviceName => {
            const cleanExisting = Array.from(document.querySelectorAll('.device-item span')).some(span => 
                span.textContent.replace(/🏮\s*/g, '').trim().toLowerCase() === deviceName.toLowerCase()
            );

            if (!cleanExisting) {
                const newCard = document.createElement('div');
                newCard.className = 'device-item';
                newCard.setAttribute('onclick', `toggleDevice(this, '${deviceName}')`);
                newCard.innerHTML = `<span>🏮 ${deviceName}</span> <span class="status-icon">⚪</span>`;
                
                if(deviceGrid && addBtnItem) {
                    deviceGrid.insertBefore(newCard, addBtnItem);
                }
            }
        });
    }
}

// Memuat Pengaturan Tersimpan dari LocalStorage saat Refresh
function loadSavedSettings() {
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
    let devices = saved ? JSON.parse(saved) : [];
    if (!devices.includes(deviceName)) {
        devices.push(deviceName);
        localStorage.setItem('samurai_custom_devices', JSON.stringify(devices));
    }

    const deviceGrid = document.querySelector('.device-grid');
    const addBtnItem = document.querySelector('.add-btn');

    const newCard = document.createElement('div');
    newCard.className = 'device-item';
    newCard.setAttribute('onclick', `toggleDevice(this, '${deviceName}')`);
    newCard.innerHTML = `<span>🏮 ${deviceName}</span> <span class="status-icon">⚪</span>`;

    if(deviceGrid && addBtnItem) {
        deviceGrid.insertBefore(newCard, addBtnItem);
    }
    addLog(`New device added: <b>${deviceName}</b>.`);
    showToast(`Device "${deviceName}" successfully added`, 'success');

    if (client.connected) {
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
        const regName = regionData[currentRegionKey].name;
        addLog(`Active region changed to: <b>${regName}</b>.`);
        updateDateTime();
        fetchWeather();
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
    
    const dateOptions = { timeZone: reg.tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    dateElement.textContent = now.toLocaleDateString('en-GB', dateOptions);
    
    const timeOptions = { timeZone: reg.tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    clockElement.textContent = now.toLocaleTimeString('en-GB', timeOptions);
}

async function fetchWeather() {
    const weatherBox = document.querySelector('.weather-box');
    if(!weatherBox) return;
    
    const reg = regionData[currentRegionKey];
    weatherBox.textContent = `${reg.name} ⛅ Loading weather...`;
    
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${reg.lat}&longitude=${reg.lon}&current=temperature_2m`);
        const data = await response.json();
        const temp = Math.round(data.current.temperature_2m);
        weatherBox.textContent = `${reg.name} ⛅ ${temp}°C`;
    } catch (error) {
        weatherBox.textContent = `${reg.name} ⛅ 28°C`;
    }
}
```[cite: 1]
