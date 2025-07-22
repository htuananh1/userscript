(function() {
    'use strict';

    // ================== CẤU HÌNH ==================
    const GITHUB_API_FILE_URL = 'https://api.github.com/repos/htuananh1/userscript/contents/Linkday.js';
    const GITHUB_KEYWORDS_URL = 'https://raw.githubusercontent.com/htuananh1/userscript/main/Linkday.js';
    const GITHUB_TOKEN = 'ghp_xxx'; // <-- Thay bằng token của bạn!
    const LOCAL_KEYWORDS_KEY = 'linkday_pro_keywords_v4';
    const WORD_TRIGGER_SELECTOR = 'strong.bg-gray-600.text-white.p-2.select-none';
    const AUTO_TASK_INPUT_SELECTOR = 'input[name="code"], input[placeholder*="Nhập mã xác nhận"]';
    const AUTO_TASK_SUBMIT_SELECTOR = 'button[type="submit"].submit-button';
    const CHANGE_KEYWORD_BUTTON_SELECTOR = 'button#changeCampaignButton';
    const FALLBACK_KEYWORDS = {};

    let WORD_TO_INPUT_MAP = {};
    let config = { autoSubmit: true };
    let uiInitialized = false;
    let lastDetectedNewKeyword = '';
    let sentKeywords = {}; // Để tránh gửi trùng

    // =============== KHỞI CHẠY SCRIPT ==============
    const observer = new MutationObserver(() => { if (!document.getElementById('gemini-fab')) { uiInitialized = false; initializeUI(); } });
    function startGuardian() { if (document.body) { observer.observe(document.body, { childList: true, subtree: true }); initializeUI(); } else { setTimeout(startGuardian, 100); } }
    startGuardian();

    async function initializeUI() {
        if (uiInitialized || !document.body || document.getElementById('gemini-fab')) return;
        uiInitialized = true;
        if (window.top === window.self) {
            setupStyles();
            createUI();
            await loadAllSettings();
            runLogicOn(document);
            setInterval(checkForNewKeyword, 1500);
        }
    }

    // =============== QUẢN LÝ DỮ LIỆU ===============
    function fetchKeywordsFromGithub() {
        return new Promise((resolve) => {
            console.log('🔄 Đang tải từ khóa từ GitHub:', GITHUB_KEYWORDS_URL);
            GM_xmlhttpRequest({
                method: 'GET',
                url: GITHUB_KEYWORDS_URL,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                timeout: 10000,
                onload: function(response) {
                    console.log('📥 GitHub Response Status:', response.status);
                    console.log('📥 GitHub Response Text:', response.responseText.substring(0, 200));
                    
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const data = JSON.parse(response.responseText);
                            console.log('✅ Đã tải thành công', Object.keys(data).length, 'từ khóa từ GitHub');
                            showToast(`✅ Đã tải ${Object.keys(data).length} từ khóa từ GitHub`, 'success', 2000);
                            resolve(data);
                        } catch (e) {
                            console.error('❌ Lỗi parse JSON:', e);
                            showToast('❌ File GitHub không đúng định dạng JSON!', 'fail');
                            resolve(FALLBACK_KEYWORDS);
                        }
                    } else {
                        console.error('❌ GitHub API Error:', response.status, response.statusText);
                        showToast(`❌ Lỗi GitHub API (${response.status})`, 'fail');
                        resolve(FALLBACK_KEYWORDS);
                    }
                },
                onerror: function(error) {
                    console.error('❌ Network Error:', error);
                    showToast('❌ Không thể kết nối đến GitHub!', 'fail');
                    resolve(FALLBACK_KEYWORDS);
                },
                ontimeout: function() {
                    console.error('❌ GitHub Request Timeout');
                    showToast('⏰ Timeout khi tải từ GitHub!', 'fail');
                    resolve(FALLBACK_KEYWORDS);
                }
            });
        });
    }

    async function loadAllSettings() {
        try {
            console.log('🔄 Đang tải cài đặt...');
            
            // Tải cài đặt auto submit
            config.autoSubmit = await GM_getValue('autoSubmit', true);
            console.log('⚙️ Auto Submit:', config.autoSubmit);
            
            // Tải từ khóa từ GitHub
            const githubKeywords = await fetchKeywordsFromGithub();
            console.log('📦 GitHub Keywords:', githubKeywords ? Object.keys(githubKeywords).length : 0);
            
            // Tải từ khóa cục bộ
            const localKeywordsJSON = await GM_getValue(LOCAL_KEYWORDS_KEY, '{}');
            let localKeywords = {};
            try { 
                localKeywords = JSON.parse(localKeywordsJSON); 
                console.log('💾 Local Keywords:', Object.keys(localKeywords).length);
            } catch (e) { 
                console.error('❌ Lỗi parse local keywords:', e);
                localKeywords = {}; 
            }
            
            // Kết hợp từ khóa
            const githubData = githubKeywords || FALLBACK_KEYWORDS;
            WORD_TO_INPUT_MAP = { ...githubData, ...localKeywords };
            console.log('🔗 Tổng từ khóa:', Object.keys(WORD_TO_INPUT_MAP).length);
            
            // Cập nhật UI
            updateUIWithSettings();
            renderKeywordList();
            
            const totalKeywords = Object.keys(WORD_TO_INPUT_MAP).length;
            if (totalKeywords > 0) {
                showToast(`🎉 Đã tải ${totalKeywords} từ khóa thành công!`, 'success');
            } else {
                showToast('⚠️ Chưa có từ khóa nào được tải!', 'info');
            }
            
        } catch (error) {
            console.error('❌ Lỗi loadAllSettings:', error);
            showToast('❌ Lỗi khi tải cài đặt!', 'fail');
            
            // Fallback to local only
            WORD_TO_INPUT_MAP = {};
            updateUIWithSettings();
            renderKeywordList();
        }
    }

    async function saveKeywordsToStorage() {
        const githubAndFallback = await fetchKeywordsFromGithub() || FALLBACK_KEYWORDS;
        const keywordsToSave = Object.fromEntries(
            Object.entries(WORD_TO_INPUT_MAP).filter(([key]) => !githubAndFallback.hasOwnProperty(key))
        );
        await GM_setValue(LOCAL_KEYWORDS_KEY, JSON.stringify(keywordsToSave));
    }

    // ========== GỬI TOÀN BỘ DANH SÁCH LÊN GITHUB ==========
    function sendAllKeywordsToGithubFile() {
        if (!GITHUB_TOKEN || GITHUB_TOKEN === 'ghp_xxx') {
            showToast('Chưa cấu hình GitHub Token!', 'fail');
            return;
        }
        const allKeywords = WORD_TO_INPUT_MAP;
        GM_xmlhttpRequest({
            method: "GET",
            url: GITHUB_API_FILE_URL,
            headers: {
                "Authorization": "token " + GITHUB_TOKEN,
                "Accept": "application/vnd.github+json"
            },
            onload: function(response) {
                if (response.status === 200) {
                    const res = JSON.parse(response.responseText);
                    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(allKeywords, null, 2))));
                    GM_xmlhttpRequest({
                        method: "PUT",
                        url: GITHUB_API_FILE_URL,
                        headers: {
                            "Authorization": "token " + GITHUB_TOKEN,
                            "Accept": "application/vnd.github+json"
                        },
                        data: JSON.stringify({
                            message: `Update all keywords from script`,
                            content: newContent,
                            sha: res.sha
                        }),
                        onload: function(r2) {
                            if (r2.status === 200 || r2.status === 201) {
                                showToast('Đã ghi toàn bộ danh sách lên GitHub!', 'success');
                            } else {
                                showToast('Ghi lên GitHub thất bại!', 'fail');
                            }
                        },
                        onerror: function() {
                            showToast('Lỗi mạng khi ghi lên GitHub!', 'fail');
                        }
                    });
                } else {
                    showToast('Không đọc được file Linkday.js!', 'fail');
                }
            },
            onerror: function() {
                showToast('Lỗi mạng khi đọc file Linkday.js!', 'fail');
            }
        });
    }

    // ========== GỬI TỪ KHOÁ MỚI LÊN GITHUB ==========
    function sendKeywordToGithubFile(keyword, value) {
        if (!keyword || !value) return;
        if (!GITHUB_TOKEN || GITHUB_TOKEN === 'ghp_xxx') {
            showToast('Chưa cấu hình GitHub Token!', 'fail');
            return;
        }
        if (sentKeywords[keyword]) return; // Đã gửi rồi thì bỏ qua
        sentKeywords[keyword] = true;
        GM_xmlhttpRequest({
            method: "GET",
            url: GITHUB_API_FILE_URL,
            headers: {
                "Authorization": "token " + GITHUB_TOKEN,
                "Accept": "application/vnd.github+json"
            },
            onload: function(response) {
                if (response.status === 200) {
                    const res = JSON.parse(response.responseText);
                    let content = atob(res.content.replace(/\n/g, ''));
                    let json;
                    try {
                        json = JSON.parse(content);
                    } catch (e) {
                        showToast('File Linkday.js không phải JSON!', 'fail');
                        return;
                    }
                    if (json.hasOwnProperty(keyword)) {
                        showToast('Từ khóa đã có trên GitHub!', 'info');
                        return;
                    }
                    json[keyword] = value;
                    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(json, null, 2))));
                    GM_xmlhttpRequest({
                        method: "PUT",
                        url: GITHUB_API_FILE_URL,
                        headers: {
                            "Authorization": "token " + GITHUB_TOKEN,
                            "Accept": "application/vnd.github+json"
                        },
                        data: JSON.stringify({
                            message: `Add keyword: ${keyword}`,
                            content: newContent,
                            sha: res.sha
                        }),
                        onload: function(r2) {
                            if (r2.status === 200 || r2.status === 201) {
                                showToast('Đã gửi từ khóa mới lên GitHub!', 'success');
                            } else {
                                showToast('Gửi lên GitHub thất bại!', 'fail');
                            }
                        },
                        onerror: function() {
                            showToast('Lỗi mạng khi gửi lên GitHub!', 'fail');
                        }
                    });
                } else {
                    showToast('Không đọc được file Linkday.js!', 'fail');
                }
            },
            onerror: function() {
                showToast('Lỗi mạng khi đọc file Linkday.js!', 'fail');
            }
        });
    }

    // ================== LOGIC CỐT LÕI ==================
    // Tự động đổi từ khoá cho đến khi đúng - CHỈ KHI BẬT AUTO SUBMIT
    function runLogicOn(doc) {
        // Chỉ chạy logic tự động khi bật chức năng auto submit
        if (!config.autoSubmit) return;
        
        const tryChangeKeyword = () => {
            const triggerEl = doc.querySelector(WORD_TRIGGER_SELECTOR);
            if (!triggerEl) return;
            const word = triggerEl.textContent.trim();
            if (WORD_TO_INPUT_MAP.hasOwnProperty(word)) {
                processAutoTask(doc, WORD_TO_INPUT_MAP[word]);
            } else {
                clickChangeKeywordButton(doc);
                setTimeout(tryChangeKeyword, 1200);
            }
        };
        tryChangeKeyword();
    }

    function findAndFillKeyword() {
        const keywordEl = document.querySelector(WORD_TRIGGER_SELECTOR);
        if (!keywordEl) { 
            showToast('Không tìm thấy từ khóa trên trang!', 'fail'); 
            return; 
        }
        const keyword = keywordEl.textContent.trim();
        if (WORD_TO_INPUT_MAP.hasOwnProperty(keyword)) {
            showToast(`Từ khóa "${keyword}" đã tồn tại!`, 'info');
            switchTab('tab-list');
            const selectBox = document.getElementById('keyword-select-box');
            if(selectBox) { 
                selectBox.value = keyword; 
                selectBox.dispatchEvent(new Event('change')); 
            }
        } else {
            const keywordInput = document.getElementById('gemini-keyword-input');
            const valueInput = document.getElementById('gemini-value-input');
            if (keywordInput && valueInput) {
                keywordInput.value = keyword;
                showToast(`Đã điền từ khóa mới: "${keyword}"`, 'success');
                switchTab('tab-add');
                valueInput.focus();
            }
        }
    }

    // Tự động gửi từ khoá mới lên GitHub nếu đã nhập mã
    function checkForNewKeyword() {
        const keywordEl = document.querySelector(WORD_TRIGGER_SELECTOR);
        if (!keywordEl) return;
        const keyword = keywordEl.textContent.trim();
        if (!WORD_TO_INPUT_MAP.hasOwnProperty(keyword) && keyword !== lastDetectedNewKeyword) {
            lastDetectedNewKeyword = keyword;
            const keywordInput = document.getElementById('gemini-keyword-input');
            const valueInput = document.getElementById('gemini-value-input');
            if (keywordInput && keywordInput.value.trim() === '') {
                keywordInput.value = keyword;
                showToast(`Phát hiện từ khóa mới: "${keyword}"`, 'info');
                switchTab('tab-add');
                if (valueInput) valueInput.focus();
            }
            // Nếu đã nhập mã thì tự động gửi lên GitHub
            if (valueInput && valueInput.value.trim() && !sentKeywords[keyword]) {
                sendKeywordToGithubFile(keyword, valueInput.value.trim());
            }
        }
    }

    function processAutoTask(doc, valueToFill) {
        if (!config.autoSubmit) return; // Chỉ auto khi bật
        const inputField = doc.querySelector(AUTO_TASK_INPUT_SELECTOR);
        if (inputField) {
            inputField.value = valueToFill;
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            const submitButton = doc.querySelector(AUTO_TASK_SUBMIT_SELECTOR);
            if (submitButton && !submitButton.disabled) {
                setTimeout(() => {
                    submitButton.click();
                    showToast(`Đã điền mã: ${valueToFill}`, 'success');
                }, 300);
            }
        }
    }

    function clickChangeKeywordButton(doc) {
        const changeButton = doc.querySelector(CHANGE_KEYWORD_BUTTON_SELECTOR);
        if (changeButton) {
            changeButton.click();
            showToast('Đang đổi từ khóa...', 'info');
        }
    }

    // Hàm chuyển tab được sử dụng ở nhiều nơi
    function switchTab(tabId) {
        const panel = document.getElementById('gemini-panel');
        if (!panel) return;
        
        // Xóa active từ tất cả tab buttons và tab panes
        panel.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        panel.querySelectorAll('.gemini-tab-pane').forEach(pane => pane.classList.remove('active'));
        
        // Kích hoạt tab được chọn
        const tabButton = panel.querySelector(`[data-tab="${tabId}"]`);
        const tabPane = panel.querySelector(`#${tabId}`);
        
        if (tabButton && tabPane) {
            tabButton.classList.add('active');
            tabPane.classList.add('active');
        }
    }

    // =============== GIAO DIỆN & HÀM PHỤ ===============
    function updateUIWithSettings() { 
        const autoSubmitToggle = document.getElementById('auto-submit-toggle'); 
        if (autoSubmitToggle) autoSubmitToggle.checked = config.autoSubmit; 
        updateStats();
    }
    
    function updateConnectionStatus(online = false, text = 'Đang kết nối...') {
        const statusDot = document.getElementById('connection-status');
        const statusText = document.querySelector('.status-text');
        
        if (statusDot) {
            statusDot.className = `status-dot ${online ? 'online' : 'offline'}`;
        }
        if (statusText) {
            statusText.textContent = text;
        }
    }
    
    function updateStats() {
        const totalEl = document.getElementById('total-keywords');
        const githubEl = document.getElementById('github-keywords');
        const localEl = document.getElementById('local-keywords');
        const countEl = document.getElementById('keyword-count');
        
        const totalCount = Object.keys(WORD_TO_INPUT_MAP).length;
        if (totalEl) totalEl.textContent = totalCount;
        if (countEl) countEl.textContent = totalCount;
        
        // Đếm từ khóa GitHub và local (async)
        fetchKeywordsFromGithub().then(githubKeywords => {
            const githubCount = githubKeywords ? Object.keys(githubKeywords).length : 0;
            const localCount = totalCount - githubCount;
            if (githubEl) githubEl.textContent = githubCount;
            if (localEl) localEl.textContent = Math.max(0, localCount);
            
            // Cập nhật trạng thái kết nối
            if (githubCount > 0) {
                updateConnectionStatus(true, `Đã kết nối - ${githubCount} từ khóa`);
            } else {
                updateConnectionStatus(false, 'Không thể kết nối GitHub');
            }
        }).catch(() => {
            updateConnectionStatus(false, 'Lỗi kết nối');
        });
    }
    
    function renderKeywordList(searchTerm = '') { 
        const selectBox = document.getElementById('keyword-select-box'); 
        const valueDisplay = document.getElementById('keyword-value-display'); 
        if (!selectBox || !valueDisplay) return; 
        
        const currentKey = selectBox.value; 
        selectBox.innerHTML = ''; 
        
        let keywords = Object.keys(WORD_TO_INPUT_MAP);
        
        // Lọc theo từ khóa tìm kiếm
        if (searchTerm) {
            keywords = keywords.filter(key => 
                key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                WORD_TO_INPUT_MAP[key].toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        if (keywords.length === 0) { 
            selectBox.innerHTML = '<option disabled>' + (searchTerm ? 'Không tìm thấy từ khóa nào' : 'Chưa có từ khóa nào') + '</option>'; 
            valueDisplay.textContent = ''; 
            return; 
        } 
        
        keywords.sort((a, b) => a.localeCompare(b, 'vi')).forEach(key => { 
            const option = document.createElement('option'); 
            option.value = key; 
            option.textContent = key; 
            selectBox.appendChild(option); 
        }); 
        
        selectBox.value = WORD_TO_INPUT_MAP.hasOwnProperty(currentKey) ? currentKey : keywords[0]; 
        valueDisplay.textContent = WORD_TO_INPUT_MAP[selectBox.value] || ''; 
        
        // Cập nhật số lượng
        const countEl = document.getElementById('keyword-count');
        if (countEl) countEl.textContent = searchTerm ? keywords.length : Object.keys(WORD_TO_INPUT_MAP).length;
    }

    function createUI() {
        const fab = document.createElement('div'); 
        fab.id = 'gemini-fab'; 
        fab.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        
        const backdrop = document.createElement('div'); 
        backdrop.id = 'gemini-panel-backdrop';
        
        const panel = document.createElement('div'); 
        panel.id = 'gemini-panel';
        panel.innerHTML = `
            <div class="panel-header">
                <button id="gemini-panel-close">×</button>
                <h3>🚀 LinkDay Pro</h3>
                <div class="header-status">
                    <span id="connection-status" class="status-dot offline">●</span>
                    <span class="status-text">Đang kết nối...</span>
                </div>
            </div>
            <div id="gemini-toast-notifier"></div>
            <div class="gemini-tabs">
                <button class="tab-button active" data-tab="tab-settings">
                    <span class="tab-icon">⚙️</span>
                    <span class="tab-text">Cài Đặt</span>
                </button>
                <button class="tab-button" data-tab="tab-add">
                    <span class="tab-icon">➕</span>
                    <span class="tab-text">Thêm</span>
                </button>
                <button class="tab-button" data-tab="tab-list">
                    <span class="tab-icon">📝</span>
                    <span class="tab-text">Danh Sách</span>
                </button>
                <button class="tab-button" data-tab="tab-info">
                    <span class="tab-icon">ℹ️</span>
                    <span class="tab-text">Trợ Giúp</span>
                </button>
            </div>
            <div class="gemini-tab-content">
                <div id="tab-settings" class="gemini-tab-pane active">
                    <div class="card">
                        <div class="card-header">
                            <h4>🎯 Chức Năng Chính</h4>
                        </div>
                        <div class="card-body">
                            <div class="setting-item">
                                <div class="setting-info">
                                    <label>Tự động vượt challenge</label>
                                    <small>Tự động điền mã và submit khi tìm thấy từ khóa phù hợp</small>
                                </div>
                                <label class="switch">
                                    <input type="checkbox" id="auto-submit-toggle">
                                    <span class="slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h4>🔄 Hành Động Nhanh</h4>
                        </div>
                        <div class="card-body">
                            <div class="action-grid">
                                <button id="quick-reload-btn" class="action-btn primary">
                                    <span class="btn-icon">🔄</span>
                                    <span class="btn-text">Tải Lại GitHub</span>
                                </button>
                                <button id="manual-check-btn" class="action-btn secondary">
                                    <span class="btn-icon">🔍</span>
                                    <span class="btn-text">Kiểm Tra</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="tab-add" class="gemini-tab-pane">
                    <div class="card">
                        <div class="card-header">
                            <h4>➕ Thêm Từ Khóa Mới</h4>
                        </div>
                        <div class="card-body">
                            <div class="form-group">
                                <label class="form-label">Từ khóa</label>
                                <div class="input-with-button">
                                    <input type="text" id="gemini-keyword-input" class="form-input" placeholder="Nhập từ khóa cần tìm...">
                                    <button id="gemini-find-btn" class="input-btn" title="Tìm từ khóa hiện tại trên trang">
                                       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">Mã tương ứng</label>
                                <input type="text" id="gemini-value-input" class="form-input" placeholder="Nhập mã cần điền tương ứng...">
                            </div>
                            
                            <div class="form-actions">
                                <button id="gemini-save-btn" class="btn btn-primary">
                                    <span class="btn-icon">💾</span>
                                    <span class="btn-text">Lưu Từ Khóa</span>
                                </button>
                                <button id="gemini-clear-btn" class="btn btn-secondary">
                                    <span class="btn-icon">🗑️</span>
                                    <span class="btn-text">Xóa Form</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="tab-list" class="gemini-tab-pane">
                    <div class="card">
                        <div class="card-header">
                            <h4>📝 Danh Sách Từ Khóa</h4>
                            <span class="keyword-badge"><span id="keyword-count">0</span> từ khóa</span>
                        </div>
                        <div class="card-body">
                            <div class="search-section">
                                <input type="text" id="keyword-search" class="search-input" placeholder="🔍 Tìm kiếm từ khóa...">
                            </div>
                            
                            <div class="keyword-list-container">
                                <select id="keyword-select-box" class="keyword-select" size="5"></select>
                            </div>
                            
                            <div class="keyword-preview">
                                <label class="preview-label">Mã tương ứng:</label>
                                <div id="keyword-value-display" class="preview-value"></div>
                            </div>
                            
                            <div class="list-actions">
                                <button id="edit-selected-btn" class="btn btn-outline">
                                    <span class="btn-icon">✏️</span>
                                    <span class="btn-text">Sửa</span>
                                </button>
                                <button id="delete-selected-btn" class="btn btn-danger">
                                    <span class="btn-icon">🗑️</span>
                                    <span class="btn-text">Xóa</span>
                                </button>
                            </div>
                            
                            <button id="gemini-sendall-github-btn" class="btn btn-sync">
                                <span class="btn-icon">☁️</span>
                                <span class="btn-text">Đồng Bộ GitHub</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h4>💾 Sao Chép & Khôi Phục</h4>
                        </div>
                        <div class="card-body">
                            <textarea id="gemini-backup-area" class="backup-textarea" readonly placeholder="Danh sách từ khóa bạn tự thêm sẽ hiển thị ở đây..."></textarea>
                            <button id="gemini-copy-btn" class="btn btn-outline">
                                <span class="btn-icon">📋</span>
                                <span class="btn-text">Sao Chép Từ Khóa</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="tab-info" class="gemini-tab-pane">
                    <div class="info-section">
                        <h4>📖 Hướng Dẫn Sử Dụng</h4>
                        <div class="info-item">
                            <strong>🎯 Tự Động Vượt:</strong> Bật để script tự động điền mã khi phát hiện từ khóa đã lưu
                        </div>
                        <div class="info-item">
                            <strong>🔍 Tìm Từ Khóa:</strong> Click nút tìm kiếm để lấy từ khóa hiện tại trên trang
                        </div>
                        <div class="info-item">
                            <strong>💾 Lưu Trữ:</strong> Từ khóa được lưu cục bộ và có thể đồng bộ lên GitHub
                        </div>
                        <div class="info-item">
                            <strong>☁️ Đồng Bộ:</strong> Cần GitHub Token để gửi từ khóa lên repository
                        </div>
                        <hr>
                        <div class="stats-section">
                            <h4>📊 Thống Kê</h4>
                            <div class="stat-item">
                                <span>Từ khóa đã lưu:</span>
                                <span id="total-keywords">0</span>
                            </div>
                            <div class="stat-item">
                                <span>Từ khóa từ GitHub:</span>
                                <span id="github-keywords">0</span>
                            </div>
                            <div class="stat-item">
                                <span>Từ khóa cục bộ:</span>
                                <span id="local-keywords">0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.append(fab, backdrop, panel);

        // Sự kiện chuyển tab
        panel.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', function() {
                panel.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                panel.querySelectorAll('.gemini-tab-pane').forEach(pane => pane.classList.remove('active'));
                btn.classList.add('active');
                const tabId = btn.getAttribute('data-tab');
                const tabPane = panel.querySelector('#' + tabId);
                if (tabPane) tabPane.classList.add('active');
            });
        });

        const togglePanel = (show) => { 
            fab.classList.toggle('hidden', show); 
            backdrop.classList.toggle('visible', show); 
            panel.classList.toggle('visible', show); 
        };
        
        fab.addEventListener('click', () => togglePanel(true));
        backdrop.addEventListener('click', () => togglePanel(false));

        // Sự kiện các nút chức năng khác
        panel.addEventListener('click', async (event) => {
            const button = event.target.closest('button');
            if (!button || button.classList.contains('tab-button')) return;
            
            switch (button.id) {
                case 'gemini-panel-close': 
                    togglePanel(false); 
                    break;
                    
                case 'gemini-find-btn': 
                    findAndFillKeyword(); 
                    break;
                    
                case 'gemini-save-btn': {
                    const keywordInput = panel.querySelector('#gemini-keyword-input');
                    const valueInput = panel.querySelector('#gemini-value-input');
                    const keyword = keywordInput ? keywordInput.value.trim() : '';
                    const value = valueInput ? valueInput.value.trim() : '';
                    if (keyword && value) {
                        WORD_TO_INPUT_MAP[keyword] = value;
                        await saveKeywordsToStorage();
                        renderKeywordList();
                        updateStats();
                        showToast(`✅ Đã lưu từ khóa: "${keyword}"`, 'success');
                        if (keywordInput) keywordInput.value = '';
                        if (valueInput) valueInput.value = '';
                        if (keywordInput) keywordInput.focus();
                    } else { 
                        showToast('❌ Vui lòng nhập đủ thông tin!', 'fail'); 
                    }
                    break;
                }
                
                case 'gemini-clear-btn': {
                    const keywordInput = panel.querySelector('#gemini-keyword-input');
                    const valueInput = panel.querySelector('#gemini-value-input');
                    if (keywordInput) keywordInput.value = '';
                    if (valueInput) valueInput.value = '';
                    if (keywordInput) keywordInput.focus();
                    showToast('🗑️ Đã xóa form', 'info');
                    break;
                }
                
                case 'quick-reload-btn': {
                    showToast('Đang tải lại từ GitHub...', 'info');
                    await loadAllSettings();
                    showToast('Đã tải lại từ GitHub!', 'success');
                    break;
                }
                
                case 'manual-check-btn': {
                    const keywordEl = document.querySelector(WORD_TRIGGER_SELECTOR);
                    if (keywordEl) {
                        const keyword = keywordEl.textContent.trim();
                        if (WORD_TO_INPUT_MAP.hasOwnProperty(keyword)) {
                            showToast(`Từ khóa "${keyword}" đã có mã: ${WORD_TO_INPUT_MAP[keyword]}`, 'success');
                        } else {
                            showToast(`Từ khóa "${keyword}" chưa có mã!`, 'fail');
                        }
                    } else {
                        showToast('Không tìm thấy từ khóa trên trang!', 'fail');
                    }
                    break;
                }
                
                case 'edit-selected-btn': {
                    const selectBox = panel.querySelector('#keyword-select-box');
                    const keywordToEdit = selectBox.value;
                    if (keywordToEdit) {
                        const keywordInput = panel.querySelector('#gemini-keyword-input');
                        const valueInput = panel.querySelector('#gemini-value-input');
                        keywordInput.value = keywordToEdit;
                        valueInput.value = WORD_TO_INPUT_MAP[keywordToEdit];
                        switchTab('tab-add');
                        showToast(`Đang sửa từ khóa: "${keywordToEdit}"`, 'info');
                    } else {
                        showToast('Vui lòng chọn từ khóa để sửa!', 'fail');
                    }
                    break;
                }
                
                case 'gemini-sendall-github-btn': {
                    if (confirm('Bạn có chắc muốn đồng bộ toàn bộ danh sách từ khóa lên GitHub?')) {
                        sendAllKeywordsToGithubFile();
                    }
                    break;
                }
                
                case 'gemini-copy-btn': {
                    const backupArea = panel.querySelector('#gemini-backup-area');
                    const githubAndFallback = await fetchKeywordsFromGithub() || FALLBACK_KEYWORDS;
                    const newKeywordsToCopy = Object.fromEntries(
                        Object.entries(WORD_TO_INPUT_MAP).filter(([key]) => !githubAndFallback.hasOwnProperty(key))
                    );
                    const dataString = JSON.stringify(newKeywordsToCopy, null, 2);
                    backupArea.value = dataString;

                    if (Object.keys(newKeywordsToCopy).length === 0) {
                        showToast('Không có từ khóa mới để sao chép!', 'info');
                        return;
                    }
                    navigator.clipboard.writeText(dataString).then(
                        () => showToast(`Đã sao chép ${Object.keys(newKeywordsToCopy).length} từ khóa!`, 'success'),
                        () => showToast('Sao chép thất bại!', 'fail')
                    );
                    break;
                }
                
                case 'delete-selected-btn': {
                    const selectBox = panel.querySelector('#keyword-select-box');
                    const keywordToDelete = selectBox.value;
                    if (keywordToDelete && confirm(`Bạn chắc chắn muốn xóa từ khóa "${keywordToDelete}"?`)) {
                        delete WORD_TO_INPUT_MAP[keywordToDelete];
                        await saveKeywordsToStorage();
                        renderKeywordList();
                        updateStats();
                        showToast(`Đã xóa từ khóa: "${keywordToDelete}"`, 'success');
                    } else if (!keywordToDelete) { 
                        showToast('Vui lòng chọn từ khóa để xóa!', 'fail');
                    }
                    break;
                }
            }
        });

        panel.querySelector('#auto-submit-toggle').addEventListener('change', (e) => {
            config.autoSubmit = e.target.checked;
            GM_setValue('autoSubmit', config.autoSubmit);
            showToast(config.autoSubmit ? 'Đã bật tự động vượt!' : 'Đã tắt tự động vượt!', 'success');
        });
        
        panel.querySelector('#keyword-select-box').addEventListener('change', (e) => {
            document.getElementById('keyword-value-display').textContent = WORD_TO_INPUT_MAP[e.target.value] || '';
        });
        
        // Thêm event listener cho tìm kiếm từ khóa
        const searchInput = panel.querySelector('#keyword-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderKeywordList(e.target.value.trim());
            });
        }
    }

    // ================== CSS & HÀM PHỤ ==================
    let toastTimeout; 
    function showToast(message, type = 'info', duration = 3000) { 
        const notifier = document.getElementById('gemini-toast-notifier'); 
        if (!notifier) return; 
        clearTimeout(toastTimeout); 
        notifier.textContent = message; 
        notifier.className = 'show'; 
        notifier.classList.add(type); 
        toastTimeout = setTimeout(() => notifier.classList.remove('show'), duration); 
    }
    
    function setupStyles() { 
        GM_addStyle(`
            :root { 
                --accent-color: #007AFF; 
                --bg-color: #ffffff; 
                --text-color: #1d1d1f; 
                --border-color: #d2d2d7; 
                --shadow: 0 8px 32px rgba(0,0,0,0.1); 
                --fail-color: #FF3B30; 
                --success-color: #34C759; 
                --info-color: #5AC8FA; 
                --warning-color: #FF9500; 
                --card-bg: #f8f9fa; 
                --card-border: #e9ecef; 
            } 
            
            #gemini-fab { 
                position: fixed; 
                bottom: 25px; 
                right: 25px; 
                z-index: 99999; 
                width: 56px; 
                height: 56px; 
                border-radius: 50%; 
                background: var(--accent-color); 
                color: white; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                cursor: pointer; 
                box-shadow: var(--shadow); 
                transition: all 0.2s ease; 
            } 
            
            #gemini-fab:hover { 
                transform: scale(1.1); 
            } 
            
            #gemini-panel-backdrop { 
                position: fixed; 
                inset: 0; 
                background: rgba(0,0,0,0.4); 
                z-index: 99998; 
                opacity: 0; 
                transition: opacity 0.3s ease; 
                pointer-events: none; 
            } 
            
            #gemini-panel-backdrop.visible { 
                opacity: 1; 
                pointer-events: all; 
            } 
            
            #gemini-panel { 
                position: fixed; 
                bottom: 0; 
                left: 0; 
                right: 0; 
                background: var(--bg-color); 
                border-top-left-radius: 20px; 
                border-top-right-radius: 20px; 
                z-index: 99999; 
                padding: 20px; 
                box-shadow: var(--shadow); 
                transform: translateY(100%); 
                transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
                max-height: 90vh; 
                overflow-y: auto; 
            } 
            
            #gemini-panel.visible { 
                transform: translateY(0); 
            } 
            
            #gemini-panel-close { 
                position: absolute; 
                top: 15px; 
                right: 15px; 
                background: none; 
                border: none; 
                font-size: 24px; 
                cursor: pointer; 
                color: #999; 
                padding: 5px; 
                z-index: 10; 
                line-height: 1; 
            } 
            
            .panel-header { 
                display: flex; 
                align-items: center; 
                justify-content: space-between; 
                margin-bottom: 20px; 
                padding-bottom: 15px; 
                border-bottom: 1px solid var(--border-color); 
            } 
            
            .panel-header h3 { 
                margin: 0; 
                flex: 1; 
                text-align: center; 
                font-size: 22px; 
                font-weight: 600; 
                color: var(--text-color); 
            } 
            
            .header-status { 
                display: flex; 
                align-items: center; 
                gap: 8px; 
                font-size: 12px; 
            } 
            
            .status-dot { 
                font-size: 8px; 
                animation: pulse 2s infinite; 
            } 
            
            .status-dot.online { 
                color: var(--success-color); 
            } 
            
            .status-dot.offline { 
                color: #999; 
            } 
            
            .status-text { 
                color: #666; 
                font-weight: 500; 
            } 
            
            @keyframes pulse { 
                0%, 100% { opacity: 1; } 
                50% { opacity: 0.5; } 
            } 
            
            .card { 
                background: var(--card-bg); 
                border: 1px solid var(--card-border); 
                border-radius: 12px; 
                margin-bottom: 16px; 
                overflow: hidden; 
                transition: all 0.2s ease; 
            } 
            
            .card:hover { 
                transform: translateY(-2px); 
                box-shadow: var(--shadow); 
            } 
            
            .card-header { 
                background: white; 
                padding: 16px; 
                border-bottom: 1px solid var(--card-border); 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
            } 
            
            .card-header h4 { 
                margin: 0; 
                font-size: 16px; 
                font-weight: 600; 
                color: var(--text-color);
            } 
            
            .card-body { 
                padding: 16px; 
            } 
            
            .keyword-badge { 
                background: var(--accent-color); 
                color: white; 
                padding: 4px 8px; 
                border-radius: 12px; 
                font-size: 12px; 
                font-weight: 500; 
            } 
            
            .gemini-tabs { 
                display: flex; 
                border-bottom: 1px solid var(--border-color); 
                margin-bottom: 20px; 
            } 
            
            .tab-button { 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                gap: 4px; 
                padding: 8px 4px; 
                flex: 1; 
                border: none; 
                background: none; 
                cursor: pointer; 
                font-size: 14px; 
                font-weight: 500; 
                color: #888; 
                border-bottom: 3px solid transparent; 
                transition: all 0.2s ease; 
            } 
            
            .tab-button.active { 
                color: var(--accent-color); 
                border-bottom-color: var(--accent-color); 
            } 
            
            .tab-icon { 
                font-size: 16px; 
            } 
            
            .tab-text { 
                font-size: 12px; 
            } 
            
            .gemini-tab-pane { 
                display: none; 
            } 
            
            .gemini-tab-pane.active { 
                display: block; 
            } 
            
            .form-group { 
                margin-bottom: 16px; 
            } 
            
            .form-label { 
                display: block; 
                margin-bottom: 6px; 
                font-weight: 500; 
                color: var(--text-color); 
                font-size: 14px; 
            } 
            
            .form-input { 
                width: 100%; 
                box-sizing: border-box; 
                border: 1px solid var(--border-color); 
                background: white; 
                padding: 12px; 
                font-size: 14px; 
                border-radius: 8px; 
                transition: all 0.2s ease; 
            } 
            
            .form-input:focus { 
                outline: none; 
                border-color: var(--accent-color); 
                box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1); 
            } 
            
            .input-with-button { 
                display: flex; 
            } 
            
            .input-with-button .form-input { 
                border-radius: 8px 0 0 8px; 
                border-right: none; 
            } 
            
            .input-btn { 
                border: 1px solid var(--border-color); 
                background: var(--card-bg); 
                color: var(--text-color); 
                padding: 12px; 
                border-radius: 0 8px 8px 0; 
                cursor: pointer; 
                transition: all 0.2s ease; 
            } 
            
            .input-btn:hover { 
                background: var(--border-color); 
            } 
            
            .form-actions { 
                display: flex; 
                gap: 12px; 
            } 
            
            .btn { 
                display: flex; 
                align-items: center; 
                gap: 8px; 
                padding: 12px 16px; 
                border: none; 
                border-radius: 8px; 
                font-size: 14px; 
                font-weight: 500; 
                cursor: pointer; 
                transition: all 0.2s ease; 
                text-decoration: none; 
                justify-content: center; 
            } 
            
            .btn-icon { 
                font-size: 16px; 
            } 
            
            .btn:hover { 
                transform: translateY(-1px); 
            } 
            
            .btn-primary { 
                background: var(--success-color); 
                color: white; 
            } 
            
            .btn-primary:hover { 
                background: #28a745; 
            } 
            
            .btn-secondary { 
                background: #6c757d; 
                color: white; 
            } 
            
            .btn-secondary:hover { 
                background: #5a6268; 
            } 
            
            .btn-outline { 
                background: white; 
                color: var(--text-color); 
                border: 1px solid var(--border-color); 
            } 
            
            .btn-outline:hover { 
                background: var(--card-bg); 
            } 
            
            .btn-danger { 
                background: var(--fail-color); 
                color: white; 
            } 
            
            .btn-danger:hover { 
                background: #dc2626; 
            } 
            
            .btn-sync { 
                background: var(--info-color); 
                color: white; 
                width: 100%; 
            } 
            
            .btn-sync:hover { 
                background: #2196f3; 
            } 
            
            .action-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 12px; 
            } 
            
            .action-btn { 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                gap: 4px; 
                padding: 16px 12px; 
                border: none; 
                border-radius: 12px; 
                font-size: 12px; 
                font-weight: 500; 
                cursor: pointer; 
                transition: all 0.2s ease; 
            } 
            
            .action-btn.primary { 
                background: var(--accent-color); 
                color: white; 
            } 
            
            .action-btn.secondary { 
                background: var(--card-bg); 
                color: var(--text-color); 
                border: 1px solid var(--border-color); 
            } 
            
            .action-btn:hover { 
                transform: translateY(-2px); 
                box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
            } 
            
            .setting-item { 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
            } 
            
            .setting-info { 
                flex: 1; 
            } 
            
            .setting-info label { 
                margin-bottom: 5px; 
                font-weight: 600; 
            } 
            
            .setting-info small { 
                color: #666; 
                font-size: 14px; 
                line-height: 1.3; 
            } 
            
            .switch { 
                position: relative; 
                display: inline-block; 
                width: 51px; 
                height: 31px; 
            } 
            
            .switch input { 
                opacity: 0; 
                width: 0; 
                height: 0; 
            } 
            
            .slider { 
                position: absolute; 
                cursor: pointer; 
                inset: 0; 
                background-color: #E9E9EA; 
                transition: .4s; 
                border-radius: 34px; 
            } 
            
            .slider:before { 
                position: absolute; 
                content: ""; 
                height: 27px; 
                width: 27px; 
                left: 2px; 
                bottom: 2px; 
                background-color: white; 
                transition: .4s; 
                border-radius: 50%; 
                box-shadow: 0 0 2px rgba(0,0,0,0.1); 
            } 
            
            input:checked + .slider { 
                background-color: var(--accent-color); 
            } 
            
            input:checked + .slider:before { 
                transform: translateX(20px); 
            } 
            
            .search-section { 
                margin-bottom: 16px; 
            } 
            
            .search-input { 
                width: 100%; 
                box-sizing: border-box; 
                border: 1px solid var(--border-color); 
                background: white; 
                padding: 12px; 
                font-size: 14px; 
                border-radius: 8px; 
                transition: all 0.2s ease; 
            } 
            
            .search-input:focus { 
                outline: none; 
                border-color: var(--accent-color); 
                box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1); 
            } 
            
            .keyword-list-container { 
                margin-bottom: 16px; 
            } 
            
            .keyword-select { 
                width: 100%; 
                border: 1px solid var(--border-color); 
                background: white; 
                border-radius: 8px; 
                font-family: monospace; 
                font-size: 12px; 
                min-height: 120px; 
            } 
            
            .keyword-preview { 
                margin-bottom: 16px; 
            } 
            
            .preview-label { 
                display: block; 
                margin-bottom: 6px; 
                font-weight: 500; 
                color: var(--text-color); 
                font-size: 12px; 
            } 
            
            .preview-value { 
                background: white; 
                border: 1px solid var(--border-color); 
                padding: 12px; 
                border-radius: 8px; 
                min-height: 20px; 
                word-break: break-all; 
                font-family: monospace; 
                font-size: 12px; 
                color: #333; 
            } 
            
            .list-actions { 
                display: flex; 
                gap: 12px; 
                margin-bottom: 16px; 
            } 
            
            .backup-textarea { 
                width: 100%; 
                height: 80px; 
                resize: vertical; 
                font-family: monospace; 
                font-size: 11px; 
                margin-bottom: 12px; 
                padding: 10px; 
                border: 1px solid var(--border-color); 
                border-radius: 8px; 
                background: white; 
            }
            
            #gemini-toast-notifier { 
                position: fixed; 
                bottom: 90px; 
                left: 50%; 
                transform: translateX(-50%); 
                padding: 12px 20px; 
                border-radius: 10px; 
                color: white; 
                text-align: center; 
                font-weight: 500; 
                opacity: 0; 
                transition: all 0.3s ease; 
                pointer-events: none; 
                z-index: 100000; 
                max-width: 90%; 
            } 
            
            #gemini-toast-notifier.show { 
                opacity: 1; 
            } 
            
            #gemini-toast-notifier.success { 
                background: var(--success-color); 
            } 
            
            #gemini-toast-notifier.fail { 
                background: var(--fail-color); 
            } 
            
            #gemini-toast-notifier.info { 
                background: var(--info-color); 
            }
            
            .info-section { 
                margin-bottom: 20px; 
            }
            
            .info-item { 
                padding: 12px; 
                background: #f8f9fa; 
                border-radius: 8px; 
                margin-bottom: 10px; 
                border-left: 4px solid var(--accent-color); 
            } 
            
            .stats-section { 
                background: #f8f9fa; 
                padding: 15px; 
                border-radius: 10px; 
            } 
            
            .stat-item { 
                display: flex; 
                justify-content: space-between; 
                margin-bottom: 8px; 
            } 
            
            .stat-item:last-child { 
                margin-bottom: 0; 
            } 
            
            .stat-item span:last-child { 
                font-weight: 600; 
                color: var(--accent-color); 
            }
            
            hr { 
                border: none; 
                border-top: 1px solid #f0f0f0; 
                margin: 20px 0; 
            }
        `); 
    }
})();
