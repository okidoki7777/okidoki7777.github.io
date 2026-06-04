// 🔐 アカウント情報
let savedId = localStorage.getItem('auth_id') || 'admin';
let savedPass = localStorage.getItem('auth_pass') || 'admin';

// 💰 設定データ
const BASE_PRICES = { 60: 10000, 75: 13000, 90: 15000, 120: 21000, 150: 27000, 180: 33000, 240: 45000, 300: 57000, 360: 69000 };
const EXTENSION_PRICES = {}; for (let i = 0; i <= 600; i += 30) { EXTENSION_PRICES[i] = (i / 30) * 6000; }
const OPTIONS_LIST = ["ピンクローター", "バイブ挿入", "電マ", "飛びっこ", "即尺", "ごっくん", "顔射", "オナニー鑑賞", "聖水", "パンスト破り", "AF", "3P", "レズ3P", "逆3P", "膝枕耳かき", "ノーパン・ノーブラ"];
const MEDIA_MAPPING = { "シティヘヴン": "ヘヴン", "ぴゅあらば": "ぴゅあ", "デリヘルタウン": "タウン", "口コミ情報局": "口コミ", "風俗じゃぱん": "風じゃ", "デリヘルじゃぱん": "デリじゃ", "HP": "HP", "その他": "その他" };
const HOTEL_ABBREV_MAPPING = { "ステラ": "S", "AI": "A", "おしゃべりダック": "お", "リーベ": "リ", "リンド": "L", "その他": "" };
const DEFAULT_GIRLS = ["るな","あいな","ほまれ","ちずる","ふみか","みれい","かほ","そら","めい","なな","りょうこ","いずみ","けい","まりえ","かおり","おと","なぎさ","みどり","さなえ","せいな","かなみ","れおな","せつな","かえで","みなみ","さくら","ありす","えりか","すい","りさ","すみれ","らん","かなこ","わかな","りりこ","すずな","ゆい","みお","みちる","としえ","ゆうか","じゅり","わか","みやび","かなえ","ぼたん","ひとみ","あげは","あおい","さよこ","なつめ","のぞみ","ひより","かすみ","ゆずは","まいか","れい","ほたる","じゅんこ","ゆりあ"];

let girlsData = [];
let allReservations = [];
try { allReservations = JSON.parse(localStorage.getItem('reservations_list')) || []; } catch(e) { allReservations = []; }

document.addEventListener('DOMContentLoaded', () => {
    // 1. 緊急ログインボタンの設置
    const loginForm = document.getElementById('login-form');
    if (loginForm && !document.getElementById('btn-emergency-login')) {
        const emergencyBtn = document.createElement('button');
        emergencyBtn.id = 'btn-emergency-login'; emergencyBtn.type = 'button'; emergencyBtn.className = 'btn btn-danger';
        emergencyBtn.style.cssText = 'width:100%; margin-top:15px; background:#ff5e7e; color:white; border:none; padding:10px; border-radius:5px;';
        emergencyBtn.textContent = '🔓 緊急ログイン (admin/admin)';
        emergencyBtn.onclick = () => { sessionStorage.setItem('isLoggedIn', 'true'); location.reload(); };
        loginForm.appendChild(emergencyBtn);
    }

    // 2. 初期化実行
    initGirlsData();
    initFormSelects();
    renderGirls();
    updateSummary();
    document.getElementById('reserve-date').value = new Date().toISOString().split('T')[0];

    // 3. 転送判定 or 通常ログイン判定
    if (checkUrlForTransfer()) {
        sessionStorage.setItem('isLoggedIn', 'true');
    } else {
        checkAuth();
    }

    // イベントリスナー設定
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    
    // 計算イベント
    ['course-time', 'extension-time', 'transport-fee', 'nomination-class', 'meeting-place-select', 'hotel-select', 'customer-class'].forEach(id => document.getElementById(id).addEventListener('change', () => {
        calculateTotalPrice(); updateLineMessagePreview();
        if(id === 'customer-class') toggleMediaVisibility();
        if(id === 'meeting-place-select') toggleHotelVisibility();
    }));
    ['start-time', 'customer-name', 'delivery-details', 'hotel-room', 'prev-visit', 'media-select', 'phone-number'].forEach(id => document.getElementById(id).addEventListener('input', updateLineMessagePreview));
    document.getElementById('options-container').addEventListener('change', updateLineMessagePreview);

    document.getElementById('add-girl-btn').addEventListener('click', addNewGirl);
    document.getElementById('btn-copy-line').addEventListener('click', copyLineMessage);
    document.getElementById('reservation-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('btn-export-code').addEventListener('click', exportTransferData);
    document.getElementById('btn-import-code').addEventListener('click', handleImportClick);

    // 初期表示
    calculateTotalPrice(); toggleMediaVisibility(); toggleHotelVisibility(); updateLineMessagePreview();
});

// --- 主要関数 ---
function initGirlsData() {
    if (localStorage.getItem('app_version') !== 'v6_3') {
        girlsData = DEFAULT_GIRLS.sort((a, b) => a.localeCompare(b, 'ja'));
        localStorage.setItem('girls_list', JSON.stringify(girlsData));
        localStorage.setItem('app_version', 'v6_3');
    } else {
        girlsData = JSON.parse(localStorage.getItem('girls_list')) || DEFAULT_GIRLS;
    }
}

function initFormSelects() {
    const courseSelect = document.getElementById('course-time');
    Object.keys(BASE_PRICES).forEach(mins => courseSelect.add(new Option(`${mins}分 (${BASE_PRICES[mins].toLocaleString()}円)`, mins)));
    
    const extSelect = document.getElementById('extension-time');
    Object.keys(EXTENSION_PRICES).forEach(mins => extSelect.add(new Option(mins == 0 ? "なし" : `+${mins}分`, mins)));

    const transSelect = document.getElementById('transport-fee');
    transSelect.add(new Option("なし (0円)", 0));
    for (let f = 1000; f <= 15000; f += 1000) transSelect.add(new Option(`${f.toLocaleString()}円`, f));

    // 🕒 開始時刻 9:30～30:00 (10分単位)
    const timeSelect = document.getElementById('start-time');
    timeSelect.innerHTML = '<option value="">-- 未選択 --</option>';
    for (let h = 9; h <= 30; h++) {
        for (let m = 0; m < 60; m += 10) {
            if (h === 9 && m < 30) continue;
            if (h === 30 && m > 0) break;
            let timeStr = `${h}:${String(m).padStart(2, '0')}`;
            timeSelect.add(new Option(timeStr, timeStr));
        }
    }
    
    const optContainer = document.getElementById('options-container');
    OPTIONS_LIST.forEach(op => {
        let lbl = document.createElement('label');
        lbl.innerHTML = `<input type="checkbox" class="op-checkbox" value="${op}"> ${op}`;
        optContainer.appendChild(lbl);
    });
}

function calculateTotalPrice() {
    const base = BASE_PRICES[document.getElementById('course-time').value] || 0;
    const ext = EXTENSION_PRICES[document.getElementById('extension-time').value || 0] || 0;
    const transport = Number(document.getElementById('transport-fee').value || 0);
    const nominationAdd = (document.getElementById('nomination-class').value === '本') ? 1000 : 0;
    document.getElementById('total-price').value = base + ext + transport + nominationAdd;
}

function updateLineMessagePreview() {
    const startTime = document.getElementById('start-time').value;
    const girl = document.getElementById('girl-select').value || "未選択";
    const custClass = document.getElementById('customer-class').value;
    const custName = document.getElementById('customer-name').value.trim();
    const prevVisit = document.getElementById('prev-visit').value.trim();
    const custStr = (custClass === '新') ? (custName ? `新規${custName}様` : "新規様") : (custName ? `会員${custName}様` : "会員様");
    const custPrev = prevVisit ? `${custStr}(前回${prevVisit})` : custStr;
    
    // 省略：以前のLINE生成ロジックと同じ内容で構成
    const message = `ご予約詳細です！\n\n${startTime ? startTime + "～" : "未定～"}\n\n女の子：${girl}\n${custPrev}\n... (以下略)`;
    document.getElementById('line-message-text').value = message;
}

function exportTransferData() {
    // ⚠️ 転送時の視認性向上メッセージ
    const girl = document.getElementById('girl-select').value || "未選択";
    const start = document.getElementById('start-time').value || "未定";
    // ...データ生成...
    const copyText = `【🚨予約転送：要印刷🚨】\n👩 女の子：${girl}\n⏰ 開始時間：${start}\n\n[URL]...`;
    navigator.clipboard.writeText(copyText).then(() => alert("転送情報をコピーしました"));
}

// 他の共通関数 (checkAuth, renderGirls, etc) は維持してください
function checkAuth() { if (sessionStorage.getItem('isLoggedIn') !== 'true') { document.getElementById('login-screen').classList.remove('hidden'); } else { document.getElementById('app-wrapper').classList.remove('hidden'); } }
function handleLogin(e) { e.preventDefault(); /* ... */ }
function handleLogout() { sessionStorage.removeItem('isLoggedIn'); location.reload(); }
function checkUrlForTransfer() { /* ... */ return true; }
function importTransferData(code) { /* ... */ }
