// ==UserScript==
// @name         Gemini 2.5 Flash Solver
// @namespace    https://github.com/htuananh
// @version      1.0.0
// @description  Đọc câu hỏi trắc nghiệm, dùng Gemini 2.5 Flash và tìm kiếm web để gợi ý đáp án. Hoạt động trên PC và mobile.
// @author       OpenAI ChatGPT
// @match        *://*/*
// @icon         https://www.gstatic.com/aihub/icons/gemini-color.svg
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-end
// ==/UserScript==

(async function () {
    'use strict';

    const STORAGE_KEY = 'gemini_flash_solver';

    const defaultConfig = {
        apiKey: '',
        temperature: 0.2,
        maxTokens: 800,
        autoExtract: true,
        autoSearch: true
    };

    let lastExtraction = { answers: { A: '', B: '', C: '', D: '' }, answerNodes: {} };
    let lastSearchResults = [];
    let lastSearchQuery = '';
    let lastSelectionText = '';

    async function loadConfig() {
        try {
            const raw = await GM_getValue(STORAGE_KEY, JSON.stringify(defaultConfig));
            const parsed = JSON.parse(raw);
            return { ...defaultConfig, ...parsed };
        } catch (error) {
            console.error('[Gemini Solver] Cannot load config', error);
            return { ...defaultConfig };
        }
    }

    async function saveConfig(cfg) {
        try {
            await GM_setValue(STORAGE_KEY, JSON.stringify(cfg));
        } catch (error) {
            console.error('[Gemini Solver] Cannot save config', error);
        }
    }

    function createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'class') {
                el.className = value;
            } else if (key === 'dataset') {
                Object.assign(el.dataset, value);
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

    function normalizeText(text) {
        return text.replace(/\s+/g, ' ').replace(/[\u00A0\u200B]/g, ' ').trim();
    }

    function clearHighlights() {
        document.querySelectorAll('.gfs-answer-highlight').forEach((el) => {
            el.classList.remove('gfs-answer-highlight');
            el.removeAttribute('data-gfs-highlight');
        });
    }

    function findHighlightTarget(element) {
        if (!element) return null;
        const preferSelector = 'li, label, .answer, .option, .choice';
        const preferred = element.closest(preferSelector);
        return preferred || element;
    }

    function extractQuestionAndOptions() {
        const selectors = 'h1, h2, h3, h4, h5, h6, p, li, span, div, article, section';
        const optionRegex = /^(?:([A-D])[\.)]\s*)(.+)$/i;
        const questionRegex = /(\?|\:|Câu\s*\d+)/i;
        const entries = [];

        document.querySelectorAll(selectors).forEach((el) => {
            if (!el || !el.innerText) return;
            if (el.closest('#gemini-flash-solver-panel')) return;
            const text = normalizeText(el.innerText);
            if (!text || text.length < 3) return;
            const lines = text.split(/\n|\\n/).map(normalizeText).filter(Boolean);
            const options = [];
            const nonOptionLines = [];

            const childOptions = el.matches('li, p, div, span') ? Array.from(el.children || []) : [];
            const childOptionMap = new Map();
            childOptions.forEach((child) => {
                const childText = normalizeText(child.innerText || '');
                const match = childText.match(optionRegex);
                if (match) {
                    const letter = match[1].toUpperCase();
                    childOptionMap.set(letter, child);
                }
            });

            lines.forEach((line) => {
                const match = line.match(optionRegex);
                if (match) {
                    const letter = match[1].toUpperCase();
                    const optionText = match[2].trim();
                    const child = childOptionMap.get(letter);
                    options.push({
                        letter,
                        text: optionText,
                        element: findHighlightTarget(child || el)
                    });
                } else if (line.length > 4) {
                    nonOptionLines.push(line);
                }
            });

            entries.push({ element: el, text, lines, options, nonOptionLines });
        });

        let best = null;

        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            let questionCandidate = '';
            const answers = {};
            const answerNodes = {};
            const contextLines = [];

            if (entry.options.length >= 2) {
                if (entry.nonOptionLines.length) {
                    questionCandidate = entry.nonOptionLines.join(' ');
                    contextLines.push(entry.text);
                } else {
                    for (let k = i - 1; k >= 0 && i - k <= 6; k--) {
                        const prev = entries[k];
                        if (!prev) continue;
                        if (prev.options.length >= 2 && !prev.nonOptionLines.length) continue;
                        if (prev.nonOptionLines.length) {
                            questionCandidate = prev.nonOptionLines.join(' ');
                        } else {
                            questionCandidate = prev.text;
                        }
                        contextLines.push(prev.text);
                        break;
                    }
                    if (!questionCandidate && entry.text.length > 6) {
                        questionCandidate = entry.text;
                        contextLines.push(entry.text);
                    }
                }
                entry.options.forEach(({ letter, text, element }) => {
                    if (!answers[letter]) {
                        answers[letter] = text;
                        answerNodes[letter] = element;
                    }
                });
            } else if (questionRegex.test(entry.text)) {
                questionCandidate = entry.text;
                contextLines.push(entry.text);
            } else {
                continue;
            }

            let j = i + 1;
            while (j < entries.length && Object.keys(answers).length < 4) {
                const next = entries[j];
                let matched = false;
                next.options.forEach(({ letter, text, element }) => {
                    if (!answers[letter]) {
                        answers[letter] = text;
                        answerNodes[letter] = element;
                        matched = true;
                    }
                });
                if (matched) {
                    contextLines.push(next.text);
                } else if (Object.keys(answers).length > 0) {
                    if (next.text.length > 120) {
                        break;
                    }
                } else if (!questionCandidate && questionRegex.test(next.text)) {
                    questionCandidate = next.text;
                    contextLines.push(next.text);
                }
                j++;
            }

            const answerCount = Object.keys(answers).length;
            if (!questionCandidate || answerCount < 2) continue;
            const score = answerCount * 20 + Math.min(questionCandidate.length, 160);
            if (!best || score > best.score) {
                best = {
                    question: questionCandidate,
                    answers,
                    answerNodes,
                    contextLines,
                    score
                };
            }
        }

        if (!best) {
            return {
                question: '',
                answers: { A: '', B: '', C: '', D: '' },
                context: '',
                answerNodes: {}
            };
        }

        const filledAnswers = { A: '', B: '', C: '', D: '' };
        Object.entries(best.answers).forEach(([letter, text]) => {
            filledAnswers[letter] = text;
        });

        return {
            question: best.question,
            answers: filledAnswers,
            context: Array.from(new Set(best.contextLines)).join('\n'),
            answerNodes: best.answerNodes
        };
    }


    function formatPrompt(question, answers, extraContext, searchEvidence) {
        const answerText = Object.entries(answers)
            .filter(([key, value]) => Boolean(value))
            .map(([key, value]) => `${key}. ${value}`)
            .join('\n');

        const parts = [
            'Bạn là trợ lý giải bài tập sử dụng mô hình Gemini 2.5 Flash.',
            'Đọc câu hỏi trắc nghiệm và phân tích từng đáp án, sau đó chọn đáp án đúng với lập luận rõ ràng.',
            'Trả lời bằng tiếng Việt và định dạng dễ đọc với:\n- Phân tích từng đáp án.\n- Chốt đáp án ở dòng cuối cùng với dạng: **Đáp án: <chữ cái> - <nội dung>**',
            '',
            `Câu hỏi: ${question}`,
            '',
            'Các đáp án:',
            answerText || '(Không tìm thấy đáp án nào)'
        ];

        if (extraContext) {
            parts.push('', `Ngữ cảnh thêm:\n${extraContext}`);
        }

        if (searchEvidence) {
            parts.push('', 'Tóm tắt kết quả tìm kiếm đáng chú ý:', searchEvidence);
        }

        return parts.join('\n');
    }

    async function callGemini(apiKey, prompt, temperature, maxTokens) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
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
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
            ]
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API lỗi ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const candidate = data?.candidates?.[0];
        const text = candidate?.content?.parts?.map(part => part.text).join('\n');
        if (!text) {
            throw new Error('Không nhận được phản hồi từ Gemini.');
        }
        return {
            text,
            grounding: candidate?.groundingMetadata,
            usage: data?.usageMetadata
        };
    }

    async function performSearch(query) {
        const endpoint = `https://r.jina.ai/https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await fetch(endpoint, { credentials: 'omit' });
        if (!response.ok) {
            throw new Error(`Không thể tìm kiếm (mã ${response.status}).`);
        }
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const results = [];
        doc.querySelectorAll('.result').forEach((item) => {
            const titleEl = item.querySelector('.result__a');
            const snippetEl = item.querySelector('.result__snippet');
            const link = titleEl?.getAttribute('href');
            const title = normalizeText(titleEl?.textContent || '');
            const snippet = normalizeText(snippetEl?.textContent || '');
            if (title && link) {
                results.push({ title, link, snippet });
            }
        });
        lastSearchQuery = query;
        lastSearchResults = results.slice(0, 5);
        return lastSearchResults;
    }

    function renderSearchResults(results, container) {
        container.innerHTML = '';
        if (!results.length) {
            container.textContent = 'Không tìm thấy kết quả phù hợp.';
            return;
        }
        results.forEach((item) => {
            const wrapper = createElement('div', { class: 'gfs-search-item' });
            const link = createElement('a', {
                href: item.link,
                target: '_blank',
                rel: 'noopener noreferrer',
                text: item.title,
                class: 'gfs-search-title'
            });
            const snippet = createElement('p', {
                class: 'gfs-search-snippet',
                text: item.snippet
            });
            wrapper.appendChild(link);
            if (item.snippet) wrapper.appendChild(snippet);
            container.appendChild(wrapper);
        });
    }

    function summarizeSearchResults(results) {
        if (!results || !results.length) return '';
        return results
            .slice(0, 3)
            .map((item, index) => {
                const parts = [`${index + 1}. ${item.title}`];
                if (item.snippet) {
                    parts.push(item.snippet);
                }
                return parts.join('\n');
            })
            .join('\n\n');
    }

    function extractFromSelection() {
        const selection = window.getSelection();
        const hasLiveSelection = selection && !selection.isCollapsed;
        const raw = hasLiveSelection ? selection.toString() : lastSelectionText;
        if (!raw) return null;
        const cleaned = raw.split(/\n|\\n/).map(normalizeText).filter(Boolean);
        if (!cleaned.length) return null;
        const optionRegex = /^(?:([A-D])[\.)]\s*)(.+)$/i;
        const answers = { A: '', B: '', C: '', D: '' };
        const context = [];
        let question = '';
        cleaned.forEach((line) => {
            const match = line.match(optionRegex);
            if (match) {
                const letter = match[1].toUpperCase();
                answers[letter] = match[2].trim();
            } else if (!question) {
                question = line;
            } else {
                context.push(line);
            }
        });
        if (!question) {
            question = cleaned[0];
        }
        return {
            question,
            answers,
            context: context.join('\n'),
            answerNodes: {}
        };
    }

    function setExtractionOnUI(extraction, ui, message) {
        if (!extraction) return false;
        const mergedAnswers = { A: '', B: '', C: '', D: '' };
        Object.assign(mergedAnswers, extraction.answers || {});
        const merged = {
            question: extraction.question || '',
            answers: mergedAnswers,
            context: extraction.context || '',
            answerNodes: extraction.answerNodes || {}
        };
        lastExtraction = merged;
        clearHighlights();
        ui.questionTextarea.value = merged.question;
        ui.contextTextarea.value = merged.context;
        ui.answerTextarea.value = Object.entries(merged.answers)
            .filter(([, value]) => Boolean(value))
            .map(([letter, value]) => `${letter}. ${value}`)
            .join('\n');
        if (message) {
            ui.outputBox.textContent = message;
        }
        return true;
    }

    function highlightAnswer(letter) {
        if (!letter) return false;
        const normalized = letter.toUpperCase();
        const node = lastExtraction?.answerNodes?.[normalized];
        if (!node || !node.isConnected) return false;
        clearHighlights();
        const target = findHighlightTarget(node);
        if (!target) return false;
        target.classList.add('gfs-answer-highlight');
        target.setAttribute('data-gfs-highlight', normalized);
        try {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (err) {
            // ignore scrolling issues
        }
        const input = target.querySelector('input[type="radio"], input[type="checkbox"]');
        if (input && !input.checked) {
            input.click();
        } else {
            const clickableLabel = target.matches('label') ? target : target.querySelector('label');
            if (clickableLabel) {
                clickableLabel.click();
            }
        }
        return true;
    }

    function applyStyles() {
        GM_addStyle(`
            #gemini-flash-solver-panel {
                position: fixed;
                bottom: 16px;
                right: 16px;
                width: min(340px, 92vw);
                max-height: 72vh;
                background: rgba(255, 255, 255, 0.98);
                color: #111827;
                border-radius: 14px;
                border: 1px solid rgba(148, 163, 184, 0.35);
                box-shadow: 0 16px 32px rgba(15, 23, 42, 0.18);
                display: flex;
                flex-direction: column;
                font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                z-index: 2147483647;
                overflow: hidden;
            }
            #gemini-flash-solver-panel.gfs-hidden {
                display: none;
            }
            #gemini-flash-solver-panel header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 12px;
                border-bottom: 1px solid #e2e8f0;
                background: rgba(248, 250, 252, 0.9);
            }
            #gemini-flash-solver-panel header h1 {
                font-size: 15px;
                margin: 0;
                font-weight: 600;
                color: #0f172a;
            }
            #gemini-flash-solver-panel header button {
                background: transparent;
                border: none;
                color: #6b7280;
                cursor: pointer;
                font-size: 18px;
            }
            #gemini-flash-solver-panel .gfs-body {
                padding: 12px 14px 14px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            #gemini-flash-solver-panel label {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #64748b;
                margin-bottom: 4px;
            }
            #gemini-flash-solver-panel textarea,
            #gemini-flash-solver-panel input {
                width: 100%;
                border-radius: 10px;
                border: 1px solid #d1d5db;
                background: #f8fafc;
                color: #0f172a;
                padding: 8px 10px;
                font-size: 14px;
                resize: vertical;
                box-sizing: border-box;
            }
            #gemini-flash-solver-panel textarea {
                min-height: 60px;
            }
            #gemini-flash-solver-panel input::placeholder,
            #gemini-flash-solver-panel textarea::placeholder {
                color: #94a3b8;
            }
            #gemini-flash-solver-panel .gfs-actions {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                gap: 8px;
            }
            #gemini-flash-solver-panel .gfs-actions button {
                border: none;
                border-radius: 10px;
                padding: 9px 12px;
                font-weight: 600;
                cursor: pointer;
                background: #2563eb;
                color: #ffffff;
                transition: background 0.15s ease;
            }
            #gemini-flash-solver-panel .gfs-actions button:hover:not(:disabled) {
                background: #1d4ed8;
            }
            #gemini-flash-solver-panel .gfs-actions button:disabled {
                background: #94a3b8;
                cursor: not-allowed;
            }
            #gemini-flash-solver-panel .gfs-output {
                background: #f1f5f9;
                border-radius: 10px;
                padding: 10px;
                border: 1px solid #e2e8f0;
                white-space: pre-wrap;
                font-size: 14px;
                line-height: 1.5;
                color: #0f172a;
            }
            #gemini-flash-solver-panel .gfs-search-results {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            #gemini-flash-solver-panel .gfs-search-item {
                background: #f8fafc;
                border-radius: 10px;
                padding: 8px 10px;
                border: 1px solid #e2e8f0;
            }
            #gemini-flash-solver-panel .gfs-search-title {
                font-weight: 600;
                color: #2563eb;
                text-decoration: none;
            }
            #gemini-flash-solver-panel .gfs-search-title:hover {
                text-decoration: underline;
            }
            #gemini-flash-solver-panel .gfs-search-snippet {
                font-size: 13px;
                color: #475569;
                margin-top: 4px;
            }
            #gemini-flash-solver-panel .gfs-config-details {
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                background: #f8fafc;
                padding: 0 10px 8px;
            }
            #gemini-flash-solver-panel .gfs-config-details[open] {
                padding-top: 6px;
            }
            #gemini-flash-solver-panel .gfs-config-details summary {
                list-style: none;
                cursor: pointer;
                font-weight: 600;
                color: #2563eb;
                padding: 10px 0 6px;
            }
            #gemini-flash-solver-panel .gfs-config-details summary::-webkit-details-marker {
                display: none;
            }
            #gemini-flash-solver-panel .gfs-config-details summary::after {
                content: '▾';
                font-size: 12px;
                margin-left: 6px;
                color: #1d4ed8;
                transition: transform 0.2s ease;
            }
            #gemini-flash-solver-panel .gfs-config-details[open] summary::after {
                transform: rotate(180deg);
            }
            #gemini-flash-solver-panel .gfs-config {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 8px;
            }
            #gemini-flash-solver-panel .gfs-config-field {
                display: flex;
                flex-direction: column;
                gap: 4px;
                font-size: 12px;
                color: #475569;
            }
            #gemini-flash-solver-panel .gfs-config-field span {
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            #gemini-flash-solver-panel .gfs-config-toggle {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: #1f2937;
                padding: 4px 0;
                grid-column: 1 / -1;
            }
            #gemini-flash-solver-panel .gfs-config-toggle input {
                width: 18px;
                height: 18px;
            }
            #gemini-flash-solver-toggle {
                position: fixed;
                bottom: 16px;
                right: 16px;
                width: 52px;
                height: 52px;
                border-radius: 999px;
                background: #2563eb;
                color: #ffffff;
                font-size: 24px;
                border: none;
                box-shadow: 0 14px 28px rgba(37, 99, 235, 0.35);
                display: none;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 2147483646;
            }
            .gfs-answer-highlight {
                outline: 2px solid rgba(37, 99, 235, 0.85) !important;
                background: rgba(191, 219, 254, 0.35) !important;
                transition: background 0.2s ease, outline 0.2s ease;
            }
            @media (max-width: 640px) {
                #gemini-flash-solver-panel {
                    left: 12px;
                    right: 12px;
                    bottom: 12px;
                    width: auto;
                    max-height: 65vh;
                    border-radius: 12px;
                }
                #gemini-flash-solver-panel .gfs-body {
                    padding: 10px 12px 12px;
                    max-height: calc(65vh - 44px);
                }
                #gemini-flash-solver-panel textarea,
                #gemini-flash-solver-panel input {
                    font-size: 13px;
                }
                #gemini-flash-solver-panel .gfs-actions {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                #gemini-flash-solver-toggle {
                    display: flex;
                    width: 48px;
                    height: 48px;
                    bottom: 12px;
                    right: 12px;
                    font-size: 22px;
                }
            }
        `);
    }

    function buildPanel(config) {
        applyStyles();

        const panel = createElement('div', { id: 'gemini-flash-solver-panel' });
        const toggleButton = createElement('button', { id: 'gemini-flash-solver-toggle', text: '⚡' });
        toggleButton.setAttribute('aria-label', 'Mở Gemini Flash Solver');
        toggleButton.setAttribute('title', 'Mở Gemini Flash Solver');

        const mobileQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 640px)') : null;
        let isMobile = mobileQuery ? mobileQuery.matches : false;

        const header = createElement('header');
        const title = createElement('h1', { text: 'Gemini Flash Solver' });
        const closeButton = createElement('button', { text: '×', title: 'Thu gọn' });
        closeButton.setAttribute('aria-label', 'Thu gọn bảng Gemini');
        header.appendChild(title);
        header.appendChild(closeButton);

        const body = createElement('div', { class: 'gfs-body' });

        const apiLabel = createElement('label', { text: 'Gemini API Key' });
        const apiInput = createElement('input', {
            type: 'password',
            placeholder: 'Nhập Google AI Studio API key...'
        });
        apiInput.value = config.apiKey || '';

        const questionLabel = createElement('label', { text: 'Câu hỏi' });
        const questionTextarea = createElement('textarea', { placeholder: 'Nội dung câu hỏi...' });
        questionTextarea.setAttribute('rows', '3');

        const answerLabel = createElement('label', { text: 'Đáp án A-D' });
        const answerTextarea = createElement('textarea', { placeholder: 'A. ...\nB. ...\nC. ...\nD. ...' });
        answerTextarea.setAttribute('rows', '6');

        const contextLabel = createElement('label', { text: 'Ngữ cảnh thêm (tự động)' });
        const contextTextarea = createElement('textarea', { placeholder: 'Các đoạn văn bản liên quan', readonly: 'readonly' });
        contextTextarea.setAttribute('rows', '3');

        const actions = createElement('div', { class: 'gfs-actions' });
        const extractButton = createElement('button', { text: 'Tự động lấy câu hỏi' });
        const selectionButton = createElement('button', { text: 'Lấy từ bôi đen' });
        const solveButton = createElement('button', { text: 'Giải bằng Gemini' });
        const searchButton = createElement('button', { text: 'Tìm kiếm web' });
        actions.append(extractButton, selectionButton, solveButton, searchButton);

        const outputLabel = createElement('label', { text: 'Kết quả Gemini' });
        const outputBox = createElement('div', { class: 'gfs-output', text: 'Chưa có kết quả.' });

        const searchLabel = createElement('label', { text: 'Kết quả tìm kiếm' });
        const searchContainer = createElement('div', { class: 'gfs-search-results' });

        const configDetails = createElement('details', { class: 'gfs-config-details' });
        const configSummary = createElement('summary', { text: 'Tùy chọn nâng cao' });
        const configContainer = createElement('div', { class: 'gfs-config' });
        const tempInput = createElement('input', { type: 'number', min: '0', max: '1', step: '0.05', value: config.temperature, placeholder: 'Temperature' });
        const maxTokenInput = createElement('input', { type: 'number', min: '128', max: '2048', step: '10', value: config.maxTokens, placeholder: 'Max tokens' });

        const tempField = createElement('label', { class: 'gfs-config-field' });
        tempField.append(createElement('span', { text: 'Temperature' }), tempInput);

        const maxField = createElement('label', { class: 'gfs-config-field' });
        maxField.append(createElement('span', { text: 'Max Tokens' }), maxTokenInput);

        const autoExtractToggle = createElement('label', { class: 'gfs-config-toggle' });
        const autoExtractCheckbox = createElement('input', { type: 'checkbox' });
        autoExtractCheckbox.checked = Boolean(config.autoExtract);
        autoExtractToggle.append(autoExtractCheckbox, createElement('span', { text: 'Tự quét câu hỏi mới' }));

        const autoSearchToggle = createElement('label', { class: 'gfs-config-toggle' });
        const autoSearchCheckbox = createElement('input', { type: 'checkbox' });
        autoSearchCheckbox.checked = Boolean(config.autoSearch);
        autoSearchToggle.append(autoSearchCheckbox, createElement('span', { text: 'Tự tìm kiếm trước khi giải' }));

        configContainer.append(tempField, maxField, autoExtractToggle, autoSearchToggle);
        configDetails.append(configSummary, configContainer);
        if (!isMobile) {
            configDetails.open = true;
        }

        body.append(
            apiLabel,
            apiInput,
            questionLabel,
            questionTextarea,
            answerLabel,
            answerTextarea,
            contextLabel,
            contextTextarea,
            actions,
            outputLabel,
            outputBox,
            searchLabel,
            searchContainer,
            configDetails
        );

        panel.append(header, body);
        document.body.append(panel, toggleButton);
        let hidden = isMobile;

        function syncVisibility() {
            if (hidden) {
                panel.classList.add('gfs-hidden');
                toggleButton.style.display = 'flex';
            } else {
                panel.classList.remove('gfs-hidden');
                toggleButton.style.display = 'none';
            }
        }

        const handleBreakpoint = (event) => {
            const matches = typeof event === 'object' && 'matches' in event
                ? event.matches
                : mobileQuery
                    ? mobileQuery.matches
                    : false;
            isMobile = matches;
            if (!isMobile) {
                hidden = false;
                configDetails.open = true;
            } else {
                configDetails.open = false;
                hidden = true;
            }
            syncVisibility();
        };
        if (mobileQuery) {
            if (typeof mobileQuery.addEventListener === 'function') {
                mobileQuery.addEventListener('change', handleBreakpoint);
            } else if (typeof mobileQuery.addListener === 'function') {
                mobileQuery.addListener(handleBreakpoint);
            }
        }

        function togglePanel() {
            hidden = !hidden;
            syncVisibility();
        }

        closeButton.addEventListener('click', togglePanel);
        toggleButton.addEventListener('click', togglePanel);

        syncVisibility();

        apiInput.addEventListener('change', async () => {
            config.apiKey = apiInput.value.trim();
            await saveConfig(config);
        });

        tempInput.addEventListener('change', async () => {
            const val = parseFloat(tempInput.value);
            if (!isNaN(val)) {
                config.temperature = Math.max(0, Math.min(1, val));
                await saveConfig(config);
            }
        });

        maxTokenInput.addEventListener('change', async () => {
            const val = parseInt(maxTokenInput.value, 10);
            if (!isNaN(val)) {
                config.maxTokens = Math.max(128, Math.min(2048, val));
                await saveConfig(config);
            }
        });

        extractButton.addEventListener('click', () => {
            const extraction = extractQuestionAndOptions();
            if (!extraction.question) {
                outputBox.textContent = 'Không tìm thấy câu hỏi phù hợp, hãy nhập hoặc bôi đen thủ công.';
                return;
            }
            setExtractionOnUI(extraction, { questionTextarea, answerTextarea, contextTextarea, outputBox }, 'Đã cập nhật dữ liệu tự động.');
        });

        selectionButton.addEventListener('click', () => {
            const extraction = extractFromSelection();
            if (!extraction) {
                outputBox.textContent = 'Hãy bôi đen đoạn văn bản chứa câu hỏi và đáp án trước.';
                return;
            }
            setExtractionOnUI(extraction, { questionTextarea, answerTextarea, contextTextarea, outputBox }, 'Đã lấy dữ liệu từ vùng bôi đen.');
        });

        autoExtractCheckbox.addEventListener('change', async () => {
            config.autoExtract = autoExtractCheckbox.checked;
            await saveConfig(config);
            if (config.autoExtract) {
                const extraction = extractQuestionAndOptions();
                if (extraction.question) {
                    setExtractionOnUI(extraction, { questionTextarea, answerTextarea, contextTextarea, outputBox }, 'Đã cập nhật dữ liệu tự động.');
                }
            }
        });

        autoSearchCheckbox.addEventListener('change', async () => {
            config.autoSearch = autoSearchCheckbox.checked;
            await saveConfig(config);
        });

        solveButton.addEventListener('click', async () => {
            if (!config.apiKey) {
                outputBox.textContent = 'Vui lòng nhập Gemini API key trong Google AI Studio.';
                return;
            }
            const question = questionTextarea.value.trim();
            const answers = { A: '', B: '', C: '', D: '' };
            answerTextarea.value.split(/\n|\\n/).forEach((line) => {
                const match = line.trim().match(/^(?:([A-D])[\.)]\s*)(.+)$/i);
                if (match) {
                    answers[match[1].toUpperCase()] = match[2].trim();
                }
            });
            const extraContext = contextTextarea.value.trim();
            if (!question) {
                outputBox.textContent = 'Hãy nhập câu hỏi trước khi gọi Gemini.';
                return;
            }
            if (lastExtraction) {
                lastExtraction = {
                    ...lastExtraction,
                    answers: { ...lastExtraction.answers, ...answers }
                };
            }
            outputBox.textContent = 'Đang chuẩn bị gọi Gemini 2.5 Flash...';
            solveButton.disabled = true;
            searchButton.disabled = true;
            let searchEvidence = '';
            if (config.autoSearch) {
                try {
                    const topAnswers = Object.values(answers)
                        .filter(Boolean)
                        .slice(0, 4)
                        .join(' ');
                    const query = `${question} ${topAnswers}`.slice(0, 300);
                    searchContainer.textContent = 'Đang tìm kiếm DuckDuckGo...';
                    const results = await performSearch(query);
                    renderSearchResults(results, searchContainer);
                    searchEvidence = summarizeSearchResults(results);
                } catch (error) {
                    console.error('[Gemini Solver] Auto search error', error);
                    searchContainer.textContent = `Lỗi tìm kiếm: ${error.message}`;
                }
            } else if (lastSearchResults.length && lastSearchQuery) {
                const firstWords = question.split(/\s+/).slice(0, 6).join(' ');
                if (!firstWords || lastSearchQuery.toLowerCase().includes(firstWords.toLowerCase())) {
                    searchEvidence = summarizeSearchResults(lastSearchResults);
                }
            }

            try {
                const prompt = formatPrompt(question, answers, extraContext, searchEvidence);
                const result = await callGemini(config.apiKey, prompt, config.temperature, config.maxTokens);
                let finalMessage = result.text;
                if (result.usage) {
                    finalMessage += `\n\n— Tokens (prompt/response): ${result.usage.promptTokenCount || 0}/${result.usage.candidatesTokenCount || 0}`;
                }
                const answerMatch = finalMessage.match(/Đáp án(?:\s+đúng)?\s*[:：]?\s*([A-D])/i)
                    || finalMessage.match(/Answer\s*[:：]?\s*([A-D])/i)
                    || finalMessage.match(/Correct\s+(?:option|answer)\s*[:：]?\s*([A-D])/i)
                    || finalMessage.match(/\bOption\s*([A-D])\b/i);
                if (answerMatch) {
                    const letter = answerMatch[1].toUpperCase();
                    const highlighted = highlightAnswer(letter);
                    if (highlighted) {
                        finalMessage += `\n\n→ Đã tô sáng đáp án ${letter} trên trang.`;
                    } else {
                        finalMessage += `\n\n(Lưu ý: Không thể tự động tô sáng đáp án ${letter}.)`;
                    }
                }
                outputBox.textContent = finalMessage;
            } catch (error) {
                console.error('[Gemini Solver] Solve error', error);
                outputBox.textContent = `Lỗi: ${error.message}`;
            } finally {
                solveButton.disabled = false;
                searchButton.disabled = false;
            }
        });

        searchButton.addEventListener('click', async () => {
            const question = questionTextarea.value.trim();
            if (!question) {
                searchContainer.textContent = 'Hãy nhập câu hỏi để tìm kiếm.';
                return;
            }
            searchContainer.textContent = 'Đang tìm kiếm DuckDuckGo...';
            searchButton.disabled = true;
            try {
                const topAnswers = answerTextarea.value
                    .split(/\n|\\n/)
                    .map(line => line.trim())
                    .filter(Boolean)
                    .slice(0, 4)
                    .join(' ');
                const query = `${question} ${topAnswers}`.slice(0, 300);
                const results = await performSearch(query);
                renderSearchResults(results, searchContainer);
            } catch (error) {
                console.error('[Gemini Solver] Search error', error);
                searchContainer.textContent = `Lỗi tìm kiếm: ${error.message}`;
            } finally {
                searchButton.disabled = false;
            }
        });

        return {
            panel,
            toggleButton,
            questionTextarea,
            answerTextarea,
            contextTextarea,
            extractButton,
            selectionButton,
            outputBox,
            searchContainer
        };
    }

    document.addEventListener('selectionchange', () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;
        const text = selection.toString();
        if (text && text.trim().length > 0) {
            lastSelectionText = text;
        }
    });

    const config = await loadConfig();
    const ui = buildPanel(config);

    if (config.autoExtract) {
        const attemptExtraction = () => {
            const extraction = extractQuestionAndOptions();
            if (extraction.question) {
                setExtractionOnUI(extraction, ui, 'Đã tự động phát hiện câu hỏi.');
                observer.disconnect();
            }
        };
        const observer = new MutationObserver(() => {
            attemptExtraction();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        attemptExtraction();
        setTimeout(() => observer.disconnect(), 12000);
    }
})();
