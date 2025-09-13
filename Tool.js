// ==UserScript==
// @name         UGPHONE VIP TOOL (Premium UI)
// @namespace    https://github.com/gemini-coder
// @version      6.0
// @description  Tool UGPHONE VIP với giao diện premium, menu hiện đại
// @author       HoangAnh (UI by Gemini)
// @match        https://www.ugphone.com/toc-portal/*
// @match        https://www.ugphone.com/toc-portal/#/dashboard/index
// @icon         https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGhmdmJyN3cxdWNjNDc1aG5iN3J4eTBrMWV6Z3lscTh0MHFnemV0diZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/jPdNzfqIDmokLbSqO0/giphy.gif
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    const ENCODED_API_TOKEN = "ZDFhZDVlODViZTdiMWZhYjk0ZmQxNWM5MTAyYTY5ZGQ4MjdjMDJjN2ZiNDM0ZQ==";
    const serverOptions = [
        { label: "🇸🇬 Singapore", value: "Singapore" },
        { label: "🇭🇰 Hong Kong", value: "Hong Kong" },
        { label: "🇯🇵 Japan", value: "Japan" },
        { label: "🇺🇸 America", value: "America" },
        { label: "🇩🇪 Germany", value: "Germany" },
        { label: "🇹🇼 Taiwan", value: "Taiwan" },
        { label: "🇰🇷 Korea", value: "Korea" }
    ];
    const bubbleIconUrl = "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGhmdmJyN3cxdWNjNDc1aG5iN3J4eTBrMWV6Z3lscTh0MHFnemV0diZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/jPdNzfqIDmokLbSqO0/giphy.gif";

    GM_addStyle(`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        :root {
            --primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            --primary-color: #667eea;
            --secondary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            --success: linear-gradient(135deg, #13f1fc 0%, #0470dc 100%);
            --danger: linear-gradient(135deg, #f43b47 0%, #453a94 100%);
            --dark: #1a1a2e;
            --light: #ffffff;
            --gray: #94a3b8;
            --border: rgba(255, 255, 255, 0.1);
            --shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            --glass: rgba(255, 255, 255, 0.05);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        #ugp-tool-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(10, 10, 20, 0.8);
            backdrop-filter: blur(20px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        #ugp-tool-container.visible {
            opacity: 1;
            visibility: visible;
        }

        .ugp-modal {
            background: linear-gradient(145deg, #1e1e2e 0%, #2a2a3e 100%);
            border-radius: 24px;
            box-shadow: var(--shadow);
            width: 90%;
            max-width: 480px;
            overflow: hidden;
            transform: translateY(20px) scale(0.95);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid var(--border);
        }
        
        #ugp-tool-container.visible .ugp-modal {
            transform: translateY(0) scale(1);
        }

        .ugp-header {
            background: var(--primary);
            padding: 24px;
            position: relative;
            overflow: hidden;
        }
        
        .ugp-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: shimmer 3s infinite;
        }
        
        @keyframes shimmer {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(180deg); }
        }
        
        .ugp-header-content {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .ugp-title {
            font-size: 24px;
            font-weight: 700;
            color: var(--light);
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .ugp-close-btn {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: none;
            background: rgba(255, 255, 255, 0.2);
            color: var(--light);
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            backdrop-filter: blur(10px);
        }
        
        .ugp-close-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: rotate(90deg);
        }

        .ugp-nav {
            display: flex;
            gap: 8px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid var(--border);
        }
        
        .ugp-nav-item {
            flex: 1;
            padding: 12px;
            background: var(--glass);
            border: 1px solid var(--border);
            border-radius: 12px;
            color: var(--gray);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .ugp-nav-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--primary);
            opacity: 0;
            transition: opacity 0.2s;
        }
        
        .ugp-nav-item.active {
            color: var(--light);
            border-color: var(--primary-color);
        }
        
        .ugp-nav-item.active::before {
            opacity: 1;
        }
        
        .ugp-nav-item span {
            position: relative;
            z-index: 1;
        }
        
        .ugp-nav-item:hover:not(.active) {
            background: rgba(255, 255, 255, 0.08);
            color: var(--light);
        }

        .ugp-content {
            padding: 24px;
            max-height: 60vh;
            overflow-y: auto;
        }
        
        .ugp-content::-webkit-scrollbar {
            width: 6px;
        }
        
        .ugp-content::-webkit-scrollbar-track {
            background: var(--glass);
            border-radius: 3px;
        }
        
        .ugp-content::-webkit-scrollbar-thumb {
            background: var(--primary);
            border-radius: 3px;
        }
        
        .ugp-tab-pane {
            display: none;
            animation: fadeInUp 0.3s ease;
        }
        
        .ugp-tab-pane.active {
            display: block;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .ugp-form-group {
            margin-bottom: 20px;
        }
        
        .ugp-label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: var(--gray);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .ugp-textarea, .ugp-select {
            width: 100%;
            padding: 14px 16px;
            background: var(--glass);
            border: 1px solid var(--border);
            border-radius: 12px;
            color: var(--light);
            font-size: 15px;
            font-family: inherit;
            transition: all 0.2s;
        }
        
        .ugp-textarea {
            min-height: 120px;
            resize: vertical;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
            font-size: 13px;
        }
        
        .ugp-textarea:focus, .ugp-select:focus {
            outline: none;
            border-color: var(--primary-color);
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .ugp-select {
            cursor: pointer;
            background-image: url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23667eea' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 16px center;
            appearance: none;
            padding-right: 40px;
        }
        
        .ugp-select option {
            background: #1a1a2e;
            color: var(--light);
        }

        .ugp-btn {
            width: 100%;
            padding: 14px 20px;
            border: none;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            position: relative;
            overflow: hidden;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }
        
        .ugp-btn:last-child {
            margin-bottom: 0;
        }
        
        .ugp-btn::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transform: translate(-50%, -50%);
            transition: width 0.3s, height 0.3s;
        }
        
        .ugp-btn:active::before {
            width: 300px;
            height: 300px;
        }
        
        .ugp-btn-primary {
            background: var(--primary);
            color: var(--light);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        .ugp-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .ugp-btn-secondary {
            background: var(--glass);
            color: var(--light);
            border: 1px solid var(--border);
        }
        
        .ugp-btn-secondary:hover {
            background: rgba(255, 255, 255, 0.08);
            border-color: var(--primary-color);
        }
        
        .ugp-btn-danger {
            background: var(--danger);
            color: var(--light);
            box-shadow: 0 4px 15px rgba(244, 59, 71, 0.3);
        }
        
        .ugp-btn-danger:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(244, 59, 71, 0.4);
        }
        
        .ugp-btn-success {
            background: var(--success);
            color: var(--light);
            box-shadow: 0 4px 15px rgba(19, 241, 252, 0.3);
        }
        
        .ugp-btn-success:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(19, 241, 252, 0.4);
        }
        
        .ugp-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }

        .ugp-divider {
            height: 1px;
            background: var(--border);
            margin: 24px 0;
        }

        .ugp-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }
        
        .ugp-stat-card {
            background: var(--glass);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            transition: all 0.2s;
        }
        
        .ugp-stat-card:hover {
            background: rgba(255, 255, 255, 0.08);
            transform: translateY(-2px);
        }
        
        .ugp-stat-icon {
            font-size: 24px;
            margin-bottom: 8px;
        }
        
        .ugp-stat-value {
            font-size: 20px;
            font-weight: 700;
            color: var(--light);
            margin-bottom: 4px;
        }
        
        .ugp-stat-label {
            font-size: 11px;
            color: var(--gray);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        #ugp-fab {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            border: none;
            background: url('${bubbleIconUrl}') no-repeat center/cover;
            box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
            cursor: pointer;
            z-index: 99998;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        #ugp-fab:hover {
            transform: scale(1.1) rotate(10deg);
            box-shadow: 0 10px 40px rgba(102, 126, 234, 0.5);
        }
        
        #ugp-fab:active {
            transform: scale(0.95);
        }

        .ugp-toast {
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
            backdrop-filter: blur(10px);
            color: var(--light);
            font-size: 14px;
            font-weight: 500;
            padding: 16px 24px;
            border-radius: 50px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 1000001;
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .ugp-toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        .ugp-info-card {
            background: var(--glass);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .ugp-info-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--light);
            margin-bottom: 12px;
        }
        
        .ugp-info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--border);
            font-size: 14px;
        }
        
        .ugp-info-item:last-child {
            border-bottom: none;
        }
        
        .ugp-info-label {
            color: var(--gray);
        }
        
        .ugp-info-value {
            color: var(--light);
            font-weight: 500;
        }
    `);

    document.body.insertAdjacentHTML('beforeend', `
        <button id="ugp-fab" title="Mở UGPHONE VIP Tool"></button>

        <div id="ugp-tool-container">
            <div class="ugp-modal">
                <div class="ugp-header">
                    <div class="ugp-header-content">
                        <h1 class="ugp-title">
                            <span>🚀</span>
                            UGPHONE VIP
                        </h1>
                        <button class="ugp-close-btn" title="Đóng">✕</button>
                    </div>
                </div>
                
                <nav class="ugp-nav">
                    <div class="ugp-nav-item active" data-tab="import">
                        <span>📥 Import</span>
                    </div>
                    <div class="ugp-nav-item" data-tab="tools">
                        <span>🛠️ Tools</span>
                    </div>
                    <div class="ugp-nav-item" data-tab="settings">
                        <span>⚙️ Settings</span>
                    </div>
                </nav>
                
                <div class="ugp-content">
                    <div class="ugp-tab-pane active" data-tab-content="import">
                        <div class="ugp-form-group">
                            <label class="ugp-label">Import Data</label>
                            <textarea id="ugp-json-input" class="ugp-textarea" 
                                placeholder='Paste your localStorage JSON or Token here...\n\nExample:\n{ "UGPHONE-Token": "...", "UGPHONE-ID": "..." }'></textarea>
                        </div>
                        <button id="ugp-login-btn" class="ugp-btn ugp-btn-primary">
                            🔐 Import & Login
                        </button>
                        <button id="ugp-copy-btn" class="ugp-btn ugp-btn-secondary">
                            📋 Copy Current Data
                        </button>
                    </div>

                    <div class="ugp-tab-pane" data-tab-content="tools">
                        <div class="ugp-stats">
                            <div class="ugp-stat-card">
                                <div class="ugp-stat-icon">📱</div>
                                <div class="ugp-stat-value" id="device-count">0</div>
                                <div class="ugp-stat-label">Devices</div>
                            </div>
                            <div class="ugp-stat-card">
                                <div class="ugp-stat-icon">🌍</div>
                                <div class="ugp-stat-value">7</div>
                                <div class="ugp-stat-label">Servers</div>
                            </div>
                            <div class="ugp-stat-card">
                                <div class="ugp-stat-icon">✅</div>
                                <div class="ugp-stat-value" id="status">ON</div>
                                <div class="ugp-stat-label">Status</div>
                            </div>
                        </div>
                        
                        <div class="ugp-form-group">
                            <label class="ugp-label">Select Server</label>
                            <select id="ugp-server-select" class="ugp-select"></select>
                        </div>
                        
                        <button id="ugp-auto-buy-btn" class="ugp-btn ugp-btn-primary">
                            🚀 Auto Buy Device
                        </button>
                        
                        <div class="ugp-divider"></div>
                        
                        <button id="ugp-refresh-btn" class="ugp-btn ugp-btn-success">
                            🔄 Refresh Page
                        </button>
                        
                        <button id="ugp-logout-btn" class="ugp-btn ugp-btn-danger">
                            🚪 Logout
                        </button>
                    </div>

                    <div class="ugp-tab-pane" data-tab-content="settings">
                        <div class="ugp-info-card">
                            <div class="ugp-info-title">📊 Information</div>
                            <div class="ugp-info-item">
                                <span class="ugp-info-label">Version</span>
                                <span class="ugp-info-value">6.0 Premium</span>
                            </div>
                            <div class="ugp-info-item">
                                <span class="ugp-info-label">Developer</span>
                                <span class="ugp-info-value">HoangAnh</span>
                            </div>
                            <div class="ugp-info-item">
                                <span class="ugp-info-label">UI Design</span>
                                <span class="ugp-info-value">Gemini AI</span>
                            </div>
                            <div class="ugp-info-item">
                                <span class="ugp-info-label">Status</span>
                                <span class="ugp-info-value" style="color: #13f1fc;">Active</span>
                            </div>
                        </div>
                        
                        <button id="ugp-export-settings" class="ugp-btn ugp-btn-success">
                            💾 Export Settings
                        </button>
                        
                        <button id="ugp-clear-cache" class="ugp-btn ugp-btn-secondary">
                            🗑️ Clear Cache
                        </button>
                        
                        <button id="ugp-hide-btn" class="ugp-btn ugp-btn-secondary">
                            👁️ Hide Menu
                        </button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="ugp-toast" id="ugp-toast"></div>
    `);

    const get = id => document.getElementById(id);
    const fab = get('ugp-fab');
    const container = get('ugp-tool-container');
    const closeModalBtn = container.querySelector('.ugp-close-btn');
    const navItems = container.querySelectorAll('.ugp-nav-item');
    const tabPanes = container.querySelectorAll('.ugp-tab-pane');
    const jsonInput = get('ugp-json-input');
    const btnLogin = get('ugp-login-btn');
    const btnCopy = get('ugp-copy-btn');
    const serverSelect = get('ugp-server-select');
    const btnAutoBuy = get('ugp-auto-buy-btn');
    const btnRefresh = get('ugp-refresh-btn');
    const btnLogout = get('ugp-logout-btn');
    const btnHide = get('ugp-hide-btn');
    const btnExportSettings = get('ugp-export-settings');
    const btnClearCache = get('ugp-clear-cache');
    const toast = get('ugp-toast');

    const toggleModal = show => container.classList.toggle('visible', show);

    const handleNavClick = event => {
        const clickedNav = event.currentTarget;
        const targetTabName = clickedNav.dataset.tab;
        navItems.forEach(nav => nav.classList.toggle('active', nav === clickedNav));
        tabPanes.forEach(pane => pane.classList.toggle('active', pane.dataset.tabContent === targetTabName));
    };

    const showToast = (msg, duration = 3500) => {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    };
    
    const populateServerOptions = () => {
        serverSelect.innerHTML = '<option value="">-- Choose Server --</option>';
        serverOptions.forEach(server => {
            const option = document.createElement('option');
            option.value = server.value;
            option.textContent = server.label;
            serverSelect.appendChild(option);
        });
    };

    const updateDeviceCount = () => {
        const devices = document.querySelectorAll('.device-item').length || 0;
        const deviceCount = get('device-count');
        if (deviceCount) deviceCount.textContent = devices;
    };

    const handleLogin = () => {
        const text = jsonInput.value.trim();
        if (!text) return showToast('⚠️ Please enter JSON or token');
        try {
            const data = JSON.parse(text);
            Object.entries(data).forEach(([key, value]) => {
                localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
            });
            showToast('✅ Import successful! Reloading...');
            setTimeout(() => location.reload(), 1000);
        } catch (e) {
            showToast('❌ Error: Invalid JSON data');
        }
    };

    const handleCopy = async () => {
        const keyOrder = [
            "ugPhoneLang", "ugBrowserId", "UGPHONE-ID", "UGrightSlideTips",
            "hadAgreePolicy", "_gcl_ls", "UGPHONE-Token", "UGPHONE-MQTT"
        ];
        const allStorage = { ...localStorage };
        const orderedData = {};
        keyOrder.forEach(key => {
            if (allStorage[key] !== undefined) orderedData[key] = allStorage[key];
        });
        const finalData = { ...orderedData, ...allStorage };
        const json = JSON.stringify(finalData, null, 2);

        try {
            await navigator.clipboard.writeText(json);
            showToast('✅ Data copied to clipboard!');
        } catch (err) {
            showToast('❌ Copy failed!');
        }
    };

    const handleAutoBuy = async () => {
        const selectedServer = serverSelect.value;
        
        if (!selectedServer) {
            return showToast("⚠️ Please select a server");
        }

        btnAutoBuy.disabled = true;
        serverSelect.disabled = true;
        showToast(`⏳ Buying device on ${selectedServer}...`);

        const ugphoneId = localStorage.getItem('UGPHONE-ID');
        const ugphoneToken = localStorage.getItem('UGPHONE-Token');

        if (!ugphoneId || !ugphoneToken) {
            showToast("❌ Please login first!");
            btnAutoBuy.disabled = false;
            serverSelect.disabled = false;
            return;
        }

        try {
            const apiToken = atob(ENCODED_API_TOKEN);
            const response = await fetch('https://api.nikata.fun/buy_device_ugphone', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: apiToken,
                    ugphone_id: ugphoneId,
                    ugphone_token: ugphoneToken,
                    server: selectedServer
                })
            });
            
            const result = await response.json();
            showToast(result.message || "✅ Success!");
            
            if (result.message && result.message.includes("thành công")) {
                setTimeout(() => location.reload(), 2000);
            }
        } catch (e) {
            showToast(`❌ API Error: ${e.message}`);
        } finally {
            btnAutoBuy.disabled = false;
            serverSelect.disabled = false;
        }
    };

    const handleRefresh = () => {
        showToast('🔄 Refreshing...');
        setTimeout(() => location.reload(), 500);
    };

    const handleLogout = () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.clear();
            showToast('👋 Logged out! Reloading...');
            setTimeout(() => location.reload(), 1000);
        }
    };

    const handleHide = () => {
        toggleModal(false);
        fab.style.display = "none";
        showToast('👁️ Menu hidden. Reload page to show again');
    };

    const handleExportSettings = async () => {
        const settings = {
            lastServer: serverSelect.value,
            version: "6.0",
            timestamp: new Date().toISOString()
        };
        try {
            await navigator.clipboard.writeText(JSON.stringify(settings, null, 2));
            showToast('💾 Settings exported!');
        } catch (err) {
            showToast('❌ Export failed!');
        }
    };

    const handleClearCache = () => {
        if (confirm('Clear all cache data?')) {
            sessionStorage.clear();
            showToast('🗑️ Cache cleared!');
        }
    };

    const initialize = () => {
        fab.addEventListener('click', () => toggleModal(true));
        closeModalBtn.addEventListener('click', () => toggleModal(false));
        container.addEventListener('click', e => {
            if (e.target === container) toggleModal(false);
        });

        navItems.forEach(nav => nav.addEventListener('click', handleNavClick));

        btnLogin.addEventListener('click', handleLogin);
        btnCopy.addEventListener('click', handleCopy);
        btnAutoBuy.addEventListener('click', handleAutoBuy);
        btnRefresh.addEventListener('click', handleRefresh);
        btnLogout.addEventListener('click', handleLogout);
        btnHide.addEventListener('click', handleHide);
        btnExportSettings.addEventListener('click', handleExportSettings);
        btnClearCache.addEventListener('click', handleClearCache);
        
        populateServerOptions();
        updateDeviceCount();
        
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && container.classList.contains('visible')) {
                toggleModal(false);
            }
        });
    };

    initialize();

})();
