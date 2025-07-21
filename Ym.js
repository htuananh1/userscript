(function() {
    'use strict';

    // --- Cấu hình các site ---
    const sites = {
        'm88':      { codexn: 'taodeptrai', url: 'https://bet88ec.com/cach-danh-bai-sam-loc', loai_traffic: 'https://bet88ec.com/', span_id: 'layma_me_vuatraffic', api_file: 'GET_MA.php' },
        'fb88':     { codexn: 'taodeptrai', url: 'https://fb88mg.com/ty-le-cuoc-hong-kong-la-gi', loai_traffic: 'https://fb88mg.com/', span_id: 'layma_me_vuatraffic', api_file: 'GET_MA.php' },
        '188bet':   { codexn: 'taodeptrailamnhe', url: 'https://88betag.com/cach-choi-game-bai-pok-deng', loai_traffic: 'https://88betag.com/', span_id: 'layma_me_vuatraffic', api_file: 'GET_MA.php' },
        'w88':      { codexn: 'taodeptrai', url: 'https://188.166.185.213/tim-hieu-khai-niem-3-bet-trong-poker-la-gi', loai_traffic: 'https://188.166.185.213/', span_id: 'layma_me_vuatraffic', api_file: 'GET_MA.php' },
        'v9bet':    { codexn: 'taodeptrai', url: 'https://v9betho.com/ca-cuoc-bong-ro-ao', loai_traffic: 'https://v9betho.com/', span_id: 'layma_me_vuatraffic', api_file: 'GET_MA.php' },
        'vn88':     { codexn: 'bomaydeptrai', url: 'https://vn88sv.com/cach-choi-bai-gao-gae', loai_traffic: 'https://vn88sv.com/', span_id: 'layma_me_vuatraffic', api_file: 'GET_MA.php' },
        'bk8':      { codexn: 'taodeptrai', url: 'https://bk8ze.com/cach-choi-bai-catte', loai_traffic: 'https://bk8ze.com/', span_id: 'layma_me_vuatraffic', api_file: 'GET_MA.php' },
        '88betag':  { codexn: 'bomaylavua', url: 'https://88betag.com/keo-chau-a-la-gi', loai_traffic: 'https://88betag.com/', span_id: 'layma_me_tfudirect', api_file: 'GET_MD.php' },
        'w88abc':   { codexn: 'bomaylavua', url: 'https://w88abc.com/cach-choi-ca-cuoc-lien-quan-mobile', loai_traffic: 'https://w88abc.com/', span_id: 'layma_me_tfudirect', api_file: 'GET_MD.php' },
        'v9betlg':  { codexn: 'bomaylavua', url: 'https://v9betlg.com/phuong-phap-cuoc-flat-betting', loai_traffic: 'https://v9betlg.com/', span_id: 'layma_me_tfudirect', api_file: 'GET_MD.php' },
        'bk8xo':    { codexn: 'bomaylavua', url: 'https://bk8xo.com/lo-ba-cang-la-gi', loai_traffic: 'https://bk8xo.com/', span_id: 'layma_me_tfudirect', api_file: 'GET_MD.php' },
        'vn88ie':   { codexn: 'bomaylavua', url: 'https://vn88ie.com/cach-nuoi-lo-khung', loai_traffic: 'https://vn88ie.com/', span_id: 'layma_me_tfudirect', api_file: 'GET_MD.php' }
    };

    let isTaskRunning = false;
    let observer;
    const WAIT_TIME_MS = 80000; // 80 giây
    let afkIndicator = null;
    const originalTitle = document.title;

    // --- Giao diện và thông báo ---
    GM_addStyle(`
        #hades-afk-indicator {
            position: fixed;
            bottom: 15px;
            left: 15px;
            background-color: rgba(20, 20, 20, 0.85);
            color: white;
            padding: 10px 15px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 14px;
            z-index: 99999;
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }
        #hades-afk-indicator .title { font-weight: bold; color: #4CAF50; }
    `);

    const updateAFKIndicator = (text) => {
        if (!afkIndicator) {
            afkIndicator = document.createElement('div');
            afkIndicator.id = 'hades-afk-indicator';
            document.body.appendChild(afkIndicator);
        }
        afkIndicator.innerHTML = `<span class="title">Hades AFK Mode</span><br>${text}`;
    };

    const removeAFKIndicator = () => {
        if (afkIndicator) {
            afkIndicator.remove();
            afkIndicator = null;
        }
        document.title = originalTitle;
    };

    const notify = (text, title = 'Hades Auto') => {
        GM_notification({ text, title, timeout: 6000, image: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGhmdmJyN3cxdWNjNDc1aG5iN3J4eTBrMWV6Z3lscTh0MHFnemV0diZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/jPdNzfqIDmokLbSqO0/giphy.gif' });
        console.log(`[${title}] ${text}`);
    };

    // --- Logic chính ---
    const fetchApiCode = (siteKey) => {
        return new Promise((resolve, reject) => {
            const config = sites[siteKey];
            if (!config) return reject('Không tìm thấy cấu hình cho từ khóa: ' + siteKey);
            const codexnParam = config.api_file === 'GET_MD.php' ? 'codexnd' : 'codexn';
            const apiUrl = `https://traffic-user.net/${config.api_file}?${codexnParam}=${config.codexn}&url=${encodeURIComponent(config.url)}&loai_traffic=${encodeURIComponent(config.loai_traffic)}&clk=1000`;
            GM.xmlHttpRequest({
                method: "POST",
                url: apiUrl,
                headers: {
                    // Fake trình duyệt Chrome mới nhất
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
                },
                onload: (response) => {
                    const match = response.responseText.match(new RegExp(`<span id="${config.span_id}"[^>]*>\\s*(\\d+)\\s*<\\/span>`));
                    if (match && match[1]) resolve(match[1]);
                    else reject('Không tìm thấy mã trong phản hồi API.');
                },
                onerror: () => reject('Lỗi mạng khi gọi API.')
            });
        });
    };

    const runAutomation = async (keyword) => {
        if (isTaskRunning) return;
        isTaskRunning = true;
        if (observer) observer.disconnect();

        const codeInput = document.querySelector('input[name="code"][placeholder*="Nhập mã"]');
        if (!codeInput) {
            notify('Không tìm thấy ô nhập mã. Giao diện Yeumoney đã thay đổi?', 'Hades Auto - Lỗi Giao Diện');
            isTaskRunning = false;
            return;
        }

        const originalPlaceholder = codeInput.placeholder;
        let countdownInterval;

        try {
            updateAFKIndicator('Đang chờ đủ 80 giây... ⏳');
            codeInput.placeholder = `Hades: Đang chờ đủ 80s [${keyword.toUpperCase()}]...`;

            let countdown = WAIT_TIME_MS / 1000;
            countdownInterval = setInterval(() => {
                updateAFKIndicator(`Đợi <strong>${countdown}</strong> giây nữa mới lấy mã...`);
                document.title = `[${countdown}s] Hades AFK`;
                codeInput.placeholder = `Hades: Đợi ${countdown}s mới lấy mã...`;
                if (countdown <= 0) clearInterval(countdownInterval);
                countdown--;
            }, 1000);

            await new Promise(resolve => setTimeout(resolve, WAIT_TIME_MS));

            updateAFKIndicator('Đang lấy mã... 🏹');
            codeInput.placeholder = `Hades: Đang lấy mã [${keyword.toUpperCase()}]...`;

            const code = await fetchApiCode(keyword);
            GM_setClipboard(code, 'text');
            notify(`Mã đã về! Đang tự động nhập và submit...`);

            const finalCodeInput = document.querySelector('input[name="code"]');
            if (!finalCodeInput) throw new Error('Không tìm thấy ô để nhập mã.');
            finalCodeInput.value = code;
            finalCodeInput.dispatchEvent(new Event('input', { bubbles: true }));

            notify(`Mã [${code}] đã được điền. Sẵn sàng xác nhận! 🚀`);

            const submitButton = document.querySelector('button#btn-xac-nhan[type="submit"], button[type="submit"]');
            if (!submitButton) throw new Error('Không tìm thấy nút "Xác nhận".');
            submitButton.click();
            notify('Xong! Nhiệm vụ đã hoàn thành. Chờ kèo tiếp theo!', 'Hades Auto - Thành Công!');

        } catch (error) {
            notify(`Lỗi: ${error.message || error}`, 'Hades Auto - Báo Lỗi!');
        } finally {
            if (countdownInterval) clearInterval(countdownInterval);
            if (codeInput) codeInput.placeholder = originalPlaceholder;
            removeAFKIndicator();
        }
    };

    // --- Nhận diện từ khóa thông minh hơn ---
    const findKeywordAndRun = () => {
        if (isTaskRunning) return false;
        let foundKeyword = null;

        // 1. Tìm trong các đoạn có "Bước 2: Hãy nhớ từ khóa"
        const allParagraphs = document.querySelectorAll('p, div.text-dark');
        for (const p of allParagraphs) {
            if (p.textContent.includes('Bước 2: Hãy nhớ từ khóa')) {
                const keywordElement = p.nextElementSibling;
                if (keywordElement && keywordElement.textContent) {
                    foundKeyword = keywordElement.textContent.trim().toLowerCase();
                    break;
                }
            }
        }

        // 2. Tìm trong .box-copy-code
        if (!foundKeyword) {
            const keywordBox = document.querySelector('.box-copy-code');
            if (keywordBox && keywordBox.textContent) {
                foundKeyword = keywordBox.textContent.trim().toLowerCase();
            }
        }

        // 3. Tìm trong tiêu đề
        if (!foundKeyword) {
            const mainTitle = document.querySelector('.box-step h2, .box-step .h2');
            if (mainTitle && mainTitle.textContent) {
                const text = mainTitle.textContent.toLowerCase().trim();
                for (const key in sites) {
                    if (text.includes(key)) {
                        foundKeyword = key;
                        break;
                    }
                }
            }
        }

        // 4. Tìm trong toàn bộ trang (nếu vẫn chưa có)
        if (!foundKeyword) {
            const bodyText = document.body.innerText.toLowerCase();
            for (const key in sites) {
                if (bodyText.includes(key)) {
                    foundKeyword = key;
                    break;
                }
            }
        }

        if (foundKeyword && sites[foundKeyword]) {
            notify(`Mục tiêu đã khóa: [${foundKeyword.toUpperCase()}]. Đợi đủ 80s rồi lấy mã! 🎯`);
            runAutomation(foundKeyword);
            return true;
        }
        return false;
    };

    // --- Khởi động ---
    const initialize = () => {
        console.log('[Hades Auto] Kích hoạt! Bắt đầu rà soát trang...');
        if (findKeywordAndRun()) {
            console.log('[Hades Auto] Phát hiện mục tiêu ngay lập tức. Triển khai!');
            return;
        }
        observer = new MutationObserver(() => {
            if (findKeywordAndRun()) {
                if(observer) observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('[Hades Auto] Chưa có mục tiêu. Chuyển sang chế độ theo dõi...');
    };

    setTimeout(initialize, 500);

})();
