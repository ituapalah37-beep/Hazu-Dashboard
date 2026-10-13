// --- KONFIGURASI MQTT CLOUD (Dengan Debugging) ---
const brokerUrl = 'wss://broker.emqx.io:8084/mqtt'; 
const clientId = 'SamuraiIoT_' + Math.random().toString(16).substr(2, 6);

document.addEventListener('DOMContentLoaded', () => {
    const clientIdDisplay = document.getElementById('client-id-display');
    if(clientIdDisplay) clientIdDisplay.textContent = clientId;
    
    loadSavedDevices();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    fetchWeather();
});

const mqttStatusEl = document.getElementById('mqtt-status');
if(mqttStatusEl) {
    mqttStatusEl.textContent = 'Menghubungkan...';
    mqttStatusEl.style.color = '#f87171';
}

const client = mqtt.connect(brokerUrl, {
    clientId: clientId,
    clean: true,
    connectTimeout: 5000
});

client.on('connect', () => {
    if(mqttStatusEl) {
        mqttStatusEl.textContent = 'Terhubung (Cloud)';
        mqttStatusEl.style.color = '#4ade80';
    }
    console.log("[MQTT] Berhasil terhubung dengan Client ID:", clientId);
    addLog('Berhasil terhubung ke Cloud MQTT Broker.');
    client.subscribe('samurai/control/#', { qos: 0 });
});

client.on('error', (err) => {
    if(mqttStatusEl) {
        mqttStatusEl.textContent = 'Gagal Terhubung';
        mqttStatusEl.style.color = '#f87171';
    }
    console.error("[MQTT] Error koneksi:", err);
    addLog('Koneksi MQTT Error: ' + err.message);
    client.end();
});

// Menerima pesan dari perangkat lain
client.on('message', (topic, payload) => {
    const message = payload.toString();
    console.log(`[MQTT RECEIVED] Topik: ${topic} | Pesan: ${message}`);
    
    const parts = topic.split('/');
    const deviceNameRaw = parts[parts.length - 1]; 

    let found = false;

    document.querySelectorAll('.device-item').forEach(item => {
        const spanText = item.querySelector('span');
        if (spanText && spanText.textContent.toLowerCase().includes(deviceNameRaw.replace(/_/g, ' '))) {
            found = true;
            const icon = item.querySelector('.status-icon');
            if (message === 'ON' && !item.classList.contains('active')) {
                item.classList.add('active');
                if(icon) icon.textContent = '🔵';
                addLog(`[Sinkronisasi] Perangkat diaktifkan dari perangkat lain.`);
            } else if (message === 'OFF' && item.classList.contains('active')) {
                item.classList.remove('active');
                if(icon) icon.textContent = '⚪';
                addLog(`[Sinkronisasi] Perangkat dinonaktifkan dari perangkat lain.`);
            }
        }
    });

    if (!found && deviceNameRaw) {
        const formattedName = deviceNameRaw.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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

            addLog(`[Sinkronisasi] Perangkat baru <b>${formattedName}</b> ditambahkan secara otomatis.`);
        }
    }
});

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
    
    const dateStr = now.toLocaleDateString('id-ID', { timeZone: reg.tz, day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('id-ID', { timeZone: reg.tz, hour: '2-digit', minute: '2-digit', second: '2-digit' });

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
        addLog(`Perangkat <b>${deviceName}</b> dinyalakan (ON).`);
    } else {
        if(icon) icon.textContent = '⚪';
        state = 'OFF';
        addLog(`Perangkat <b>${deviceName}</b> dimatikan (OFF).`);
    }

    if (client.connected) {
        const topic = `samurai/control/${deviceName.toLowerCase().replace(/\s+/g, '_')}`;
        console.log(`[MQTT PUBLISH] Topik: ${topic} | State: ${state}`);
        client.publish(topic, state, { qos: 0 });
    } else {
        console.warn("[MQTT] Tidak dapat mengirim, klien terputus.");
    }
}

function loadSavedDevices() {
    const saved = localStorage.getItem('samurai_custom_devices');
    if (saved) {
        const devices = JSON.parse(saved);
        const deviceGrid = document.querySelector('.device-grid');
        const addBtnItem = document.querySelector('.add-btn');
        
        devices.forEach(deviceName => {
            const newCard = document.createElement('div');
            newCard.className = 'device-item';
            newCard.setAttribute('onclick', `toggleDevice(this, '${deviceName}')`);
            newCard.innerHTML = `<span>🏮 ${deviceName}</span> <span class="status-icon">⚪</span>`;
            
            if(deviceGrid && addBtnItem) {
                deviceGrid.insertBefore(newCard, addBtnItem);
            }
        });
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
        alert('Nama perangkat tidak boleh kosong!');
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
    addLog(`Perangkat baru ditambahkan: <b>${deviceName}</b>.`);
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
        const headerTitle = document.querySelector('.header h1');
        if(headerTitle) headerTitle.textContent = newTitle;
        addLog(`Teks sambutan diubah menjadi: "${newTitle}".`);
    }

    const regionSelect = document.getElementById('regionSelect');
    if (regionSelect && regionSelect.value && regionData[regionSelect.value]) {
        currentRegionKey = regionSelect.value;
        const regName = regionData[currentRegionKey].name;
        addLog(`Wilayah aktif diubah ke: <b>${regName}</b>.`);
        updateDateTime();
        fetchWeather();
    }

    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        if (themeSelect.value === 'light') {
            document.body.classList.add('light-mode');
            addLog(`Tema diubah ke: <b>Light Mode (Terang)</b>.`);
        } else {
            document.body.classList.remove('light-mode');
            addLog(`Tema diubah ke: <b>Dark Mode (Gelap)</b>.`);
        }
    }

    const wallpaperStatusSelect = document.getElementById('wallpaperStatusSelect');
    const wallpaperCard = document.querySelector('.wallpaper-card');
    if (wallpaperStatusSelect && wallpaperCard) {
        if (wallpaperStatusSelect.value === 'off') {
            wallpaperCard.style.display = 'none';
            addLog(`Live Wallpaper dinonaktifkan.`);
        } else {
            wallpaperCard.style.display = 'block';
            addLog(`Live Wallpaper diaktifkan.`);
        }
    }

    const wallpaperFileSelect = document.getElementById('wallpaperFileSelect');
    if (wallpaperFileSelect) {
        const selectedVideoUrl = wallpaperFileSelect.value;
        const videoElement = document.getElementById('wallpaperVideo');
        const sourceElement = document.getElementById('videoSource');
        const titleElement = document.getElementById('wallpaperTitle');

        if(sourceElement && videoElement) {
            sourceElement.src = selectedVideoUrl;
            videoElement.load();
        }

        if (titleElement) {
            const selectedText = wallpaperFileSelect.options[wallpaperFileSelect.selectedIndex].text;
            titleElement.textContent = selectedText + ' ⚔️';
            addLog(`Wallpaper diganti ke: <b>${selectedText}</b>.`);
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
    weatherBox.textContent = `${reg.name} ⛅ Memuat cuaca...`;
    
    try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${reg.lat}&longitude=${reg.lon}&current=temperature_2m`);
        const data = await response.json();
        const temp = Math.round(data.current.temperature_2m);
        weatherBox.textContent = `${reg.name} ⛅ ${temp}°C`;
    } catch (error) {
        weatherBox.textContent = `${reg.name} ⛅ 28°C`;
    }
}