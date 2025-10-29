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
        answers: { A: '', B: '', C: '', D: '' },
        answerElements: { A: null, B: null, C: null, D: null }
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
        const questionArea = createElement('textarea', { id: 'gfs-question', rows: '4', placeholder: 'Dán hoặc lấy từ phần bôi đen...' });
        questionArea.style.fontSize = '15px';
        questionArea.style.lineHeight = '1.6';
        questionRow.appendChild(questionLabel);
        questionRow.appendChild(questionArea);
        panel.appendChild(questionRow);

        const answersContainer = createElement('div', { class: 'gfs-answers' });
        const answerInputs = {};
        ['A', 'B', 'C', 'D'].forEach(letter => {
            const wrapper = createElement('div', { class: 'gfs-answer-item' });
            wrapper.setAttribute('data-answer-letter', letter);
            const label = createElement('label', { class: 'gfs-label', text: `Đáp án ${letter}` });
            label.style.fontWeight = '700';
            label.style.fontSize = '13px';
            label.style.marginBottom = '6px';
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
                const previous = state.answers[letter];
                state.answers[letter] = input.value.trim();
                if (state.answerElements[letter] && normalizeText(previous) !== normalizeText(state.answers[letter])) {
                    state.answerElements[letter] = null;
                }
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
        const range = selection.getRangeAt(0);
        const rawText = extractRangeText(range);
        if (!rawText) return;
        if (panel.contains(range.commonAncestorContainer)) {
            return;
        }
        state.selectionText = rawText;
        state.selectionRange = range.cloneRange();
        state.selectionRoot = getRangeRoot(state.selectionRange);
        state.answerElements = { A: null, B: null, C: null, D: null };
    }

    function extractRangeText(range) {
        if (!range) return '';
        const cloned = range.cloneContents();
        if (!cloned) return '';
        const container = document.createElement('div');
        container.appendChild(cloned);
        
        // Preserve line breaks and clean up
        let text = container.innerText || container.textContent || '';
        text = text.replace(/[\u00A0\u200B]+/g, ' '); // Remove non-breaking spaces
        text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // Normalize line breaks
        text = text.replace(/[ \t]+$/gm, ''); // Remove trailing spaces on each line
        text = text.trim();
        
        return text;
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
        if (!state.selectionText || !state.selectionRange) {
            status.textContent = 'Không tìm thấy nội dung được bôi đen.';
            status.className = 'gfs-status warn';
            return;
        }
        const parsed = parseSelection(state.selectionText);
        const questionText = parsed.question || state.question || '';
        const previousAnswers = { ...state.answers };
        state.question = questionText;
        state.answers = { A: '', B: '', C: '', D: '', ...previousAnswers, ...parsed.answers };
        const located = locateAnswerElements(state.selectionRange, parsed.answers);
        state.answerElements = { A: null, B: null, C: null, D: null, ...located };
        if (parsed.question || !questionArea.value.trim()) {
            questionArea.value = questionText;
        }
        Object.entries(answerInputs).forEach(([letter, input]) => {
            if (parsed.answers[letter]) {
                input.value = parsed.answers[letter];
            } else if (!input.value.trim()) {
                input.value = '';
            }
        });
        status.textContent = 'Đã lấy nội dung từ phần bôi đen.';
        status.className = 'gfs-status ok';
        updateSendButtonState();
    }

    function parseSelection(text) {
        if (!text) {
            return { question: '', answers: { A: '', B: '', C: '', D: '' } };
        }

        const answers = { A: '', B: '', C: '', D: '' };
        
        // Normalize text but preserve line structure
        const normalized = String(text)
            .replace(/[\u00A0\u200B]+/g, ' ')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');

        // Try to find answer options with various formats: A), A., A:, A-, (A), etc.
        // Match at start of line or after whitespace
        const optionRegex = /(?:^|\n|\s{2,})\(?([A-D])\)?[\).:\-]\s*(.+?)(?=(?:\n|\s{2,})\(?[A-D]\)?[\).:\-]|$)/gis;
        const matches = [];
        let match;
        
        while ((match = optionRegex.exec(normalized)) !== null) {
            const letter = match[1].toUpperCase();
            const content = match[2].trim();
            if (content && !answers[letter]) {
                matches.push({
                    letter,
                    content,
                    start: match.index
                });
                answers[letter] = content;
            }
        }

        // Extract question (everything before first answer option)
        let question = '';
        if (matches.length > 0) {
            const firstMatchIndex = matches[0].start;
            question = normalized.slice(0, firstMatchIndex).trim();
        } else {
            // No options found, try alternative parsing
            // Split by line breaks and look for patterns
            const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Check if line starts with answer marker
                const answerMatch = line.match(/^\(?([A-D])\)?[\).:\-]\s*(.+)/);
                if (answerMatch) {
                    const letter = answerMatch[1].toUpperCase();
                    const content = answerMatch[2].trim();
                    if (!answers[letter]) {
                        answers[letter] = content;
                    }
                    // Question is everything before this line
                    if (!question) {
                        question = lines.slice(0, i).join(' ').trim();
                    }
                } else if (!Object.values(answers).some(a => a)) {
                    // Still building the question
                    question = lines.slice(0, i + 1).join(' ').trim();
                }
            }
        }

        // If still no question found, use first line or first sentence
        if (!question) {
            const sentences = normalized.split(/[.?!]\s+/);
            question = sentences[0] ? sentences[0].trim() : normalized.trim();
        }

        // Clean up question - remove common prefixes
        question = question.replace(/^(?:câu hỏi|question|câu)\s*\d*[:.\-]?\s*/i, '').trim();
        
        return { question, answers };
    }

    function locateAnswerElements(range, answers) {
        const result = {};
        if (!range) return result;
        
        const root = getRangeRoot(range) || document.body;
        const letters = Object.entries(answers).filter(([, value]) => value);
        if (!letters.length) {
            return result;
        }
        
        const selectionRect = safeRect(range.getBoundingClientRect());
        
        // Get all potential answer elements
        const candidates = (root === document.body)
            ? Array.from(document.querySelectorAll('li, label, p, div, span, td'))
            : Array.from(root.querySelectorAll('li, label, p, div, span, td'));

        // Sort by position in document for more predictable matching
        candidates.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            if (Math.abs(rectA.top - rectB.top) > 5) {
                return rectA.top - rectB.top;
            }
            return rectA.left - rectB.left;
        });

        for (const el of candidates) {
            if (!el || !document.contains(el)) continue;
            if (el === panel || panel.contains(el)) continue;
            
            const text = normalizeText(el.innerText || el.textContent || '');
            if (!text) continue;
            
            // Check if element is within or near selection area
            if (selectionRect) {
                const rect = safeRect(el.getBoundingClientRect());
                if (!rect || !rectsIntersect(rect, selectionRect)) {
                    continue;
                }
            }
            
            const textLower = text.toLowerCase();
            
            for (const [letter, answer] of letters) {
                if (result[letter]) continue;
                
                const answerNormalized = normalizeText(answer);
                if (!answerNormalized) continue;
                
                const answerLower = answerNormalized.toLowerCase();
                
                // Check if text contains the answer content
                if (!textLower.includes(answerLower)) continue;
                
                // Check for letter marker patterns: A), A., A:, (A), etc.
                const letterLower = letter.toLowerCase();
                const patterns = [
                    new RegExp(`\\(?${letterLower}\\)[\\).:\\-]`, 'i'),
                    new RegExp(`^\\s*${letterLower}[\\).:\\-]`, 'i'),
                    new RegExp(`\\b${letterLower}[\\).:\\-]`, 'i')
                ];
                
                const hasMarker = patterns.some(p => p.test(text));
                
                // Also check if the answer text is a significant portion of the element
                const similarity = answerNormalized.length / text.length;
                
                if (hasMarker || similarity > 0.5) {
                    result[letter] = el;
                }
            }
            
            // Early exit if all answers found
            if (letters.every(([letter]) => result[letter])) {
                break;
            }
        }
        
        return result;
    }

    function safeRect(rect) {
        if (!rect || Number.isNaN(rect.top)) return null;
        if (rect.width === 0 && rect.height === 0) return null;
        return rect;
    }

    function rectsIntersect(a, b) {
        return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
    }

    function escapeRegExp(str) {
        return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function buildPrompt(question, answers) {
        const lang = config.language === 'vi' ? 'Tiếng Việt' : 'English';
        let instruction;
        if (config.outputMode === 'custom' && config.customPrompt.trim()) {
            instruction = `${config.customPrompt.trim()} (Trả lời bằng ${lang}).`;
        } else if (config.outputMode === 'answer') {
            instruction = `Chỉ trả lời duy nhất một dòng với định dạng chính xác "Đáp án: <A/B/C/D>" (ví dụ: Đáp án: C). Không thêm giải thích hay ký tự thừa.`;
        } else {
            instruction = `Mở đầu câu trả lời bằng định dạng "Đáp án: <A/B/C/D>" rồi giải thích ngắn gọn bằng ${lang}. Không dùng markdown.`;
        }

        const formattedOptions = Object.entries(answers)
            .filter(([, value]) => value)
            .map(([letter, value]) => `${letter}. ${value}`)
            .join('\n');

        return [
            'Bạn là chuyên gia giải bài tập trắc nghiệm.',
            `Hãy đọc câu hỏi môn ${config.subject}.`,
            'Phân tích từng đáp án A, B, C, D và xác định lựa chọn chính xác nhất.',
            'Nếu dữ kiện chưa đủ, hãy chọn đáp án có khả năng cao nhất thay vì từ chối trả lời.',
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
            const finalText = result.text.trim();
            answerBox.className = 'gfs-answer';
            renderAnswerBox(answerBox, finalText, answers);
            status.textContent = 'Hoàn tất.';
            status.className = 'gfs-status ok';
            highlightFromResponse(finalText, answers);
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
                            let message = `Gemini API lỗi ${response.status}`;
                            try {
                                const parsed = JSON.parse(response.responseText || '{}');
                                if (parsed?.error?.message) {
                                    message = parsed.error.message;
                                }
                            } catch (parseErr) {
                                // ignore parse error, keep default message
                            }
                            throw new Error(message);
                        }
                        const data = JSON.parse(response.responseText || '{}');
                        const blockReason = data?.promptFeedback?.blockReason;
                        if (blockReason) {
                            throw new Error(`Gemini từ chối trả lời: ${blockReason}.`);
                        }
                        const candidate = data?.candidates?.[0];
                        if (!candidate) {
                            throw new Error('Gemini không trả lời.');
                        }
                        if (candidate.finishReason && candidate.finishReason !== 'STOP') {
                            throw new Error(`Gemini dừng với lý do: ${candidate.finishReason}.`);
                        }
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
        
        // Highlight in the panel
        const panelAnswerItems = panel.querySelectorAll('.gfs-answer-item');
        panelAnswerItems.forEach(item => {
            item.classList.remove('correct');
        });
        const correctItem = panel.querySelector(`.gfs-answer-item[data-answer-letter="${letter}"]`);
        if (correctItem) {
            correctItem.classList.add('correct');
        }
        
        // Highlight on the page
        let element = state.answerElements?.[letter];
        if (element && !document.contains(element)) {
            element = null;
        }
        if (!element) {
            element = findAnswerElement(letter, answers[letter]);
        }
        if (element) {
            element.classList.add('gfs-answer-highlight');
            element.setAttribute('data-gfs-highlight', letter);
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            markQuestionDone();
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
        const candidates = [];
        
        if (root === document.body) {
            candidates.push(...document.querySelectorAll('li, p, div, span, label, td'));
        } else {
            candidates.push(root, ...root.querySelectorAll('li, p, div, span, label, td'));
        }
        
        const normalizedTarget = normalizeText(text).toLowerCase();
        const letterLower = letter.toLowerCase();
        const selectionRect = state.selectionRange ? safeRect(state.selectionRange.getBoundingClientRect()) : null;
        
        let bestMatch = null;
        let bestScore = 0;
        
        for (const el of candidates) {
            if (!el || el === panel || panel.contains(el)) continue;
            
            const content = normalizeText(el.innerText || el.textContent || '');
            if (!content) continue;
            
            const contentLower = content.toLowerCase();
            
            // Skip if answer text not in element
            if (!contentLower.includes(normalizedTarget)) continue;
            
            // Check if within selection area
            if (selectionRect) {
                const rect = safeRect(el.getBoundingClientRect());
                if (!rect || !rectsIntersect(rect, selectionRect)) {
                    continue;
                }
            }
            
            // Score this match
            let score = 0;
            
            // Check for letter markers
            const patterns = [
                new RegExp(`^\\s*\\(?${letterLower}\\)[\\).:\\-]`, 'i'),  // Starts with (A) or A)
                new RegExp(`^\\s*${letterLower}[\\).:\\-]`, 'i'),           // Starts with A.
                new RegExp(`\\b${letterLower}[\\).:\\-]`, 'i')              // Contains A.
            ];
            
            for (let i = 0; i < patterns.length; i++) {
                if (patterns[i].test(content)) {
                    score += (3 - i); // Earlier patterns get higher scores
                    break;
                }
            }
            
            // Prefer exact or close matches
            const similarity = normalizedTarget.length / content.length;
            if (similarity > 0.8) score += 3;
            else if (similarity > 0.5) score += 2;
            else if (similarity > 0.3) score += 1;
            
            // Prefer smaller elements (more specific)
            if (content.length < 200) score += 1;
            
            if (score > bestScore) {
                bestScore = score;
                bestMatch = el;
            }
        }
        
        return bestScore > 0 ? bestMatch : null;
    }

    function clearHighlights() {
        // Clear highlights on page
        document.querySelectorAll('.gfs-answer-highlight').forEach(el => {
            el.classList.remove('gfs-answer-highlight');
            el.removeAttribute('data-gfs-highlight');
        });
        // Clear highlights in panel
        const panelAnswerItems = panel.querySelectorAll('.gfs-answer-item');
        panelAnswerItems.forEach(item => {
            item.classList.remove('correct');
        });
    }

    // Render rich answer box with colored options and correct letter
    function renderAnswerBox(answerBox, text, answers) {
        try {
            // Reset box
            while (answerBox.firstChild) answerBox.removeChild(answerBox.firstChild);

            const letter = detectAnswerLetter(text, answers);

            const header = createElement('div', { class: 'gfs-answer-head' });
            header.appendChild(createElement('span', { class: 'gfs-answer-head-label', text: 'Đáp án:' }));
            header.appendChild(createElement('span', { class: 'gfs-correct-letter', text: letter || '?' }));
            answerBox.appendChild(header);

            const grid = createElement('div', { class: 'gfs-options-grid' });
            ['A', 'B', 'C', 'D'].forEach(l => {
                const option = createElement('div', { class: `gfs-option${l === letter ? ' correct' : ''}` });
                option.appendChild(createElement('div', { class: 'gfs-letter', text: l }));
                option.appendChild(createElement('div', { class: 'gfs-option-text', text: answers[l] || '' }));
                grid.appendChild(option);
            });
            answerBox.appendChild(grid);

            // For modes with explanation, keep the model output for reference
            if (config.outputMode !== 'answer' && text) {
                const explain = createElement('div', { class: 'gfs-explain' });
                const pre = document.createElement('pre');
                pre.textContent = text;
                explain.appendChild(pre);
                answerBox.appendChild(explain);
            }
        } catch (err) {
            // Fallback to plain text if rendering fails for any reason
            answerBox.textContent = text;
        }
    }

    // Try to mark the current question index on page as done (best-effort for common UIs)
    function markQuestionDone() {
        try {
            // Find an element like "1/10" or "3 / 20" on page
            const progressEl = Array.from(document.querySelectorAll('div, span, p, strong'))
                .find(el => {
                    if (!el || el === panel || panel.contains(el)) return false;
                    const t = (el.innerText || el.textContent || '').trim();
                    return /^\d+\s*\/\s*\d+$/.test(t);
                });
            if (!progressEl) return;
            const t = (progressEl.innerText || progressEl.textContent || '').trim();
            const current = t.split('/')[0].trim();
            if (!current) return;

            const nearBottom = (el) => {
                const rect = safeRect(el.getBoundingClientRect());
                return rect && rect.bottom > (window.innerHeight - 260);
            };

            const candidates = Array.from(document.querySelectorAll('button, a, span, div, li'))
                .filter(el => {
                    if (!el || el === panel || panel.contains(el)) return false;
                    const label = (el.innerText || el.textContent || '').trim();
                    if (label !== current) return false;
                    if (label.length > 3) return false;
                    return nearBottom(el);
                });
            candidates.forEach(el => {
                el.setAttribute('data-gfs-done', 'true');
                el.style.backgroundColor = '#23a057';
                el.style.color = '#fff';
                el.style.borderRadius = '8px';
                el.style.transition = 'all .2s ease';
            });
        } catch (_) {
            // ignore best-effort failures
        }
    }

    GM_addStyle(`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
            box-sizing: border-box;
        }
        
        #gfs-toggle {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            color: #fff;
            font-size: 20px;
            font-weight: 700;
            box-shadow: 0 8px 24px rgba(46, 204, 113, 0.4), 0 4px 8px rgba(0,0,0,0.2);
            z-index: 2147483647;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            animation: float 3s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-8px) scale(1.02); }
        }
        
        #gfs-toggle:hover {
            transform: scale(1.1) rotate(10deg);
            box-shadow: 0 12px 32px rgba(46, 204, 113, 0.5), 0 6px 12px rgba(0,0,0,0.3);
        }
        
        #gfs-toggle.gfs-active {
            background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
            transform: scale(0.95);
        }
        
        #gfs-panel {
            position: fixed;
            bottom: 90px;
            right: 20px;
            width: min(440px, calc(100vw - 40px));
            max-height: calc(100vh - 130px);
            overflow-y: auto;
            background: linear-gradient(145deg, rgba(26, 26, 46, 0.98) 0%, rgba(42, 42, 62, 0.98) 100%);
            backdrop-filter: blur(20px);
            color: #f0f0f0;
            border-radius: 24px;
            padding: 0;
            box-shadow: 0 24px 64px rgba(0,0,0,0.7), 0 0 1px rgba(46, 204, 113, 0.3);
            font-family: 'Inter', 'Segoe UI', -apple-system, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            z-index: 2147483646;
            display: none;
            border: 1px solid rgba(46, 204, 113, 0.15);
        }
        #gfs-panel.gfs-visible {
            display: block;
            animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        #gfs-panel::-webkit-scrollbar {
            width: 8px;
        }
        
        #gfs-panel::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 4px;
        }
        
        #gfs-panel::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            border-radius: 4px;
        }
        
        .gfs-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            background: linear-gradient(135deg, rgba(46, 204, 113, 0.15) 0%, rgba(39, 174, 96, 0.1) 100%);
            border-bottom: 2px solid rgba(46, 204, 113, 0.2);
            position: relative;
            overflow: hidden;
        }
        
        .gfs-header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(46, 204, 113, 0.1) 0%, transparent 70%);
            animation: shimmer 4s infinite;
        }
        
        @keyframes shimmer {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(180deg); }
        }
        
        .gfs-title {
            font-weight: 700;
            font-size: 20px;
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            position: relative;
            z-index: 1;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .gfs-title::before {
            content: '✨';
            font-size: 20px;
        }
        
        .gfs-close {
            background: rgba(255, 255, 255, 0.08);
            border: none;
            color: #aaa;
            font-size: 24px;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            position: relative;
            z-index: 1;
        }
        
        .gfs-close:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.15);
            transform: rotate(90deg);
        }
        .gfs-row {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 0 24px;
            margin-bottom: 16px;
        }
        
        .gfs-label {
            font-size: 12px;
            font-weight: 600;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        input#gfs-api,
        select,
        textarea {
            width: 100%;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.05);
            color: #f6f6f6;
            padding: 12px 16px;
            font-size: 14px;
            font-family: inherit;
            box-sizing: border-box;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        select:focus,
        textarea:focus,
        input:focus {
            outline: none;
            border-color: rgba(46, 204, 113, 0.6);
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 0 3px rgba(46, 204, 113, 0.15);
        }
        .gfs-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            padding: 0 24px;
            margin-bottom: 16px;
        }
        
        .gfs-select {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .gfs-answers {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            padding: 0 24px;
            margin-bottom: 16px;
        }
        
        .gfs-answer-item {
            background: rgba(255,255,255,0.03);
            border: 2px solid rgba(255,255,255,0.1);
            border-radius: 16px;
            padding: 16px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }
        
        .gfs-answer-item::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(46, 204, 113, 0.1) 0%, transparent 100%);
            opacity: 0;
            transition: opacity 0.3s;
        }
        
        .gfs-answer-item:hover {
            border-color: rgba(46, 204, 113, 0.4);
            background: rgba(255,255,255,0.06);
            transform: translateY(-2px);
        }
        
        .gfs-answer-item:hover::before {
            opacity: 1;
        }
        
        .gfs-answer-item.correct {
            border-color: #2ecc71;
            background: rgba(46, 204, 113, 0.2);
            box-shadow: 0 8px 24px rgba(46, 204, 113, 0.3);
            animation: correctPulse 2s ease-in-out infinite;
        }
        .gfs-answer-item.correct .gfs-label {
            color: #2ecc71;
            font-weight: 700;
            font-size: 13px;
        }
        
        .gfs-answer-item.correct .gfs-label::before {
            content: '✓ ';
            font-size: 14px;
        }
        
        .gfs-answer-item.correct .gfs-answer-input {
            color: #2ecc71;
            font-weight: 600;
            border-color: rgba(46, 204, 113, 0.5);
            background: rgba(46, 204, 113, 0.08);
        }
        
        .gfs-answer-input {
            min-height: 70px;
            font-size: 14px;
            line-height: 1.6;
            resize: vertical;
        }
        .gfs-controls {
            display: flex;
            gap: 12px;
            padding: 0 24px 20px;
            margin-bottom: 0;
        }
        
        .gfs-controls button {
            flex: 1;
            border: none;
            border-radius: 12px;
            padding: 14px 20px;
            font-weight: 600;
            font-size: 15px;
            cursor: pointer;
            background: #23a057;
            color: #fff;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .gfs-controls button::before {
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
        
        .gfs-controls button:active::before {
            width: 300px;
            height: 300px;
        }
        
        .gfs-controls button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none !important;
        }
        
        #gfs-capture {
            background: rgba(255,255,255,0.08);
            color: #d8ffe6;
            border: 1px solid rgba(255,255,255,0.1);
        }
        
        #gfs-capture:hover:not(:disabled) {
            background: rgba(46, 204, 113, 0.2);
            border-color: rgba(46, 204, 113, 0.4);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(46, 204, 113, 0.2);
        }
        
        #gfs-send {
            background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
            box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
        }
        
        #gfs-send:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(46, 204, 113, 0.4);
        }
        #gfs-answer-box {
            background: linear-gradient(135deg, rgba(46, 204, 113, 0.15), rgba(39, 174, 96, 0.15));
            border: 2px solid rgba(46, 204, 113, 0.3);
            border-radius: 20px;
            padding: 20px;
            margin: 0 24px 20px;
            min-height: 100px;
            white-space: pre-wrap;
            word-break: break-word;
            font-size: 15px;
            font-weight: 600;
            line-height: 1.8;
            color: #2ecc71;
            box-shadow: 0 8px 24px rgba(46, 204, 113, 0.15);
        }
        /* Rich answer layout */
        .gfs-answer-head {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
            font-weight: 600;
            font-size: 16px;
        }
        
        .gfs-answer-head-label { 
            color: #94a3b8;
            font-size: 15px;
        }
        
        .gfs-correct-letter {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 32px;
            height: 32px;
            padding: 0 12px;
            border-radius: 999px;
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: #fff;
            font-size: 16px;
            font-weight: 700;
            box-shadow: 0 4px 12px rgba(46, 204, 113, 0.3);
        }
        .gfs-options-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
        }
        
        .gfs-option {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            border: 2px solid rgba(255,255,255,0.1);
            background: rgba(255,255,255,0.04);
            border-radius: 12px;
            padding: 12px 14px;
            transition: all 0.2s;
        }
        
        .gfs-option:hover {
            background: rgba(255,255,255,0.06);
        }
        
        .gfs-letter {
            width: 28px;
            height: 28px;
            min-width: 28px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            background: rgba(255,255,255,0.12);
            font-weight: 700;
            font-size: 14px;
        }
        
        .gfs-option.correct {
            border-color: rgba(46,204,113,0.8);
            background: rgba(46,204,113,0.2);
        }
        
        .gfs-option.correct .gfs-letter {
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: #fff;
            box-shadow: 0 2px 8px rgba(46, 204, 113, 0.3);
        }
        
        .gfs-option-text { 
            white-space: pre-wrap;
            flex: 1;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .gfs-explain { 
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            opacity: .95;
            font-size: 13px;
        }
        
        .gfs-explain pre { 
            margin: 0;
            white-space: pre-wrap;
            line-height: 1.6;
        }
        .gfs-answer.loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        
        .gfs-answer.loading::after {
            content: '';
            width: 24px;
            height: 24px;
            border: 3px solid rgba(46, 204, 113, 0.2);
            border-top-color: #2ecc71;
            border-radius: 50%;
            display: inline-block;
            animation: gfs-spin 0.8s linear infinite;
        }
        
        .gfs-answer.error {
            color: #ff6b6b;
            border-color: rgba(255, 107, 107, 0.5);
            background: rgba(255, 107, 107, 0.1);
        }
        .gfs-status {
            font-size: 13px;
            padding: 12px 24px;
            margin: 0;
            font-weight: 500;
            border-radius: 0;
            background: rgba(255, 255, 255, 0.03);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .gfs-status::before {
            content: '•';
            font-size: 20px;
        }
        
        .gfs-status.ok {
            color: #2ecc71;
            background: rgba(46, 204, 113, 0.1);
        }
        
        .gfs-status.ok::before {
            content: '✓';
        }
        
        .gfs-status.warn {
            color: #f39c12;
            background: rgba(243, 156, 18, 0.1);
        }
        
        .gfs-status.warn::before {
            content: '⚠';
        }
        
        .gfs-status.info {
            color: #3498db;
            background: rgba(52, 152, 219, 0.1);
        }
        
        .gfs-status.info::before {
            content: 'ℹ';
        }
        @keyframes gfs-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .gfs-answer-highlight {
            background: rgba(46, 204, 113, 0.3) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            border: 3px solid #2ecc71 !important;
            box-shadow: 0 8px 32px rgba(46, 204, 113, 0.5) !important;
            font-weight: 700 !important;
            font-size: 16px !important;
            transform: scale(1.03);
            animation: highlightPulse 2s ease-in-out infinite;
        }
        
        @keyframes highlightPulse {
            0%, 100% { 
                box-shadow: 0 8px 32px rgba(46, 204, 113, 0.5);
                transform: scale(1.03);
            }
            50% { 
                box-shadow: 0 12px 40px rgba(46, 204, 113, 0.7);
                transform: scale(1.04);
            }
        }
        
        .gfs-answer-highlight::before {
            content: '✓ Đáp án đúng';
            position: absolute;
            top: -14px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: #fff;
            font-size: 12px;
            font-weight: 700;
            padding: 6px 16px;
            border-radius: 999px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            white-space: nowrap;
            letter-spacing: 0.8px;
            text-transform: uppercase;
        }
        
        .gfs-answer-highlight::after {
            content: attr(data-gfs-highlight);
            position: absolute;
            top: 10px;
            right: 10px;
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: #fff;
            font-size: 20px;
            font-weight: 700;
            padding: 8px 14px;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            min-width: 36px;
            text-align: center;
        }
        
        @keyframes correctPulse {
            0%, 100% { 
                box-shadow: 0 8px 24px rgba(46, 204, 113, 0.3);
            }
            50% { 
                box-shadow: 0 12px 32px rgba(46, 204, 113, 0.5);
            }
        }
        
        .gfs-answer-item.correct {
            animation: correctPulse 2s ease-in-out infinite;
        }
        @media (max-width: 768px) {
            #gfs-panel {
                right: 10px;
                left: 10px;
                bottom: 80px;
                width: auto;
                max-height: calc(100vh - 110px);
                border-radius: 20px;
            }
            
            .gfs-header {
                padding: 16px 20px;
            }
            
            .gfs-title {
                font-size: 18px;
            }
            
            .gfs-row,
            .gfs-grid,
            .gfs-answers,
            .gfs-controls {
                padding-left: 20px;
                padding-right: 20px;
            }
            
            .gfs-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }
            
            .gfs-answers {
                grid-template-columns: 1fr;
                gap: 10px;
            }
            
            .gfs-answer-item {
                padding: 14px;
            }
            
            .gfs-controls {
                flex-direction: column;
                gap: 10px;
            }
            
            .gfs-controls button {
                padding: 12px 16px;
                font-size: 14px;
            }
            
            #gfs-answer-box {
                margin: 0 20px 16px;
                padding: 16px;
                font-size: 14px;
            }
            
            #gfs-toggle {
                bottom: 16px;
                right: 16px;
                width: 52px;
                height: 52px;
            }
        }
        
        @media (max-width: 480px) {
            .gfs-header {
                padding: 14px 16px;
            }
            
            .gfs-title {
                font-size: 16px;
            }
            
            .gfs-row,
            .gfs-grid,
            .gfs-answers,
            .gfs-controls,
            #gfs-answer-box {
                padding-left: 16px;
                padding-right: 16px;
            }
            
            .gfs-grid {
                grid-template-columns: 1fr;
            }
            
            input#gfs-api,
            select,
            textarea {
                padding: 10px 12px;
                font-size: 13px;
            }
            
            .gfs-answer-item {
                padding: 12px;
            }
        }
    `);
})();
