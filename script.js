let client = null;
let brokerUrl = 'wss://broker.emqx.io:8083/mqtt'; // Ubah ke URL WebSocket EMQX Cloud Anda (misal: wss://xxxx.ala.eu-central-1.emqxcloud.com:8084/mqtt)

// Fungsi Navigasi Bawah
function switchView(viewName, element) {
    document.querySelectorAll('.bottom-nav .nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (element && !element.classList.contains('settings-btn')) {
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

// Catatan Aktivitas (Log)
function addLog(actionMessage) {
    const logList = document.getElementById('logList');
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    logItem.innerHTML = `<span>${actionMessage}</span> <span class="log-time">${timeStr}</span>`;
    
    logList.prepend(logItem);
}

// Inisialisasi Koneksi EMQX Cloud
function initMQTT() {
    const statusText = document.getElementById('mqtt-status');
    const mqttBadge = document.getElementById('mqtt-badge');

    addLog(`Menghubungkan ke broker...`);
    
    const options = {
        clientId: 'SamuraiMobile_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        connectTimeout: 5000
    };

    client = mqtt.connect(brokerUrl, options);

    client.on('connect', () => {
        statusText.textContent = 'Terhubung (Online)';
        statusText.style.color = '#4ade80';
        mqttBadge.textContent = 'Online';
        mqttBadge.classList.add('online');
        addLog('Berhasil terhubung ke EMQX!');

        // Subscribe topik agar dashboard bisa menerima data sensor/feedback perangkat
        client.subscribe('samurai/#', (err) => {
            if (!err) {
                addLog('Berhasil subscribe topik samurai/#');
            }
        });
    });

    client.on('message', (topic, payload) => {
        const messageStr = payload.toString();
        addLog(`Pesan masuk [${topic}]: ${messageStr}`);
    });

    client.on('error', (err) => {
        console.error('MQTT Error: ', err);
        statusText.textContent = 'Gagal Koneksi';
        mqttBadge.textContent = 'Error';
        addLog('Koneksi MQTT Gagal.');
        client.end();
    });

    client.on('offline', () => {
        statusText.textContent = 'Terputus (Offline)';
        mqttBadge.textContent = 'Offline';
        mqttBadge.classList.remove('online');
        addLog('Koneksi MQTT terputus.');
    });
}

// Fungsi Toggle Perangkat & Publish ke MQTT
function toggleDevice(element, deviceName, topic) {
    element.classList.toggle('active');
    const icon = element.querySelector('.status-icon');
    let state = 'OFF';

    if (element.classList.contains('active')) {
        icon.textContent = '🔵';
        state = 'ON';
        addLog(`<b>${deviceName}</b> dinyalakan.`);
    } else {
        icon.textContent = '⚪';
        state = 'OFF';
        addLog(`<b>${deviceName}</b> dimatikan.`);
    }

    // Kirim perintah ke broker EMQX
    if (client && client.connected) {
        client.publish(topic, state);
        addLog(`Publish [${topic}] -> ${state}`);
    } else {
        addLog(`MQTT belum terhubung! Perintah gagal dikirim.`);
    }
}

// Modal Tambah Perangkat
function openAddModal() {
    document.getElementById('addModal').style.display = 'flex';
}

function closeAddModal() {
    document.getElementById('addModal').style.display = 'none';
    document.getElementById('deviceNameInput').value = '';
}

function confirmAddDevice() {
    const deviceName = document.getElementById('deviceNameInput').value.trim();
    if (!deviceName) {
        alert('Nama perangkat tidak boleh kosong!');
        return;
    }

    const deviceGrid = document.querySelector('.device-grid');
    const addBtnItem = document.querySelector('.add-btn');
    const topicKey = 'samurai/' + deviceName.toLowerCase().replace(/\s+/g, '_');

    const newCard = document.createElement('div');
    newCard.className = 'device-item';
    newCard.setAttribute('onclick', `toggleDevice(this, '${deviceName}', '${topicKey}')`);
    newCard.innerHTML = `<span>${deviceName}</span> <span class="status-icon">⚪</span>`;

    deviceGrid.insertBefore(newCard, addBtnItem);
    addLog(`Perangkat ditambahkan: <b>${deviceName}</b>.`);
    closeAddModal();
}

// Pengaturan Modal
function openSettings() {
    document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

function saveSettings() {
    const newTitle = document.getElementById('welcomeInput').value.trim();
    if (newTitle) {
        document.getElementById('mainTitle').textContent = newTitle;
        addLog(`Judul diubah ke: "${newTitle}".`);
    }

    const newBroker = document.getElementById('brokerInput').value.trim();
    if (newBroker && newBroker !== brokerUrl) {
        brokerUrl = newBroker;
        addLog(`Mengubah broker ke: ${brokerUrl}`);
        if (client) client.end(true);
        initMQTT();
    }

    const theme = document.getElementById('themeSelect').value;
    if (theme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }

    closeSettings();
}

// Widget Cuaca Real-Time
async function fetchWeather() {
    const weatherBox = document.getElementById('weather-widget');
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-5.1477&longitude=119.4327&current=temperature_2m');
        const data = await response.json();
        const temp = Math.round(data.current.temperature_2m);
        weatherBox.textContent = `Makassar ⛅ ${temp}°C`;
    } catch (e) {
        weatherBox.textContent = `Makassar ⛅ 28°C`;
    }
}

// Inisialisasi otomatis saat dibuka di HP
window.addEventListener('DOMContentLoaded', () => {
    fetchWeather();
    initMQTT();
});