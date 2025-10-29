// ==UserScript==
// @name         AI Quiz Solver Pro
// @namespace    https://github.com/htuananh
// @version      2.0.0
// @description  Modern AI-powered quiz solver with Gemini integration
// @author       htuananh
// @match        *://*/*
// @icon         https://www.gstatic.com/aihub/icons/gemini-color.svg
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================================
    // CONFIGURATION
    // ============================================================================
    
    const CONFIG = {
        STORAGE_KEY: 'ai_quiz_solver_config',
        DEFAULT_SETTINGS: {
            apiKey: '',
            model: 'gemini-2.0-flash-exp',
            language: 'vi',
            subject: 'General',
            outputMode: 'answer',
            customPrompt: '',
            temperature: 0.2,
            maxTokens: 1000,
            autoHighlight: true,
            theme: 'dark'
        },
        MODELS: [
            { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)' },
            { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
            { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' }
        ],
        LANGUAGES: [
            { value: 'vi', label: 'Tiếng Việt' },
            { value: 'en', label: 'English' }
        ],
        SUBJECTS: [
            'General', 'Math', 'Physics', 'Chemistry', 'Biology',
            'History', 'Geography', 'Literature', 'English', 'Computer Science'
        ]
    };

    // ============================================================================
    // UTILITIES
    // ============================================================================
    
    class Utils {
        static normalizeText(text) {
            return (text || '')
                .replace(/[\u00A0\u200B\uFEFF]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        static createElement(tag, attrs = {}, children = []) {
            const el = document.createElement(tag);
            Object.entries(attrs).forEach(([key, value]) => {
                if (key === 'class') el.className = value;
                else if (key === 'text') el.textContent = value;
                else if (key === 'html') el.innerHTML = value;
                else if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
                else el.setAttribute(key, value);
            });
            children.forEach(child => {
                if (typeof child === 'string') {
                    el.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    el.appendChild(child);
                }
            });
            return el;
        }

        static debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        static async sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    // ============================================================================
    // STORAGE MANAGER
    // ============================================================================
    
    class StorageManager {
        static async load() {
            try {
                const data = await GM_getValue(CONFIG.STORAGE_KEY);
                if (!data) return { ...CONFIG.DEFAULT_SETTINGS };
                const parsed = typeof data === 'string' ? JSON.parse(data) : data;
                return { ...CONFIG.DEFAULT_SETTINGS, ...parsed };
            } catch (error) {
                console.error('[AI Quiz Solver] Storage load error:', error);
                return { ...CONFIG.DEFAULT_SETTINGS };
            }
        }

        static async save(config) {
            try {
                await GM_setValue(CONFIG.STORAGE_KEY, JSON.stringify(config));
                return true;
            } catch (error) {
                console.error('[AI Quiz Solver] Storage save error:', error);
                return false;
            }
        }
    }

    // ============================================================================
    // SELECTION PARSER
    // ============================================================================
    
    class SelectionParser {
        static parse(text) {
            if (!text) return { question: '', answers: {} };

            const answers = {};
            const normalized = text
                .replace(/[\u00A0\u200B\uFEFF]+/g, ' ')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');

            // Match answer patterns: A), A., A:, (A), etc.
            const answerRegex = /(?:^|\n)\s*\(?([A-D])\)?[\).:\-]\s*(.+?)(?=(?:\n\s*\(?[A-D]\)?[\).:\-])|$)/gis;
            const matches = [];
            let match;

            while ((match = answerRegex.exec(normalized)) !== null) {
                const letter = match[1].toUpperCase();
                const content = match[2].trim();
                if (content && !answers[letter]) {
                    matches.push({ letter, content, start: match.index });
                    answers[letter] = content;
                }
            }

            // Extract question (text before first answer)
            let question = '';
            if (matches.length > 0) {
                question = normalized.slice(0, matches[0].start).trim();
            } else {
                // No answers found, entire text is question
                question = normalized.trim();
            }

            // Clean up question
            question = question.replace(/^(?:question|câu hỏi|câu)\s*\d*[:.\-]?\s*/i, '').trim();

            return { question, answers };
        }

        static extractFromRange(range) {
            if (!range) return '';
            const cloned = range.cloneContents();
            const container = document.createElement('div');
            container.appendChild(cloned);
            return container.innerText || container.textContent || '';
        }
    }

    // ============================================================================
    // GEMINI API CLIENT
    // ============================================================================
    
    class GeminiClient {
        constructor(apiKey, model, temperature, maxTokens) {
            this.apiKey = apiKey;
            this.model = model;
            this.temperature = temperature;
            this.maxTokens = maxTokens;
        }

        buildPrompt(question, answers, config) {
            const lang = config.language === 'vi' ? 'Vietnamese' : 'English';
            let instruction;

            if (config.outputMode === 'custom' && config.customPrompt) {
                instruction = config.customPrompt;
            } else if (config.outputMode === 'answer') {
                instruction = `Only respond with the exact format "Answer: <A/B/C/D>" (e.g., Answer: C). No explanation.`;
            } else {
                instruction = `Start with "Answer: <A/B/C/D>" then provide a brief explanation in ${lang}.`;
            }

            const formattedAnswers = Object.entries(answers)
                .filter(([, value]) => value)
                .map(([letter, value]) => `${letter}. ${value}`)
                .join('\n');

            return [
                `You are an expert quiz solver specializing in ${config.subject}.`,
                `Analyze the following multiple-choice question carefully.`,
                `Evaluate each option (A, B, C, D) and determine the most correct answer.`,
                instruction,
                '',
                `Question: ${question}`,
                '',
                `Options:`,
                formattedAnswers || '(No options provided)',
                '',
                `Respond in ${lang}.`
            ].join('\n');
        }

        async generate(prompt) {
            if (!this.apiKey) {
                throw new Error('API key is required');
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
            
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url,
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify({
                        contents: [{
                            role: 'user',
                            parts: [{ text: prompt }]
                        }],
                        generationConfig: {
                            temperature: this.temperature,
                            maxOutputTokens: this.maxTokens
                        }
                    }),
                    onload: (response) => {
                        try {
                            if (response.status < 200 || response.status >= 300) {
                                const data = JSON.parse(response.responseText || '{}');
                                throw new Error(data?.error?.message || `API Error ${response.status}`);
                            }

                            const data = JSON.parse(response.responseText);
                            const text = data?.candidates?.[0]?.content?.parts
                                ?.map(p => p?.text)
                                .filter(Boolean)
                                .join('\n');

                            if (!text) throw new Error('Empty response from API');
                            resolve({ text });
                        } catch (err) {
                            reject(err);
                        }
                    },
                    onerror: (err) => {
                        reject(new Error(`Network error: ${err?.error || 'Unknown'}`));
                    }
                });
            });
        }
    }

    // ============================================================================
    // ANSWER DETECTOR
    // ============================================================================
    
    class AnswerDetector {
        static detectLetter(text) {
            const patterns = [
                /(?:answer|đáp án|correct)[:：]?\s*([A-D])/i,
                /^([A-D])[\).:\-]/m,
                /\b([A-D])\b/
            ];

            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) {
                    return match[1].toUpperCase();
                }
            }
            return null;
        }

        static findAnswerElement(letter, answerText, root = document.body) {
            const candidates = Array.from(root.querySelectorAll('li, label, p, div, span, button'));
            const normalized = Utils.normalizeText(answerText).toLowerCase();
            
            let bestMatch = null;
            let bestScore = 0;

            for (const el of candidates) {
                const text = Utils.normalizeText(el.innerText || el.textContent || '');
                if (!text) continue;

                const textLower = text.toLowerCase();
                if (!textLower.includes(normalized)) continue;

                let score = 0;

                // Check for letter markers
                if (new RegExp(`^\\s*\\(?${letter}\\)?[\\).:\\-]`, 'i').test(text)) {
                    score += 10;
                }

                // Check text similarity
                const similarity = normalized.length / text.length;
                if (similarity > 0.7) score += 5;
                else if (similarity > 0.5) score += 3;
                else if (similarity > 0.3) score += 1;

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = el;
                }
            }

            return bestScore > 0 ? bestMatch : null;
        }
    }

    // ============================================================================
    // UI COMPONENTS
    // ============================================================================
    
    class UI {
        constructor(app) {
            this.app = app;
            this.panel = null;
            this.fab = null;
            this.elements = {};
        }

        init() {
            this.injectStyles();
            this.createFAB();
            this.createPanel();
            this.attachEventListeners();
        }

        injectStyles() {
            GM_addStyle(`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                
                :root {
                    --primary: #667eea;
                    --primary-hover: #5568d3;
                    --success: #10b981;
                    --danger: #ef4444;
                    --warning: #f59e0b;
                    --bg-dark: #1e1e2e;
                    --bg-darker: #161622;
                    --text: #e5e7eb;
                    --text-muted: #9ca3af;
                    --border: rgba(255, 255, 255, 0.1);
                }

                #aqs-fab {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary), #764ba2);
                    border: none;
                    color: white;
                    font-size: 24px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
                    z-index: 999998;
                    transition: transform 0.2s, box-shadow 0.2s;
                    font-family: 'Inter', sans-serif;
                }

                #aqs-fab:hover {
                    transform: scale(1.1);
                    box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5);
                }

                #aqs-panel {
                    position: fixed;
                    bottom: 90px;
                    right: 24px;
                    width: 420px;
                    max-height: 80vh;
                    background: var(--bg-dark);
                    border-radius: 16px;
                    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
                    font-family: 'Inter', sans-serif;
                    color: var(--text);
                    z-index: 999999;
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                }

                #aqs-panel.visible {
                    display: flex;
                    animation: slideIn 0.3s ease;
                }

                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .aqs-header {
                    background: linear-gradient(135deg, var(--primary), #764ba2);
                    padding: 16px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .aqs-title {
                    font-size: 18px;
                    font-weight: 700;
                    color: white;
                }

                .aqs-close {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }

                .aqs-close:hover {
                    background: rgba(255, 255, 255, 0.3);
                }

                .aqs-tabs {
                    display: flex;
                    background: var(--bg-darker);
                    border-bottom: 1px solid var(--border);
                }

                .aqs-tab {
                    flex: 1;
                    padding: 12px;
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 14px;
                    transition: color 0.2s, background 0.2s;
                }

                .aqs-tab.active {
                    color: var(--primary);
                    background: rgba(102, 126, 234, 0.1);
                }

                .aqs-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                }

                .aqs-content::-webkit-scrollbar {
                    width: 6px;
                }

                .aqs-content::-webkit-scrollbar-thumb {
                    background: var(--border);
                    border-radius: 3px;
                }

                .aqs-tab-pane {
                    display: none;
                }

                .aqs-tab-pane.active {
                    display: block;
                }

                .aqs-form-group {
                    margin-bottom: 16px;
                }

                .aqs-label {
                    display: block;
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--text-muted);
                    margin-bottom: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .aqs-input, .aqs-select, .aqs-textarea {
                    width: 100%;
                    padding: 10px 12px;
                    background: var(--bg-darker);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    color: var(--text);
                    font-family: inherit;
                    font-size: 14px;
                    transition: border-color 0.2s;
                }

                .aqs-input:focus, .aqs-select:focus, .aqs-textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                }

                .aqs-textarea {
                    min-height: 100px;
                    resize: vertical;
                    font-family: 'SF Mono', 'Monaco', monospace;
                    font-size: 13px;
                }

                .aqs-btn {
                    width: 100%;
                    padding: 12px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-bottom: 8px;
                }

                .aqs-btn:last-child {
                    margin-bottom: 0;
                }

                .aqs-btn-primary {
                    background: var(--primary);
                    color: white;
                }

                .aqs-btn-primary:hover:not(:disabled) {
                    background: var(--primary-hover);
                }

                .aqs-btn-secondary {
                    background: var(--bg-darker);
                    color: var(--text);
                    border: 1px solid var(--border);
                }

                .aqs-btn-secondary:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.05);
                }

                .aqs-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .aqs-status {
                    padding: 12px;
                    border-radius: 8px;
                    font-size: 13px;
                    margin-bottom: 16px;
                }

                .aqs-status.success {
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--success);
                }

                .aqs-status.error {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--danger);
                }

                .aqs-status.warning {
                    background: rgba(245, 158, 11, 0.1);
                    color: var(--warning);
                }

                .aqs-answer-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                    margin-bottom: 16px;
                }

                .aqs-answer-item {
                    background: var(--bg-darker);
                    border: 2px solid var(--border);
                    border-radius: 8px;
                    padding: 12px;
                    transition: all 0.2s;
                }

                .aqs-answer-item.correct {
                    border-color: var(--success);
                    background: rgba(16, 185, 129, 0.1);
                }

                .aqs-answer-letter {
                    font-weight: 700;
                    color: var(--primary);
                    margin-bottom: 4px;
                }

                .aqs-answer-text {
                    font-size: 13px;
                    color: var(--text-muted);
                }

                .aqs-result {
                    background: var(--bg-darker);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 16px;
                    margin-top: 16px;
                }

                .aqs-result-answer {
                    font-size: 24px;
                    font-weight: 700;
                    color: var(--success);
                    text-align: center;
                    margin-bottom: 12px;
                }

                .aqs-result-text {
                    font-size: 14px;
                    line-height: 1.6;
                    color: var(--text);
                }

                .aqs-highlight {
                    background: rgba(16, 185, 129, 0.3) !important;
                    border: 3px solid var(--success) !important;
                    box-shadow: 0 0 20px rgba(16, 185, 129, 0.4) !important;
                    transition: all 0.3s !important;
                }

                @media (max-width: 768px) {
                    #aqs-panel {
                        right: 12px;
                        left: 12px;
                        width: auto;
                    }
                }
            `);
        }

        createFAB() {
            this.fab = Utils.createElement('button', {
                id: 'aqs-fab',
                text: 'AI',
                title: 'Open AI Quiz Solver'
            });
            document.body.appendChild(this.fab);
        }

        createPanel() {
            this.panel = Utils.createElement('div', { id: 'aqs-panel' });

            // Header
            const header = Utils.createElement('div', { class: 'aqs-header' }, [
                Utils.createElement('div', { class: 'aqs-title', text: '🤖 AI Quiz Solver' }),
                Utils.createElement('button', { class: 'aqs-close', text: '×' })
            ]);

            // Tabs
            const tabs = Utils.createElement('div', { class: 'aqs-tabs' }, [
                Utils.createElement('button', { class: 'aqs-tab active', 'data-tab': 'solve', text: 'Solve' }),
                Utils.createElement('button', { class: 'aqs-tab', 'data-tab': 'settings', text: 'Settings' })
            ]);

            // Content
            const content = Utils.createElement('div', { class: 'aqs-content' });

            // Solve Tab
            const solveTab = Utils.createElement('div', { class: 'aqs-tab-pane active', 'data-pane': 'solve' });
            
            this.elements.status = Utils.createElement('div', { class: 'aqs-status warning', text: 'Please configure API key in Settings' });
            solveTab.appendChild(this.elements.status);

            const questionGroup = Utils.createElement('div', { class: 'aqs-form-group' });
            questionGroup.appendChild(Utils.createElement('label', { class: 'aqs-label', text: 'Question' }));
            this.elements.questionInput = Utils.createElement('textarea', {
                class: 'aqs-textarea',
                placeholder: 'Paste or capture question from selection...'
            });
            questionGroup.appendChild(this.elements.questionInput);
            solveTab.appendChild(questionGroup);

            this.elements.answerGrid = Utils.createElement('div', { class: 'aqs-answer-grid' });
            ['A', 'B', 'C', 'D'].forEach(letter => {
                const item = Utils.createElement('div', { class: 'aqs-answer-item' });
                item.appendChild(Utils.createElement('div', { class: 'aqs-answer-letter', text: letter }));
                const textarea = Utils.createElement('textarea', {
                    class: 'aqs-textarea',
                    placeholder: `${letter}. ...`,
                    rows: '2'
                });
                textarea.dataset.letter = letter;
                item.appendChild(textarea);
                this.elements.answerGrid.appendChild(item);
            });
            solveTab.appendChild(this.elements.answerGrid);

            this.elements.captureBtn = Utils.createElement('button', {
                class: 'aqs-btn aqs-btn-secondary',
                text: '📝 Capture from Selection'
            });
            solveTab.appendChild(this.elements.captureBtn);

            this.elements.solveBtn = Utils.createElement('button', {
                class: 'aqs-btn aqs-btn-primary',
                text: '🚀 Solve with AI',
                disabled: true
            });
            solveTab.appendChild(this.elements.solveBtn);

            this.elements.resultDiv = Utils.createElement('div', { class: 'aqs-result', style: 'display: none;' });
            solveTab.appendChild(this.elements.resultDiv);

            content.appendChild(solveTab);

            // Settings Tab
            const settingsTab = Utils.createElement('div', { class: 'aqs-tab-pane', 'data-pane': 'settings' });

            const apiGroup = Utils.createElement('div', { class: 'aqs-form-group' });
            apiGroup.appendChild(Utils.createElement('label', { class: 'aqs-label', text: 'Gemini API Key' }));
            this.elements.apiKeyInput = Utils.createElement('input', {
                class: 'aqs-input',
                type: 'password',
                placeholder: 'Enter your API key...'
            });
            apiGroup.appendChild(this.elements.apiKeyInput);
            settingsTab.appendChild(apiGroup);

            const modelGroup = Utils.createElement('div', { class: 'aqs-form-group' });
            modelGroup.appendChild(Utils.createElement('label', { class: 'aqs-label', text: 'Model' }));
            this.elements.modelSelect = Utils.createElement('select', { class: 'aqs-select' });
            CONFIG.MODELS.forEach(model => {
                const option = Utils.createElement('option', { value: model.value, text: model.label });
                this.elements.modelSelect.appendChild(option);
            });
            modelGroup.appendChild(this.elements.modelSelect);
            settingsTab.appendChild(modelGroup);

            const langGroup = Utils.createElement('div', { class: 'aqs-form-group' });
            langGroup.appendChild(Utils.createElement('label', { class: 'aqs-label', text: 'Language' }));
            this.elements.langSelect = Utils.createElement('select', { class: 'aqs-select' });
            CONFIG.LANGUAGES.forEach(lang => {
                const option = Utils.createElement('option', { value: lang.value, text: lang.label });
                this.elements.langSelect.appendChild(option);
            });
            langGroup.appendChild(this.elements.langSelect);
            settingsTab.appendChild(langGroup);

            const saveBtn = Utils.createElement('button', {
                class: 'aqs-btn aqs-btn-primary',
                text: '💾 Save Settings'
            });
            settingsTab.appendChild(saveBtn);

            content.appendChild(settingsTab);

            this.panel.appendChild(header);
            this.panel.appendChild(tabs);
            this.panel.appendChild(content);
            document.body.appendChild(this.panel);

            // Store references
            this.elements.closeBtn = header.querySelector('.aqs-close');
            this.elements.tabs = Array.from(tabs.querySelectorAll('.aqs-tab'));
            this.elements.panes = Array.from(content.querySelectorAll('.aqs-tab-pane'));
            this.elements.saveBtn = saveBtn;
        }

        attachEventListeners() {
            this.fab.addEventListener('click', () => this.togglePanel());
            this.elements.closeBtn.addEventListener('click', () => this.togglePanel(false));
            
            this.elements.tabs.forEach(tab => {
                tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
            });

            this.elements.captureBtn.addEventListener('click', () => this.app.captureSelection());
            this.elements.solveBtn.addEventListener('click', () => this.app.solveQuestion());
            this.elements.saveBtn.addEventListener('click', () => this.app.saveSettings());

            this.elements.apiKeyInput.addEventListener('input', () => this.updateSolveButton());
            this.elements.questionInput.addEventListener('input', () => this.updateSolveButton());
        }

        togglePanel(show = null) {
            const isVisible = show === null ? !this.panel.classList.contains('visible') : show;
            this.panel.classList.toggle('visible', isVisible);
        }

        switchTab(tabName) {
            this.elements.tabs.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            this.elements.panes.forEach(pane => {
                pane.classList.toggle('active', pane.dataset.pane === tabName);
            });
        }

        updateSolveButton() {
            const hasApiKey = this.elements.apiKeyInput.value.trim().length > 0;
            const hasQuestion = this.elements.questionInput.value.trim().length > 0;
            this.elements.solveBtn.disabled = !(hasApiKey && hasQuestion);
        }

        showStatus(message, type = 'success') {
            this.elements.status.className = `aqs-status ${type}`;
            this.elements.status.textContent = message;
        }

        showResult(answer, text) {
            this.elements.resultDiv.innerHTML = '';
            this.elements.resultDiv.style.display = 'block';
            
            const answerDiv = Utils.createElement('div', {
                class: 'aqs-result-answer',
                text: `Answer: ${answer || '?'}`
            });
            this.elements.resultDiv.appendChild(answerDiv);

            if (text) {
                const textDiv = Utils.createElement('div', {
                    class: 'aqs-result-text',
                    text: text
                });
                this.elements.resultDiv.appendChild(textDiv);
            }
        }

        highlightAnswer(letter) {
            document.querySelectorAll('.aqs-highlight').forEach(el => {
                el.classList.remove('aqs-highlight');
            });

            this.elements.answerGrid.querySelectorAll('.aqs-answer-item').forEach(item => {
                item.classList.remove('correct');
            });

            const textarea = this.elements.answerGrid.querySelector(`textarea[data-letter="${letter}"]`);
            if (textarea) {
                textarea.closest('.aqs-answer-item').classList.add('correct');
            }
        }

        loadSettings(config) {
            this.elements.apiKeyInput.value = config.apiKey;
            this.elements.modelSelect.value = config.model;
            this.elements.langSelect.value = config.language;
            this.updateSolveButton();
        }
    }

    // ============================================================================
    // MAIN APPLICATION
    // ============================================================================
    
    class AIQuizSolver {
        constructor() {
            this.config = null;
            this.ui = null;
            this.selectionText = '';
            this.selectionRange = null;
        }

        async init() {
            this.config = await StorageManager.load();
            this.ui = new UI(this);
            this.ui.init();
            this.ui.loadSettings(this.config);
            this.setupSelectionListener();
            this.updateStatus();
        }

        setupSelectionListener() {
            document.addEventListener('selectionchange', Utils.debounce(() => {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    this.selectionText = SelectionParser.extractFromRange(range);
                    this.selectionRange = range.cloneRange();
                }
            }, 300));
        }

        updateStatus() {
            if (this.config.apiKey) {
                this.ui.showStatus('✓ Ready to solve questions', 'success');
            } else {
                this.ui.showStatus('⚠ Please configure API key in Settings', 'warning');
            }
        }

        captureSelection() {
            if (!this.selectionText) {
                this.ui.showStatus('⚠ No text selected', 'warning');
                return;
            }

            const parsed = SelectionParser.parse(this.selectionText);
            
            if (parsed.question) {
                this.ui.elements.questionInput.value = parsed.question;
            }

            const textareas = this.ui.elements.answerGrid.querySelectorAll('textarea');
            textareas.forEach(textarea => {
                const letter = textarea.dataset.letter;
                if (parsed.answers[letter]) {
                    textarea.value = parsed.answers[letter];
                }
            });

            this.ui.showStatus('✓ Content captured successfully', 'success');
            this.ui.updateSolveButton();
        }

        async solveQuestion() {
            const question = this.ui.elements.questionInput.value.trim();
            if (!question) {
                this.ui.showStatus('⚠ Please enter a question', 'warning');
                return;
            }

            const answers = {};
            this.ui.elements.answerGrid.querySelectorAll('textarea').forEach(textarea => {
                const letter = textarea.dataset.letter;
                const value = textarea.value.trim();
                if (value) answers[letter] = value;
            });

            this.ui.elements.solveBtn.disabled = true;
            this.ui.showStatus('🔄 Asking AI...', 'warning');

            try {
                const client = new GeminiClient(
                    this.config.apiKey,
                    this.config.model,
                    this.config.temperature,
                    this.config.maxTokens
                );

                const prompt = client.buildPrompt(question, answers, this.config);
                const result = await client.generate(prompt);

                const answerLetter = AnswerDetector.detectLetter(result.text);
                
                this.ui.showResult(answerLetter, result.text);
                this.ui.showStatus('✓ Question solved!', 'success');

                if (answerLetter) {
                    this.ui.highlightAnswer(answerLetter);
                    
                    // Highlight on page
                    if (answers[answerLetter]) {
                        const element = AnswerDetector.findAnswerElement(answerLetter, answers[answerLetter]);
                        if (element) {
                            element.classList.add('aqs-highlight');
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }
                }
            } catch (error) {
                this.ui.showStatus(`❌ Error: ${error.message}`, 'error');
            } finally {
                this.ui.elements.solveBtn.disabled = false;
            }
        }

        async saveSettings() {
            this.config.apiKey = this.ui.elements.apiKeyInput.value.trim();
            this.config.model = this.ui.elements.modelSelect.value;
            this.config.language = this.ui.elements.langSelect.value;

            const saved = await StorageManager.save(this.config);
            if (saved) {
                this.ui.showStatus('✓ Settings saved successfully', 'success');
                this.updateStatus();
                this.ui.updateSolveButton();
            } else {
                this.ui.showStatus('❌ Failed to save settings', 'error');
            }
        }
    }

    // ============================================================================
    // INITIALIZE
    // ============================================================================
    
    const app = new AIQuizSolver();
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => app.init());
    } else {
        app.init();
    }

})();
