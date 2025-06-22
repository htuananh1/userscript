// ==UserScript==
// @name         UGPHONE VIP TOOL
// @namespace    https://ugphone.com/
// @version      2.3
// @author       HoangAnh
// @match        https://www.ugphone.com/toc-portal/*
// @match        https://www.ugphone.com/toc-portal/#/dashboard/index
// @icon         https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGhmdmJyN3cxdWNjNDc1aG5iN3J4eTBrMWV6Z3lscTh0MHFnemV0diZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/jPdNzfqIDmokLbSqO0/giphy.gif
// @grant        none
// @description  Vip
// ==/UserScript==

(function() {
    const autoBtnText = 'Auto Mua';
    const serverOptions = [
        { label: "Singapore", value: "Singapore" },
        { label: "Hong Kong", value: "Hong Kong" },
        { label: "Japan", value: "Japan" },
        { label: "America", value: "America" },
        { label: "Germany", value: "Germany" },
    ];
    const bubbleIconUrl = "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGhmdmJyN3cxdWNjNDc1aG5iN3J4eTBrMWV6Z3lscTh0MHFnemV0diZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/jPdNzfqIDmokLbSqO0/giphy.gif";

    // UI
    const host = document.createElement('div');
    host.id = 'ugphone-flat-ui-host';
    const shadow = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);

    shadow.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap');
        .ugp-flat-bubble {
          position: fixed; bottom: 18px; right: 18px; width: 38px; height: 38px; border-radius: 50%;
          background: url('${bubbleIconUrl}') no-repeat center/cover;
          box-shadow: 0 0 8px #00ffe7, 0 0 18px #a400ff;
          border: 2.5px solid #00ffe7;
          cursor: pointer; z-index: 1000000;
          display: flex; align-items: center; justify-content: center;
        }
        .ugp-flat-modal-bg {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(24,22,45,0.90);
          z-index: 999999;
          display: none; align-items: center; justify-content: center;
        }
        .ugp-flat-modal {
          width: 400px;
          height: 600px;
          max-width: 97vw;
          max-height: 98vh;
          background: #181C2B;
          border-radius: 28px;
          box-shadow: 0 8px 42px #000b, 0 0 0 2px #00ffe799 inset;
          display: flex; flex-direction: column; align-items: center;
          padding: 32px 20px 22px 20px;
          font-family: 'Montserrat', Arial, sans-serif;
          border: 2.5px solid #00ffe7;
          position: relative;
        }
        .ugp-title {
          font-size: 27px;
          font-weight: 700;
          background: linear-gradient(90deg, #60eaff, #f157ff 80%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 18px;
          letter-spacing: 1.2px;
          text-align: center;
        }
        .ugp-input-wrap {
          width: 100%;
          display: flex;
          justify-content: center;
          margin-bottom: 30px;
        }
        .ugp-input {
          width: 95%;
          min-width: 0;
          background: #23243a;
          border: none;
          border-radius: 13px;
          padding: 16px 18px;
          color: #fff;
          font-size: 18px;
          font-family: inherit;
          margin: 0 auto;
          box-shadow: 0 2px 16px #0002;
          outline: none;
          resize: none;
          text-align: left;
          line-height: 1.5;
          font-weight: 500;
        }
        .ugp-btn-row {
          display: flex;
          gap: 14px;
          width: 100%;
          justify-content: center;
          margin-bottom: 18px;
        }
        .ugp-btn-row.ugp-bottom {
          margin-bottom: 0;
        }
        .ugp-btn {
          flex: 1;
          min-width: 0;
          padding: 17px 0;
          font-family: inherit;
          font-weight: 700;
          font-size: 19px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          color: #fff;
          margin: 0 2px;
          box-shadow: 0 3px 16px 0 #0004;
          transition: background 0.21s, box-shadow 0.21s, transform 0.12s;
          outline: none;
        }
        .ugp-btn:active { transform: scale(0.97);}
        .ugp-btn-login    { background: linear-gradient(90deg,#6eeafd 60%,#2db2e7 100%);}
        .ugp-btn-auto     { background: linear-gradient(90deg,#ff6e95 60%,#a400ff 100%);}
        .ugp-btn-copy     { background: linear-gradient(90deg,#57e679 60%,#21cda6 100%);}
        .ugp-btn-logout   { background: linear-gradient(90deg,#ff5f59 70%,#ff90a8 100%);}
        .ugp-btn-hide     { background: linear-gradient(90deg,#ffd35c 60%,#ffe08a 100%); color: #23243a;}
        .ugp-btn-close    { background: linear-gradient(90deg,#23243a,#45455b 100%);}
        .ugp-btn:disabled { filter: grayscale(1) brightness(0.8);}
        .ugp-toast {
          position: fixed; bottom: 36px; left: 50%; transform: translateX(-50%);
          background: #22244b;
          color: #fff; font-size: 17px;
          padding: 13px 28px; border-radius: 24px;
          box-shadow: 0 4px 20px #0007;
          z-index: 1000001;
          opacity: 0; pointer-events: none;
          transition: opacity 0.3s;
        }
        .ugp-toast.show { opacity: 1; }
        /* Server Modal styles */
        .ugp-server-modal-bg {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(24,22,45,0.97);
          z-index: 1000001;
          display: none; align-items: center; justify-content: center;
        }
        .ugp-server-modal {
          background: linear-gradient(135deg, #1a1a2e 70%, #a400ff 100%);
          border-radius: 18px;
          box-shadow: 0 8px 22px #000b, 0 0 0 2px #00ffe7aa inset;
          padding: 28px 18px 20px 18px; min-width: 240px; max-width: 92vw;
          display: flex; flex-direction: column; align-items: center;
          border: 2px solid #00ffe7;
          color: #fff;
        }
        .ugp-server-title {
          font-size: 19px;
          font-family: 'Montserrat', Arial, sans-serif;
          font-weight: bold;
          background: linear-gradient(90deg, #60eaff, #a400ff 80%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 14px;
        }
        .ugp-server-tip {
          margin-bottom: 16px;
          color: #fff;
          font-size: 16px;
          text-align:center;
        }
        .ugp-server-btns {
          width: 100%; display: flex; flex-wrap: wrap; justify-content: center; gap: 13px 13px; margin-bottom: 18px;
        }
        .ugp-server-btn {
          width: 110px;
          margin: 0; padding: 13px 0;
          border-radius: 10px; border: 0;
          font-size: 18px; font-weight: bold; font-family: 'Montserrat', Arial, sans-serif;
          background: linear-gradient(90deg,#23243a 70%,#a400ff 100%);
          color: #00ffe7; box-shadow: 0 2px 10px #00ffe766;
          text-align: center; letter-spacing: 1px; cursor: pointer;
          border: 2px solid #00ffe7;
          transition: all 0.22s;
        }
        .ugp-server-btn.selected, .ugp-server-btn:hover {
          background: linear-gradient(90deg,#a400ff 10%,#00ffe7 90%);
          color: #fff; border: 2px solid #a400ff;
          transform: translateY(-2px);
        }
        .ugp-server-cancel-btn {
          margin-top: 10px;
          background: #a400ff;
          color: #fff;
          font-weight: bold;
          font-size: 17px;
          padding: 11px 30px;
          border-radius: 9px;
          border: 2px solid #00ffe7;
          letter-spacing: 1px;
          box-shadow: 0 2px 10px #a400ff77;
          transition: all 0.22s;
          cursor: pointer;
        }
        .ugp-server-cancel-btn:hover {
          background: #ff487a;
          border-color: #fff;
        }
        @media (max-width: 500px) {
          .ugp-flat-modal {
            width: 98vw !important;
            height: auto !important;
            min-width: unset !important;
            padding: 18px 2vw 18px 2vw !important;
          }
          .ugp-input { font-size: 15px; padding: 11px 10px;}
          .ugp-btn { font-size: 15px; padding: 12px 0;}
        }
      </style>
      <div class="ugp-flat-bubble" id="ugp-bubble" title="UGPHONE VIP TOOL"></div>
      <div class="ugp-flat-modal-bg" id="ugp-modal-bg">
        <div class="ugp-flat-modal">
          <div class="ugp-title">UGPHONE VIP TOOL</div>
          <div class="ugp-input-wrap">
            <textarea class="ugp-input" id="ugp-input" rows="3" placeholder="Dán localStorage JSON hoặc mã token"></textarea>
          </div>
          <div class="ugp-btn-row">
            <button class="ugp-btn ugp-btn-login" id="ugp-login">Đăng Nhập</button>
            <button class="ugp-btn ugp-btn-auto" id="ugp-auto">${autoBtnText}</button>
          </div>
          <div class="ugp-btn-row ugp-bottom">
            <button class="ugp-btn ugp-btn-copy" id="ugp-copy">Sao Chép</button>
            <button class="ugp-btn ugp-btn-logout" id="ugp-logout">Đăng Xuất</button>
            <button class="ugp-btn ugp-btn-hide" id="ugp-hide">Hide Menu</button>
            <button class="ugp-btn ugp-btn-close" id="ugp-close">Đóng</button>
          </div>
        </div>
      </div>
      <div class="ugp-toast" id="ugp-toast"></div>
      <div class="ugp-server-modal-bg" id="ugp-server-modal">
        <div class="ugp-server-modal">
          <div class="ugp-server-title">CHỌN SERVER</div>
          <div class="ugp-server-tip">Vui lòng chọn server muốn mua máy.</div>
          <div class="ugp-server-btns" id="ugp-server-btns"></div>
          <button class="ugp-server-cancel-btn" id="ugp-server-cancel-btn">Hủy</button>
        </div>
      </div>
    `;

    // Elements
    const bubble   = shadow.getElementById('ugp-bubble');
    const modalBg  = shadow.getElementById('ugp-modal-bg');
    const input    = shadow.getElementById('ugp-input');
    const btnLogin = shadow.getElementById('ugp-login');
    const btnAuto  = shadow.getElementById('ugp-auto');
    const btnCopy  = shadow.getElementById('ugp-copy');
    const btnLogout= shadow.getElementById('ugp-logout');
    const btnHide  = shadow.getElementById('ugp-hide');
    const btnClose = shadow.getElementById('ugp-close');
    const toast    = shadow.getElementById('ugp-toast');
    const serverModalBg = shadow.getElementById('ugp-server-modal');
    const serverBtnsWrap= shadow.getElementById('ugp-server-btns');
    const serverCancelBtn = shadow.getElementById('ugp-server-cancel-btn');

    function showToast(msg, dur=1800) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(()=>toast.classList.remove('show'), dur);
    }

    bubble.onclick = () => { modalBg.style.display = "flex"; };
    btnClose.onclick = () => { modalBg.style.display = "none"; };
    btnHide.onclick = () => {
      modalBg.style.display = "none";
      bubble.style.display = "none";
      showToast('Đã ẩn menu, tải lại trang để hiện lại!');
    };

    btnLogin.onclick = () => {
      const text = input.value.trim();
      if (!text) return showToast('Vui lòng nhập JSON hoặc token');
      let obj;
      try { obj = JSON.parse(text); }
      catch { showToast('JSON không hợp lệ'); return; }
      Object.entries(obj).forEach(([k,v]) => localStorage.setItem(k, typeof v==='object'?JSON.stringify(v):String(v)));
      showToast('Import thành công! Đang tải lại...');
      setTimeout(()=>location.reload(), 850);
    };

    btnCopy.onclick = () => {
      const data = {};
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i); data[k]=localStorage.getItem(k);
      }
      const json = JSON.stringify(data,null,2);
      (navigator.clipboard?.writeText?
        navigator.clipboard.writeText(json):
        new Promise((res,rej)=>{
          const ta=document.createElement('textarea');
          ta.value=json;document.body.appendChild(ta);
          ta.select();try{document.execCommand('copy');res();}catch(e){rej(e);}
          document.body.removeChild(ta);
        })
      ).then(()=>showToast('Đã sao chép localStorage!')).catch(()=>showToast('Sao chép thất bại!'));
    };

    btnLogout.onclick = () => {
      localStorage.clear();
      showToast('Đã đăng xuất! Đang tải lại...');
      setTimeout(()=>location.reload(), 850);
    };

    btnAuto.onclick = () => {
      btnAuto.disabled = true;
      serverBtnsWrap.innerHTML = "";
      serverOptions.forEach(s => {
        const btn = document.createElement("button");
        btn.className = "ugp-server-btn";
        btn.textContent = s.label;
        btn.onclick = async () => {
          serverModalBg.style.display = "none";
          showToast("Đang tiến hành mua máy server " + s.label + " ...");
          const ugphoneId = localStorage.getItem('UGPHONE-ID');
          const ugphoneToken = localStorage.getItem('UGPHONE-Token');
          if (!ugphoneId || !ugphoneToken) {
            showToast("Vui lòng đăng nhập UGPHONE trước!");
            btnAuto.disabled = false;
            return;
          }
          try {
            const res = await fetch('https://api.nikata.fun/buy_device_ugphone', {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: "d1ad5e85be7b1fab94fd15c9102a69dd827c02c7fb434e",
                ugphone_id: ugphoneId,
                ugphone_token: ugphoneToken,
                server: s.value
              })
            });
            const result = await res.json();
            if (result && result.message) {
              showToast(result.message);
              if (result.message.includes("thành công")) {
                setTimeout(()=>location.reload(), 1700);
              }
            } else {
              showToast("Lỗi kết nối API!");
            }
          } catch(e) {
            showToast("Lỗi kết nối tới API: " + e.message);
          }
          btnAuto.disabled = false;
        };
        serverBtnsWrap.appendChild(btn);
      });
      serverModalBg.style.display = "flex";
      btnAuto.disabled = false;
    };
    serverCancelBtn.onclick = () => { serverModalBg.style.display = "none"; };

    modalBg.onclick = (e) => { if (e.target === modalBg) modalBg.style.display = "none"; };
    serverModalBg.onclick = (e) => { if (e.target === serverModalBg) serverModalBg.style.display = "none"; };

    bubble.style.display = "flex";
})();