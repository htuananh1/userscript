(function() {
    'use strict';

    // ================== CẤU HÌNH ==================
    const GITHUB_KEYWORDS_URL = 'https://raw.githubusercontent.com/htuananh1/userscript/main/Linkday.js';
    const LOCAL_KEYWORDS_KEY = 'linkday_pro_keywords_v5'; // Đổi key để tránh xung đột với phiên bản cũ
    const WORD_TRIGGER_SELECTOR = 'strong.bg-gray-600.text-white.p-2.select-none';
    const AUTO_TASK_INPUT_SELECTOR = 'input[name="code"], input[placeholder*="Nhập mã xác nhận"]';
    const AUTO_TASK_SUBMIT_SELECTOR = 'button[type="submit"].submit-button';
    const CHANGE_KEYWORD_BUTTON_SELECTOR = 'button#changeCampaignButton';
    const FALLBACK_KEYWORDS = {}; // Sử dụng khi không tải được từ đâu cả

    let WORD_TO_INPUT_MAP = {};
    let githubKeywordsCache = {}; // Lưu cache các từ khóa từ Github để phân biệt
    let config = { autoSubmit: true };
    let uiInitialized = false;

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
            setTimeout(() => runLogicOn(document), 1000);
        }
    }

    // =============== QUẢN LÝ DỮ LIỆU ===============
    function fetchKeywordsFromGithub() {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: GITHUB_KEYWORDS_URL + '?t=' + Date.now(), // Tránh cache
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const text = response.responseText.trim();
                            const json = text ? JSON.parse(text) : {};
                            if (typeof json === 'object' && json !== null) resolve(json);
                            else resolve(FALLBACK_KEYWORDS);
                        } catch (e) {
                            showToast('Lỗi file JSON trên GitHub!', 'fail');
                            resolve(FALLBACK_KEYWORDS);
                        }
                    } else {
                        showToast('Không tải được từ GitHub!', 'fail');
                        resolve(FALLBACK_KEYWORDS);
                    }
                },
                onerror: function() {
                    showToast('Lỗi mạng, không thể tải!', 'fail');
                    resolve(FALLBACK_KEYWORDS);
                }
            });
        });
    }

    async function loadAllSettings() {
        config.autoSubmit = await GM_getValue('autoSubmit', true);
        githubKeywordsCache = await fetchKeywordsFromGithub();
        const localKeywordsJSON = await GM_getValue(LOCAL_KEYWORDS_KEY, '{}');
        let localKeywords = {};
        try { localKeywords = JSON.parse(localKeywordsJSON); } catch (e) { localKeywords = {}; }
        // Hợp nhất: Từ khóa local sẽ ghi đè từ khóa từ GitHub nếu trùng
        WORD_TO_INPUT_MAP = { ...githubKeywordsCache, ...localKeywords };
        updateUIWithSettings();
        renderKeywordList();
    }

    async function saveKeywordsToStorage() {
        // Chỉ lưu những từ khóa không có trên GitHub hoặc có giá trị khác
        const keywordsToSave = Object.fromEntries(
            Object.entries(WORD_TO_INPUT_MAP).filter(([key, value]) => !githubKeywordsCache.hasOwnProperty(key) || githubKeywordsCache[key] !== value)
        );
        await GM_setValue(LOCAL_KEYWORDS_KEY, JSON.stringify(keywordsToSave));
    }

    // ================== LOGIC CỐT LÕI ==================
    function runLogicOn(doc) {
        if (!config.autoSubmit) return;
        const triggerEl = doc.querySelector(WORD_TRIGGER_SELECTOR);
        if (!triggerEl) return;
        const word = triggerEl.textContent.trim();
        if (WORD_TO_INPUT_MAP.hasOwnProperty(word)) {
            processAutoTask(doc, WORD_TO_INPUT_MAP[word]);
        } else {
            // Nếu không có từ khóa thì thử đổi, tránh lặp vô hạn
            clickChangeKeywordButton(doc);
        }
    }

    function findAndFillKeyword() {
        const keywordEl = document.querySelector(WORD_TRIGGER_SELECTOR);
        if (!keywordEl) { showToast('Không tìm thấy từ khóa trên trang!', 'fail'); return; }
        const keyword = keywordEl.textContent.trim();
        if (WORD_TO_INPUT_MAP.hasOwnProperty(keyword)) {
            showToast(`Từ khóa "${keyword}" đã tồn tại!`, 'info');
            switchTab('tab-list');
            const selectBox = document.getElementById('keyword-select-box');
            if(selectBox) { selectBox.value = keyword; selectBox.dispatchEvent(new Event('change')); }
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

    function processAutoTask(doc, valueToFill) {
        if (!config.autoSubmit) return;
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
        if (changeButton) changeButton.click();
    }

    function switchTab(tabId) {
        const panel = document.getElementById('gemini-panel');
        if (!panel) return;
        panel.querySelectorAll('.gemini-tabs button').forEach(b => b.classList.remove('active'));
        panel.querySelectorAll('.gemini-tab-pane').forEach(pane => pane.classList.remove('active'));
        const tabButton = panel.querySelector(`[data-tab="${tabId}"]`);
        const tabPane = panel.querySelector(`#${tabId}`);
        if (tabButton && tabPane) {
            tabButton.classList.add('active');
            tabPane.classList.add('active');
        }
    }

    // =============== GIAO DIỆN & HÀM PHỤ ===============
    function updateUIWithSettings() { const autoSubmitToggle = document.getElementById('auto-submit-toggle'); if (autoSubmitToggle) autoSubmitToggle.checked = config.autoSubmit; }
    function renderKeywordList() { const selectBox = document.getElementById('keyword-select-box'); const valueDisplay = document.getElementById('keyword-value-display'); if (!selectBox || !valueDisplay) return; const currentKey = selectBox.value; selectBox.innerHTML = ''; const keywords = Object.keys(WORD_TO_INPUT_MAP); if (keywords.length === 0) { selectBox.innerHTML = '<option disabled>Chưa có từ khóa nào</option>'; valueDisplay.textContent = ''; return; } keywords.sort((a, b) => a.localeCompare(b, 'vi')).forEach(key => { const option = document.createElement('option'); option.value = key; option.textContent = key; selectBox.appendChild(option); }); selectBox.value = WORD_TO_INPUT_MAP.hasOwnProperty(currentKey) ? currentKey : keywords[0]; valueDisplay.textContent = WORD_TO_INPUT_MAP[selectBox.value] || ''; }
    function createUI() {
        const fab = document.createElement('div'); fab.id = 'gemini-fab'; fab.textContent = '☰';
        const backdrop = document.createElement('div'); backdrop.id = 'gemini-panel-backdrop';
        const panel = document.createElement('div'); panel.id = 'gemini-panel';
        panel.innerHTML = `
            <button id="gemini-panel-close">×</button>
            <h3>Quản Lý Từ Khóa</h3>
            <div id="gemini-toast-notifier"></div>
            <div class="gemini-tabs">
                <button class="active" data-tab="tab-settings">Cài Đặt</button>
                <button data-tab="tab-add">Thêm Mới</button>
                <button data-tab="tab-list">Danh Sách</button>
            </div>
            <div class="gemini-tab-content">
                <div id="tab-settings" class="gemini-tab-pane active">
                    <div class="gemini-settings-row">
                        <label>Tự động vượt</label>
                        <label class="switch"><input type="checkbox" id="auto-submit-toggle"><span class="slider"></span></label>
                    </div>
                     <div class="gemini-settings-row">
                        <button id="reload-keywords-btn" class="gemini-button-secondary">Tải lại từ khóa từ GitHub</button>
                    </div>
                </div>
                <div id="tab-add" class="gemini-tab-pane">
                    <label class="gemini-label">Thêm Từ Khóa Mới</label>
                    <div class="gemini-input-group">
                        <input type="text" id="gemini-keyword-input" class="gemini-input" placeholder="Từ khóa...">
                        <button id="gemini-find-btn" title="Tìm từ khóa trên trang">Tìm</button>
                    </div>
                    <input type="text" id="gemini-value-input" class="gemini-input" placeholder="Mã cần điền...">
                    <button id="gemini-save-btn">Lưu Từ Khóa</button>
                </div>
                <div id="tab-list" class="gemini-tab-pane">
                    <label class="gemini-label">Danh sách từ khóa</label>
                    <select id="keyword-select-box" class="gemini-input"></select>
                    <div id="keyword-value-display"></div>
                    <button id="delete-selected-btn" class="gemini-button-secondary danger">Xóa Từ Đã Chọn</button>
                    <hr>
                    <label class="gemini-label">Nhập / Xuất từ khóa cục bộ</label>
                    <textarea id="gemini-backup-area" placeholder="Dán chuỗi JSON vào đây rồi nhấn Nhập. Hoặc nhấn Xuất để sao chép từ khóa bạn đã thêm."></textarea>
                    <div style="display: flex; gap: 8px;">
                       <button id="gemini-export-btn" class="gemini-button-secondary">Xuất</button>
                       <button id="gemini-import-btn" class="gemini-button-secondary">Nhập</button>
                    </div>
                </div>
            </div>
        `;
        document.body.append(fab, backdrop, panel);

        panel.querySelectorAll('.gemini-tabs button').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
        const togglePanel = (show) => { fab.classList.toggle('hidden', show); backdrop.classList.toggle('visible', show); panel.classList.toggle('visible', show); };
        fab.addEventListener('click', () => togglePanel(true));
        backdrop.addEventListener('click', () => togglePanel(false));
        panel.querySelector('#gemini-panel-close').addEventListener('click', () => togglePanel(false));

        panel.querySelector('#gemini-save-btn').addEventListener('click', async () => {
            const keywordInput = panel.querySelector('#gemini-keyword-input'), valueInput = panel.querySelector('#gemini-value-input');
            const keyword = keywordInput.value.trim(), value = valueInput.value.trim();
            if (keyword && value) {
                WORD_TO_INPUT_MAP[keyword] = value;
                await saveKeywordsToStorage();
                renderKeywordList();
                showToast('Đã lưu!', 'success');
                keywordInput.value = ''; valueInput.value = ''; keywordInput.focus();
            } else { showToast('Vui lòng nhập đủ thông tin', 'fail'); }
        });

        panel.querySelector('#gemini-find-btn').addEventListener('click', findAndFillKeyword);
        panel.querySelector('#reload-keywords-btn').addEventListener('click', async () => {
            showToast('Đang tải lại danh sách từ khóa...', 'info');
            await loadAllSettings();
            showToast('Tải lại thành công!', 'success');
        });

        panel.querySelector('#delete-selected-btn').addEventListener('click', async () => {
            const selectBox = panel.querySelector('#keyword-select-box');
            const keywordToDelete = selectBox.value;
            if (keywordToDelete && confirm(`Bạn chắc chắn muốn xóa từ khóa "${keywordToDelete}"?`)) {
                delete WORD_TO_INPUT_MAP[keywordToDelete];
                await saveKeywordsToStorage();
                renderKeywordList();
                showToast(`Đã xóa từ khóa!`, 'success');
            } else if (!keywordToDelete) { showToast('Danh sách rỗng!', 'fail');}
        });

        panel.querySelector('#gemini-export-btn').addEventListener('click', async () => {
            const backupArea = panel.querySelector('#gemini-backup-area');
            const localKeywords = Object.fromEntries(
                Object.entries(WORD_TO_INPUT_MAP).filter(([key]) => !githubKeywordsCache.hasOwnProperty(key))
            );
            if (Object.keys(localKeywords).length === 0) {
                showToast('Không có từ khóa cục bộ nào để xuất.', 'info');
                backupArea.value = '{}';
                return;
            }
            const dataString = JSON.stringify(localKeywords, null, 2);
            backupArea.value = dataString;
            navigator.clipboard.writeText(dataString).then(
                () => showToast('Đã sao chép từ khóa cục bộ!', 'success'),
                () => showToast('Sao chép thất bại.', 'fail')
            );
        });

        panel.querySelector('#gemini-import-btn').addEventListener('click', async () => {
            const backupArea = panel.querySelector('#gemini-backup-area');
            const jsonString = backupArea.value.trim();
            if (!jsonString) { showToast('Vui lòng dán JSON vào ô trống.', 'fail'); return; }
            try {
                const importedKeys = JSON.parse(jsonString);
                if (typeof importedKeys !== 'object' || importedKeys === null) {
                    showToast('Lỗi: Dữ liệu phải là một đối tượng JSON.', 'fail');
                    return;
                }
                const count = Object.keys(importedKeys).length;
                if (confirm(`Bạn có chắc muốn nhập ${count} từ khóa? Các từ khóa trùng lặp sẽ bị ghi đè.`)) {
                    WORD_TO_INPUT_MAP = { ...WORD_TO_INPUT_MAP, ...importedKeys };
                    await saveKeywordsToStorage();
                    renderKeywordList();
                    backupArea.value = '';
                    showToast(`Đã nhập thành công ${count} từ khóa!`, 'success');
                }
            } catch (e) {
                showToast('Lỗi: Chuỗi JSON không hợp lệ.', 'fail');
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
    function setupStyles() { GM_addStyle(`
        #gemini-fab { position: fixed; bottom: 25px; right: 25px; z-index: 99999; width: 48px; height: 48px; border-radius: 50%; background: #007AFF; color: white; display: flex; align-items: center; justify-content: center; font-size: 22px; cursor: pointer; }
        #gemini-panel-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.2); z-index: 99998; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
        #gemini-panel-backdrop.visible { opacity: 1; pointer-events: all; }
        #gemini-panel { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top-left-radius: 16px; border-top-right-radius: 16px; z-index: 99999; padding: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); transform: translateY(100%); transition: transform 0.3s; max-height: 90vh; overflow-y: auto; }
        #gemini-panel.visible { transform: translateY(0); }
        #gemini-panel-close { position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 22px; cursor: pointer; color: #999; }
        #gemini-panel h3 { font-size: 18px; font-weight: 600; color: #222; margin: 0 0 10px 0; text-align: center; }
        .gemini-tabs { display: flex; border-bottom: 1px solid #eee; margin-bottom: 10px; }
        .gemini-tabs button { flex: 1; padding: 8px; border: none; background: none; cursor: pointer; font-size: 15px; font-weight: 500; color: #888; border-bottom: 2px solid transparent; }
        .gemini-tabs button.active { color: #007AFF; border-bottom-color: #007AFF; }
        .gemini-tab-pane { display: none; } .gemini-tab-pane.active { display: block; }
        .gemini-label { font-weight: 500; display: block; margin-bottom: 6px; font-size: 15px; }
        .gemini-input { width: 100%; box-sizing: border-box; border: 1px solid #d2d2d7; background: #f5f5f7; padding: 10px; font-size: 15px; border-radius: 8px; margin-bottom: 8px; }
        .gemini-input-group { display: flex; margin-bottom: 8px; }
        .gemini-input-group input { flex-grow: 1; border-radius: 8px 0 0 8px; margin-bottom: 0; }
        .gemini-input-group button { border: 1px solid #d2d2d7; background: #f5f5f7; color: #222; padding: 0 10px; border-radius: 0 8px 8px 0; cursor: pointer; border-left: none; }
        #gemini-save-btn, .gemini-button-secondary { width: 100%; background: #007AFF; color: white; border: none; padding: 10px; font-size: 15px; font-weight: 500; border-radius: 8px; cursor: pointer; margin-bottom: 8px; }
        .gemini-button-secondary { background: #e5e5ea; color: #333; }
        .gemini-button-secondary.danger { background-color: #FF3B30; color: white; }
        #gemini-toast-notifier { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); padding: 10px 18px; border-radius: 8px; color: white; text-align: center; font-weight: 500; opacity: 0; transition: all 0.3s; pointer-events: none; z-index: 100000; background: #007AFF; }
        #gemini-toast-notifier.show { opacity: 1; }
        #keyword-value-display { background: #f0f0f0; padding: 8px; border-radius: 6px; margin-top: -4px; margin-bottom: 8px; min-height: 1.2em; word-break: break-all; color: #333; }
        #gemini-backup-area { width: 100%; box-sizing: border-box; height: 100px; resize: vertical; font-family: monospace; font-size: 12px; margin-bottom: 8px; }
        .gemini-settings-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .switch { position: relative; display: inline-block; width: 44px; height: 24px; } .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; inset: 0; background-color: #E9E9EA; transition: .4s; border-radius: 24px; }
        .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #007AFF; }
        input:checked + .slider:before { transform: translateX(20px); }
    `); }
})();
