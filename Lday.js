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
            GM_xmlhttpRequest({
                method: 'GET',
                url: GITHUB_KEYWORDS_URL,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            resolve(JSON.parse(response.responseText));
                        } catch (e) {
                            showToast('Lỗi file JSON trên GitHub!', 'fail');
                            resolve(null);
                        }
                    } else {
                        showToast('Lỗi tải từ GitHub!', 'fail');
                        resolve(null);
                    }
                },
                onerror: function() {
                    showToast('Lỗi mạng, không thể tải!', 'fail');
                    resolve(null);
                }
            });
        });
    }

    async function loadAllSettings() {
        config.autoSubmit = await GM_getValue('autoSubmit', true);
        const githubKeywords = await fetchKeywordsFromGithub();
        const localKeywordsJSON = await GM_getValue(LOCAL_KEYWORDS_KEY, '{}');
        let localKeywords = {};
        try { localKeywords = JSON.parse(localKeywordsJSON); } catch (e) { localKeywords = {}; }
        WORD_TO_INPUT_MAP = { ...(githubKeywords || FALLBACK_KEYWORDS), ...localKeywords };
        updateUIWithSettings();
        renderKeywordList();
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
    // Tự động đổi từ khoá cho đến khi đúng
    function runLogicOn(doc) {
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
        if (!keywordEl) { showToast('Không tìm thấy từ khóa!', 'fail'); return; }
        const keyword = keywordEl.textContent.trim();
        if (WORD_TO_INPUT_MAP.hasOwnProperty(keyword)) {
            showToast('Từ khóa đã tồn tại!', 'info');
            switchTab('tab-list');
            const selectBox = document.getElementById('keyword-select-box');
            if(selectBox) { selectBox.value = keyword; selectBox.dispatchEvent(new Event('change')); }
        } else {
            const keywordInput = document.getElementById('gemini-keyword-input');
            const valueInput = document.getElementById('gemini-value-input');
            if (keywordInput && valueInput) {
                keywordInput.value = keyword;
                showToast('Đã điền từ khóa mới!', 'success');
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
                showToast('Đã phát hiện từ khóa mới!', 'info');
                switchTab('tab-add');
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
            if (submitButton && !submitButton.disabled) setTimeout(() => submitButton.click(), 300);
        }
    }

    function clickChangeKeywordButton(doc) {
        const changeButton = doc.querySelector(CHANGE_KEYWORD_BUTTON_SELECTOR);
        if (changeButton) changeButton.click();
    }

    // =============== GIAO DIỆN & HÀM PHỤ ===============
    function updateUIWithSettings() { const autoSubmitToggle = document.getElementById('auto-submit-toggle'); if (autoSubmitToggle) autoSubmitToggle.checked = config.autoSubmit; }
    function renderKeywordList() { const selectBox = document.getElementById('keyword-select-box'); const valueDisplay = document.getElementById('keyword-value-display'); if (!selectBox || !valueDisplay) return; const currentKey = selectBox.value; selectBox.innerHTML = ''; const keywords = Object.keys(WORD_TO_INPUT_MAP); if (keywords.length === 0) { selectBox.innerHTML = '<option disabled>Chưa có từ khóa nào</option>'; valueDisplay.textContent = ''; return; } keywords.sort((a, b) => a.localeCompare(b, 'vi')).forEach(key => { const option = document.createElement('option'); option.value = key; option.textContent = key; selectBox.appendChild(option); }); selectBox.value = WORD_TO_INPUT_MAP.hasOwnProperty(currentKey) ? currentKey : keywords[0]; valueDisplay.textContent = WORD_TO_INPUT_MAP[selectBox.value] || ''; }
    function createUI() {
        const fab = document.createElement('div'); fab.id = 'gemini-fab'; fab.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const backdrop = document.createElement('div'); backdrop.id = 'gemini-panel-backdrop';
        const panel = document.createElement('div'); panel.id = 'gemini-panel';
        panel.innerHTML = `
            <button id="gemini-panel-close">×</button>
            <h3>Bảng Điều Khiển</h3>
            <div id="gemini-toast-notifier"></div>
            <div class="gemini-tabs">
                <button class="active" data-tab="tab-settings">Chức Năng</button>
                <button data-tab="tab-add">Thêm Mới</button>
                <button data-tab="tab-list">Danh Sách</button>
            </div>
            <div class="gemini-tab-content">
                <div id="tab-settings" class="gemini-tab-pane active">
                    <div class="gemini-settings-row"><label>Tự động vượt</label><label class="switch"><input type="checkbox" id="auto-submit-toggle"><span class="slider"></span></label></div>
                </div>
                <div id="tab-add" class="gemini-tab-pane">
                    <label class="gemini-label">Thêm Từ Khóa Mới</label>
                    <div class="gemini-input-group">
                        <input type="text" id="gemini-keyword-input" class="gemini-input" placeholder="Từ khóa...">
                        <button id="gemini-find-btn" title="Tìm từ khóa trên trang">
                           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </button>
                    </div>
                    <input type="text" id="gemini-value-input" class="gemini-input" placeholder="Mã cần điền...">
                    <button id="gemini-save-btn">Lưu Từ Khóa</button>
                </div>
                <div id="tab-list" class="gemini-tab-pane">
                    <label class="gemini-label">Danh sách từ khóa đã lưu</label>
                    <select id="keyword-select-box" class="gemini-input"></select>
                    <div id="keyword-value-display"></div>
                    <button id="delete-selected-btn" class="gemini-button-secondary danger">Xóa Từ Đã Chọn</button>
                    <button id="gemini-sendall-github-btn" class="gemini-button-secondary" style="margin-top:8px;">Gửi danh sách lên GitHub</button>
                    <hr><label class="gemini-label">Sao chép / Khôi phục</label>
                    <textarea id="gemini-backup-area" readonly placeholder="Chỉ sao chép những từ khóa bạn tự thêm."></textarea>
                    <button id="gemini-copy-btn" class="gemini-button-secondary">Sao Chép Từ Khóa Đã Thêm</button>
                </div>
            </div>
        `;
        document.body.append(fab, backdrop, panel);

        // Sự kiện chuyển tab
        panel.querySelectorAll('.gemini-tabs button').forEach(btn => {
            btn.addEventListener('click', function() {
                panel.querySelectorAll('.gemini-tabs button').forEach(b => b.classList.remove('active'));
                panel.querySelectorAll('.gemini-tab-pane').forEach(pane => pane.classList.remove('active'));
                btn.classList.add('active');
                const tabId = btn.getAttribute('data-tab');
                const tabPane = panel.querySelector('#' + tabId);
                if (tabPane) tabPane.classList.add('active');
            });
        });

        const togglePanel = (show) => { fab.classList.toggle('hidden', show); backdrop.classList.toggle('visible', show); panel.classList.toggle('visible', show); };
        fab.addEventListener('click', () => togglePanel(true));
        backdrop.addEventListener('click', () => togglePanel(false));

        // Sự kiện các nút chức năng khác
        panel.addEventListener('click', async (event) => {
            const button = event.target.closest('button');
            if (!button || button.classList.contains('gemini-tabs')) return;
            switch (button.id) {
                case 'gemini-panel-close': togglePanel(false); break;
                case 'gemini-find-btn': findAndFillKeyword(); break;
                case 'gemini-save-btn': {
                    const keywordInput = panel.querySelector('#gemini-keyword-input'), valueInput = panel.querySelector('#gemini-value-input');
                    const keyword = keywordInput.value.trim(), value = valueInput.value.trim();
                    if (keyword && value) {
                        WORD_TO_INPUT_MAP[keyword] = value;
                        await saveKeywordsToStorage();
                        renderKeywordList();
                        showToast('Đã lưu!', 'success');
                        keywordInput.value = ''; valueInput.value = ''; keywordInput.focus();
                    } else { showToast('Vui lòng nhập đủ thông tin', 'fail'); }
                    break;
                }
                case 'gemini-sendall-github-btn': {
                    if (confirm('Bạn có chắc muốn ghi đè toàn bộ danh sách từ khóa lên GitHub?')) {
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
                        showToast('Không có từ khóa mới để sao chép.', 'info');
                        return;
                    }
                    navigator.clipboard.writeText(dataString).then(
                        () => showToast('Đã sao chép từ khóa mới!', 'success'),
                        () => showToast('Sao chép thất bại.', 'fail')
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
                        showToast(`Đã xóa từ khóa!`, 'success');
                    } else if (!keywordToDelete) { showToast('Danh sách rỗng!', 'fail');}
                    break;
                }
            }
        });

        panel.querySelector('#auto-submit-toggle').addEventListener('change', (e) => {
            config.autoSubmit = e.target.checked;
            GM_setValue('autoSubmit', config.autoSubmit);
            showToast('Đã lưu cài đặt!', 'success');
        });
        panel.querySelector('#keyword-select-box').addEventListener('change', (e) => {
            document.getElementById('keyword-value-display').textContent = WORD_TO_INPUT_MAP[e.target.value] || '';
        });
    }

    // ================== CSS & HÀM PHỤ ==================
    let toastTimeout; function showToast(message, type = 'info', duration = 3000) { const notifier = document.getElementById('gemini-toast-notifier'); if (!notifier) return; clearTimeout(toastTimeout); notifier.textContent = message; notifier.className = 'show'; notifier.classList.add(type); toastTimeout = setTimeout(() => notifier.classList.remove('show'), duration); }
    function setupStyles() { GM_addStyle(`:root { --accent-color: #007AFF; --bg-color: #ffffff; --text-color: #1d1d1f; --border-color: #d2d2d7; --shadow: 0 8px 32px rgba(0,0,0,0.1); --fail-color: #FF3B30; } #gemini-fab { position: fixed; bottom: 25px; right: 25px; z-index: 99999; width: 56px; height: 56px; border-radius: 50%; background: var(--accent-color); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow); } #gemini-panel-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99998; opacity: 0; transition: opacity 0.3s ease; pointer-events: none; } #gemini-panel-backdrop.visible { opacity: 1; pointer-events: all; } #gemini-panel { position: fixed; bottom: 0; left: 0; right: 0; background: var(--bg-color); border-top-left-radius: 20px; border-top-right-radius: 20px; z-index: 99999; padding: 20px; box-shadow: var(--shadow); transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); max-height: 90vh; overflow-y: auto; } #gemini-panel.visible { transform: translateY(0); } #gemini-panel-close { position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #999; padding: 5px; z-index: 10; line-height: 1; } #gemini-panel h3 { font-size: 22px; font-weight: 600; color: var(--text-color); margin: 0; padding-bottom: 15px; text-align: center; } .gemini-label { font-weight: 500; display: block; margin-bottom: 8px; font-size: 16px; } .gemini-input { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); background: #f5f5f7; padding: 12px; font-size: 16px; border-radius: 10px; margin-bottom: 10px; } #gemini-save-btn { width: 100%; background: #34C759; color: white; border: none; padding: 14px; font-size: 16px; font-weight: 600; border-radius: 10px; cursor: pointer; } #gemini-toast-notifier { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); padding: 12px 20px; border-radius: 10px; color: white; text-align: center; font-weight: 500; opacity: 0; transition: all 0.3s ease; pointer-events: none; z-index: 100000; } #gemini-toast-notifier.show { opacity: 1; } .gemini-button-secondary { width: 100%; background: #e5e5ea; color: #333; border: none; padding: 12px; font-size: 15px; font-weight: 500; border-radius: 10px; cursor: pointer; } .gemini-button-secondary.danger { background-color: var(--fail-color); color: white; margin-top: 10px; } hr { border: none; border-top: 1px solid #f0f0f0; margin: 20px 0; } #keyword-value-display { background: #f0f0f0; padding: 10px; border-radius: 8px; margin-top: -5px; margin-bottom: 10px; min-height: 1.5em; word-break: break-all; color: #333; } .gemini-tabs { display: flex; border-bottom: 1px solid var(--border-color); margin-bottom: 20px; } .gemini-tabs button { flex: 1; padding: 10px; border: none; background: none; cursor: pointer; font-size: 16px; font-weight: 500; color: #888; border-bottom: 3px solid transparent; transition: all 0.2s ease; } .gemini-tabs button.active { color: var(--accent-color); border-bottom-color: var(--accent-color); } .gemini-tab-pane { display: none; } .gemini-tab-pane.active { display: block; } .switch { position: relative; display: inline-block; width: 51px; height: 31px; } .switch input { opacity: 0; width: 0; height: 0; } .slider { position: absolute; cursor: pointer; inset: 0; background-color: #E9E9EA; transition: .4s; border-radius: 34px; } .slider:before { position: absolute; content: ""; height: 27px; width: 27px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 0 2px rgba(0,0,0,0.1); } input:checked + .slider { background-color: var(--accent-color); } input:checked + .slider:before { transform: translateX(20px); } #gemini-backup-area { width: 100%; box-sizing: border-box; height: 100px; resize: vertical; font-family: monospace; font-size: 12px; margin-bottom: 10px; } .gemini-input-group { display: flex; margin-bottom: 10px; } .gemini-input-group input { flex-grow: 1; border-radius: 10px 0 0 10px; margin-bottom: 0; } .gemini-input-group button { border: 1px solid var(--border-color); background: #f5f5f7; color: var(--text-color); padding: 0 12px; border-radius: 0 10px 10px 0; cursor: pointer; border-left: none; }`); }
})();
