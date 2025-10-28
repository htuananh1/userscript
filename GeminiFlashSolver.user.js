// ==UserScript==
// @name         Gemini 2.5 Flash Solver
// @namespace    https://github.com/htuananh
// @version      1.1.0
// @description  Hỗ trợ gửi câu hỏi trắc nghiệm đã bôi đen cho Gemini 2.5 Flash và tô đáp án đúng trên trang web.
// @author       OpenAI ChatGPT
// @match        *://*/*
// @icon         https://www.gstatic.com/aihub/icons/gemini-color.svg
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// @run-at       document-end
// ==/UserScript==

(async function () {
    'use strict';

    const STORAGE_KEY = 'gemini_flash_solver_min';

    const defaultConfig = {
        apiKey: '',
        model: 'gemini-2.5-flash',
        language: 'vi',
        subject: 'Chung',
        outputMode: 'answer',
        customPrompt: '',
        temperature: 0.2,
        maxTokens: 800
    };

    let config = await loadConfig();

    const state = {
        selectionText: '',
        selectionRange: null,
        selectionRoot: null,
        question: '',
        answers: { A: '', B: '', C: '', D: '' }
    };

    const panel = buildPanel();
    const toggleButton = createElement('button', { id: 'gfs-toggle', type: 'button', text: 'AI' });
    toggleButton.addEventListener('click', () => {
        const visible = panel.classList.toggle('gfs-visible');
        toggleButton.classList.toggle('gfs-active', visible);
        if (visible) {
            ensureApiStatus();
        }
    });
    document.body.appendChild(toggleButton);

    document.addEventListener('selectionchange', handleSelectionChange, true);
    ensureApiStatus();

    function normalizeText(text) {
        return (text || '').replace(/[\u00A0\u200B]+/g, ' ').replace(/\s+/g, ' ').trim();
    }

    function createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'class') {
                el.className = value;
            } else if (key === 'text') {
                el.textContent = value;
            } else if (key === 'html') {
                el.innerHTML = value;
            } else {
                el.setAttribute(key, value);
            }
        });
        children.forEach(child => el.appendChild(child));
        return el;
    }

    async function loadConfig() {
        try {
            const raw = await GM_getValue(STORAGE_KEY);
            if (!raw) return { ...defaultConfig };
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return { ...defaultConfig, ...parsed };
        } catch (error) {
            console.error('[Gemini Solver] Cannot load config', error);
            return { ...defaultConfig };
        }
    }

    async function saveConfig(partial) {
        config = { ...config, ...partial };
        try {
            await GM_setValue(STORAGE_KEY, JSON.stringify(config));
        } catch (error) {
            console.error('[Gemini Solver] Cannot save config', error);
        }
    }

    function buildPanel() {
        const panel = createElement('div', { id: 'gfs-panel' });

        const header = createElement('div', { class: 'gfs-header' }, [
            createElement('span', { class: 'gfs-title', text: 'Gemini Solver' }),
            createElement('button', { class: 'gfs-close', type: 'button', text: '×' })
        ]);
        panel.appendChild(header);

        const status = createElement('div', { id: 'gfs-status', text: 'Vui lòng nhập API key Gemini.' });
        panel.appendChild(status);

        const apiRow = createElement('div', { class: 'gfs-row' });
        const apiLabel = createElement('label', { class: 'gfs-label', text: 'API Key' });
        const apiInput = createElement('input', { id: 'gfs-api', type: 'password', value: config.apiKey, placeholder: 'Nhập API key...' });
        apiRow.appendChild(apiLabel);
        apiRow.appendChild(apiInput);
        panel.appendChild(apiRow);

        const selectRow = createElement('div', { class: 'gfs-grid' }, [
            createSelect('Model', 'gfs-model', config.model, [
                { value: 'gemini-2.5-flash', label: '2.5 Flash' },
                { value: 'gemini-1.5-flash', label: '1.5 Flash' },
                { value: 'gemini-2.5-pro', label: '2.5 Pro' }
            ]),
            createSelect('Ngôn ngữ', 'gfs-lang', config.language, [
                { value: 'vi', label: 'Tiếng Việt' },
                { value: 'en', label: 'English' }
            ]),
            createSelect('Môn học', 'gfs-subject', config.subject, [
                'Chung', 'Toán', 'Lý', 'Hóa', 'Sinh', 'Sử', 'Địa', 'Văn', 'Anh', 'Tin học'
            ])
        ]);
        panel.appendChild(selectRow);

        const modeRow = createElement('div', { class: 'gfs-row' });
        const modeLabel = createElement('label', { class: 'gfs-label', text: 'Kiểu trả lời' });
        const modeSelect = createElement('select', { id: 'gfs-output' }, []);
        [
            { value: 'answer', label: 'Chỉ đáp án' },
            { value: 'explain', label: 'Có giải thích' },
            { value: 'custom', label: 'Tùy chỉnh...' }
        ].forEach(opt => {
            const option = createElement('option', { value: opt.value, text: opt.label });
            if (config.outputMode === opt.value) option.selected = true;
            modeSelect.appendChild(option);
        });
        modeRow.appendChild(modeLabel);
        modeRow.appendChild(modeSelect);
        panel.appendChild(modeRow);

        const customPromptRow = createElement('div', { class: 'gfs-row', id: 'gfs-custom-row' });
        const customPromptLabel = createElement('label', { class: 'gfs-label', text: 'Yêu cầu tùy chỉnh' });
        const customPromptArea = createElement('textarea', {
            id: 'gfs-custom',
            rows: '3',
            placeholder: 'Nhập hướng dẫn riêng cho Gemini...'
        });
        customPromptArea.value = config.customPrompt;
        customPromptRow.appendChild(customPromptLabel);
        customPromptRow.appendChild(customPromptArea);
        panel.appendChild(customPromptRow);

        const questionRow = createElement('div', { class: 'gfs-row' });
        const questionLabel = createElement('label', { class: 'gfs-label', text: 'Câu hỏi' });
        const questionArea = createElement('textarea', { id: 'gfs-question', rows: '3', placeholder: 'Dán hoặc lấy từ phần bôi đen...' });
        questionRow.appendChild(questionLabel);
        questionRow.appendChild(questionArea);
        panel.appendChild(questionRow);

        const answersContainer = createElement('div', { class: 'gfs-answers' });
        const answerInputs = {};
        ['A', 'B', 'C', 'D'].forEach(letter => {
            const wrapper = createElement('div', { class: 'gfs-answer-item' });
            const label = createElement('label', { class: 'gfs-label', text: `Đáp án ${letter}` });
            const input = createElement('textarea', {
                class: 'gfs-answer-input',
                rows: '2',
                placeholder: `${letter}. ...`
            });
            answerInputs[letter] = input;
            wrapper.appendChild(label);
            wrapper.appendChild(input);
            answersContainer.appendChild(wrapper);
        });
        panel.appendChild(answersContainer);

        const controls = createElement('div', { class: 'gfs-controls' });
        const captureBtn = createElement('button', { id: 'gfs-capture', type: 'button', text: 'Lấy từ bôi đen' });
        const sendBtn = createElement('button', { id: 'gfs-send', type: 'button', text: 'Gửi Gemini' });
        controls.appendChild(captureBtn);
        controls.appendChild(sendBtn);
        panel.appendChild(controls);

        const answerBox = createElement('div', { id: 'gfs-answer-box' });
        panel.appendChild(answerBox);

        document.body.appendChild(panel);

        header.querySelector('.gfs-close').addEventListener('click', () => {
            panel.classList.remove('gfs-visible');
            toggleButton.classList.remove('gfs-active');
        });

        apiInput.addEventListener('change', () => {
            saveConfig({ apiKey: apiInput.value.trim() });
            ensureApiStatus();
            updateSendButtonState();
        });

        modeSelect.addEventListener('change', () => {
            saveConfig({ outputMode: modeSelect.value });
            updateCustomVisibility();
        });

        customPromptArea.addEventListener('change', () => {
            saveConfig({ customPrompt: customPromptArea.value.trim() });
        });

        panel.querySelector('#gfs-model').addEventListener('change', (ev) => {
            saveConfig({ model: ev.target.value });
        });
        panel.querySelector('#gfs-lang').addEventListener('change', (ev) => {
            saveConfig({ language: ev.target.value });
        });
        panel.querySelector('#gfs-subject').addEventListener('change', (ev) => {
            saveConfig({ subject: ev.target.value });
        });

        questionArea.addEventListener('input', () => {
            state.question = questionArea.value.trim();
            updateSendButtonState();
        });

        Object.entries(answerInputs).forEach(([letter, input]) => {
            input.addEventListener('input', () => {
                state.answers[letter] = input.value.trim();
            });
        });

        captureBtn.addEventListener('click', () => {
            captureSelection({ questionArea, answerInputs, status });
        });

        sendBtn.addEventListener('click', () => {
            sendToGemini({ questionArea, answerInputs, answerBox, status, sendBtn });
        });

        updateCustomVisibility();
        updateSendButtonState();

        return panel;
    }

    function createSelect(labelText, id, value, options) {
        const wrapper = createElement('div', { class: 'gfs-select' });
        const label = createElement('label', { class: 'gfs-label', text: labelText });
        const select = createElement('select', { id });
        options.forEach(opt => {
            const option = typeof opt === 'string' ? { value: opt, label: opt } : opt;
            const optionEl = createElement('option', { value: option.value, text: option.label });
            if (option.value === value) optionEl.selected = true;
            select.appendChild(optionEl);
        });
        wrapper.appendChild(label);
        wrapper.appendChild(select);
        return wrapper;
    }

    function updateCustomVisibility() {
        const row = document.getElementById('gfs-custom-row');
        row.style.display = config.outputMode === 'custom' ? 'block' : 'none';
    }

    function updateSendButtonState() {
        const sendBtn = document.getElementById('gfs-send');
        const question = document.getElementById('gfs-question').value.trim();
        const hasApi = (config.apiKey || '').length > 0;
        sendBtn.disabled = !(hasApi && question);
    }

    function ensureApiStatus() {
        const status = document.getElementById('gfs-status');
        if (!status) return;
        if (!config.apiKey) {
            status.textContent = 'Vui lòng nhập API key Gemini.';
            status.className = 'gfs-status warn';
        } else {
            status.textContent = 'Sẵn sàng gửi yêu cầu tới Gemini.';
            status.className = 'gfs-status ok';
        }
    }

    function handleSelectionChange() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const rawText = selection.toString();
        if (!rawText || !rawText.trim()) return;
        const range = selection.getRangeAt(0);
        if (panel.contains(range.commonAncestorContainer)) {
            return;
        }
        state.selectionText = rawText;
        state.selectionRange = range.cloneRange();
        state.selectionRoot = getRangeRoot(state.selectionRange);
    }

    function getRangeRoot(range) {
        if (!range) return document.body;
        let node = range.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }
        while (node && node.id === 'gfs-panel') {
            node = node.parentElement;
        }
        return node || document.body;
    }

    function captureSelection({ questionArea, answerInputs, status }) {
        if (!state.selectionText) {
            status.textContent = 'Không tìm thấy nội dung được bôi đen.';
            status.className = 'gfs-status warn';
            return;
        }
        const parsed = parseSelection(state.selectionText);
        state.question = parsed.question;
        state.answers = { A: '', B: '', C: '', D: '', ...parsed.answers };
        questionArea.value = state.question;
        Object.entries(answerInputs).forEach(([letter, input]) => {
            input.value = parsed.answers[letter] || '';
        });
        status.textContent = 'Đã lấy nội dung từ phần bôi đen.';
        status.className = 'gfs-status ok';
        updateSendButtonState();
    }

    function parseSelection(text) {
        const lines = String(text)
            .split(/\r?\n/)
            .map(line => line.replace(/[\u00A0\u200B]+/g, ' ').trim())
            .filter(Boolean);
        const answers = { A: '', B: '', C: '', D: '' };
        const optionRegex = /^(?:([A-D])[).:-]?\s*)(.+)$/i;
        const questionLines = [];
        lines.forEach(line => {
            const match = line.match(optionRegex);
            if (match) {
                const letter = match[1].toUpperCase();
                if (!answers[letter]) {
                    answers[letter] = match[2].trim();
                }
            } else {
                questionLines.push(line);
            }
        });
        let question = questionLines.join(' ');
        if (!question && lines.length) {
            question = lines[0];
        }
        return { question, answers };
    }

    function buildPrompt(question, answers) {
        const lang = config.language === 'vi' ? 'Tiếng Việt' : 'English';
        let instruction;
        if (config.outputMode === 'custom' && config.customPrompt.trim()) {
            instruction = `${config.customPrompt.trim()} (Trả lời bằng ${lang}).`;
        } else if (config.outputMode === 'answer') {
            instruction = `Chỉ trả lời dòng duy nhất theo định dạng "Đáp án: <chữ cái>" khi chọn đáp án cho bài ${config.subject}.`;
        } else {
            instruction = `Giải thích ngắn gọn bằng ${lang}, ghi rõ đáp án theo định dạng "Đáp án: <chữ cái>" trước phần phân tích.`;
        }

        const formattedOptions = Object.entries(answers)
            .filter(([, value]) => value)
            .map(([letter, value]) => `${letter}. ${value}`)
            .join('\n');

        return [
            'Bạn là chuyên gia giải bài tập trắc nghiệm.',
            `Hãy đọc câu hỏi môn ${config.subject}.`,
            'Phân tích từng đáp án và chọn đáp án đúng nhất.',
            'Nếu không tự tin, hãy chọn đáp án khả dĩ nhất thay vì trả lời chung chung.',
            instruction,
            '',
            `Ngôn ngữ câu trả lời: ${lang}.`,
            '',
            `Câu hỏi: ${question}`,
            '',
            'Các đáp án:',
            formattedOptions || '(Chưa cung cấp đáp án)'
        ].join('\n');
    }

    function sendToGemini({ questionArea, answerInputs, answerBox, status, sendBtn }) {
        clearHighlights();
        const question = questionArea.value.trim();
        if (!question) {
            status.textContent = 'Vui lòng nhập câu hỏi.';
            status.className = 'gfs-status warn';
            return;
        }
        const answers = { A: '', B: '', C: '', D: '' };
        Object.entries(answerInputs).forEach(([letter, input]) => {
            const value = input.value.trim();
            if (value) {
                answers[letter] = value;
            }
        });
        const prompt = buildPrompt(question, answers);
        answerBox.textContent = 'Đang gửi đến Gemini...';
        answerBox.className = 'gfs-answer loading';
        status.textContent = 'Đang chờ phản hồi...';
        status.className = 'gfs-status info';
        sendBtn.disabled = true;

        callGemini(config.apiKey, {
            prompt,
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens
        }).then(result => {
            answerBox.textContent = result.text.trim();
            answerBox.className = 'gfs-answer';
            status.textContent = 'Hoàn tất.';
            status.className = 'gfs-status ok';
            highlightFromResponse(result.text.trim(), answers);
        }).catch(error => {
            answerBox.textContent = `Lỗi: ${error.message}`;
            answerBox.className = 'gfs-answer error';
            status.textContent = 'Không gửi được yêu cầu. Kiểm tra API key hoặc mạng.';
            status.className = 'gfs-status warn';
        }).finally(() => {
            sendBtn.disabled = false;
        });
    }

    function callGemini(apiKey, { prompt, model, temperature, maxTokens }) {
        if (!apiKey) {
            return Promise.reject(new Error('Chưa nhập API key.'));
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const body = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature,
                maxOutputTokens: maxTokens
            }
        };
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(body),
                onload: (response) => {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            throw new Error(`Gemini API lỗi ${response.status}: ${response.responseText || ''}`);
                        }
                        const data = JSON.parse(response.responseText || '{}');
                        const candidate = data?.candidates?.[0];
                        const text = candidate?.content?.parts?.map(part => part?.text).filter(Boolean).join('\n');
                        if (!text) {
                            throw new Error('Không nhận được phản hồi từ Gemini.');
                        }
                        resolve({ text });
                    } catch (err) {
                        reject(err);
                    }
                },
                onerror: (err) => {
                    reject(new Error(`Không thể kết nối tới Gemini: ${err?.error || 'Lỗi mạng không xác định'}`));
                }
            });
        });
    }

    function highlightFromResponse(text, answers) {
        const letter = detectAnswerLetter(text, answers);
        if (!letter) return;
        const element = findAnswerElement(letter, answers[letter]);
        if (element) {
            element.classList.add('gfs-answer-highlight');
            element.setAttribute('data-gfs-highlight', letter);
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function detectAnswerLetter(text, answers) {
        const patterns = [
            /Đáp án(?: đúng)?[:：]?\s*([A-D])/i,
            /Answer(?: is)?[:：]?\s*([A-D])/i,
            /Phương án (?:đúng|chính xác)[:：]?\s*([A-D])/i
        ];
        for (const regex of patterns) {
            const match = text.match(regex);
            if (match) {
                const letter = match[1].toUpperCase();
                if (answers[letter]) return letter;
            }
        }
        const lines = text.split(/\n|\r/).map(normalizeText);
        for (const line of lines) {
            const match = line.match(/^([A-D])[).:-]?\b/);
            if (match) {
                const letter = match[1].toUpperCase();
                if (answers[letter]) return letter;
            }
        }
        const single = text.match(/\b([A-D])\b/);
        if (single) {
            const letter = single[1].toUpperCase();
            if (answers[letter]) return letter;
        }
        return null;
    }

    function findAnswerElement(letter, text) {
        if (!text) return null;
        const root = (state.selectionRoot && document.contains(state.selectionRoot)) ? state.selectionRoot : document.body;
        const queue = [];
        if (root === document.body) {
            queue.push(...document.querySelectorAll('li, p, div, span, label')); // fallback
        } else {
            queue.push(root, ...root.querySelectorAll('li, p, div, span, label'));
        }
        const normalizedTarget = normalizeText(text).toLowerCase();
        const letterLower = letter.toLowerCase();
        for (const el of queue) {
            if (!el || el === panel || panel.contains(el)) continue;
            const content = normalizeText(el.innerText || '').toLowerCase();
            if (!content) continue;
            if (!content.includes(normalizedTarget)) continue;
            const hasLetterMarker = new RegExp(`\\b${letterLower}[\\).:-]?`).test(content);
            if (hasLetterMarker || content === normalizedTarget) {
                return el;
            }
        }
        return null;
    }

    function clearHighlights() {
        document.querySelectorAll('.gfs-answer-highlight').forEach(el => {
            el.classList.remove('gfs-answer-highlight');
            el.removeAttribute('data-gfs-highlight');
        });
    }

    GM_addStyle(`
        #gfs-toggle {
            position: fixed;
            bottom: 18px;
            right: 18px;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            border: none;
            background: #1f7a4c;
            color: #fff;
            font-size: 18px;
            box-shadow: 0 6px 16px rgba(0,0,0,0.2);
            z-index: 2147483647;
            cursor: pointer;
        }
        #gfs-toggle.gfs-active {
            background: #23a057;
        }
        #gfs-panel {
            position: fixed;
            bottom: 80px;
            right: 18px;
            width: min(360px, 90vw);
            max-height: 80vh;
            overflow-y: auto;
            background: rgba(20, 20, 20, 0.95);
            backdrop-filter: blur(12px);
            color: #f0f0f0;
            border-radius: 16px;
            padding: 14px;
            box-shadow: 0 12px 30px rgba(0,0,0,0.4);
            font-family: 'Segoe UI', sans-serif;
            font-size: 13px;
            line-height: 1.4;
            z-index: 2147483646;
            display: none;
        }
        #gfs-panel.gfs-visible {
            display: block;
        }
        .gfs-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .gfs-title {
            font-weight: 600;
            font-size: 15px;
        }
        .gfs-close {
            background: transparent;
            border: none;
            color: #aaa;
            font-size: 20px;
            cursor: pointer;
        }
        .gfs-close:hover {
            color: #fff;
        }
        .gfs-row {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 10px;
        }
        .gfs-label {
            font-size: 12px;
            color: #b7c0c8;
        }
        input#gfs-api,
        select,
        textarea {
            width: 100%;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.05);
            color: #f6f6f6;
            padding: 8px 10px;
            font-size: 13px;
            box-sizing: border-box;
        }
        select:focus,
        textarea:focus,
        input:focus {
            outline: none;
            border-color: rgba(46, 204, 113, 0.6);
            box-shadow: 0 0 0 1px rgba(46, 204, 113, 0.2);
        }
        .gfs-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
            margin-bottom: 10px;
        }
        .gfs-answers {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin-bottom: 10px;
        }
        .gfs-answer-input {
            min-height: 48px;
        }
        .gfs-controls {
            display: flex;
            gap: 8px;
            margin-bottom: 10px;
        }
        .gfs-controls button {
            flex: 1;
            border: none;
            border-radius: 10px;
            padding: 10px;
            font-weight: 600;
            cursor: pointer;
            background: #23a057;
            color: #fff;
        }
        .gfs-controls button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        #gfs-capture {
            background: rgba(255,255,255,0.08);
            color: #d8ffe6;
        }
        #gfs-capture:hover {
            background: rgba(35,160,87,0.4);
        }
        #gfs-send {
            background: linear-gradient(135deg, #23a057, #1f7a4c);
        }
        #gfs-send:hover {
            background: linear-gradient(135deg, #2bc86c, #219356);
        }
        #gfs-answer-box {
            background: rgba(255,255,255,0.06);
            border-radius: 12px;
            padding: 12px;
            min-height: 64px;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .gfs-answer.loading::after {
            content: '⏳';
            display: inline-block;
            margin-left: 6px;
            animation: gfs-spin 1s linear infinite;
        }
        .gfs-answer.error {
            color: #ffb3b3;
        }
        .gfs-status {
            font-size: 12px;
            margin-bottom: 8px;
        }
        .gfs-status.ok {
            color: #2ecc71;
        }
        .gfs-status.warn {
            color: #e67e22;
        }
        .gfs-status.info {
            color: #3498db;
        }
        @keyframes gfs-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .gfs-answer-highlight {
            background: rgba(46, 204, 113, 0.3) !important;
            transition: background 0.3s ease;
            position: relative;
        }
        .gfs-answer-highlight::after {
            content: attr(data-gfs-highlight);
            position: absolute;
            top: 6px;
            right: 6px;
            background: #23a057;
            color: #fff;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 999px;
            box-shadow: 0 3px 6px rgba(0,0,0,0.2);
        }
        @media (max-width: 520px) {
            #gfs-panel {
                right: 12px;
                left: 12px;
                width: auto;
            }
            .gfs-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .gfs-answers {
                grid-template-columns: minmax(0, 1fr);
            }
        }
    `);
})();
