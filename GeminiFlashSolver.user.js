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
            width: min(420px, 90vw);
            max-height: 85vh;
            overflow-y: auto;
            background: rgba(20, 20, 20, 0.98);
            backdrop-filter: blur(16px);
            color: #f0f0f0;
            border-radius: 20px;
            padding: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1);
            font-family: 'Segoe UI', 'Inter', -apple-system, sans-serif;
            font-size: 13px;
            line-height: 1.5;
            z-index: 2147483646;
            display: none;
            border: 1px solid rgba(46, 204, 113, 0.1);
        }
        #gfs-panel.gfs-visible {
            display: block;
        }
        .gfs-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 12px;
            border-bottom: 2px solid rgba(46, 204, 113, 0.2);
        }
        .gfs-title {
            font-weight: 700;
            font-size: 18px;
            background: linear-gradient(135deg, #2ecc71, #23a057);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
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
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 10px;
        }
        .gfs-answer-item {
            background: rgba(255,255,255,0.03);
            border: 2px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 12px;
            transition: all 0.3s ease;
        }
        .gfs-answer-item:hover {
            border-color: rgba(46, 204, 113, 0.3);
            background: rgba(255,255,255,0.06);
        }
        .gfs-answer-item.correct {
            border-color: #2ecc71;
            background: rgba(46, 204, 113, 0.15);
            box-shadow: 0 0 15px rgba(46, 204, 113, 0.2);
        }
        .gfs-answer-item.correct .gfs-label {
            color: #2ecc71;
            font-weight: 700;
            font-size: 14px;
        }
        .gfs-answer-item.correct .gfs-answer-input {
            color: #2ecc71;
            font-weight: 600;
            border-color: rgba(46, 204, 113, 0.4);
        }
        .gfs-answer-input {
            min-height: 60px;
            font-size: 14px;
            line-height: 1.6;
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
            background: linear-gradient(135deg, rgba(46, 204, 113, 0.15), rgba(35, 160, 87, 0.15));
            border: 2px solid rgba(46, 204, 113, 0.3);
            border-radius: 16px;
            padding: 16px;
            min-height: 80px;
            white-space: pre-wrap;
            word-break: break-word;
            font-size: 16px;
            font-weight: 600;
            line-height: 1.8;
            color: #2ecc71;
            box-shadow: 0 4px 15px rgba(46, 204, 113, 0.1);
        }
        /* Rich answer layout */
        .gfs-answer-head {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-weight: 600;
        }
        .gfs-answer-head-label { color: #cfd8dc; }
        .gfs-correct-letter {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 28px;
            height: 28px;
            padding: 0 10px;
            border-radius: 999px;
            background: #23a057;
            color: #fff;
        }
        .gfs-options-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 6px;
        }
        .gfs-option {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            border: 1px solid rgba(255,255,255,0.08);
            background: rgba(255,255,255,0.04);
            border-radius: 10px;
            padding: 8px 10px;
        }
        .gfs-letter {
            width: 26px;
            height: 26px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            background: rgba(255,255,255,0.1);
            font-weight: 700;
        }
        .gfs-option.correct {
            border-color: rgba(46,204,113,0.7);
            background: rgba(46,204,113,0.15);
        }
        .gfs-option.correct .gfs-letter {
            background: #23a057;
            color: #fff;
        }
        .gfs-option-text { white-space: pre-wrap; }
        .gfs-explain { margin-top: 8px; opacity: .95; }
        .gfs-explain pre { margin: 0; white-space: pre-wrap; }
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
            transition: all 0.3s ease;
            position: relative;
            border: 3px solid #2ecc71 !important;
            box-shadow: 0 0 20px rgba(46, 204, 113, 0.5) !important;
            font-weight: 700 !important;
            font-size: 16px !important;
            transform: scale(1.02);
        }
        .gfs-answer-highlight::before {
            content: '✓ Đáp án đúng';
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            padding: 4px 12px;
            border-radius: 999px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            white-space: nowrap;
            letter-spacing: 0.5px;
        }
        .gfs-answer-highlight::after {
            content: attr(data-gfs-highlight);
            position: absolute;
            top: 8px;
            right: 8px;
            background: #2ecc71;
            color: #fff;
            font-size: 18px;
            font-weight: 700;
            padding: 6px 12px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            min-width: 32px;
            text-align: center;
        }
        @keyframes correctPulse {
            0%, 100% { box-shadow: 0 0 15px rgba(46, 204, 113, 0.2); }
            50% { box-shadow: 0 0 30px rgba(46, 204, 113, 0.5); }
        }
        .gfs-answer-item.correct {
            animation: correctPulse 2s ease-in-out infinite;
        }
        @media (max-width: 520px) {
            #gfs-panel {
                right: 8px;
                left: 8px;
                width: auto;
                bottom: 70px;
            }
            .gfs-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .gfs-title {
                font-size: 16px;
            }
        }
    `);
})();
