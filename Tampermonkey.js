// ==UserScript==
// @name         BypassYeumoney Loader
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Tuấn Anh đẹp trai
// @author       htuananh
// @icon         https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGhmdmJyN3cxdWNjNDc1aG5iN3J4eTBrMWV6Z3lscTh0MHFnemV0diZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/jPdNzfqIDmokLbSqO0/giphy.gif
// @match        https://yeumoney.com/*
// @connect      traffic-user.net
// @connect      raw.githubusercontent.com
// @grant        GM.xmlHttpRequest
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        GM_addStyle
// @grant        GM.getValue
// @grant        GM.setValue
// @run-at       document-end
// ==/UserScript==
(async () => {
    'use strict';
    const scriptUrl = atob('aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS9odHVhbmFuaDEvM2EzMDgxNDI3NzNhZTA3OGJiZTA3MGQwNjg0Zjc5MTMvcmF3LzlhMGM3MjViMTJlMDg4NGYyNDM2MzYxNTBkMmJhNDJhOGJlNGRkOTEvWWV1bW9uZXkuanM=');
    const CACHE_KEY = 'script_cache';
    const TIME_KEY = 'script_time';
    const CACHE_DURATION = 60;

    let code = await GM.getValue(CACHE_KEY);
    const lastFetch = await GM.getValue(TIME_KEY, 0);

    if (!code || (Date.now() - lastFetch > CACHE_DURATION)) {
        const response = await new Promise(resolve => {
            GM.xmlHttpRequest({
                method: 'GET',
                url: scriptUrl,
                onload: resolve,
                onerror: () => resolve({ status: 0 }) // Trả về để không bị lỗi
            });
        });

        if (response.status === 200) {
            code = response.responseText;
            await GM.setValue(CACHE_KEY, code);
            await GM.setValue(TIME_KEY, Date.now());
        }
    }

    if (code) eval(code);
})();
