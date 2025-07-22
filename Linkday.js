(function() {
    'use strict';

    // =====================================================================
    // == CẤU HÌNH & BIẾN TOÀN CỤC
    // =====================================================================
    const LOCAL_KEYWORDS_KEY = 'linkday_pro_keywords_v3';
    const WORD_TRIGGER_SELECTOR = 'strong.bg-gray-600.text-white.p-2.select-none';
    const AUTO_TASK_INPUT_SELECTOR = 'input[name="code"], input[placeholder*="Nhập mã xác nhận"]';
    const AUTO_TASK_SUBMIT_SELECTOR = 'button[type="submit"].submit-button';
    const CHANGE_KEYWORD_BUTTON_SELECTOR = 'button#changeCampaignButton';
    
    const DEFAULT_KEYWORDS = {
      "du lịch nga giá rẻ": "/2015/CDLQGVN",
      "hút bể phốt tại hà nội dichvumoitruongxanh.com": "89763300",
      "thiết kế website": "0315552572",
      "chi phí niềng răng elite dental": "Miniscrew",
      "affiliate network permate": "AffiliatePlatform",
      "Bác sĩ Nguyên Giáp ưu đãi": "0909886054",
      "chivas 12": "Annabel Meikle",
      "công ty hoàng việt travel": "/2015/CDLQGVN",
      "creed aventus": "0824422828",
      "gửi hàng đi mỹ": "989799622",
      "hút bể phốt tại hưng yên": "24/2424/24",
      "lưới thép hàn": "301155522",
      "máy rửa chén bát công nghiệp": "0972222958",
      "máy rửa chén công nghiệp": "Storytelling",
      "máy sục ozone": "0972222958",
      "nền tảng affiliate marketing": "AffiliatePlatform",
      "nước hoa nữ cao cấp gucci bloom": "0824422828",
      "set nước hoa victoria secret": "0824422828",
      "trần xuyên sáng": "315476699"
    };

    let WORD_TO_INPUT_MAP = {};
    let config = { autoSubmit: true };
    let uiInitialized = false;
    let lastDetectedNewKeyword = '';

    // =====================================================================
    // == KHỞI CHẠY SCRIPT
    // =====================================================================
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

    // =====================================================================
    // == QUẢN LÝ DỮ LIỆU
    // =====================================================================
    async function loadAllSettings() { config.autoSubmit = await GM_getValue('autoSubmit', true); const savedKeywords = await GM_getValue(LOCAL_KEYWORDS_KEY, JSON.stringify(DEFAULT_KEYWORDS)); try { WORD_TO_INPUT_MAP = JSON.parse(savedKeywords); } catch (e) { WORD_TO_INPUT_MAP = {}; } updateUIWithSettings(); renderKeywordList(); }
    async function saveKeywordsToStorage() { await GM_setValue(LOCAL_KEYWORDS_KEY, JSON.stringify(WORD_TO_INPUT_MAP)); }

    // =====================================================================
    // == LOGIC CỐT LÕI
    // =====================================================================
    function switchTab(tabId) { document.querySelectorAll('.gemini-tab-pane').forEach(pane => pane.classList.remove('active')); document.querySelectorAll('.gemini-tabs button').forEach(button => button.classList.remove('active')); const newActiveTab = document.querySelector(`.gemini-tabs button[data-tab="${tabId}"]`); const newActivePane = document.getElementById(tabId); if (newActiveTab) newActiveTab.classList.add('active'); if (newActivePane) newActivePane.classList.add('active'); }

    function findAndFillKeyword() {
        const keywordEl = document.querySelector(WORD_TRIGGER_SELECTOR);
        if (!keywordEl) {
            showToast('Không tìm thấy từ khóa nào trên trang!', 'fail');
            return;
        }

        const keyword = keywordEl.textContent.trim();

        if (WORD_TO_INPUT_MAP.hasOwnProperty(keyword)) {
            showToast('Từ khóa đã tồn tại!', 'info');
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
                showToast('Đã điền từ khóa mới!', 'success');
                switchTab('tab-add');
                valueInput.focus();
            }
        }
    }

    function checkForNewKeyword() {
        const keywordEl = document.querySelector(WORD_TRIGGER_SELECTOR);
        if (!keywordEl) return;
        const keyword = keywordEl.textContent.trim();
        if (!WORD_TO_INPUT_MAP.hasOwnProperty(keyword) && keyword !== lastDetectedNewKeyword) {
            lastDetectedNewKeyword = keyword;
            const keywordInput = document.getElementById('gemini-keyword-input');
            if (keywordInput && keywordInput.value.trim() === '') {
                keywordInput.value = keyword;
                showToast('Đã phát hiện từ khóa mới!', 'info');
                switchTab('tab-add');
            }
        }
    }
    function processAutoTask(doc, valueToFill) { const inputField = doc.querySelector(AUTO_TASK_INPUT_SELECTOR); if (inputField) { inputField.value = valueToFill; inputField.dispatchEvent(new Event('input', { bubbles: true })); if (config.autoSubmit) { const submitButton = doc.querySelector(AUTO_TASK_SUBMIT_SELECTOR); if (submitButton && !submitButton.disabled) setTimeout(() => submitButton.click(), 300); } } }
    function clickChangeKeywordButton(doc) { const changeButton = doc.querySelector(CHANGE_KEYWORD_BUTTON_SELECTOR); if (changeButton) changeButton.click(); }
    function runLogicOn(doc) { const triggerEl = doc.querySelector(WORD_TRIGGER_SELECTOR); if (!triggerEl) return; const word = triggerEl.textContent.trim(); if (WORD_TO_INPUT_MAP.hasOwnProperty(word)) { processAutoTask(doc, WORD_TO_INPUT_MAP[word]); } else { setTimeout(() => clickChangeKeywordButton(doc), 1500); } }

    // =====================================================================
    // == GIAO DIỆN & CÁC HÀM CÒN LẠI
    // =====================================================================
    function updateUIWithSettings() { const autoSubmitToggle = document.getElementById('auto-submit-toggle'); if (autoSubmitToggle) autoSubmitToggle.checked = config.autoSubmit; }
    function renderKeywordList() { const selectBox = document.getElementById('keyword-select-box'); const valueDisplay = document.getElementById('keyword-value-display'); if (!selectBox || !valueDisplay) return; const currentKey = selectBox.value; selectBox.innerHTML = ''; const keywords = Object.keys(WORD_TO_INPUT_MAP); if (keywords.length === 0) { selectBox.innerHTML = '<option disabled>Chưa có từ khóa nào</option>'; valueDisplay.textContent = ''; return; } keywords.sort().forEach(key => { const option = document.createElement('option'); option.value = key; option.textContent = key; selectBox.appendChild(option); }); selectBox.value = WORD_TO_INPUT_MAP.hasOwnProperty(currentKey) ? currentKey : keywords[0]; valueDisplay.textContent = WORD_TO_INPUT_MAP[selectBox.value] || ''; }
    function createUI() {
        const fab = document.createElement('div'); fab.id = 'gemini-fab'; fab.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const backdrop = document.createElement('div'); backdrop.id = 'gemini-panel-backdrop';
        const panel = document.createElement('div'); panel.id = 'gemini-panel';
        panel.innerHTML = `
            <button id="gemini-panel-close">×</button>
            <h3>Bảng Điều Khiển</h3>
            <div id="gemini-toast-notifier"></div>
            <div class="gemini-tabs">
                <button class="active" data-tab="tab-add">Thêm Mới</button>
                <button data-tab="tab-list">Danh Sách</button>
                <button data-tab="tab-settings">Cài Đặt</button>
            </div>
            <div class="gemini-tab-content">
                <div id="tab-add" class="gemini-tab-pane active">
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
                    <hr><label class="gemini-label">Sao chép / Khôi phục</label>
                    <textarea id="gemini-backup-area" readonly placeholder="Chỉ sao chép những từ khóa mới. Nhấn 'Sao Chép' để hiển thị."></textarea>
                    <button id="gemini-copy-btn" class="gemini-button-secondary">Sao Chép Từ Khóa Mới</button>
                </div>
                <div id="tab-settings" class="gemini-tab-pane">
                    <div class="gemini-settings-row"><label>Tự động vượt</label><label class="switch"><input type="checkbox" id="auto-submit-toggle"><span class="slider"></span></label></div>
                </div>
            </div>
        `;
        document.body.append(fab, backdrop, panel);

        const togglePanel = (show) => { fab.classList.toggle('hidden', show); backdrop.classList.toggle('visible', show); panel.classList.toggle('visible', show); };
        fab.addEventListener('click', () => togglePanel(true));
        backdrop.addEventListener('click', () => togglePanel(false));

        panel.addEventListener('click', async (event) => {
            const button = event.target.closest('button');
            if (!button) return;
            if (button.dataset.tab) { switchTab(button.dataset.tab); return; }
            switch (button.id) {
                case 'gemini-panel-close': togglePanel(false); break;
                case 'gemini-find-btn': findAndFillKeyword(); break;
                case 'gemini-save-btn': const keywordInput = panel.querySelector('#gemini-keyword-input'), valueInput = panel.querySelector('#gemini-value-input'); const keyword = keywordInput.value.trim(), value = valueInput.value.trim(); if (keyword && value) { WORD_TO_INPUT_MAP[keyword] = value; await saveKeywordsToStorage(); renderKeywordList(); showToast('Đã lưu!', 'success'); keywordInput.value = ''; valueInput.value = ''; keywordInput.focus(); } else { showToast('Vui lòng nhập đủ thông tin', 'fail'); } break;
                
                case 'gemini-copy-btn': {
                    const backupArea = panel.querySelector('#gemini-backup-area');
                    const newKeywordsToCopy = Object.fromEntries(
                        Object.entries(WORD_TO_INPUT_MAP).filter(([key]) => !DEFAULT_KEYWORDS.hasOwnProperty(key))
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

                case 'delete-selected-btn': const selectBox = panel.querySelector('#keyword-select-box'); const keywordToDelete = selectBox.value; if (keywordToDelete && confirm(`Bạn có chắc muốn xóa từ khóa "${keywordToDelete}"?`)) { delete WORD_TO_INPUT_MAP[keywordToDelete]; await saveKeywordsToStorage(); renderKeywordList(); showToast(`Đã xóa từ khóa!`, 'success'); } else if (!keywordToDelete) { showToast('Danh sách rỗng!', 'fail');} break;
            }
        });

        panel.querySelector('#auto-submit-toggle').addEventListener('change', (e) => { config.autoSubmit = e.target.checked; GM_setValue('autoSubmit', config.autoSubmit); showToast('Đã lưu cài đặt!', 'success'); });
        panel.querySelector('#keyword-select-box').addEventListener('change', (e) => { document.getElementById('keyword-value-display').textContent = WORD_TO_INPUT_MAP[e.target.value] || ''; });
    }

    // =====================================================================
    // == CSS & HÀM PHỤ
    // =====================================================================
    let toastTimeout; function showToast(message, type = 'info', duration = 3000) { const notifier = document.getElementById('gemini-toast-notifier'); if (!notifier) return; clearTimeout(toastTimeout); notifier.textContent = message; notifier.className = 'show'; notifier.classList.add(type); toastTimeout = setTimeout(() => notifier.classList.remove('show'), duration); }
    function setupStyles() { GM_addStyle(`:root { --accent-color: #007AFF; --bg-color: #ffffff; --text-color: #1d1d1f; --border-color: #d2d2d7; --shadow: 0 8px 32px rgba(0,0,0,0.1); --fail-color: #FF3B30; } #gemini-fab { position: fixed; bottom: 25px; right: 25px; z-index: 99999; width: 56px; height: 56px; border-radius: 50%; background: var(--accent-color); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow); } #gemini-panel-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 99998; opacity: 0; transition: opacity 0.3s ease; pointer-events: none; } #gemini-panel-backdrop.visible { opacity: 1; pointer-events: all; } #gemini-panel { position: fixed; bottom: 0; left: 0; right: 0; background: var(--bg-color); border-top-left-radius: 20px; border-top-right-radius: 20px; z-index: 99999; padding: 20px; box-shadow: var(--shadow); transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1); max-height: 90vh; overflow-y: auto; } #gemini-panel.visible { transform: translateY(0); } #gemini-panel-close { position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #999; padding: 5px; z-index: 10; line-height: 1; } #gemini-panel h3 { font-size: 22px; font-weight: 600; color: var(--text-color); margin: 0; padding-bottom: 15px; text-align: center; } .gemini-label { font-weight: 500; display: block; margin-bottom: 8px; font-size: 16px; } .gemini-input { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color); background: #f5f5f7; padding: 12px; font-size: 16px; border-radius: 10px; margin-bottom: 10px; } #gemini-save-btn { width: 100%; background: #34C759; color: white; border: none; padding: 14px; font-size: 16px; font-weight: 600; border-radius: 10px; cursor: pointer; } #gemini-toast-notifier { position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); padding: 12px 20px; border-radius: 10px; color: white; text-align: center; font-weight: 500; opacity: 0; transition: all 0.3s ease; pointer-events: none; z-index: 100000; } #gemini-toast-notifier.show { opacity: 1; } .gemini-button-secondary { width: 100%; background: #e5e5ea; color: #333; border: none; padding: 12px; font-size: 15px; font-weight: 500; border-radius: 10px; cursor: pointer; } .gemini-button-secondary.danger { background-color: var(--fail-color); color: white; margin-top: 10px; } hr { border: none; border-top: 1px solid #f0f0f0; margin: 20px 0; } #keyword-value-display { background: #f0f0f0; padding: 10px; border-radius: 8px; margin-top: -5px; margin-bottom: 10px; min-height: 1.5em; word-break: break-all; color: #333; } .gemini-tabs { display: flex; border-bottom: 1px solid var(--border-color); margin-bottom: 20px; } .gemini-tabs button { flex: 1; padding: 10px; border: none; background: none; cursor: pointer; font-size: 16px; font-weight: 500; color: #888; border-bottom: 3px solid transparent; transition: all 0.2s ease; } .gemini-tabs button.active { color: var(--accent-color); border-bottom-color: var(--accent-color); } .gemini-tab-pane { display: none; } .gemini-tab-pane.active { display: block; } .switch { position: relative; display: inline-block; width: 51px; height: 31px; } .switch input { opacity: 0; width: 0; height: 0; } .slider { position: absolute; cursor: pointer; inset: 0; background-color: #E9E9EA; transition: .4s; border-radius: 34px; } .slider:before { position: absolute; content: ""; height: 27px; width: 27px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 0 2px rgba(0,0,0,0.1); } input:checked + .slider { background-color: var(--accent-color); } input:checked + .slider:before { transform: translateX(20px); } #gemini-backup-area { width: 100%; box-sizing: border-box; height: 100px; resize: vertical; font-family: monospace; font-size: 12px; margin-bottom: 10px; } .gemini-input-group { display: flex; margin-bottom: 10px; } .gemini-input-group input { flex-grow: 1; border-radius: 10px 0 0 10px; margin-bottom: 0; } .gemini-input-group button { border: 1px solid var(--border-color); background: #f5f5f7; color: var(--text-color); padding: 0 12px; border-radius: 0 10px 10px 0; cursor: pointer; border-left: none; }`); }
})();
