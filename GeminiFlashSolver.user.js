// ==UserScript==
// @name         AI Quiz Solver Pro MAX
// @namespace    https://github.com/htuananh
// @version      3.0.0
// @description  Next-gen AI Quiz Solver with advanced question detection, multi-format support, history tracking, and intelligent answer prediction
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
        HISTORY_KEY: 'ai_quiz_solver_history',
        CACHE_KEY: 'ai_quiz_solver_cache',
        DEFAULT_SETTINGS: {
            apiKey: '',
            model: 'gemini-2.5-flash',
            language: 'vi',
            subject: 'General',
            outputMode: 'answer',
            customPrompt: '',
            temperature: 0.2,
            maxTokens: 1000,
            autoHighlight: true,
            theme: 'dark',
            autoDetect: true,
            enableCache: true,
            showConfidence: true,
            enableHistory: true,
            maxHistoryItems: 100,
            batchMode: false
        },
        MODELS: [
            { value: 'gemini-2.5-flash', label: '⚡ Gemini 2.5 Flash (Fast)', icon: '⚡' },
            { value: 'gemini-2.5-pro', label: '💎 Gemini 2.5 Pro (Accurate)', icon: '💎' }
        ],
        LANGUAGES: [
            { value: 'vi', label: 'Tiếng Việt' },
            { value: 'en', label: 'English' }
        ],
        SUBJECTS: [
            'General', 'Math', 'Physics', 'Chemistry', 'Biology',
            'History', 'Geography', 'Literature', 'English', 'Computer Science',
            'Economics', 'Law', 'Medicine', 'Engineering', 'Business'
        ],
        QUESTION_TYPES: {
            MULTIPLE_CHOICE: 'multiple_choice',
            TRUE_FALSE: 'true_false',
            MATCHING: 'matching',
            SHORT_ANSWER: 'short_answer',
            FILL_BLANK: 'fill_blank'
        }
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

        static generateHash(text) {
            let hash = 0;
            for (let i = 0; i < text.length; i++) {
                const char = text.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(36);
        }

        static formatDate(date) {
            return new Date(date).toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        static calculateSimilarity(str1, str2) {
            const longer = str1.length > str2.length ? str1 : str2;
            const shorter = str1.length > str2.length ? str2 : str1;
            if (longer.length === 0) return 1.0;
            return (longer.length - this.editDistance(longer, shorter)) / longer.length;
        }

        static editDistance(s1, s2) {
            s1 = s1.toLowerCase();
            s2 = s2.toLowerCase();
            const costs = [];
            for (let i = 0; i <= s1.length; i++) {
                let lastValue = i;
                for (let j = 0; j <= s2.length; j++) {
                    if (i === 0) costs[j] = j;
                    else {
                        if (j > 0) {
                            let newValue = costs[j - 1];
                            if (s1.charAt(i - 1) !== s2.charAt(j - 1))
                                newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                            costs[j - 1] = lastValue;
                            lastValue = newValue;
                        }
                    }
                }
                if (i > 0) costs[s2.length] = lastValue;
            }
            return costs[s2.length];
        }
    }

    // ============================================================================
    // STORAGE MANAGER
    // ============================================================================
    
    class StorageManager {
        static async load(key = CONFIG.STORAGE_KEY) {
            try {
                const data = await GM_getValue(key);
                if (!data) return key === CONFIG.STORAGE_KEY ? { ...CONFIG.DEFAULT_SETTINGS } : null;
                return typeof data === 'string' ? JSON.parse(data) : data;
            } catch (error) {
                console.error('[AI Quiz Solver] Storage load error:', error);
                return key === CONFIG.STORAGE_KEY ? { ...CONFIG.DEFAULT_SETTINGS } : null;
            }
        }

        static async save(data, key = CONFIG.STORAGE_KEY) {
            try {
                await GM_setValue(key, JSON.stringify(data));
                return true;
            } catch (error) {
                console.error('[AI Quiz Solver] Storage save error:', error);
                return false;
            }
        }

        static async clear(key) {
            try {
                await GM_setValue(key, null);
                return true;
            } catch (error) {
                console.error('[AI Quiz Solver] Storage clear error:', error);
                return false;
            }
        }
    }

    // ============================================================================
    // HISTORY MANAGER
    // ============================================================================
    
    class HistoryManager {
        static async add(item) {
            try {
                const history = await StorageManager.load(CONFIG.HISTORY_KEY) || [];
                const newItem = {
                    id: Utils.generateHash(item.question + Date.now()),
                    question: item.question,
                    answer: item.answer,
                    confidence: item.confidence || 0,
                    timestamp: Date.now(),
                    subject: item.subject || 'General',
                    type: item.type || CONFIG.QUESTION_TYPES.MULTIPLE_CHOICE
                };
                history.unshift(newItem);
                
                // Keep only max items
                const maxItems = (await StorageManager.load()).maxHistoryItems || 100;
                const trimmed = history.slice(0, maxItems);
                
                await StorageManager.save(trimmed, CONFIG.HISTORY_KEY);
                return newItem;
            } catch (error) {
                console.error('[AI Quiz Solver] History add error:', error);
                return null;
            }
        }

        static async getAll() {
            return await StorageManager.load(CONFIG.HISTORY_KEY) || [];
        }

        static async clear() {
            return await StorageManager.clear(CONFIG.HISTORY_KEY);
        }

        static async search(query) {
            const history = await this.getAll();
            const normalized = Utils.normalizeText(query.toLowerCase());
            return history.filter(item => 
                Utils.normalizeText(item.question.toLowerCase()).includes(normalized)
            );
        }

        static async getStats() {
            const history = await this.getAll();
            return {
                total: history.length,
                avgConfidence: history.reduce((sum, item) => sum + (item.confidence || 0), 0) / (history.length || 1),
                bySubject: history.reduce((acc, item) => {
                    acc[item.subject] = (acc[item.subject] || 0) + 1;
                    return acc;
                }, {}),
                recentCount: history.filter(item => Date.now() - item.timestamp < 86400000).length
            };
        }
    }

    // ============================================================================
    // CACHE MANAGER
    // ============================================================================
    
    class CacheManager {
        static async get(question) {
            try {
                const cache = await StorageManager.load(CONFIG.CACHE_KEY) || {};
                const hash = Utils.generateHash(question);
                const cached = cache[hash];
                if (cached && Date.now() - cached.timestamp < 86400000 * 7) { // 7 days
                    return cached.data;
                }
                return null;
            } catch (error) {
                console.error('[AI Quiz Solver] Cache get error:', error);
                return null;
            }
        }

        static async set(question, data) {
            try {
                const cache = await StorageManager.load(CONFIG.CACHE_KEY) || {};
                const hash = Utils.generateHash(question);
                cache[hash] = {
                    data,
                    timestamp: Date.now()
                };
                
                // Keep only last 500 items
                const entries = Object.entries(cache);
                if (entries.length > 500) {
                    const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
                    const trimmed = Object.fromEntries(sorted.slice(0, 500));
                    await StorageManager.save(trimmed, CONFIG.CACHE_KEY);
                } else {
                    await StorageManager.save(cache, CONFIG.CACHE_KEY);
                }
                return true;
            } catch (error) {
                console.error('[AI Quiz Solver] Cache set error:', error);
                return false;
            }
        }

        static async clear() {
            return await StorageManager.clear(CONFIG.CACHE_KEY);
        }
    }

    // ============================================================================
    // ADVANCED SELECTION PARSER
    // ============================================================================
    
    class SelectionParser {
        static parse(text) {
            if (!text) return { question: '', answers: {}, type: CONFIG.QUESTION_TYPES.MULTIPLE_CHOICE };

            const normalized = text
                .replace(/[\u00A0\u200B\uFEFF]+/g, ' ')
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n');

            // Detect question type
            const type = this.detectQuestionType(normalized);
            
            switch(type) {
                case CONFIG.QUESTION_TYPES.TRUE_FALSE:
                    return this.parseTrueFalse(normalized);
                case CONFIG.QUESTION_TYPES.MATCHING:
                    return this.parseMatching(normalized);
                case CONFIG.QUESTION_TYPES.FILL_BLANK:
                    return this.parseFillBlank(normalized);
                case CONFIG.QUESTION_TYPES.SHORT_ANSWER:
                    return this.parseShortAnswer(normalized);
                default:
                    return this.parseMultipleChoice(normalized);
            }
        }

        static detectQuestionType(text) {
            const lower = text.toLowerCase();
            
            // True/False detection
            if (/\b(true|false|đúng|sai)\b/i.test(text) && 
                !/\b[a-d][\).:\-]/i.test(text)) {
                return CONFIG.QUESTION_TYPES.TRUE_FALSE;
            }
            
            // Fill in the blank detection
            if (/_{3,}|\[.*?\]|\.{3,}/g.test(text)) {
                return CONFIG.QUESTION_TYPES.FILL_BLANK;
            }
            
            // Matching detection
            if (/match|nối|ghép|tương ứng/i.test(lower) && /\d+\.|[ivxIVX]+\./g.test(text)) {
                return CONFIG.QUESTION_TYPES.MATCHING;
            }
            
            // Short answer detection (no options provided)
            if (!/\b[a-d][\).:\-]/i.test(text) && text.split('\n').length < 6) {
                return CONFIG.QUESTION_TYPES.SHORT_ANSWER;
            }
            
            return CONFIG.QUESTION_TYPES.MULTIPLE_CHOICE;
        }

        static parseMultipleChoice(text) {
            const answers = {};
            
            // Enhanced regex patterns for answer detection
            const patterns = [
                /(?:^|\n)\s*\(?([A-D])\)?[\).:\-]\s*(.+?)(?=\s*\(?[A-D]\)?[\).:\-]|$)/gis,
                /(?:^|\n)\s*([A-D])\s*[\.:\-]\s*(.+?)(?=\s*[A-D]\s*[\.:\-]|$)/gis,
                /\b([A-D])\)\s*(.+?)(?=\s*[A-D]\)|$)/gis
            ];
            
            let matches = [];
            for (const pattern of patterns) {
                const found = [...text.matchAll(pattern)];
                if (found.length > 0) {
                    matches = found;
                    break;
                }
            }
            
            let firstAnswerIndex = text.length;
            
            matches.forEach(match => {
                const letter = match[1].toUpperCase();
                let content = match[2].trim();
                content = content.replace(/\s*(?=[A-D][\).:\-])/g, '').trim();
                
                if (content && !answers[letter]) {
                    if (match.index < firstAnswerIndex) {
                        firstAnswerIndex = match.index;
                    }
                    answers[letter] = content;
                }
            });

            // Extract question
            let question = text.slice(0, firstAnswerIndex).trim();
            question = question
                .replace(/^(?:question|câu hỏi|câu)\s*\d*[:.\-]?\s*/i, '')
                .replace(/[?.!]+$/, '')
                .trim();

            return { 
                question, 
                answers, 
                type: CONFIG.QUESTION_TYPES.MULTIPLE_CHOICE 
            };
        }

        static parseTrueFalse(text) {
            const lines = text.split('\n');
            let question = lines[0].trim();
            
            // Clean question
            question = question
                .replace(/^(?:question|câu hỏi|câu)\s*\d*[:.\-]?\s*/i, '')
                .replace(/[?.!]+$/, '')
                .trim();
            
            const answers = {
                A: 'True / Đúng',
                B: 'False / Sai'
            };
            
            return { 
                question, 
                answers, 
                type: CONFIG.QUESTION_TYPES.TRUE_FALSE 
            };
        }

        static parseMatching(text) {
            const question = text.split('\n')[0].trim();
            return { 
                question, 
                answers: { A: 'Matching question detected - requires manual analysis' }, 
                type: CONFIG.QUESTION_TYPES.MATCHING 
            };
        }

        static parseFillBlank(text) {
            return { 
                question: text.trim(), 
                answers: {}, 
                type: CONFIG.QUESTION_TYPES.FILL_BLANK 
            };
        }

        static parseShortAnswer(text) {
            return { 
                question: text.trim(), 
                answers: {}, 
                type: CONFIG.QUESTION_TYPES.SHORT_ANSWER 
            };
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
    // PLATFORM DETECTOR
    // ============================================================================
    
    class PlatformDetector {
        static detect() {
            const url = window.location.hostname;
            const platforms = [
                { 
                    pattern: /quizizz\.com/, 
                    name: 'Quizizz',
                    selectors: {
                        question: '.question-text-container',
                        answers: '.option-text'
                    }
                },
                { 
                    pattern: /kahoot\.(com|it)/, 
                    name: 'Kahoot',
                    selectors: {
                        question: '.question-text',
                        answers: '.answer-text'
                    }
                },
                { 
                    pattern: /forms\.gle|docs\.google\.com\/forms/, 
                    name: 'Google Forms',
                    selectors: {
                        question: '.freebirdFormviewerComponentsQuestionBaseTitle',
                        answers: '.docssharedWizToggleLabeledLabelText'
                    }
                },
                {
                    pattern: /moodle/,
                    name: 'Moodle',
                    selectors: {
                        question: '.qtext',
                        answers: '.answer'
                    }
                },
                {
                    pattern: /canvas/,
                    name: 'Canvas',
                    selectors: {
                        question: '.question_text',
                        answers: '.answer_text'
                    }
                }
            ];
            
            return platforms.find(p => p.pattern.test(url)) || null;
        }

        static extractFromPlatform(platform) {
            if (!platform || !platform.selectors) return null;
            
            try {
                const questionEl = document.querySelector(platform.selectors.question);
                const answerEls = document.querySelectorAll(platform.selectors.answers);
                
                if (!questionEl) return null;
                
                const question = Utils.normalizeText(questionEl.textContent);
                const answers = {};
                const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
                
                answerEls.forEach((el, idx) => {
                    if (idx < letters.length) {
                        answers[letters[idx]] = Utils.normalizeText(el.textContent);
                    }
                });
                
                return { question, answers, type: CONFIG.QUESTION_TYPES.MULTIPLE_CHOICE };
            } catch (error) {
                console.error('[AI Quiz Solver] Platform extraction error:', error);
                return null;
            }
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

        buildPrompt(question, answers, config, questionType) {
            const lang = config.language === 'vi' ? 'Vietnamese' : 'English';
            let instruction;

            if (config.outputMode === 'custom' && config.customPrompt) {
                instruction = config.customPrompt;
            } else if (config.outputMode === 'answer') {
                instruction = `Respond ONLY with "Answer: <letter>" (e.g., Answer: C). No explanation. Be decisive.`;
            } else {
                instruction = `Start with "Answer: <letter>" on the first line, then provide a concise explanation in ${lang}.`;
            }

            const formattedAnswers = Object.entries(answers)
                .filter(([, value]) => value)
                .map(([letter, value]) => `${letter}. ${value}`)
                .join('\n');

            let typeInfo = '';
            switch(questionType) {
                case CONFIG.QUESTION_TYPES.TRUE_FALSE:
                    typeInfo = 'This is a TRUE/FALSE question. Determine if the statement is true or false.';
                    break;
                case CONFIG.QUESTION_TYPES.MATCHING:
                    typeInfo = 'This is a MATCHING question. Analyze the correspondences carefully.';
                    break;
                case CONFIG.QUESTION_TYPES.FILL_BLANK:
                    typeInfo = 'This is a FILL-IN-THE-BLANK question. Provide the most appropriate word/phrase.';
                    break;
                case CONFIG.QUESTION_TYPES.SHORT_ANSWER:
                    typeInfo = 'This is a SHORT ANSWER question. Provide a concise, accurate answer.';
                    break;
            }

            return [
                `You are an expert ${config.subject} professor with deep knowledge and critical thinking skills.`,
                `Your task is to solve this question with the HIGHEST ACCURACY possible.`,
                '',
                typeInfo,
                '',
                `ANALYSIS FRAMEWORK:`,
                `1. Read the question carefully and identify key concepts`,
                `2. Eliminate obviously incorrect options immediately`,
                `3. Analyze each remaining option for factual accuracy`,
                `4. Consider edge cases and common misconceptions`,
                `5. Apply domain-specific knowledge from ${config.subject}`,
                `6. Choose the MOST COMPLETE and ACCURATE answer`,
                `7. Verify your choice against the question requirements`,
                '',
                instruction,
                '',
                `===== QUESTION =====`,
                question,
                '',
                formattedAnswers ? `===== OPTIONS =====\n${formattedAnswers}\n` : '',
                `===== REQUIREMENTS =====`,
                `- Subject: ${config.subject}`,
                `- Language: ${lang}`,
                `- Accuracy: Critical`,
                `- Reasoning: Logical and evidence-based`,
                '',
                `Provide your answer with maximum confidence and accuracy.`
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
                            maxOutputTokens: this.maxTokens,
                            topP: 0.95,
                            topK: 40
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
                /(?:answer|đáp án|correct|答案)[:：]?\s*([A-F])/i,
                /^([A-F])[\).:\-]/m,
                /\b([A-F])\b/,
                /option\s+([A-F])/i
            ];

            for (const pattern of patterns) {
                const match = text.match(pattern);
                if (match) {
                    return match[1].toUpperCase();
                }
            }
            return null;
        }

        static calculateConfidence(text, answer) {
            let confidence = 0.5; // Base confidence
            
            // Check for confident keywords
            const confidentWords = /\b(definitely|certainly|clearly|obviously|确定|明确)\b/i;
            if (confidentWords.test(text)) confidence += 0.2;
            
            // Check for explanation length (longer = more confident)
            if (text.length > 100) confidence += 0.1;
            if (text.length > 200) confidence += 0.1;
            
            // Check for explicit answer statement
            if (/^answer[:：]\s*[A-F]/im.test(text)) confidence += 0.1;
            
            return Math.min(confidence, 1.0);
        }

        static findAnswerElement(letter, answerText, root = document.body) {
            const candidates = Array.from(root.querySelectorAll('li, label, p, div, span, button, input[type="radio"]'));
            const normalized = Utils.normalizeText(answerText).toLowerCase();
            
            let bestMatch = null;
            let bestScore = 0;

            for (const el of candidates) {
                const text = Utils.normalizeText(el.innerText || el.textContent || '');
                if (!text) continue;

                const textLower = text.toLowerCase();
                
                // Check if it contains the answer text
                if (!textLower.includes(normalized) && 
                    Utils.calculateSimilarity(textLower, normalized) < 0.6) {
                    continue;
                }

                let score = 0;

                // Letter marker bonus
                if (new RegExp(`^\\s*\\(?${letter}\\)?[\\).:\\-]`, 'i').test(text)) {
                    score += 10;
                }

                // Similarity bonus
                const similarity = Utils.calculateSimilarity(normalized, textLower);
                score += similarity * 5;

                // Element type bonus
                if (el.tagName === 'LABEL' || el.tagName === 'LI') score += 2;
                if (el.querySelector('input[type="radio"]')) score += 3;

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
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                
                :root {
                    --primary: #667eea;
                    --primary-hover: #5568d3;
                    --success: #10b981;
                    --danger: #ef4444;
                    --warning: #f59e0b;
                    --info: #3b82f6;
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
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary), #764ba2);
                    border: none;
                    color: white;
                    font-size: 28px;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.5);
                    z-index: 999998;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    font-family: 'Inter', sans-serif;
                    animation: fabPulse 2s ease-in-out infinite;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                @keyframes fabPulse {
                    0%, 100% { box-shadow: 0 8px 32px rgba(102, 126, 234, 0.5); }
                    50% { box-shadow: 0 8px 48px rgba(102, 126, 234, 0.7); }
                }

                #aqs-fab:hover {
                    transform: scale(1.1) rotate(5deg);
                    box-shadow: 0 12px 48px rgba(102, 126, 234, 0.7);
                }

                #aqs-panel {
                    position: fixed;
                    bottom: 100px;
                    right: 24px;
                    width: 520px;
                    max-height: 90vh;
                    background: var(--bg-dark);
                    border-radius: 20px;
                    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
                    font-family: 'Inter', sans-serif;
                    color: var(--text);
                    z-index: 999999;
                    display: none;
                    flex-direction: column;
                    overflow: hidden;
                    border: 1px solid var(--border);
                }

                #aqs-panel.visible {
                    display: flex;
                    animation: slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }

                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(30px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }

                .aqs-header {
                    background: linear-gradient(135deg, var(--primary), #764ba2);
                    padding: 20px 24px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: relative;
                    overflow: hidden;
                }

                .aqs-header::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                    animation: headerShimmer 4s linear infinite;
                }

                @keyframes headerShimmer {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .aqs-title {
                    font-size: 20px;
                    font-weight: 800;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    position: relative;
                    z-index: 1;
                }

                .aqs-version {
                    font-size: 11px;
                    font-weight: 500;
                    background: rgba(255, 255, 255, 0.2);
                    padding: 2px 8px;
                    border-radius: 12px;
                    letter-spacing: 0.5px;
                }

                .aqs-close {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    cursor: pointer;
                    font-size: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    position: relative;
                    z-index: 1;
                }

                .aqs-close:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: rotate(90deg);
                }

                .aqs-tabs {
                    display: flex;
                    background: var(--bg-darker);
                    border-bottom: 1px solid var(--border);
                    padding: 8px;
                    gap: 6px;
                }

                .aqs-tab {
                    flex: 1;
                    padding: 12px;
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 13px;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    border-radius: 10px;
                }

                .aqs-tab.active {
                    color: white;
                    background: linear-gradient(135deg, var(--primary), #764ba2);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                .aqs-tab:hover:not(.active) {
                    color: var(--text);
                    background: rgba(255, 255, 255, 0.05);
                }

                .aqs-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px;
                }

                .aqs-content::-webkit-scrollbar {
                    width: 6px;
                }

                .aqs-content::-webkit-scrollbar-thumb {
                    background: var(--primary);
                    border-radius: 3px;
                }

                .aqs-tab-pane {
                    display: none;
                }

                .aqs-tab-pane.active {
                    display: block;
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .aqs-form-group {
                    margin-bottom: 20px;
                }

                .aqs-label {
                    display: block;
                    font-size: 12px;
                    font-weight: 700;
                    color: var(--text-muted);
                    margin-bottom: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                }

                .aqs-input, .aqs-select, .aqs-textarea {
                    width: 100%;
                    padding: 12px 16px;
                    background: var(--bg-darker);
                    border: 2px solid var(--border);
                    border-radius: 10px;
                    color: var(--text);
                    font-family: inherit;
                    font-size: 14px;
                    transition: all 0.2s;
                }

                .aqs-input:focus, .aqs-select:focus, .aqs-textarea:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .aqs-textarea {
                    min-height: 100px;
                    resize: vertical;
                    font-family: 'SF Mono', 'Monaco', monospace;
                    font-size: 13px;
                    line-height: 1.6;
                }

                .aqs-btn {
                    width: 100%;
                    padding: 14px 20px;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .aqs-btn-primary {
                    background: linear-gradient(135deg, var(--primary), #764ba2);
                    color: white;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                }

                .aqs-btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                }

                .aqs-btn-secondary {
                    background: var(--bg-darker);
                    color: var(--text);
                    border: 2px solid var(--border);
                }

                .aqs-btn-secondary:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.05);
                    border-color: var(--primary);
                }

                .aqs-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .aqs-status {
                    padding: 14px 18px;
                    border-radius: 12px;
                    font-size: 13px;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 600;
                    border: 2px solid transparent;
                    line-height: 1.5;
                }

                .aqs-status.success {
                    background: rgba(16, 185, 129, 0.15);
                    color: var(--success);
                    border-color: rgba(16, 185, 129, 0.3);
                }

                .aqs-status.error {
                    background: rgba(239, 68, 68, 0.15);
                    color: var(--danger);
                    border-color: rgba(239, 68, 68, 0.3);
                }

                .aqs-status.warning {
                    background: rgba(245, 158, 11, 0.15);
                    color: var(--warning);
                    border-color: rgba(245, 158, 11, 0.3);
                }

                .aqs-status.info {
                    background: rgba(59, 130, 246, 0.15);
                    color: var(--info);
                    border-color: rgba(59, 130, 246, 0.3);
                }

                .aqs-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .aqs-stat-card {
                    background: var(--bg-darker);
                    border: 2px solid var(--border);
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                    transition: all 0.3s;
                }

                .aqs-stat-card:hover {
                    border-color: var(--primary);
                    transform: translateY(-2px);
                }

                .aqs-stat-value {
                    font-size: 24px;
                    font-weight: 800;
                    color: var(--primary);
                    margin-bottom: 4px;
                }

                .aqs-stat-label {
                    font-size: 11px;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 600;
                }

                .aqs-result {
                    background: var(--bg-darker);
                    border: 2px solid var(--border);
                    border-radius: 12px;
                    padding: 20px;
                    margin-top: 16px;
                }

                .aqs-result-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .aqs-result-answer {
                    font-size: 32px;
                    font-weight: 800;
                    background: linear-gradient(135deg, var(--success), #059669);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .aqs-confidence-badge {
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .aqs-confidence-high {
                    background: rgba(16, 185, 129, 0.2);
                    color: var(--success);
                }

                .aqs-confidence-medium {
                    background: rgba(245, 158, 11, 0.2);
                    color: var(--warning);
                }

                .aqs-confidence-low {
                    background: rgba(239, 68, 68, 0.2);
                    color: var(--danger);
                }

                .aqs-result-text {
                    font-size: 14px;
                    line-height: 1.7;
                    color: var(--text);
                }

                .aqs-history-item {
                    background: var(--bg-darker);
                    border: 2px solid var(--border);
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .aqs-history-item:hover {
                    border-color: var(--primary);
                    transform: translateX(4px);
                }

                .aqs-history-question {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text);
                    margin-bottom: 8px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .aqs-history-meta {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 11px;
                    color: var(--text-muted);
                }

                .aqs-highlight {
                    background: rgba(16, 185, 129, 0.25) !important;
                    border: 3px solid var(--success) !important;
                    box-shadow: 0 0 25px rgba(16, 185, 129, 0.5) !important;
                    transition: all 0.3s !important;
                    animation: highlightPulse 1.5s ease-in-out infinite;
                }

                @keyframes highlightPulse {
                    0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
                    50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.6); }
                }

                .aqs-type-badge {
                    display: inline-block;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 12px;
                }

                .aqs-type-multiple { background: rgba(102, 126, 234, 0.2); color: var(--primary); }
                .aqs-type-truefalse { background: rgba(16, 185, 129, 0.2); color: var(--success); }
                .aqs-type-matching { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
                .aqs-type-short { background: rgba(59, 130, 246, 0.2); color: var(--info); }

                @media (max-width: 768px) {
                    #aqs-panel {
                        right: 12px;
                        left: 12px;
                        width: auto;
                        max-height: 85vh;
                    }
                }
            `);
        }

        createFAB() {
            this.fab = Utils.createElement('button', {
                id: 'aqs-fab',
                html: '🧠',
                title: 'AI Quiz Solver Pro MAX v3.0'
            });
            document.body.appendChild(this.fab);
        }

        createPanel() {
            this.panel = Utils.createElement('div', { id: 'aqs-panel' });

            // Header
            const header = Utils.createElement('div', { class: 'aqs-header' }, [
                Utils.createElement('div', { 
                    class: 'aqs-title', 
                    html: '🧠 AI Quiz Solver <span class="aqs-version">v3.0 MAX</span>' 
                }),
                Utils.createElement('button', { class: 'aqs-close', text: '×' })
            ]);

            // Tabs
            const tabs = Utils.createElement('div', { class: 'aqs-tabs' }, [
                Utils.createElement('button', { class: 'aqs-tab active', 'data-tab': 'solve', text: '🎯 Solve' }),
                Utils.createElement('button', { class: 'aqs-tab', 'data-tab': 'history', text: '📚 History' }),
                Utils.createElement('button', { class: 'aqs-tab', 'data-tab': 'settings', text: '⚙️ Settings' })
            ]);

            // Content
            const content = Utils.createElement('div', { class: 'aqs-content' });

            // Solve Tab
            const solveTab = this.createSolveTab();
            content.appendChild(solveTab);

            // History Tab
            const historyTab = this.createHistoryTab();
            content.appendChild(historyTab);

            // Settings Tab
            const settingsTab = this.createSettingsTab();
            content.appendChild(settingsTab);

            this.panel.appendChild(header);
            this.panel.appendChild(tabs);
            this.panel.appendChild(content);
            document.body.appendChild(this.panel);

            // Store references
            this.elements.closeBtn = header.querySelector('.aqs-close');
            this.elements.tabs = Array.from(tabs.querySelectorAll('.aqs-tab'));
            this.elements.panes = Array.from(content.querySelectorAll('.aqs-tab-pane'));
        }

        createSolveTab() {
            const solveTab = Utils.createElement('div', { class: 'aqs-tab-pane active', 'data-pane': 'solve' });
            
            // Stats
            this.elements.statsGrid = Utils.createElement('div', { class: 'aqs-stats-grid' });
            this.elements.totalSolved = Utils.createElement('div', { class: 'aqs-stat-card' });
            this.elements.totalSolved.innerHTML = `
                <div class="aqs-stat-value">0</div>
                <div class="aqs-stat-label">Solved</div>
            `;
            this.elements.avgConfidence = Utils.createElement('div', { class: 'aqs-stat-card' });
            this.elements.avgConfidence.innerHTML = `
                <div class="aqs-stat-value">0%</div>
                <div class="aqs-stat-label">Confidence</div>
            `;
            this.elements.todaySolved = Utils.createElement('div', { class: 'aqs-stat-card' });
            this.elements.todaySolved.innerHTML = `
                <div class="aqs-stat-value">0</div>
                <div class="aqs-stat-label">Today</div>
            `;
            this.elements.statsGrid.appendChild(this.elements.totalSolved);
            this.elements.statsGrid.appendChild(this.elements.avgConfidence);
            this.elements.statsGrid.appendChild(this.elements.todaySolved);
            solveTab.appendChild(this.elements.statsGrid);

            // Status
            this.elements.status = Utils.createElement('div', { 
                class: 'aqs-status warning', 
                text: '⚠️ Configure API key in Settings to start' 
            });
            solveTab.appendChild(this.elements.status);

            // Question type badge
            this.elements.typeBadge = Utils.createElement('div', { 
                class: 'aqs-type-badge aqs-type-multiple',
                text: '📝 Multiple Choice'
            });
            this.elements.typeBadge.style.display = 'none';
            solveTab.appendChild(this.elements.typeBadge);

            // Question
            const questionGroup = Utils.createElement('div', { class: 'aqs-form-group' });
            questionGroup.appendChild(Utils.createElement('label', { class: 'aqs-label', text: '❓ Question / Câu hỏi' }));
            this.elements.questionInput = Utils.createElement('textarea', {
                class: 'aqs-textarea',
                placeholder: 'Paste question here or use Auto-Detect / Capture buttons...\n\nDán câu hỏi vào đây hoặc dùng nút Tự động phát hiện / Chụp...',
                style: 'min-height: 100px;'
            });
            questionGroup.appendChild(this.elements.questionInput);
            solveTab.appendChild(questionGroup);

            // Answer
            const answerGroup = Utils.createElement('div', { class: 'aqs-form-group' });
            answerGroup.appendChild(Utils.createElement('label', { class: 'aqs-label', text: '💡 Answers / Đáp án' }));
            this.elements.answerInput = Utils.createElement('textarea', {
                class: 'aqs-textarea',
                placeholder: 'A. Option 1\nB. Option 2\nC. Option 3\nD. Option 4\n\n(Auto-filled from selection)',
                style: 'min-height: 120px;'
            });
            answerGroup.appendChild(this.elements.answerInput);
            solveTab.appendChild(answerGroup);

            // Buttons
            this.elements.autoDetectBtn = Utils.createElement('button', {
                class: 'aqs-btn aqs-btn-secondary',
                html: '<span>🔍</span><span>Auto-Detect from Page</span>'
            });
            solveTab.appendChild(this.elements.autoDetectBtn);

            this.elements.captureBtn = Utils.createElement('button', {
                class: 'aqs-btn aqs-btn-secondary',
                html: '<span>📥</span><span>Capture from Selection</span>'
            });
            solveTab.appendChild(this.elements.captureBtn);

            this.elements.solveBtn = Utils.createElement('button', {
                class: 'aqs-btn aqs-btn-primary',
                html: '<span>🧠</span><span>Solve with AI</span>',
                disabled: true
            });
            solveTab.appendChild(this.elements.solveBtn);

            // Result
            this.elements.resultDiv = Utils.createElement('div', { class: 'aqs-result', style: 'display: none;' });
            solveTab.appendChild(this.elements.resultDiv);

            return solveTab;
        }

        createHistoryTab() {
            const historyTab = Utils.createElement('div', { class: 'aqs-tab-pane', 'data-pane': 'history' });
            
            this.elements.historySearch = Utils.createElement('input', {
                class: 'aqs-input',
                type: 'text',
                placeholder: '🔍 Search history...',
                style: 'margin-bottom: 16px;'
            });
            historyTab.appendChild(this.elements.historySearch);

            this.elements.clearHistoryBtn = Utils.createElement('button', {
                class: 'aqs-btn aqs-btn-secondary',
                html: '<span>🗑️</span><span>Clear History</span>',
                style: 'margin-bottom: 16px;'
            });
            historyTab.appendChild(this.elements.clearHistoryBtn);

            this.elements.historyList = Utils.createElement('div', { class: 'aqs-history-list' });
            historyTab.appendChild(this.elements.historyList);

            return historyTab;
        }

        createSettingsTab() {
            const settingsTab = Utils.createElement('div', { class: 'aqs-tab-pane', 'data-pane': 'settings' });

            // API Key
            const apiGroup = Utils.createElement('div', { class: 'aqs-form-group' });
            apiGroup.appendChild(Utils.createElement('label', { class: 'aqs-label', text: '🔑 Gemini API Key' }));
            this.elements.apiKeyInput = Utils.createElement('input', {
                class: 'aqs-input',
                type: 'password',
                placeholder: 'Your API key...'
            });
            apiGroup.appendChild(this.elements.apiKeyInput);
            settingsTab.appendChild(apiGroup);

            // Model
            const modelGroup = Utils.createElement('div', { class: 'aqs-form-group' });
            modelGroup.appendChild(Utils.createElement('label', { class: 'aqs-label', text: '🤖 AI Model' }));
            this.elements.modelSelect = Utils.createElement('select', { class: 'aqs-select' });
            CONFIG.MODELS.forEach(model => {
                const option = Utils.createElement('option', { value: model.value, text: model.label });
                this.elements.modelSelect.appendChild(option);
            });
            modelGroup.appendChild(this.elements.modelSelect);
            settingsTab.appendChild(modelGroup);

            // Subject
            const subjectGroup = Utils.createElement('div', { class: 'aqs-form-group' });
            subjectGroup.appendChild(Utils.createElement('label', { class: 'aqs-label', text: '📚 Subject' }));
            this.elements.subjectSelect = Utils.createElement('select', { class: 'aqs-select' });
            CONFIG.SUBJECTS.forEach(subject => {
                const option = Utils.createElement('option', { value: subject, text: subject });
                this.elements.subjectSelect.appendChild(option);
            });
            subjectGroup.appendChild(this.elements.subjectSelect);
            settingsTab.appendChild(subjectGroup);

            // Language
            const langGroup = Utils.createElement('div', { class: 'aqs-form-group' });
            langGroup.appendChild(Utils.createElement('label', { class: 'aqs-label', text: '🌍 Language' }));
            this.elements.langSelect = Utils.createElement('select', { class: 'aqs-select' });
            CONFIG.LANGUAGES.forEach(lang => {
                const option = Utils.createElement('option', { value: lang.value, text: lang.label });
                this.elements.langSelect.appendChild(option);
            });
            langGroup.appendChild(this.elements.langSelect);
            settingsTab.appendChild(langGroup);

            // Save button
            this.elements.saveBtn = Utils.createElement('button', {
                class: 'aqs-btn aqs-btn-primary',
                html: '<span>💾</span><span>Save Settings</span>'
            });
            settingsTab.appendChild(this.elements.saveBtn);

            // Clear cache button
            this.elements.clearCacheBtn = Utils.createElement('button', {
                class: 'aqs-btn aqs-btn-secondary',
                html: '<span>🗑️</span><span>Clear Cache</span>'
            });
            settingsTab.appendChild(this.elements.clearCacheBtn);

            return settingsTab;
        }

        attachEventListeners() {
            this.fab.addEventListener('click', () => this.togglePanel());
            this.elements.closeBtn.addEventListener('click', () => this.togglePanel(false));
            
            this.elements.tabs.forEach(tab => {
                tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
            });

            this.elements.autoDetectBtn.addEventListener('click', () => this.app.autoDetect());
            this.elements.captureBtn.addEventListener('click', () => this.app.captureSelection());
            this.elements.solveBtn.addEventListener('click', () => this.app.solveQuestion());
            this.elements.saveBtn.addEventListener('click', () => this.app.saveSettings());
            this.elements.clearHistoryBtn.addEventListener('click', () => this.app.clearHistory());
            this.elements.clearCacheBtn.addEventListener('click', () => this.app.clearCache());

            this.elements.apiKeyInput.addEventListener('input', () => this.updateSolveButton());
            this.elements.questionInput.addEventListener('input', () => this.updateSolveButton());
            this.elements.historySearch.addEventListener('input', (e) => this.app.searchHistory(e.target.value));
        }

        togglePanel(show = null) {
            const isVisible = show === null ? !this.panel.classList.contains('visible') : show;
            this.panel.classList.toggle('visible', isVisible);
            if (isVisible) {
                this.app.updateStats();
                if (this.elements.tabs.find(t => t.dataset.tab === 'history')?.classList.contains('active')) {
                    this.app.loadHistory();
                }
            }
        }

        switchTab(tabName) {
            this.elements.tabs.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === tabName);
            });
            this.elements.panes.forEach(pane => {
                pane.classList.toggle('active', pane.dataset.pane === tabName);
            });
            
            if (tabName === 'history') {
                this.app.loadHistory();
            }
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

        showQuestionType(type) {
            const badges = {
                [CONFIG.QUESTION_TYPES.MULTIPLE_CHOICE]: { class: 'aqs-type-multiple', text: '📝 Multiple Choice' },
                [CONFIG.QUESTION_TYPES.TRUE_FALSE]: { class: 'aqs-type-truefalse', text: '✓✗ True/False' },
                [CONFIG.QUESTION_TYPES.MATCHING]: { class: 'aqs-type-matching', text: '🔗 Matching' },
                [CONFIG.QUESTION_TYPES.SHORT_ANSWER]: { class: 'aqs-type-short', text: '✍️ Short Answer' },
                [CONFIG.QUESTION_TYPES.FILL_BLANK]: { class: 'aqs-type-short', text: '📝 Fill Blank' }
            };
            
            const badge = badges[type] || badges[CONFIG.QUESTION_TYPES.MULTIPLE_CHOICE];
            this.elements.typeBadge.className = `aqs-type-badge ${badge.class}`;
            this.elements.typeBadge.textContent = badge.text;
            this.elements.typeBadge.style.display = 'inline-block';
        }

        showResult(answer, text, confidence) {
            this.elements.resultDiv.innerHTML = '';
            this.elements.resultDiv.style.display = 'block';
            
            const header = Utils.createElement('div', { class: 'aqs-result-header' });
            
            const answerDiv = Utils.createElement('div', {
                class: 'aqs-result-answer',
                text: `Answer: ${answer || '?'}`
            });
            header.appendChild(answerDiv);

            if (confidence !== undefined) {
                const confClass = confidence > 0.7 ? 'high' : confidence > 0.5 ? 'medium' : 'low';
                const confBadge = Utils.createElement('div', {
                    class: `aqs-confidence-badge aqs-confidence-${confClass}`,
                    text: `${Math.round(confidence * 100)}% confidence`
                });
                header.appendChild(confBadge);
            }

            this.elements.resultDiv.appendChild(header);

            if (text) {
                const textDiv = Utils.createElement('div', {
                    class: 'aqs-result-text',
                    text: text
                });
                this.elements.resultDiv.appendChild(textDiv);
            }
        }

        loadSettings(config) {
            this.elements.apiKeyInput.value = config.apiKey;
            this.elements.modelSelect.value = config.model;
            this.elements.langSelect.value = config.language;
            this.elements.subjectSelect.value = config.subject;
            this.updateSolveButton();
        }

        async updateStatsDisplay() {
            const stats = await HistoryManager.getStats();
            this.elements.totalSolved.querySelector('.aqs-stat-value').textContent = stats.total;
            this.elements.avgConfidence.querySelector('.aqs-stat-value').textContent = 
                `${Math.round(stats.avgConfidence * 100)}%`;
            this.elements.todaySolved.querySelector('.aqs-stat-value').textContent = stats.recentCount;
        }

        displayHistory(items) {
            this.elements.historyList.innerHTML = '';
            
            if (items.length === 0) {
                this.elements.historyList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 40px;">No history yet</div>';
                return;
            }

            items.forEach(item => {
                const historyItem = Utils.createElement('div', { class: 'aqs-history-item' });
                historyItem.innerHTML = `
                    <div class="aqs-history-question">${item.question}</div>
                    <div class="aqs-history-meta">
                        <span>📌 Answer: ${item.answer}</span>
                        <span>${Utils.formatDate(item.timestamp)}</span>
                    </div>
                `;
                historyItem.addEventListener('click', () => {
                    this.elements.questionInput.value = item.question;
                    this.switchTab('solve');
                });
                this.elements.historyList.appendChild(historyItem);
            });
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
            this.currentParsed = null;
        }

        async init() {
            this.config = await StorageManager.load();
            this.ui = new UI(this);
            this.ui.init();
            this.ui.loadSettings(this.config);
            this.setupSelectionListener();
            this.updateStatus();
            await this.updateStats();
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
                const platform = PlatformDetector.detect();
                if (platform) {
                    this.ui.showStatus(`✅ Ready! Detected: ${platform.name}. Use Auto-Detect button.`, 'success');
                } else {
                    this.ui.showStatus('✅ Ready to solve! Select text and capture or use Auto-Detect.', 'success');
                }
            } else {
                this.ui.showStatus('⚠️ Configure Gemini API key in Settings tab first.', 'warning');
            }
        }

        async updateStats() {
            await this.ui.updateStatsDisplay();
        }

        autoDetect() {
            const platform = PlatformDetector.detect();
            
            if (!platform) {
                this.ui.showStatus('ℹ️ No supported quiz platform detected. Use manual capture instead.', 'info');
                return;
            }

            const extracted = PlatformDetector.extractFromPlatform(platform);
            
            if (!extracted) {
                this.ui.showStatus(`⚠️ Could not extract data from ${platform.name}. Try manual capture.`, 'warning');
                return;
            }

            this.fillQuestionData(extracted);
            this.ui.showStatus(`✅ Auto-detected from ${platform.name}!`, 'success');
        }

        captureSelection() {
            if (!this.selectionText) {
                this.ui.showStatus('⚠️ No text selected. Select question text on page first.', 'warning');
                return;
            }

            const parsed = SelectionParser.parse(this.selectionText);
            this.fillQuestionData(parsed);
            
            const answerCount = Object.keys(parsed.answers).length;
            this.ui.showStatus(
                `✅ Captured: ${parsed.type} (${answerCount} option${answerCount !== 1 ? 's' : ''})`, 
                'success'
            );
        }

        fillQuestionData(parsed) {
            this.currentParsed = parsed;
            this.ui.elements.questionInput.value = parsed.question;
            
            const answersText = Object.entries(parsed.answers)
                .map(([letter, text]) => `${letter}. ${text}`)
                .join('\n');
            this.ui.elements.answerInput.value = answersText;
            
            this.ui.showQuestionType(parsed.type);
            this.ui.updateSolveButton();
        }

        async solveQuestion() {
            const question = this.ui.elements.questionInput.value.trim();
            if (!question) {
                this.ui.showStatus('⚠️ Please enter a question first', 'warning');
                return;
            }

            // Parse answers
            const answersText = this.ui.elements.answerInput.value.trim();
            const answers = {};
            if (answersText) {
                answersText.split('\n').forEach(line => {
                    const match = line.match(/^([A-F])[\.:\)]\s*(.+)/i);
                    if (match) {
                        answers[match[1].toUpperCase()] = match[2].trim();
                    }
                });
            }

            const questionType = this.currentParsed?.type || CONFIG.QUESTION_TYPES.MULTIPLE_CHOICE;

            this.ui.elements.solveBtn.disabled = true;
            this.ui.elements.solveBtn.innerHTML = '<span>⏳</span><span>AI Analyzing...</span>';
            this.ui.showStatus('🤖 AI is analyzing... Please wait.', 'info');

            try {
                // Check cache
                if (this.config.enableCache) {
                    const cached = await CacheManager.get(question);
                    if (cached) {
                        this.displayAnswer(cached, true);
                        return;
                    }
                }

                const client = new GeminiClient(
                    this.config.apiKey,
                    this.config.model,
                    this.config.temperature,
                    this.config.maxTokens
                );

                const prompt = client.buildPrompt(question, answers, this.config, questionType);
                const result = await client.generate(prompt);

                const answerLetter = AnswerDetector.detectLetter(result.text);
                const confidence = AnswerDetector.calculateConfidence(result.text, answerLetter);
                
                const answerData = {
                    letter: answerLetter,
                    text: result.text,
                    confidence,
                    question,
                    questionType
                };

                // Cache result
                if (this.config.enableCache && answerLetter) {
                    await CacheManager.set(question, answerData);
                }

                // Add to history
                if (this.config.enableHistory && answerLetter) {
                    await HistoryManager.add({
                        question,
                        answer: answerLetter,
                        confidence,
                        subject: this.config.subject,
                        type: questionType
                    });
                }

                this.displayAnswer(answerData, false);
                await this.updateStats();

            } catch (error) {
                this.ui.showStatus(`❌ Error: ${error.message}`, 'error');
                console.error('[AI Quiz Solver] Error:', error);
            } finally {
                this.ui.elements.solveBtn.disabled = false;
                this.ui.elements.solveBtn.innerHTML = '<span>🧠</span><span>Solve with AI</span>';
            }
        }

        displayAnswer(answerData, fromCache) {
            const { letter, text, confidence } = answerData;
            
            this.ui.showResult(letter, text, confidence);
            
            const cacheText = fromCache ? ' (from cache)' : '';
            const confText = confidence ? ` | Confidence: ${Math.round(confidence * 100)}%` : '';
            this.ui.showStatus(
                `✅ Answer: ${letter || 'Unknown'}${confText}${cacheText}`, 
                'success'
            );

            // Highlight answer on page
            if (letter && this.currentParsed?.answers[letter]) {
                setTimeout(() => {
                    const element = AnswerDetector.findAnswerElement(
                        letter, 
                        this.currentParsed.answers[letter]
                    );
                    if (element) {
                        // Remove previous highlights
                        document.querySelectorAll('.aqs-highlight').forEach(el => {
                            el.classList.remove('aqs-highlight');
                        });
                        
                        element.classList.add('aqs-highlight');
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            }
        }

        async saveSettings() {
            this.config.apiKey = this.ui.elements.apiKeyInput.value.trim();
            this.config.model = this.ui.elements.modelSelect.value;
            this.config.language = this.ui.elements.langSelect.value;
            this.config.subject = this.ui.elements.subjectSelect.value;

            if (!this.config.apiKey) {
                this.ui.showStatus('⚠️ Please enter your Gemini API key', 'warning');
                return;
            }

            const saved = await StorageManager.save(this.config);
            if (saved) {
                this.ui.showStatus('✅ Settings saved successfully!', 'success');
                this.updateStatus();
                this.ui.updateSolveButton();
                setTimeout(() => this.ui.switchTab('solve'), 1500);
            } else {
                this.ui.showStatus('❌ Failed to save settings', 'error');
            }
        }

        async loadHistory() {
            const history = await HistoryManager.getAll();
            this.ui.displayHistory(history);
        }

        async searchHistory(query) {
            if (!query.trim()) {
                await this.loadHistory();
                return;
            }
            const results = await HistoryManager.search(query);
            this.ui.displayHistory(results);
        }

        async clearHistory() {
            if (confirm('Clear all history? This cannot be undone.')) {
                await HistoryManager.clear();
                this.ui.showStatus('✅ History cleared', 'success');
                await this.loadHistory();
                await this.updateStats();
            }
        }

        async clearCache() {
            if (confirm('Clear answer cache? This cannot be undone.')) {
                await CacheManager.clear();
                this.ui.showStatus('✅ Cache cleared', 'success');
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
