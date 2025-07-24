(function() {
    'use strict';

    // ================== MODULE: TRẠNG THÁI & CẤU HÌNH ==================
    const State = {
        config: {
            autoSubmit: true,
        },
        keywords: {
            github: {},
            local: {},
            merged: {},
        },
        log: [],
        ui: {
            initialized: false,
            fab: null,
            panel: null,
            backdrop: null,
        },
        constants: {
            GITHUB_KEYWORDS_URL: 'https://raw.githubusercontent.com/htuananh1/userscript/main/Data.json',
            LOCAL_KEYWORDS_KEY: 'linkday_pro_keywords_v5',
            LOG_KEY: 'linkday_pro_log_v1',
            WORD_TRIGGER_SELECTOR: 'strong.bg-gray-600.text-white.p-2.select-none',
            AUTO_TASK_INPUT_SELECTOR: 'input[name="code"], input[placeholder*="Nhập mã xác nhận"]',
            AUTO_TASK_SUBMIT_SELECTOR: 'button[type="submit"].submit-button',
            CHANGE_KEYWORD_BUTTON_SELECTOR: 'button#changeCampaignButton',
        }
    };

    // ================== MODULE: DỊCH VỤ DỮ LIỆU ==================
    const DataService = {
        async fetchKeywordsFromGithub() {
            try {
                const response = await GM.xmlHttpRequest({
                    method: 'GET',
                    url: `${State.constants.GITHUB_KEYWORDS_URL}?t=${Date.now()}`,
                    responseType: 'json',
                    timeout: 10000,
                });

                if (response.status === 200 && typeof response.response === 'object' && response.response !== null) {
                    this.log('success', `Tải thành công ${Object.keys(response.response).length} từ khóa từ GitHub.`);
                    return response.response;
                } else {
                    this.log('fail', `Lỗi tải từ khóa từ GitHub. Status: ${response.status}`);
                    return {};
                }
            } catch (error) {
                this.log('fail', 'Lỗi mạng hoặc timeout khi tải từ khóa.');
                UIService.showToast('Lỗi mạng, không thể tải từ GitHub!', 'fail');
                return {};
            }
        },

        async loadAllData() {
            const [autoSubmit, localKeywordsJSON, log] = await Promise.all([
                GM.getValue('autoSubmit', true),
                GM.getValue(State.constants.LOCAL_KEYWORDS_KEY, '{}'),
                GM.getValue(State.constants.LOG_KEY, [])
            ]);

            State.config.autoSubmit = autoSubmit;
            State.log = log;

            try {
                State.keywords.local = JSON.parse(localKeywordsJSON);
            } catch {
                State.keywords.local = {};
            }

            State.keywords.github = await this.fetchKeywordsFromGithub();
            this.mergeKeywords();
        },

        async saveLocalKeywords() {
            await GM.setValue(State.constants.LOCAL_KEYWORDS_KEY, JSON.stringify(State.keywords.local));
        },

        async saveConfig() {
            await GM.setValue('autoSubmit', State.config.autoSubmit);
        },

        mergeKeywords() {
            State.keywords.merged = { ...State.keywords.github, ...State.keywords.local };
        },

        async log(status, msg) {
            State.log.unshift({ time: new Date().toLocaleString('vi-VN'), status, msg });
            State.log.splice(30); // Giữ lại 30 log gần nhất
            await GM.setValue(State.constants.LOG_KEY, State.log);
            if (State.ui.initialized) UIService.renderLogList();
        }
    };

    // ================== MODULE: LOGIC CỐT LÕI ==================
    const CoreLogic = {
        run() {
            if (!State.config.autoSubmit) return;

            const triggerEl = document.querySelector(State.constants.WORD_TRIGGER_SELECTOR);
            if (!triggerEl) return;

            const word = triggerEl.textContent.trim();
            const valueToFill = State.keywords.merged[word];

            if (valueToFill) {
                this.processAutoTask(valueToFill);
            } else {
                this.clickChangeKeywordButton();
            }
        },

        processAutoTask(value) {
            const inputField = document.querySelector(State.constants.AUTO_TASK_INPUT_SELECTOR);
            const submitButton = document.querySelector(State.constants.AUTO_TASK_SUBMIT_SELECTOR);

            if (inputField && submitButton && !submitButton.disabled) {
                inputField.value = value;
                inputField.dispatchEvent(new Event('input', { bubbles: true }));

                setTimeout(() => {
                    submitButton.click();
                    UIService.showToast(`Đã điền mã: ${value}`, 'success');
                }, 300);
            }
        },

        clickChangeKeywordButton() {
            const changeButton = document.querySelector(State.constants.CHANGE_KEYWORD_BUTTON_SELECTOR);
            if (changeButton) changeButton.click();
        },

        findAndFillKeywordOnPage() {
            const keywordEl = document.querySelector(State.constants.WORD_TRIGGER_SELECTOR);
            if (!keywordEl) {
                UIService.showToast('Không tìm thấy từ khóa trên trang!', 'fail');
                return;
            }

            const keyword = keywordEl.textContent.trim();
            if (State.keywords.merged[keyword]) {
                UIService.showToast(`Từ khóa "${keyword}" đã tồn tại!`, 'info');
                UIService.switchTab('tab-list');
                const selectBox = document.getElementById('keyword-select-box');
                if (selectBox) {
                    selectBox.value = keyword;
                    selectBox.dispatchEvent(new Event('change'));
                }
            } else {
                document.getElementById('gemini-keyword-input').value = keyword;
                UIService.showToast(`Đã điền từ khóa mới: "${keyword}"`, 'success');
                UIService.switchTab('tab-add');
                document.getElementById('gemini-value-input').focus();
            }
        }
    };

    // ================== MODULE: GIAO DIỆN NGƯỜI DÙNG ==================
    const UIService = {
        init() {
            if (State.ui.initialized || window.top !== window.self) return;
            State.ui.initialized = true;

            this.injectStyles();
            this.createPanel();
            this.attachEventListeners();
            this.updateAllUI();

            // Bắt đầu chạy logic chính sau khi UI đã sẵn sàng
            setTimeout(() => CoreLogic.run(), 1000);
        },

        updateAllUI() {
            document.getElementById('auto-submit-toggle').checked = State.config.autoSubmit;
            this.renderKeywordList();
            this.renderLogList();
        },

        createPanel() {
            const container = document.createElement('div');
            container.innerHTML = `
                <div id="gemini-fab" title="Mở bảng điều khiển LinkDay Pro">☰</div>
                <div id="gemini-panel-backdrop"></div>
                <div id="gemini-panel">
                    <button id="gemini-panel-close" title="Đóng">×</button>
                    <h3>Quản Lý Từ Khóa</h3>
                    <div id="gemini-toast-notifier"></div>
                    <div class="gemini-tabs">
                        <button class="active" data-tab="tab-settings">Cài Đặt</button>
                        <button data-tab="tab-add">Thêm Mới</button>
                        <button data-tab="tab-list">Danh Sách</button>
                        <button data-tab="tab-log">Log</button>
                    </div>
                    <div class="gemini-tab-content">
                        ${this.getSettingsTabHTML()}
                        ${this.getAddTabHTML()}
                        ${this.getListTabHTML()}
                        ${this.getLogTabHTML()}
                    </div>
                </div>
            `.trim();

            document.body.append(...container.children);
            State.ui.fab = document.getElementById('gemini-fab');
            State.ui.panel = document.getElementById('gemini-panel');
            State.ui.backdrop = document.getElementById('gemini-panel-backdrop');
        },
        
        getSettingsTabHTML: () => `
            <div id="tab-settings" class="gemini-tab-pane active">
                <div class="gemini-settings-row">
                    <label>Tự động vượt</label>
                    <label class="switch"><input type="checkbox" id="auto-submit-toggle"><span class="slider"></span></label>
                </div>
                 <div class="gemini-settings-row">
                    <button id="reload-keywords-btn" class="gemini-button">Tải lại từ khóa từ GitHub</button>
                </div>
            </div>`,

        getAddTabHTML: () => `
            <div id="tab-add" class="gemini-tab-pane">
                <label class="gemini-label">Thêm Từ Khóa Mới (chỉ lưu ở máy bạn)</label>
                <div class="gemini-input-group">
                    <input type="text" id="gemini-keyword-input" class="gemini-input" placeholder="Từ khóa...">
                    <button id="gemini-find-btn" title="Tìm từ khóa trên trang">🔍</button>
                </div>
                <input type="text" id="gemini-value-input" class="gemini-input" placeholder="Mã cần điền...">
                <button id="gemini-save-btn" class="gemini-button primary">Lưu Từ Khóa</button>
            </div>`,

        getListTabHTML: () => `
            <div id="tab-list" class="gemini-tab-pane">
                <label class="gemini-label">Danh sách từ khóa</label>
                <select id="keyword-select-box" class="gemini-input"></select>
                <div id="keyword-value-display"></div>
                <button id="delete-selected-btn" class="gemini-button danger">Xóa Từ Đã Chọn</button>
                <hr>
                <label class="gemini-label">Nhập / Xuất từ khóa cục bộ</label>
                <textarea id="gemini-backup-area" placeholder="Dán chuỗi JSON vào đây rồi nhấn Nhập. Hoặc nhấn Xuất để sao chép từ khóa bạn đã thêm."></textarea>
                <div class="gemini-button-group">
                   <button id="gemini-export-btn" class="gemini-button">Xuất</button>
                   <button id="gemini-import-btn" class="gemini-button">Nhập</button>
                </div>
            </div>`,
            
        getLogTabHTML: () => `
            <div id="tab-log" class="gemini-tab-pane">
                <label class="gemini-label">Lịch sử cập nhật từ khóa</label>
                <div id="gemini-log-list"></div>
            </div>`,

        togglePanel(show) {
            State.ui.fab.classList.toggle('hidden', show);
            State.ui.backdrop.classList.toggle('visible', show);
            State.ui.panel.classList.toggle('visible', show);
        },

        switchTab(tabId) {
            State.ui.panel.querySelectorAll('.gemini-tabs button').forEach(b => b.classList.remove('active'));
            State.ui.panel.querySelectorAll('.gemini-tab-pane').forEach(pane => pane.classList.remove('active'));
            State.ui.panel.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
            State.ui.panel.querySelector(`#${tabId}`)?.classList.add('active');
        },

        attachEventListeners() {
            // Panel toggling
            State.ui.fab.addEventListener('click', () => this.togglePanel(true));
            State.ui.backdrop.addEventListener('click', () => this.togglePanel(false));
            document.getElementById('gemini-panel-close').addEventListener('click', () => this.togglePanel(false));
            
            // Tab switching
            document.querySelectorAll('.gemini-tabs button').forEach(btn => {
                btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
            });

            // --- Cài đặt ---
            document.getElementById('auto-submit-toggle').addEventListener('change', async (e) => {
                State.config.autoSubmit = e.target.checked;
                await DataService.saveConfig();
                this.showToast('Đã lưu cài đặt!', 'success');
            });
            document.getElementById('reload-keywords-btn').addEventListener('click', async () => {
                this.showToast('Đang tải lại...', 'info');
                await DataService.loadAllData();
                this.updateAllUI();
                this.showToast('Tải lại thành công!', 'success');
            });

            // --- Thêm mới ---
            document.getElementById('gemini-save-btn').addEventListener('click', this.handleSaveKeyword.bind(this));
            document.getElementById('gemini-find-btn').addEventListener('click', CoreLogic.findAndFillKeywordOnPage.bind(CoreLogic));

            // --- Danh sách ---
            document.getElementById('keyword-select-box').addEventListener('change', (e) => {
                document.getElementById('keyword-value-display').textContent = State.keywords.merged[e.target.value] || '';
            });
            document.getElementById('delete-selected-btn').addEventListener('click', this.handleDeleteKeyword.bind(this));
            document.getElementById('gemini-export-btn').addEventListener('click', this.handleExportKeywords.bind(this));
            document.getElementById('gemini-import-btn').addEventListener('click', this.handleImportKeywords.bind(this));
        },
        
        async handleSaveKeyword() {
            const keywordInput = document.getElementById('gemini-keyword-input');
            const valueInput = document.getElementById('gemini-value-input');
            const keyword = keywordInput.value.trim();
            const value = valueInput.value.trim();

            if (!keyword || !value) {
                this.showToast('Vui lòng nhập đủ thông tin', 'fail');
                return;
            }

            State.keywords.local[keyword] = value;
            DataService.mergeKeywords();
            await DataService.saveLocalKeywords();
            
            this.renderKeywordList();
            this.showToast('Đã lưu!', 'success');
            keywordInput.value = '';
            valueInput.value = '';
            keywordInput.focus();
        },

        async handleDeleteKeyword() {
            const selectBox = document.getElementById('keyword-select-box');
            const keyword = selectBox.value;
            if (!keyword) {
                this.showToast('Danh sách rỗng!', 'fail');
                return;
            }

            if (State.keywords.github[keyword]) {
                this.showToast('Không thể xóa từ khóa gốc từ GitHub.', 'fail');
                return;
            }

            if (confirm(`Bạn chắc chắn muốn xóa từ khóa "${keyword}"?`)) {
                delete State.keywords.local[keyword];
                DataService.mergeKeywords();
                await DataService.saveLocalKeywords();
                this.renderKeywordList();
                this.showToast(`Đã xóa từ khóa!`, 'success');
            }
        },

        handleExportKeywords() {
            const backupArea = document.getElementById('gemini-backup-area');
            if (Object.keys(State.keywords.local).length === 0) {
                this.showToast('Không có từ khóa cục bộ nào để xuất.', 'info');
                backupArea.value = '{}';
                return;
            }
            const dataString = JSON.stringify(State.keywords.local, null, 2);
            backupArea.value = dataString;
            navigator.clipboard.writeText(dataString)
                .then(() => this.showToast('Đã sao chép từ khóa cục bộ!', 'success'))
                .catch(() => this.showToast('Sao chép thất bại.', 'fail'));
        },
        
        async handleImportKeywords() {
            const backupArea = document.getElementById('gemini-backup-area');
            const jsonString = backupArea.value.trim();
            if (!jsonString) { this.showToast('Vui lòng dán JSON vào ô trống.', 'fail'); return; }

            try {
                const importedKeys = JSON.parse(jsonString);
                if (typeof importedKeys !== 'object' || importedKeys === null) throw new Error();
                
                const count = Object.keys(importedKeys).length;
                if (confirm(`Bạn có chắc muốn nhập ${count} từ khóa? Các từ khóa trùng lặp sẽ bị ghi đè.`)) {
                    State.keywords.local = { ...State.keywords.local, ...importedKeys };
                    DataService.mergeKeywords();
                    await DataService.saveLocalKeywords();
                    this.renderKeywordList();
                    backupArea.value = '';
                    this.showToast(`Đã nhập thành công ${count} từ khóa!`, 'success');
                }
            } catch {
                this.showToast('Lỗi: Chuỗi JSON không hợp lệ.', 'fail');
            }
        },

        renderKeywordList() {
            const selectBox = document.getElementById('keyword-select-box');
            const valueDisplay = document.getElementById('keyword-value-display');
            if (!selectBox || !valueDisplay) return;

            const currentKey = selectBox.value;
            const keywords = Object.keys(State.keywords.merged).sort((a, b) => a.localeCompare(b, 'vi'));
            
            if (keywords.length === 0) {
                selectBox.innerHTML = '<option disabled>Chưa có từ khóa nào</option>';
                valueDisplay.textContent = '';
                return;
            }

            selectBox.innerHTML = keywords.map(key => `<option value="${key}">${key}</option>`).join('');
            selectBox.value = State.keywords.merged[currentKey] ? currentKey : keywords[0];
            valueDisplay.textContent = State.keywords.merged[selectBox.value] || '';
        },

        renderLogList() {
            const logBox = document.getElementById('gemini-log-list');
            if (!logBox) return;

            if (!State.log || State.log.length === 0) {
                logBox.innerHTML = '<div class="gemini-log-item-empty">Chưa có log.</div>';
                return;
            }
            logBox.innerHTML = State.log.map(log =>
                `<div class="gemini-log-item ${log.status}">
                    <b>${log.time}</b> - <span>${log.msg}</span>
                </div>`
            ).join('');
        },

        showToast(message, type = 'info', duration = 3000) {
            const notifier = document.getElementById('gemini-toast-notifier');
            if (!notifier) return;
            
            clearTimeout(notifier.timeoutId);
            notifier.textContent = message;
            notifier.className = `show ${type}`;
            notifier.timeoutId = setTimeout(() => notifier.classList.remove('show'), duration);
        },

        injectStyles: () => GM.addStyle(`
            :root { --gemini-primary: #007AFF; --gemini-danger: #FF3B30; --gemini-bg: #fff; --gemini-bg-subtle: #f5f5f7; --gemini-border: #d2d2d7; --gemini-text: #222; --gemini-text-secondary: #888; }
            #gemini-fab { position: fixed; bottom: 25px; right: 25px; z-index: 99999; width: 48px; height: 48px; border-radius: 50%; background: var(--gemini-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 22px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all .3s; }
            #gemini-fab.hidden { transform: scale(0); }
            #gemini-panel-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.2); z-index: 99998; opacity: 0; transition: opacity .3s; pointer-events: none; }
            #gemini-panel-backdrop.visible { opacity: 1; pointer-events: all; }
            #gemini-panel { position: fixed; bottom: 0; left: 0; right: 0; background: var(--gemini-bg); border-top-left-radius: 16px; border-top-right-radius: 16px; z-index: 99999; padding: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); transform: translateY(100%); transition: transform .3s ease-out; max-height: 90vh; overflow-y: auto; }
            #gemini-panel.visible { transform: translateY(0); }
            #gemini-panel-close { position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 22px; cursor: pointer; color: #999; line-height: 1; padding: 4px;}
            #gemini-panel h3 { font-size: 18px; font-weight: 600; color: var(--gemini-text); margin: 0 0 10px 0; text-align: center; }
            .gemini-tabs { display: flex; border-bottom: 1px solid #eee; margin-bottom: 10px; }
            .gemini-tabs button { flex: 1; padding: 8px; border: none; background: none; cursor: pointer; font-size: 15px; font-weight: 500; color: var(--gemini-text-secondary); border-bottom: 2px solid transparent; }
            .gemini-tabs button.active { color: var(--gemini-primary); border-bottom-color: var(--gemini-primary); }
            .gemini-tab-pane { display: none; } .gemini-tab-pane.active { display: block; }
            .gemini-label { font-weight: 500; display: block; margin-bottom: 6px; font-size: 15px; }
            .gemini-input { width: 100%; box-sizing: border-box; border: 1px solid var(--gemini-border); background: var(--gemini-bg-subtle); padding: 10px; font-size: 15px; border-radius: 8px; margin-bottom: 8px; }
            .gemini-input-group { display: flex; margin-bottom: 8px; }
            .gemini-input-group input { flex-grow: 1; border-radius: 8px 0 0 8px; margin-bottom: 0; }
            .gemini-input-group button { border: 1px solid var(--gemini-border); background: var(--gemini-bg-subtle); color: var(--gemini-text); padding: 0 12px; border-radius: 0 8px 8px 0; cursor: pointer; border-left: none; font-size: 18px; }
            .gemini-button { width: 100%; background: #e5e5ea; color: #333; border: none; padding: 10px; font-size: 15px; font-weight: 500; border-radius: 8px; cursor: pointer; margin-bottom: 8px; }
            .gemini-button.primary { background: var(--gemini-primary); color: white; }
            .gemini-button.danger { background-color: var(--gemini-danger); color: white; }
            .gemini-button-group { display: flex; gap: 8px; }
            #gemini-toast-notifier { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%) scale(0.9); padding: 10px 18px; border-radius: 8px; color: white; text-align: center; font-weight: 500; opacity: 0; transition: all .3s; pointer-events: none; z-index: 100000; }
            #gemini-toast-notifier.show { opacity: 1; transform: translateX(-50%) scale(1); }
            #gemini-toast-notifier.success { background: var(--gemini-primary); } #gemini-toast-notifier.fail { background: var(--gemini-danger); } #gemini-toast-notifier.info { background: #555; }
            #keyword-value-display { background: #f0f0f0; padding: 8px; border-radius: 6px; margin-top: -4px; margin-bottom: 8px; min-height: 1.2em; word-break: break-all; color: var(--gemini-text); }
            #gemini-backup-area { width: 100%; box-sizing: border-box; height: 100px; resize: vertical; font-family: monospace; font-size: 12px; margin-bottom: 8px; }
            .gemini-settings-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 4px 0; }
            .switch { position: relative; display: inline-block; width: 44px; height: 24px; } .switch input { opacity: 0; width: 0; height: 0; }
            .slider { position: absolute; cursor: pointer; inset: 0; background-color: #E9E9EA; transition: .4s; border-radius: 24px; }
            .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            input:checked + .slider { background-color: var(--gemini-primary); }
            input:checked + .slider:before { transform: translateX(20px); }
            #gemini-log-list { font-size: 13px; max-height: 250px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; padding: 8px; }
            .gemini-log-item { padding: 4px 0; border-bottom: 1px solid #f0f0f0; } .gemini-log-item:last-child { border-bottom: none; }
            .gemini-log-item.success { color: #007AFF; } .gemini-log-item.fail { color: #FF3B30; }
            .gemini-log-item-empty { color: var(--gemini-text-secondary); text-align: center; padding: 20px; }
        `)
    };
    
    // ================== KHỞI CHẠY SCRIPT ==================
    async function main() {
        await DataService.loadAllData();
        UIService.init();
    }
    
    // Đợi body tải xong để gắn UI
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

    // Giám sát thay đổi DOM để chạy lại logic (hữu ích cho các trang SPA)
    const observer = new MutationObserver(() => {
        // Tạm dừng một chút để DOM ổn định rồi mới chạy logic
        clearTimeout(observer.timeoutId);
        observer.timeoutId = setTimeout(() => CoreLogic.run(), 500);
    });
    
    // Bắt đầu giám sát khi trang đã tải xong
    window.addEventListener('load', () => {
        observer.observe(document.body, { childList: true, subtree: true });
    });

})();
