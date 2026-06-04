// 🔐 アカウント情報初期化
let savedId = localStorage.getItem('auth_id') || 'admin';
let savedPass = localStorage.getItem('auth_pass') || 'admin';

const BASE_PRICES = {
    60: 10000, 75: 13000, 90: 15000, 120: 21000, 150: 27000,
    180: 33000, 240: 45000, 300: 57000, 360: 69000
};
const EXTENSION_PRICES = {};
for (let i = 0; i <= 600; i += 30) { EXTENSION_PRICES[i] = (i / 30) * 6000; }

const OPTIONS_LIST = ["ピンクローター", "バイブ挿入", "電マ", "飛びっこ", "即尺", "ごっくん", "顔射", "オナニー鑑賞", "聖水", "パンスト破り", "AF", "3P", "レズ3P", "逆3P", "膝枕耳かき", "ノーパン・ノーブラ"];
const MEDIA_MAPPING = { "シティヘヴン": "ヘヴン", "ぴゅあらば": "ぴゅあ", "デリヘルタウン": "タウン", "口コミ情報局": "口コミ", "風俗じゃぱん": "風じゃ", "デリヘルじゃぱん": "デリじゃ", "HP": "HP", "その他": "その他" };
const HOTEL_ABBREV_MAPPING = { "ステラ": "S", "AI": "A", "おしゃべりダック": "お", "リーベ": "リ", "リンド": "L", "その他": "" };
const DEFAULT_GIRLS = ["るな","あいな","ほまれ","ちずる","ふみか","みれい","かほ","そら","めい","なな","りょうこ","いずみ","けい","まりえ","かおり","おと","なぎさ","みどり","さなえ","せいな","かなみ","れおな","せつな","かえで","みなみ","さくら","ありす","えりか","すい","りさ","すみれ","らん","かなこ","わかな","りりこ","すずな","ゆい","みお","みちる","としえ","ゆうか","じゅり","わか","みやび","かなえ","ぼたん","ひとみ","あげは","あおい","さよこ","なつめ","のぞみ","ひより","かすみ","ゆずは","まいか","れい","ほたる","じゅんこ","ゆりあ"];

let girlsData = [];
let allReservations = [];
try { allReservations = JSON.parse(localStorage.getItem('reservations_list')) || []; } catch(e) { allReservations = []; }

document.addEventListener('DOMContentLoaded', () => {
    initGirlsData();
    initFormSelects();
    renderGirls();
    updateSummary();

    document.getElementById('reserve-date').value = new Date().toISOString().split('T')[0];

    // イベントリスナー
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('btn-emergency-reset').addEventListener('click', handleEmergencyReset);
    document.getElementById('btn-update-auth').addEventListener('click', handleAuthUpdate);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    
    // 転送データのチェックを最優先 (ログイン状態を判定)
    if (!checkUrlForTransfer()) {
        checkAuth(); // 転送データがない場合のみ通常ログインチェック
    }

    // 計算・LINE連動
    const recalcEvents = ['course-time', 'extension-time', 'transport-fee', 'nomination-class', 'meeting-place-select', 'hotel-select', 'customer-class'];
    recalcEvents.forEach(id => document.getElementById(id).addEventListener('change', () => {
        calculateTotalPrice(); updateLineMessagePreview();
        if(id === 'customer-class') toggleMediaVisibility();
        if(id === 'meeting-place-select') toggleHotelVisibility();
    }));
    const textEvents = ['start-time', 'customer-name', 'delivery-details', 'hotel-room', 'prev-visit', 'media-select', 'phone-number'];
    textEvents.forEach(id => document.getElementById(id).addEventListener('input', updateLineMessagePreview));
    document.getElementById('options-container').addEventListener('change', updateLineMessagePreview);

    document.getElementById('add-girl-btn').addEventListener('click', addNewGirl);
    document.getElementById('btn-copy-line').addEventListener('click', copyLineMessage);
    document.getElementById('reservation-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('btn-export-code').addEventListener('click', exportTransferData);
    document.getElementById('btn-import-code').addEventListener('click', handleImportClick);

    calculateTotalPrice();
    toggleMediaVisibility();
    toggleHotelVisibility();
    updateLineMessagePreview();
});

// --- 🔐 認証 ---
function checkAuth() {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-wrapper').classList.remove('hidden');
    }
}
function handleLogin(e) {
    e.preventDefault();
    const inputId = document.getElementById('login-id').value.trim();
    const inputPass = document.getElementById('login-pass').value.trim();
    if (inputId === savedId && inputPass === savedPass) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.reload();
    } else { alert("IDまたはパスワードが間違っています。"); }
}

// --- 初期化 ---
function initFormSelects() {
    // 開始時刻 9:30～30:00 (10分単位)
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
    // ... その他は前回の記述と同様 ...
    const courseSelect = document.getElementById('course-time');
    Object.keys(BASE_PRICES).forEach(mins => courseSelect.add(new Option(`${mins}分 (${BASE_PRICES[mins].toLocaleString()}円)`, mins)));
    const extSelect = document.getElementById('extension-time');
    Object.keys(EXTENSION_PRICES).forEach(mins => {
        let label = mins == 0 ? "なし" : `+${mins}分 (+${EXTENSION_PRICES[mins].toLocaleString()}円)`;
        extSelect.add(new Option(label, mins));
    });
    const transSelect = document.getElementById('transport-fee');
    transSelect.add(new Option("なし (0円)", 0));
    for (let f = 1000; f <= 15000; f += 1000) transSelect.add(new Option(`${f.toLocaleString()}円`, f));
    const optContainer = document.getElementById('options-container');
    OPTIONS_LIST.forEach(op => {
        let lbl = document.createElement('label');
        lbl.innerHTML = `<input type="checkbox" class="op-checkbox" value="${op}"> ${op}`;
        optContainer.appendChild(lbl);
    });
}

// --- 転送関連 ---
function checkUrlForTransfer() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('tdata');
    if (code) {
        sessionStorage.setItem('isLoggedIn', 'true'); // ログイン省略
        importTransferData(code);
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
    }
    return false;
}

function importTransferData(code) {
    try {
        const data = JSON.parse(decodeURIComponent(atob(code)));
        if(data.d) document.getElementById('reserve-date').value = data.d;
        if(data.nc) document.getElementById('nomination-class').value = data.nc;
        if(data.st) document.getElementById('start-time').value = data.st; // 開始時刻の反映
        if(data.cn) document.getElementById('customer-name').value = data.cn;
        // ... その他すべての項目を反映 ...
        if(data.g) document.getElementById('girl-select').value = data.g;
        if(data.ct) document.getElementById('course-time').value = data.ct;
        if(data.et) document.getElementById('extension-time').value = data.et;
        if(data.tf) document.getElementById('transport-fee').value = data.tf;
        if(data.pr) document.getElementById('total-price').value = data.pr;
        if(data.gs) document.getElementById('guide-status').value = data.gs;
        if(data.hs) document.getElementById('hotel-select').value = data.hs;
        if(data.hr) document.getElementById('hotel-room').value = data.hr;
        if(data.pn) document.getElementById('phone-number').value = data.pn;
        if(data.mp) document.getElementById('meeting-place-select').value = data.mp;
        if(data.dd) document.getElementById('delivery-details').value = data.dd;
        if(data.pv) document.getElementById('prev-visit').value = data.pv;
        if(data.ms) document.getElementById('media-select').value = data.ms;

        toggleMediaVisibility();
        toggleHotelVisibility();
        calculateTotalPrice();
        updateLineMessagePreview();
    } catch(e) { console.error("データ読み込み失敗", e); }
}

// ... 必要な関数 (renderGirls, calculateTotalPrice, etc) は前回のまま維持してください ...
