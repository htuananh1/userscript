// ==UserScript==
// @name         Gemini 2.5 Flash Solver (Mobile/PC)
// @namespace    https://github.com/ai-utils
// @version      0.1.0
// @description  Giải trắc nghiệm ABCD từ nội dung trang bằng Gemini 2.5 Flash. Menu nhỏ gọn, dễ dùng trên mobile/PC, chính xác và nhẹ.
// @author       you
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ai.google
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlHttpRequest
// @connect      generativelanguage.googleapis.com
// @run-at       document-idle
// ==/UserScript==
(function () {
  'use strict';

  const STORAGE_KEYS = {
    apiKey: 'gs_api_key',
    model: 'gs_model',
    autoClick: 'gs_auto_click',
    autoRun: 'gs_auto_run',
  };

  const DEFAULTS = {
    model: 'gemini-2.5-flash',
    temperature: 0.0,
    maxContextChars: 1200, // giữ nhẹ
  };

  // ---------- UI ----------
  const style = `
    #gs-fab { position: fixed; bottom: 18px; right: 18px; width: 54px; height: 54px; border-radius: 50%; border: none; background: #303446; color: #fff; font-weight: 700; font-size: 16px; box-shadow: 0 6px 16px rgba(0,0,0,.25); z-index: 2147483646; cursor: pointer; display:flex; align-items:center; justify-content:center; }
    #gs-fab:active { transform: scale(.96); }

    #gs-panel { position: fixed; left: 8px; right: 8px; bottom: 8px; background: rgba(24,24,28,.98); color: #eaeaea; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.35); z-index: 2147483647; padding: 12px; max-width: 520px; margin: 0 auto; display: none; }
    #gs-panel.show { display: block; }
    #gs-header { display:flex; align-items:center; justify-content:space-between; gap: 8px; margin-bottom: 8px; }
    #gs-title { font-size: 16px; font-weight: 700; }
    #gs-close { background: transparent; border: none; color: #bbb; font-size: 20px; line-height: 1; cursor: pointer; }

    #gs-row { display:flex; gap:8px; flex-wrap:wrap; }
    .gs-col { flex:1 1 180px; min-width: 0; }

    .gs-input, .gs-select, .gs-btn, .gs-checkbox { width: 100%; box-sizing: border-box; }
    .gs-input, .gs-select { padding: 10px 12px; border-radius: 8px; border: 1px solid #3b3b44; background: #1e1e24; color: #fff; font-size: 14px; }
    .gs-input::placeholder { color: #888 }

    .gs-actions { display:flex; gap:8px; margin-top: 8px; }
    .gs-btn { padding: 10px 12px; border-radius: 8px; border: none; cursor: pointer; background: #4263eb; color:#fff; font-weight: 600; }
    .gs-btn.secondary { background: #3b3b44; }

    .gs-toggles { display:flex; gap: 12px; align-items:center; flex-wrap: wrap; margin-top: 8px; }
    .gs-check { display:flex; align-items:center; gap:6px; color:#cfcfcf; font-size: 13px; }

    #gs-output { margin-top: 10px; font-size: 14px; color: #c6f6d5; white-space: pre-wrap; word-break: break-word; }

    /* highlight answer */
    .gs-correct { outline: 3px solid #22c55e !important; background-color: rgba(34,197,94,.12) !important; border-radius: 8px; }

    /* label badge */
    .gs-badge { display:inline-block; font-size:12px; font-weight:700; background:#22c55e; color:#0b1; padding:2px 6px; border-radius: 6px; margin-left: 6px; }
  `;
  GM_addStyle(style);

  const fab = document.createElement('button');
  fab.id = 'gs-fab';
  fab.title = 'Gemini Solver';
  fab.textContent = 'GS';

  const panel = document.createElement('div');
  panel.id = 'gs-panel';
  panel.innerHTML = `
    <div id="gs-header">
      <div id="gs-title">Gemini Solver</div>
      <button id="gs-close" aria-label="Đóng">×</button>
    </div>
    <div id="gs-row">
      <div class="gs-col">
        <input id="gs-api" class="gs-input" type="password" placeholder="Google API Key (Gemini)" />
      </div>
      <div class="gs-col" style="max-width:180px">
        <input id="gs-model" class="gs-input" type="text" value="${DEFAULTS.model}" title="Model" />
      </div>
    </div>
    <div class="gs-toggles">
      <label class="gs-check"><input id="gs-autoclick" type="checkbox" /> Tự chọn đáp án</label>
      <label class="gs-check"><input id="gs-autorun" type="checkbox" /> Tự giải khi mở trang</label>
    </div>
    <div class="gs-actions">
      <button id="gs-solve" class="gs-btn">Giải (A/B/C/D)</button>
      <button id="gs-save" class="gs-btn secondary">Lưu</button>
    </div>
    <div id="gs-output"></div>
  `;

  document.documentElement.appendChild(fab);
  document.documentElement.appendChild(panel);

  const $ = (id) => panel.querySelector(id);
  const els = {
    close: $('#gs-close'),
    api: $('#gs-api'),
    model: $('#gs-model'),
    autoClick: $('#gs-autoclick'),
    autoRun: $('#gs-autorun'),
    out: $('#gs-output'),
    solve: $('#gs-solve'),
    save: $('#gs-save'),
  };

  fab.addEventListener('click', () => panel.classList.toggle('show'));
  els.close.addEventListener('click', () => panel.classList.remove('show'));

  // ---------- Storage helpers ----------
  async function loadSettings() {
    const [apiKey, model, autoClick, autoRun] = await Promise.all([
      GM_getValue(STORAGE_KEYS.apiKey, ''),
      GM_getValue(STORAGE_KEYS.model, DEFAULTS.model),
      GM_getValue(STORAGE_KEYS.autoClick, true),
      GM_getValue(STORAGE_KEYS.autoRun, false),
    ]);
    els.api.value = apiKey;
    els.model.value = model || DEFAULTS.model;
    els.autoClick.checked = !!autoClick;
    els.autoRun.checked = !!autoRun;
  }

  async function saveSettings() {
    await Promise.all([
      GM_setValue(STORAGE_KEYS.apiKey, els.api.value.trim()),
      GM_setValue(STORAGE_KEYS.model, els.model.value.trim() || DEFAULTS.model),
      GM_setValue(STORAGE_KEYS.autoClick, !!els.autoClick.checked),
      GM_setValue(STORAGE_KEYS.autoRun, !!els.autoRun.checked),
    ]);
    toast('Đã lưu cài đặt');
  }

  els.save.addEventListener('click', saveSettings);

  // ---------- Toast (lightweight) ----------
  let toastTimer;
  function toast(msg) {
    clearTimeout(toastTimer);
    let node = document.getElementById('gs-toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'gs-toast';
      node.style.cssText = 'position:fixed;left:50%;bottom:92px;transform:translateX(-50%);background:#333;color:#fff;padding:8px 12px;border-radius:8px;z-index:2147483647;font-size:13px;box-shadow:0 6px 14px rgba(0,0,0,.3)';
      document.documentElement.appendChild(node);
    }
    node.textContent = String(msg || '');
    node.style.opacity = '1';
    toastTimer = setTimeout(() => { node.style.opacity = '0'; }, 1800);
  }

  // ---------- Extraction ----------
  function isVisible(el) {
    if (!el || !(el instanceof Element)) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function cleanupText(s) {
    return (s || '')
      .replace(/\s+/g, ' ')
      .replace(/[\u00a0\t\n\r]+/g, ' ')
      .trim();
  }

  function getLabelForInput(input) {
    if (!input) return '';
    const id = input.id;
    if (id) {
      const labelFor = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (labelFor) return cleanupText(labelFor.innerText || labelFor.textContent);
    }
    const wrap = input.closest('label');
    if (wrap) return cleanupText(wrap.innerText || wrap.textContent);
    if (input.nextElementSibling) return cleanupText(input.nextElementSibling.textContent || input.nextElementSibling.innerText);
    return cleanupText(input.parentElement ? input.parentElement.innerText : '');
  }

  function getCommonAncestor(elements) {
    if (!elements.length) return document.body;
    const paths = elements.map((el) => {
      const path = [];
      let n = el;
      while (n) { path.push(n); n = n.parentElement; }
      return path;
    });
    let ancestor = document.body;
    const firstPath = paths[0];
    for (const node of firstPath) {
      if (paths.every((p) => p.includes(node))) { ancestor = node; break; }
    }
    return ancestor || document.body;
  }

  function findQuestionNear(container, optionEls) {
    // Scan previous siblings and headings for question text
    const candidates = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (!(node instanceof Element)) return NodeFilter.FILTER_SKIP;
        const tag = node.tagName.toLowerCase();
        if (!['p','div','span','h1','h2','h3','h4','h5','h6'].includes(tag)) return NodeFilter.FILTER_SKIP;
        if (!isVisible(node)) return NodeFilter.FILTER_SKIP;
        for (const opt of optionEls) { if (node.contains(opt)) return NodeFilter.FILTER_SKIP; }
        const txt = cleanupText(node.textContent || '');
        if (txt.length >= 12) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
      }
    });
    let n; while ((n = walker.nextNode())) { candidates.push(n); }
    // Prefer text that ends with ? or includes cues like 'Câu hỏi', 'Question'
    const scored = candidates.map((el) => {
      const t = cleanupText(el.textContent || '');
      let score = 0;
      if (/\?$/.test(t)) score += 5;
      if (/(câu\s*hỏi|question|which of|what is|chọn đáp án)/i.test(t)) score += 3;
      score += Math.min(60, Math.floor(t.length / 40)); // longer more likely
      // Distance to options: closer gets bonus
      const dist = optionEls.reduce((acc, oe) => acc + Math.abs(el.getBoundingClientRect().top - oe.getBoundingClientRect().top), 0) / (optionEls.length || 1);
      score += Math.max(0, 40 - Math.min(40, Math.floor(dist / 20)));
      return { el, t, score };
    });
    scored.sort((a,b)=> b.score - a.score);
    return scored[0]?.t || '';
  }

  function extractByInputs() {
    const inputs = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]')).filter(isVisible);
    // group by name to get one question block
    const nameToInputs = new Map();
    for (const ip of inputs) {
      const name = ip.name || '__no_name__';
      (nameToInputs.get(name) || nameToInputs.set(name, []).get(name)).push(ip);
    }
    // Choose the group with 3-6 options near viewport center
    const groups = Array.from(nameToInputs.values()).filter((arr) => arr.length >= 3 && arr.length <= 6);
    if (!groups.length) return null;
    groups.sort((a,b)=> {
      const center = window.innerHeight / 2;
      const ad = a.reduce((s,el)=> s + Math.abs((el.getBoundingClientRect().top+el.getBoundingClientRect().bottom)/2 - center), 0) / a.length;
      const bd = b.reduce((s,el)=> s + Math.abs((el.getBoundingClientRect().top+el.getBoundingClientRect().bottom)/2 - center), 0) / b.length;
      return ad - bd;
    });
    const group = groups[0];
    const options = group.map((ip, idx) => {
      const text = getLabelForInput(ip) || `Option ${idx+1}`;
      return { letter: String.fromCharCode(65 + idx), text, input: ip, el: ip.closest('label') || ip.parentElement || ip };
    }).filter((o) => cleanupText(o.text).length > 0);
    const container = getCommonAncestor(options.map(o=>o.el));
    const question = findQuestionNear(container, options.map(o=>o.el)) || '';
    return options.length >= 3 ? { question, options, container } : null;
  }

  function extractByTextBlocks() {
    // Look for blocks that include lines like A. xxx, B. xxx ...
    const allBlocks = Array.from(document.querySelectorAll('ol,ul,div,p,section,article')).filter(isVisible);
    for (const block of allBlocks) {
      const text = cleanupText(block.innerText || block.textContent || '');
      if (!text) continue;
      const lines = text.split(/\n|(?<=\s)[ABCD][\)\.:\-]\s/i).filter(Boolean);
      // Quick heuristic
      const optMatches = (text.match(/(^|\s)[ABCD][\)\.:\-]\s+/gi) || []).length;
      if (optMatches >= 3) {
        // Build options by scanning child nodes to keep DOM references
        const options = [];
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_ELEMENT, null);
        const optionRegex = /^\s*([A-D])[\)\.:\-]\s*(.+)$/i;
        let node;
        while ((node = walker.nextNode())) {
          const t = cleanupText(node.textContent || '');
          const m = optionRegex.exec(t);
          if (m && isVisible(node)) {
            const letter = m[1].toUpperCase();
            const body = m[2];
            if (body.length > 0) options.push({ letter, text: body, input: null, el: node });
          }
        }
        if (options.length >= 3) {
          // Question: previous text outside options
          const container = block;
          let question = '';
          const allText = cleanupText(block.textContent || '');
          const firstIdx = allText.search(/[ABCD][\)\.:\-]\s+/i);
          if (firstIdx > 0) question = cleanupText(allText.slice(0, firstIdx));
          if (!question) question = findQuestionNear(container, options.map(o=>o.el));
          // Normalize options order A..D unique
          const map = new Map();
          for (const o of options) if (!map.has(o.letter)) map.set(o.letter, o);
          const norm = [];
          for (const L of ['A','B','C','D','E','F']) { if (map.has(L)) norm.push(map.get(L)); }
          return { question, options: norm.slice(0, 6), container };
        }
      }
    }
    return null;
  }

  function extractQA() {
    const byInputs = extractByInputs();
    if (byInputs) return byInputs;
    const byText = extractByTextBlocks();
    if (byText) return byText;
    return null;
  }

  function buildPrompt(q, opts, context) {
    const optLines = opts.slice(0, 6).map((o) => `${o.letter}. ${o.text}`).join('\n');
    const cx = context ? `\n\nContext:\n${context}` : '';
    return `Bạn là trợ lý chuyên giải trắc nghiệm. Chỉ trả lời đúng một chữ cái A/B/C/D (hoặc E/F nếu có) ứng với đáp án đúng, không kèm giải thích hay ký tự nào khác.\n\nCâu hỏi:\n${q}\n\nCác lựa chọn:\n${optLines}${cx}\n\nĐáp án:`;
  }

  function getContextAround(container) {
    try {
      if (!container) return '';
      // Capture neighbor text up to a limit
      const parent = container.parentElement || document.body;
      let text = cleanupText(parent.innerText || parent.textContent || '');
      if (text.length > DEFAULTS.maxContextChars) {
        // Take a window around container
        const all = text;
        const idx = all.indexOf(cleanupText(container.innerText || container.textContent || ''));
        const start = Math.max(0, idx - Math.floor(DEFAULTS.maxContextChars / 2));
        text = all.slice(start, start + DEFAULTS.maxContextChars);
      }
      return text;
    } catch { return ''; }
  }

  // ---------- Gemini call ----------
  async function callGemini(apiKey, model, prompt) {
    if (!apiKey) throw new Error('Thiếu API Key');
    if (!model) model = DEFAULTS.model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }]}],
      generationConfig: { temperature: DEFAULTS.temperature, topP: 1, topK: 40 },
    };
    const resText = await new Promise((resolve, reject) => {
      GM_xmlHttpRequest({
        method: 'POST', url, data: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        onload: (r) => resolve(r.responseText),
        onerror: (e) => reject(new Error('Network error')),
        timeout: 30000,
        ontimeout: () => reject(new Error('Timeout')),
      });
    });
    let data;
    try { data = JSON.parse(resText); } catch { throw new Error('Invalid JSON from API'); }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
             || data?.candidates?.[0]?.output
             || data?.candidates?.[0]?.content?.parts?.map(p=>p.text).filter(Boolean).join('\n')
             || '';
    if (!text) {
      const msg = data?.error?.message || 'API không trả về nội dung';
      throw new Error(msg);
    }
    return String(text).trim();
  }

  function parseLetterFrom(text) {
    const s = String(text || '').trim();
    // Try JSON first
    try {
      const j = JSON.parse(s);
      const cand = (j.answer || j.result || j.choice || '').toString().toUpperCase();
      const m = cand.match(/[A-F]/);
      if (m) return m[0];
    } catch {}
    // Plain formats: "A", "Answer: C", "Option B", "-> D"
    const m = s.toUpperCase().match(/\b([A-F])\b/);
    if (m) return m[1];
    // Sometimes model writes like "Đáp án: C)" or "C." first token
    const m2 = s.toUpperCase().match(/^\s*([A-F])[\)\.:\s]/);
    if (m2) return m2[1];
    return null;
  }

  function highlightAndClick(letter, options, autoClick) {
    if (!letter) return false;
    const map = new Map(options.map(o => [o.letter, o]));
    const target = map.get(letter);
    if (!target) return false;
    try {
      target.el?.classList?.add('gs-correct');
      const badge = document.createElement('span');
      badge.className = 'gs-badge';
      badge.textContent = 'Đúng';
      target.el?.appendChild(badge);
      if (autoClick && target.input instanceof HTMLElement) {
        target.input.click();
        // Trigger change event for frameworks
        target.input.dispatchEvent(new Event('change', { bubbles: true }));
        target.input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      target.el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return true;
    } catch { return false; }
  }

  async function solveFlow() {
    els.out.textContent = 'Đang quét câu hỏi...';
    const qa = extractQA();
    if (!qa) {
      els.out.textContent = 'Không tìm thấy câu hỏi và đáp án ABCD trên trang';
      return;
    }
    const question = cleanupText(qa.question) || '(Không rõ câu hỏi - suy luận từ ngữ cảnh)';
    const options = qa.options.slice(0, 6).map((o, i) => ({ ...o, letter: o.letter || String.fromCharCode(65 + i), text: cleanupText(o.text) }));
    const context = getContextAround(qa.container);
    const prompt = buildPrompt(question, options, context);

    // Load settings
    const apiKey = (await GM_getValue(STORAGE_KEYS.apiKey, '')).trim();
    const model = (await GM_getValue(STORAGE_KEYS.model, DEFAULTS.model)).trim() || DEFAULTS.model;
    const autoClick = !!(await GM_getValue(STORAGE_KEYS.autoClick, true));
    if (!apiKey) {
      els.out.textContent = 'Thiếu API Key. Nhập API key rồi bấm Lưu.';
      panel.classList.add('show');
      return;
    }

    els.out.textContent = 'Đang hỏi Gemini...';
    try {
      const raw = await callGemini(apiKey, model, prompt);
      const letter = parseLetterFrom(raw);
      if (!letter) {
        els.out.textContent = `Không trích xuất được đáp án từ phản hồi:\n${raw}`;
        toast('Không nhận diện được A/B/C/D');
        return;
      }
      const ok = highlightAndClick(letter, options, autoClick);
      els.out.textContent = ok ? `Đáp án: ${letter}` : `Đáp án: ${letter} (không tìm thấy lựa chọn tương ứng trên trang)`;
      toast(`Đáp án: ${letter}`);
    } catch (e) {
      els.out.textContent = `Lỗi: ${e.message || e}`;
      toast('Gọi API lỗi');
    }
  }

  els.solve.addEventListener('click', solveFlow);

  // Load settings on start
  loadSettings().then(async () => {
    // Optional auto-run on pages with MCQ
    const autoRun = !!(await GM_getValue(STORAGE_KEYS.autoRun, false));
    if (autoRun) {
      // small delay to allow page UI to settle
      setTimeout(() => { try { const qa = extractQA(); if (qa) solveFlow(); } catch {} }, 800);
    }
  });
})();
