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
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// @run-at       document-end
// ==/UserScript==

(async function () {
    'use strict';

    const STORAGE_KEY = 'gemini_flash_solver';

    const defaultConfig = {
        apiKey: '',
        model: 'gemini-2.5-flash',
        language: 'vi',
        subject: 'Chung',
        outputMode: 'answer',
        customPrompt: '',
        temperature: 0.2,
        maxTokens: 800,
        autoExtract: true,
        autoSearch: true,
        quickPanelPinned: false
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


    function formatPrompt(question, answers, extraContext, searchEvidence, options = {}) {
        const {
            subject = 'Chung',
            language = 'vi',
            outputMode = 'explain',
            customPrompt = ''
        } = options || {};

        const langText = language === 'vi' ? 'Tiếng Việt' : 'English';
        let instruction;
        if (outputMode === 'custom' && customPrompt.trim()) {
            instruction = `${customPrompt.trim()} (Trả lời bằng ${langText}).`;
        } else if (outputMode === 'answer') {
            instruction = `Chỉ đưa ra đáp án cuối cùng cho bài tập môn ${subject}. Không giải thích. Trả lời bằng ${langText}.`;
        } else {
            instruction = `Phân tích và giải chi tiết bài tập môn ${subject}. Trình bày lập luận từng bước, so sánh từng đáp án. Trả lời bằng ${langText}.`;
        }

        const answerText = Object.entries(answers)
            .filter(([key, value]) => Boolean(value))
            .map(([key, value]) => `${key}. ${value}`)
            .join('\n');

        const parts = [
            'Bạn là trợ lý giải bài tập sử dụng mô hình Gemini.',
            instruction,
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

    async function callGemini(apiKey, {
        prompt,
        model = 'gemini-2.5-flash',
        temperature,
        maxTokens,
        imageBase64
    }) {
        if (!apiKey) {
            throw new Error('Vui lòng nhập API key Gemini trong phần cài đặt.');
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const parts = [{ text: prompt }];
        if (imageBase64) {
            parts.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
        }

        const body = {
            contents: [
                {
                    role: 'user',
                    parts
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
                url: endpoint,
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify(body),
                onload: (response) => {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            const errBody = response.responseText || '';
                            throw new Error(`Gemini API lỗi ${response.status}: ${errBody}`);
                        }
                        const data = JSON.parse(response.responseText || '{}');
                        const candidate = data?.candidates?.[0];
                        const text = candidate?.content?.parts
                            ?.map((part) => part?.text)
                            .filter(Boolean)
                            .join('\n');
                        if (!text) {
                            throw new Error('Không nhận được phản hồi từ Gemini.');
                        }
                        resolve({
                            text,
                            grounding: candidate?.groundingMetadata,
                            usage: data?.usageMetadata
                        });
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: (error) => {
                    reject(new Error(`Không thể kết nối Gemini: ${error?.error || 'Lỗi mạng không xác định'}`));
                }
            });
        });
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
                width: min(320px, 90vw);
                max-height: 70vh;
                background: rgba(15, 23, 42, 0.96);
                color: #f8fafc;
                border-radius: 18px;
                border: 1px solid rgba(148, 163, 184, 0.22);
                box-shadow: 0 18px 42px rgba(15, 23, 42, 0.45);
                display: flex;
                flex-direction: column;
                font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                z-index: 2147483647;
                overflow: hidden;
                backdrop-filter: blur(12px);
                transform-origin: bottom right;
                transition: transform 0.28s ease, opacity 0.28s ease;
            }
            #gemini-flash-solver-panel.gfs-hidden {
                opacity: 0;
                transform: translateY(18px) scale(0.96);
                pointer-events: none;
            }
            #gemini-flash-solver-panel .gfs-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                padding: 14px 16px 10px;
                border-bottom: 1px solid rgba(148, 163, 184, 0.16);
            }
            #gemini-flash-solver-panel .gfs-header h1 {
                font-size: 15px;
                font-weight: 700;
                margin: 0;
                color: #bfdbfe;
                letter-spacing: 0.01em;
            }
            #gemini-flash-solver-panel .gfs-header button {
                background: none;
                border: none;
                color: #cbd5f5;
                font-size: 18px;
                line-height: 1;
                cursor: pointer;
                width: 28px;
                height: 28px;
                border-radius: 10px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s ease, color 0.2s ease;
            }
            #gemini-flash-solver-panel .gfs-header button:hover {
                background: rgba(148, 163, 184, 0.16);
                color: #ffffff;
            }
            #gemini-flash-solver-panel .gfs-body {
                padding: 12px 16px 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                overflow-y: auto;
            }
            #gemini-flash-solver-panel .gfs-status {
                font-size: 11px;
                color: #cbd5f5;
                margin-top: -6px;
            }
            #gemini-flash-solver-panel label,
            #gemini-flash-solver-panel .gfs-field {
                display: flex;
                flex-direction: column;
                gap: 4px;
                font-size: 12px;
                color: #e2e8f0;
            }
            #gemini-flash-solver-panel input,
            #gemini-flash-solver-panel textarea,
            #gemini-flash-solver-panel select {
                width: 100%;
                padding: 7px 10px;
                font-size: 12.5px;
                color: #f8fafc;
                background: rgba(30, 41, 59, 0.78);
                border-radius: 12px;
                border: 1px solid rgba(148, 163, 184, 0.24);
                box-sizing: border-box;
                transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
            }
            #gemini-flash-solver-panel textarea {
                min-height: 70px;
                resize: vertical;
            }
            #gemini-flash-solver-panel input:focus,
            #gemini-flash-solver-panel textarea:focus,
            #gemini-flash-solver-panel select:focus {
                outline: none;
                border-color: rgba(96, 165, 250, 0.9);
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.35);
                background: rgba(30, 41, 59, 0.92);
            }
            #gemini-flash-solver-panel .gfs-quick-selects {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 6px;
            }
            #gemini-flash-solver-panel .gfs-api-row {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 6px;
                align-items: center;
            }
            #gemini-flash-solver-panel .gfs-api-row button {
                min-width: 98px;
            }
            #gemini-flash-solver-panel .gfs-advanced-body {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            #gemini-flash-solver-panel .gfs-actions {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 6px;
            }
            #gemini-flash-solver-panel .gfs-quick-actions {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 6px;
            }
            #gemini-flash-solver-panel button {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                border: none;
                color: #ffffff;
                padding: 9px 10px;
                border-radius: 12px;
                cursor: pointer;
                font-size: 12.5px;
                font-weight: 600;
                transition: transform 0.15s ease, opacity 0.2s ease, box-shadow 0.2s ease;
                box-shadow: 0 10px 24px -16px rgba(37, 99, 235, 0.8);
                min-height: 36px;
            }
            #gemini-flash-solver-panel button.secondary {
                background: rgba(30, 41, 59, 0.9);
                color: #bfdbfe;
                border: 1px solid rgba(96, 165, 250, 0.35);
                box-shadow: none;
            }
            #gemini-flash-solver-panel button:hover:not(:disabled) {
                transform: translateY(-1px);
                box-shadow: 0 18px 28px -18px rgba(59, 130, 246, 0.9);
            }
            #gemini-flash-solver-panel button:active:not(:disabled) {
                transform: translateY(1px);
            }
            #gemini-flash-solver-panel button:disabled {
                opacity: 0.55;
                cursor: not-allowed;
                box-shadow: none;
            }
            #gemini-flash-solver-panel .gfs-output,
            #gemini-flash-solver-panel .gfs-search-results,
            #gemini-flash-solver-panel .gfs-image-preview {
                background: rgba(15, 23, 42, 0.68);
                border-radius: 14px;
                border: 1px solid rgba(148, 163, 184, 0.2);
                padding: 10px;
                min-height: 52px;
                font-size: 13px;
                line-height: 1.5;
                color: #e2e8f0;
                white-space: pre-wrap;
                word-break: break-word;
            }
            #gemini-flash-solver-panel .gfs-image-preview img {
                max-width: 100%;
                border-radius: 10px;
                display: block;
            }
            #gemini-flash-solver-panel .gfs-search-results a {
                color: #bfdbfe;
                text-decoration: none;
                font-weight: 600;
            }
            #gemini-flash-solver-panel .gfs-search-item {
                padding: 6px 0;
                border-bottom: 1px solid rgba(148, 163, 184, 0.2);
            }
            #gemini-flash-solver-panel .gfs-search-item:last-child {
                border-bottom: none;
            }
            #gemini-flash-solver-panel .gfs-search-snippet {
                margin: 4px 0 0;
                color: #cbd5f5;
                font-size: 12px;
            }
            #gemini-flash-solver-panel details {
                background: rgba(30, 41, 59, 0.55);
                border-radius: 14px;
                border: 1px solid rgba(148, 163, 184, 0.18);
                padding: 6px 12px 10px;
            }
            #gemini-flash-solver-panel details summary {
                list-style: none;
                cursor: pointer;
                font-weight: 600;
                color: #bfdbfe;
                font-size: 12.5px;
            }
            #gemini-flash-solver-panel details summary::-webkit-details-marker {
                display: none;
            }
            #gemini-flash-solver-panel details[open] summary {
                margin-bottom: 6px;
            }
            #gemini-flash-solver-panel .gfs-config {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
            }
            #gemini-flash-solver-panel .gfs-config-toggle {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12.5px;
                color: #f8fafc;
                grid-column: 1 / -1;
            }
            #gemini-flash-solver-panel .gfs-config-toggle input {
                width: 18px;
                height: 18px;
            }
            #gemini-flash-solver-panel .gfs-token-meta {
                font-size: 11px;
                color: #94a3b8;
                margin-top: 4px;
            }
            #gemini-flash-solver-toggle {
                position: fixed;
                bottom: 16px;
                right: 16px;
                width: 48px;
                height: 48px;
                border-radius: 999px;
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: #ffffff;
                font-size: 22px;
                border: none;
                box-shadow: 0 18px 28px rgba(37, 99, 235, 0.35);
                display: none;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 2147483646;
                transition: transform 0.2s ease;
            }
            #gemini-flash-solver-toggle:active {
                transform: scale(0.95);
            }
            .gfs-answer-highlight {
                outline: 2px solid rgba(96, 165, 250, 0.9) !important;
                background: rgba(96, 165, 250, 0.2) !important;
                transition: background 0.2s ease, outline 0.2s ease;
            }
            #gfs-snip-overlay {
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.55);
                z-index: 2147483646;
                cursor: crosshair;
                display: none;
            }
            #gfs-snip-box {
                position: absolute;
                border: 2px dashed rgba(96, 165, 250, 0.9);
                background: rgba(96, 165, 250, 0.15);
                border-radius: 10px;
                pointer-events: none;
                display: none;
            }
            @media (max-width: 640px) {
                #gemini-flash-solver-panel {
                    left: 12px;
                    right: 12px;
                    bottom: 12px;
                    width: auto;
                    max-height: 62vh;
                    border-radius: 16px;
                }
                #gemini-flash-solver-panel .gfs-body {
                    padding: 10px 14px 14px;
                    gap: 10px;
                }
                #gemini-flash-solver-panel .gfs-api-row {
                    grid-template-columns: repeat(1, minmax(0, 1fr));
                }
                #gemini-flash-solver-panel .gfs-quick-actions {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }
                #gemini-flash-solver-panel .gfs-quick-selects {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
                #gemini-flash-solver-panel .gfs-config {
                    grid-template-columns: repeat(1, minmax(0, 1fr));
                }
                #gemini-flash-solver-panel textarea,
                #gemini-flash-solver-panel input,
                #gemini-flash-solver-panel select {
                    font-size: 12.5px;
                }
                #gemini-flash-solver-toggle {
                    display: flex;
                }
            }
        `);
    }


    function buildPanel(config) {
        applyStyles();

        const panel = createElement('div', { id: 'gemini-flash-solver-panel' });
        const toggleButton = createElement('button', { id: 'gemini-flash-solver-toggle', text: '⚡' });
        toggleButton.setAttribute('aria-label', 'Mở bảng Gemini Flash Solver');
        toggleButton.setAttribute('title', 'Mở bảng Gemini Flash Solver');

        const mobileQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 640px)') : null;
        let isMobile = mobileQuery ? mobileQuery.matches : false;

        const header = createElement('div', { class: 'gfs-header' });
        const headerInfo = createElement('div');
        const title = createElement('h1', { text: 'AI Giải Bài Tập' });
        const status = createElement('div', {
            class: 'gfs-status',
            text: config.apiKey ? 'Sẵn sàng' : 'Chưa nhập API key'
        });
        headerInfo.append(title, status);
        const closeButton = createElement('button', { text: '×', title: 'Thu gọn bảng' });
        closeButton.setAttribute('aria-label', 'Thu gọn bảng Gemini');
        header.append(headerInfo, closeButton);

        const body = createElement('div', { class: 'gfs-body' });

        const apiField = createElement('div', { class: 'gfs-field gfs-api-field' });
        apiField.append(createElement('span', { text: 'API Key Gemini' }));
        const apiRow = createElement('div', { class: 'gfs-api-row' });
        const apiInput = createElement('input', {
            type: 'password',
            placeholder: 'Nhập Google AI Studio API key...'
        });
        apiInput.value = config.apiKey || '';
        const apiCheckButton = createElement('button', { class: 'secondary', text: 'Kiểm tra key' });
        apiRow.append(apiInput, apiCheckButton);
        apiField.append(apiRow);

        const quickSelects = createElement('div', { class: 'gfs-quick-selects' });
        const modelSelect = createElement('select');
        modelSelect.setAttribute('aria-label', 'Model Gemini');
        modelSelect.setAttribute('title', 'Chọn model Gemini để sử dụng');
        [
            { value: 'gemini-flash-latest', label: '⚡ Flash mới' },
            { value: 'gemini-2.5-flash', label: '⚡ 2.5 Flash' },
            { value: 'gemini-2.5-pro', label: '✨ 2.5 Pro' }
        ].forEach((item) => {
            const option = createElement('option', { value: item.value, text: item.label });
            modelSelect.appendChild(option);
        });
        modelSelect.value = config.model || 'gemini-2.5-flash';

        const languageSelect = createElement('select');
        languageSelect.setAttribute('aria-label', 'Ngôn ngữ trả lời');
        languageSelect.setAttribute('title', 'Chọn ngôn ngữ phản hồi');
        [
            { value: 'vi', label: 'Tiếng Việt' },
            { value: 'en', label: 'English' }
        ].forEach((item) => languageSelect.appendChild(createElement('option', item)));
        languageSelect.value = config.language || 'vi';

        const subjectSelect = createElement('select');
        subjectSelect.setAttribute('aria-label', 'Môn học');
        subjectSelect.setAttribute('title', 'Chọn môn học liên quan');
        ['Toán', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'Ngữ văn', 'Tiếng Anh', 'GDCD', 'Tin học', 'Chung'].forEach((label) => {
            subjectSelect.appendChild(createElement('option', { value: label, text: label }));
        });
        subjectSelect.value = config.subject || 'Chung';

        const outputModeSelect = createElement('select');
        outputModeSelect.setAttribute('aria-label', 'Kiểu phản hồi');
        outputModeSelect.setAttribute('title', 'Chọn kiểu phản hồi mong muốn');
        [
            { value: 'answer', text: 'Chỉ đáp án' },
            { value: 'explain', text: 'Giải thích chi tiết' },
            { value: 'custom', text: 'Tùy chỉnh...' }
        ].forEach((item) => outputModeSelect.appendChild(createElement('option', item)));
        outputModeSelect.value = config.outputMode || 'answer';

        quickSelects.append(modelSelect, languageSelect, subjectSelect, outputModeSelect);

        const customPromptField = createElement('div', {
            class: 'gfs-field',
            style: config.outputMode === 'custom' ? '' : 'display:none;'
        });
        customPromptField.append(createElement('span', { text: 'Yêu cầu tùy chỉnh' }));
        const customPromptInput = createElement('textarea', {
            rows: '3',
            placeholder: 'Ví dụ: Giải thích từng bước và nêu công thức...'
        });
        customPromptInput.value = config.customPrompt || '';
        customPromptField.append(customPromptInput);

        const quickActions = createElement('div', { class: 'gfs-quick-actions' });
        const btnShot = createElement('button', { text: '📸 Kéo vùng' });
        const btnFullPage = createElement('button', { text: '📄 Toàn trang' });
        const btnToggleTextMode = createElement('button', { class: 'secondary', text: '📝 Nhập câu hỏi' });
        quickActions.append(btnShot, btnFullPage, btnToggleTextMode);

        const textSection = createElement('div', {
            class: 'gfs-field',
            style: 'display:none;'
        });
        textSection.append(createElement('span', { text: 'Nhập câu hỏi của bạn' }));
        const textQuestionInput = createElement('textarea', {
            rows: '3',
            placeholder: 'Ví dụ: Số nào lớn nhất trong các số sau...'
        });
        const btnSendTextQuestion = createElement('button', { text: 'Gửi câu hỏi' });
        textSection.append(textQuestionInput, btnSendTextQuestion);

        const imagePreview = createElement('div', {
            class: 'gfs-image-preview',
            text: 'Chưa chụp ảnh.'
        });
        const answerBox = createElement('div', {
            class: 'gfs-output',
            text: 'Chưa có phản hồi.'
        });
        const answerMeta = createElement('div', { class: 'gfs-token-meta' });

        const advanced = createElement('details', { class: 'gfs-advanced' });
        if (!isMobile) {
            advanced.open = true;
        }
        const advancedSummary = createElement('summary', { text: 'Tự động quét trắc nghiệm' });
        const advancedBody = createElement('div', { class: 'gfs-advanced-body' });

        const questionLabel = createElement('label', { text: 'Câu hỏi' });
        const questionTextarea = createElement('textarea', { placeholder: 'Nội dung câu hỏi...', rows: '3' });
        const answerLabel = createElement('label', { text: 'Đáp án A-D' });
        const answerTextarea = createElement('textarea', { placeholder: 'A. ...\nB. ...\nC. ...\nD. ...', rows: '5' });
        const contextLabel = createElement('label', { text: 'Ngữ cảnh thêm' });
        const contextTextarea = createElement('textarea', { placeholder: 'Các đoạn văn bản liên quan', rows: '3' });
        contextTextarea.readOnly = true;

        const actions = createElement('div', { class: 'gfs-actions' });
        const extractButton = createElement('button', { text: 'Tự động quét' });
        const selectionButton = createElement('button', { text: 'Lấy từ bôi đen' });
        const solveButton = createElement('button', { text: 'Giải bằng Gemini' });
        const searchButton = createElement('button', { text: 'Tìm kiếm web' });
        actions.append(extractButton, selectionButton, solveButton, searchButton);

        const outputLabel = createElement('label', { text: 'Kết quả Gemini' });
        const outputBox = createElement('div', { class: 'gfs-output', text: 'Chưa có kết quả.' });
        const advancedMeta = createElement('div', { class: 'gfs-token-meta' });
        const searchLabel = createElement('label', { text: 'Kết quả tìm kiếm' });
        const searchContainer = createElement('div', { class: 'gfs-search-results' });

        const configDetails = createElement('div', { class: 'gfs-config' });
        const tempField = createElement('label', { class: 'gfs-field' });
        tempField.append(createElement('span', { text: 'Temperature' }));
        const tempInput = createElement('input', { type: 'number', min: '0', max: '1', step: '0.05', value: config.temperature });
        tempField.append(tempInput);

        const maxField = createElement('label', { class: 'gfs-field' });
        maxField.append(createElement('span', { text: 'Max Tokens' }));
        const maxTokenInput = createElement('input', {
            type: 'number',
            min: '128',
            max: '2048',
            step: '10',
            value: config.maxTokens
        });
        maxField.append(maxTokenInput);

        const autoExtractToggle = createElement('label', { class: 'gfs-config-toggle' });
        const autoExtractCheckbox = createElement('input', { type: 'checkbox' });
        autoExtractCheckbox.checked = Boolean(config.autoExtract);
        autoExtractToggle.append(autoExtractCheckbox, createElement('span', { text: 'Tự quét câu hỏi mới' }));

        const autoSearchToggle = createElement('label', { class: 'gfs-config-toggle' });
        const autoSearchCheckbox = createElement('input', { type: 'checkbox' });
        autoSearchCheckbox.checked = Boolean(config.autoSearch);
        autoSearchToggle.append(autoSearchCheckbox, createElement('span', { text: 'Đính kèm tóm tắt tìm kiếm' }));

        configDetails.append(tempField, maxField, autoExtractToggle, autoSearchToggle);
        advancedBody.append(
            questionLabel,
            questionTextarea,
            answerLabel,
            answerTextarea,
            contextLabel,
            contextTextarea,
            actions,
            outputLabel,
            outputBox,
            advancedMeta,
            searchLabel,
            searchContainer,
            configDetails
        );
        advanced.append(advancedSummary, advancedBody);

        body.append(
            apiField,
            quickSelects,
            customPromptField,
            quickActions,
            textSection,
            imagePreview,
            answerBox,
            answerMeta,
            advanced
        );

        panel.append(header, body);
        document.body.append(panel, toggleButton);

        let hidden = isMobile ? !config.quickPanelPinned : false;
        function syncVisibility() {
            if (hidden) {
                panel.classList.add('gfs-hidden');
                toggleButton.style.display = 'flex';
            } else {
                panel.classList.remove('gfs-hidden');
                toggleButton.style.display = 'none';
            }
        }

        function updateStatus(message, tone = 'info') {
            status.textContent = message;
            if (tone === 'success') {
                status.style.color = '#4ade80';
            } else if (tone === 'error') {
                status.style.color = '#fca5a5';
            } else {
                status.style.color = '#cbd5f5';
            }
        }

        function setQuickButtonsEnabled(enabled) {
            [btnShot, btnFullPage, btnToggleTextMode, btnSendTextQuestion].forEach((btn) => {
                btn.disabled = !enabled;
            });
        }

        setQuickButtonsEnabled(Boolean(config.apiKey));

        const handleBreakpoint = (event) => {
            const matches = typeof event === 'object' && 'matches' in event ? event.matches : mobileQuery ? mobileQuery.matches : false;
            isMobile = matches;
            if (!isMobile) {
                hidden = false;
                advanced.open = true;
            } else {
                hidden = !config.quickPanelPinned;
                if (advanced.open) {
                    advanced.open = false;
                }
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

        function togglePanel(force) {
            if (typeof force === 'boolean') {
                hidden = force;
            } else {
                hidden = !hidden;
            }
            if (isMobile) {
                config.quickPanelPinned = !hidden;
                saveConfig(config);
            }
            syncVisibility();
        }

        closeButton.addEventListener('click', () => togglePanel(true));
        toggleButton.addEventListener('click', () => togglePanel(false));

        syncVisibility();

        async function validateApiKey() {
            const key = apiInput.value.trim();
            if (!key) {
                updateStatus('Vui lòng nhập API key', 'error');
                setQuickButtonsEnabled(false);
                return;
            }
            updateStatus('Đang kiểm tra key...', 'info');
            apiCheckButton.disabled = true;
            try {
                const result = await callGemini(key, {
                    prompt: 'Ping',
                    model: modelSelect.value,
                    temperature: 0,
                    maxTokens: 16
                });
                if (result) {
                    config.apiKey = key;
                    await saveConfig(config);
                    updateStatus('✅ Key hợp lệ', 'success');
                    setQuickButtonsEnabled(true);
                }
            } catch (error) {
                updateStatus(`❌ ${error.message}`, 'error');
                setQuickButtonsEnabled(false);
            } finally {
                apiCheckButton.disabled = false;
            }
        }

        apiInput.addEventListener('change', async () => {
            config.apiKey = apiInput.value.trim();
            await saveConfig(config);
            updateStatus(config.apiKey ? 'Đã lưu key, bấm "Kiểm tra" để xác nhận.' : 'Chưa nhập API key');
            setQuickButtonsEnabled(Boolean(config.apiKey));
        });
        apiCheckButton.addEventListener('click', validateApiKey);

        modelSelect.addEventListener('change', async () => {
            config.model = modelSelect.value;
            await saveConfig(config);
        });
        languageSelect.addEventListener('change', async () => {
            config.language = languageSelect.value;
            await saveConfig(config);
        });
        subjectSelect.addEventListener('change', async () => {
            config.subject = subjectSelect.value;
            await saveConfig(config);
        });
        outputModeSelect.addEventListener('change', async () => {
            config.outputMode = outputModeSelect.value;
            customPromptField.style.display = config.outputMode === 'custom' ? '' : 'none';
            await saveConfig(config);
        });
        customPromptInput.addEventListener('change', async () => {
            config.customPrompt = customPromptInput.value.trim();
            await saveConfig(config);
        });

        btnToggleTextMode.addEventListener('click', () => {
            const isVisible = textSection.style.display !== 'none';
            textSection.style.display = isVisible ? 'none' : '';
            btnToggleTextMode.textContent = isVisible ? '📝 Nhập câu hỏi' : 'Ẩn nhập tay';
        });

        function createQuickPrompt({ isImage }) {
            const langText = languageSelect.value === 'vi' ? 'Tiếng Việt' : 'English';
            const subject = subjectSelect.value || 'Chung';
            const source = isImage ? 'trong ảnh' : 'được cung cấp';
            if (outputModeSelect.value === 'custom') {
                const custom = customPromptInput.value.trim();
                if (!custom) {
                    answerBox.textContent = 'Vui lòng nhập yêu cầu tùy chỉnh trước.';
                    return null;
                }
                return `${custom} (Trả lời bằng ${langText}).`;
            }
            if (outputModeSelect.value === 'answer') {
                return `Với bài tập môn ${subject} ${source}, chỉ đưa ra đáp án cuối cùng. Không giải thích. Trả lời bằng ${langText}.`;
            }
            return `Phân tích và giải chi tiết bài tập môn ${subject} ${source}. Trình bày lập luận từng bước và kết luận rõ ràng. Trả lời bằng ${langText}.`;
        }

        async function runGemini({ prompt, imageBase64, container, metaTarget, highlightResult }) {
            if (!config.apiKey) {
                updateStatus('Chưa có API key Gemini', 'error');
                if (container) {
                    container.textContent = 'Vui lòng nhập API key Gemini.';
                }
                return null;
            }
            if (!prompt) {
                if (container) {
                    container.textContent = 'Không có dữ liệu để gửi tới Gemini.';
                }
                return null;
            }
            if (container) {
                container.textContent = 'Đang gọi Gemini...';
            }
            if (metaTarget) {
                metaTarget.textContent = '';
            }
            try {
                const result = await callGemini(config.apiKey, {
                    prompt,
                    model: modelSelect.value,
                    temperature: config.temperature,
                    maxTokens: config.maxTokens,
                    imageBase64
                });
                if (container) {
                    container.textContent = result.text.trim();
                }
                if (metaTarget && result.usage) {
                    metaTarget.textContent = `Tokens (prompt/response): ${result.usage.promptTokenCount || 0}/${result.usage.candidatesTokenCount || 0}`;
                }
                if (highlightResult && result.text) {
                    const match = result.text.match(/Đáp án(?:\s+đúng)?\s*[:：]?\s*([A-D])/i)
                        || result.text.match(/Answer\s*[:：]?\s*([A-D])/i)
                        || result.text.match(/Correct\s+(?:option|answer)\s*[:：]?\s*([A-D])/i)
                        || result.text.match(/\bOption\s*([A-D])\b/i);
                    if (match) {
                        const highlighted = highlightAnswer(match[1]);
                        if (highlighted && container) {
                            container.textContent += `\n\n→ Đã tô sáng đáp án ${match[1].toUpperCase()} trên trang.`;
                        }
                    }
                }
                updateStatus('Đã nhận phản hồi từ Gemini', 'success');
                return result;
            } catch (error) {
                if (container) {
                    container.textContent = `Lỗi: ${error.message}`;
                }
                updateStatus(`❌ ${error.message}`, 'error');
                return null;
            }
        }

        async function captureScreenshot(rect) {
            const previousDisplay = panel.style.visibility;
            const previousToggle = toggleButton.style.visibility;
            panel.style.visibility = 'hidden';
            toggleButton.style.visibility = 'hidden';
            await new Promise((resolve) => requestAnimationFrame(resolve));
            try {
                const options = {
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    allowTaint: true,
                    scale: Math.min(window.devicePixelRatio || 1.5, 2)
                };
                if (rect) {
                    options.x = rect.left;
                    options.y = rect.top;
                    options.width = rect.width;
                    options.height = rect.height;
                }
                const canvas = await html2canvas(document.body, options);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                const base64 = dataUrl.split(',')[1];
                imagePreview.innerHTML = `<img src="${dataUrl}" alt="Ảnh đã chụp">`;
                return base64;
            } catch (error) {
                imagePreview.textContent = `❌ Lỗi chụp ảnh: ${error.message}`;
                throw error;
            } finally {
                panel.style.visibility = previousDisplay || '';
                toggleButton.style.visibility = previousToggle || '';
                syncVisibility();
            }
        }

        async function handleImageRequest(rect) {
            try {
                const instruction = createQuickPrompt({ isImage: true });
                if (!instruction) {
                    return;
                }
                imagePreview.textContent = 'Đang chụp ảnh...';
                answerBox.textContent = 'Đang chuẩn bị gửi đến Gemini...';
                const base64 = await captureScreenshot(rect);
                await runGemini({
                    prompt: instruction,
                    imageBase64: base64,
                    container: answerBox,
                    metaTarget: answerMeta
                });
            } catch (error) {
                answerBox.textContent = `Lỗi: ${error.message}`;
            }
        }

        const overlay = document.getElementById('gfs-snip-overlay') || createElement('div', { id: 'gfs-snip-overlay' });
        const snipBox = document.getElementById('gfs-snip-box') || createElement('div', { id: 'gfs-snip-box' });
        if (!overlay.isConnected) {
            document.body.append(overlay, snipBox);
        }

        let selecting = false;
        let startPoint = null;

        function pointerPosition(event) {
            if (event.touches && event.touches.length) {
                return {
                    x: event.touches[0].clientX + window.scrollX,
                    y: event.touches[0].clientY + window.scrollY
                };
            }
            return {
                x: event.clientX + window.scrollX,
                y: event.clientY + window.scrollY
            };
        }

        const onPointerDown = (event) => {
            if (!selecting) return;
            startPoint = pointerPosition(event);
            snipBox.style.display = 'block';
            snipBox.style.left = `${startPoint.x - window.scrollX}px`;
            snipBox.style.top = `${startPoint.y - window.scrollY}px`;
            snipBox.style.width = '0px';
            snipBox.style.height = '0px';
            event.preventDefault();
        };

        const onPointerMove = (event) => {
            if (!selecting || !startPoint) return;
            const pos = pointerPosition(event);
            const left = Math.min(startPoint.x, pos.x) - window.scrollX;
            const top = Math.min(startPoint.y, pos.y) - window.scrollY;
            const width = Math.abs(pos.x - startPoint.x);
            const height = Math.abs(pos.y - startPoint.y);
            snipBox.style.left = `${left}px`;
            snipBox.style.top = `${top}px`;
            snipBox.style.width = `${width}px`;
            snipBox.style.height = `${height}px`;
            event.preventDefault();
        };

        const onPointerUp = async (event) => {
            if (!selecting || !startPoint) return;
            const pos = pointerPosition(event);
            selecting = false;
            overlay.style.display = 'none';
            snipBox.style.display = 'none';
            const rect = {
                left: Math.min(startPoint.x, pos.x),
                top: Math.min(startPoint.y, pos.y),
                width: Math.abs(pos.x - startPoint.x),
                height: Math.abs(pos.y - startPoint.y)
            };
            startPoint = null;
            event.preventDefault();
            if (rect.width < 16 || rect.height < 16) {
                return;
            }
            await handleImageRequest(rect);
        };

        overlay.addEventListener('mousedown', onPointerDown);
        overlay.addEventListener('mousemove', onPointerMove);
        overlay.addEventListener('mouseup', onPointerUp);
        overlay.addEventListener('touchstart', onPointerDown);
        overlay.addEventListener('touchmove', onPointerMove, { passive: false });
        overlay.addEventListener('touchend', onPointerUp);

        btnShot.addEventListener('click', () => {
            selecting = true;
            overlay.style.display = 'block';
            snipBox.style.display = 'none';
        });

        btnFullPage.addEventListener('click', async () => {
            overlay.style.display = 'none';
            snipBox.style.display = 'none';
            await handleImageRequest(null);
        });

        btnSendTextQuestion.addEventListener('click', async () => {
            const question = textQuestionInput.value.trim();
            if (!question) {
                answerBox.textContent = 'Vui lòng nhập câu hỏi trước.';
                return;
            }
            const instruction = createQuickPrompt({ isImage: false });
            if (!instruction) {
                return;
            }
            btnSendTextQuestion.disabled = true;
            try {
                const parts = [`Câu hỏi: ${question}`];
                if (config.autoSearch) {
                    try {
                        const results = await performSearch(question.slice(0, 280));
                        const summary = summarizeSearchResults(results);
                        if (summary) {
                            parts.push('', 'Tài liệu tham khảo từ web:', summary);
                        }
                    } catch (searchError) {
                        console.warn('[Gemini Solver] Search error', searchError);
                    }
                }
                parts.push('', instruction);
                const prompt = parts.join('\n');
                await runGemini({
                    prompt,
                    container: answerBox,
                    metaTarget: answerMeta
                });
            } finally {
                btnSendTextQuestion.disabled = false;
            }
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

        solveButton.addEventListener('click', async () => {
            const question = questionTextarea.value.trim();
            if (!question) {
                outputBox.textContent = 'Hãy nhập câu hỏi trước khi gọi Gemini.';
                return;
            }
            const answers = { A: '', B: '', C: '', D: '' };
            answerTextarea.value.split(/\n|\\n/).forEach((line) => {
                const match = line.trim().match(/^(?:([A-D])[\.)]\s*)(.+)$/i);
                if (match) {
                    answers[match[1].toUpperCase()] = match[2].trim();
                }
            });
            const extraContext = contextTextarea.value.trim();
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
                    const topAnswers = Object.values(answers).filter(Boolean).slice(0, 4).join(' ');
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
                const prompt = formatPrompt(question, answers, extraContext, searchEvidence, {
                    subject: subjectSelect.value,
                    language: languageSelect.value,
                    outputMode: outputModeSelect.value,
                    customPrompt: customPromptInput.value.trim()
                });
                await runGemini({
                    prompt,
                    container: outputBox,
                    metaTarget: advancedMeta,
                    highlightResult: true
                });
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
                    .map((line) => line.trim())
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

        document.addEventListener('selectionchange', () => {
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
                lastSelectionText = selection.toString();
            }
        });

        if (config.autoExtract) {
            const extraction = extractQuestionAndOptions();
            if (extraction.question) {
                setExtractionOnUI(extraction, { questionTextarea, answerTextarea, contextTextarea, outputBox });
            }
        }

        return {
            panel,
            toggleButton,
            status,
            answerBox,
            outputBox,
            imagePreview,
            questionTextarea,
            answerTextarea,
            contextTextarea,
            searchContainer
        };
    }

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
