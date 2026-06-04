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
    // 1. 初期設定・リスト読み込み
    initGirlsData();
    initFormSelects();
    renderGirls();
    updateSummary();
    document.getElementById('reserve-date').value = new Date().toISOString().split('T')[0];

    // 2. ログイン判定 (転送がある場合は自動ログイン)
    if (checkUrlForTransfer()) {
        sessionStorage.setItem('isLoggedIn', 'true');
        showApp();
    } else {
        checkAuth();
    }

    // イベント設定
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    
    // 計算系イベント
    ['course-time', 'extension-time', 'transport-fee', 'nomination-class', 'meeting-place-select', 'hotel-select', 'customer-class'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', () => {
            calculateTotalPrice(); updateLineMessagePreview();
            if(id === 'customer-class') toggleMediaVisibility();
            if(id === 'meeting-place-select') toggleHotelVisibility();
        });
    });
    
    // 入力系イベント
    ['start-time', 'customer-name', 'delivery-details', 'hotel-room', 'prev-visit', 'media-select', 'phone-number'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', updateLineMessagePreview);
    });

    document.getElementById('options-container').addEventListener('change', updateLineMessagePreview);
    document.getElementById('add-girl-btn').addEventListener('click', addNewGirl);
    document.getElementById('btn-copy-line').addEventListener('click', copyLineMessage);
    document.getElementById('reservation-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('btn-export-code').addEventListener('click', exportTransferData);
    document.getElementById('btn-import-code').addEventListener('click', handleImportClick);

    // 初期状態更新
    calculateTotalPrice(); toggleMediaVisibility(); toggleHotelVisibility(); updateLineMessagePreview();
});

// --- 認証機能 ---
function checkAuth() {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        showApp();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-wrapper').classList.add('hidden');
    }
}

function handleLogin(e) {
    e.preventDefault();
    const id = document.getElementById('login-id').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    if (id === savedId && pass === savedPass) {
        sessionStorage.setItem('isLoggedIn', 'true');
        showApp();
    } else {
        alert("IDまたはパスワードが間違っています。");
    }
}

function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-wrapper').classList.remove('hidden');
}

function handleLogout() {
    sessionStorage.removeItem('isLoggedIn');
    location.reload();
}

// --- 転送機能 (ログイン省略) ---
function checkUrlForTransfer() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('tdata');
    if (code) {
        importTransferData(code);
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
    }
    return false;
}

// --- 以前の機能をそのまま維持 ---
function initGirlsData() {
    girlsData = JSON.parse(localStorage.getItem('girls_list')) || DEFAULT_GIRLS;
    girlsData.sort((a, b) => a.localeCompare(b, 'ja'));
}

function initFormSelects() {
    // 9:30～30:00 (10分単位)
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
    // コース・延長などは省略... (前回と同様のロジックがここに入ります)
    const courseSelect = document.getElementById('course-time');
    Object.keys(BASE_PRICES).forEach(mins => courseSelect.add(new Option(`${mins}分 (${BASE_PRICES[mins].toLocaleString()}円)`, mins)));
    const extSelect = document.getElementById('extension-time');
    Object.keys(EXTENSION_PRICES).forEach(mins => extSelect.add(new Option(mins == 0 ? "なし" : `+${mins}分`, mins)));
}

function exportTransferData() {
    // 視認性向上版
    const girl = document.getElementById('girl-select').value || "未選択";
    const start = document.getElementById('start-time').value || "未定";
    // データ作成処理...
    const copyText = `【🚨予約転送：要印刷🚨】\n👩 女の子：${girl}\n⏰ 開始時間：${start}\n\n[転送URL]...`;
    navigator.clipboard.writeText(copyText).then(() => alert("コピーしました"));
}

function updateLineMessagePreview() {
    // 前回の「前回」欄出力ロジックをここに維持
    // ...
}

// 他の関数(calculateTotalPrice, renderGirls, etc)も同様に維持してください
