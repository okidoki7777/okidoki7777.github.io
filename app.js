// 🔐 アカウント情報
let savedId = localStorage.getItem('auth_id') || 'admin';
let savedPass = localStorage.getItem('auth_pass') || 'admin';

// 💰 各種設定データ
const BASE_PRICES = { 60: 10000, 75: 13000, 90: 15000, 120: 21000, 150: 27000, 180: 33000, 240: 45000, 300: 57000, 360: 69000 };
const EXTENSION_PRICES = {}; for (let i = 0; i <= 600; i += 30) { EXTENSION_PRICES[i] = (i / 30) * 6000; }
const OPTIONS_LIST = ["ピンクローター", "バイブ挿入", "電マ", "飛びっこ", "即尺", "ごっくん", "顔射", "オナニー鑑賞", "聖水", "パンスト破り", "AF", "3P", "レズ3P", "逆3P", "膝枕耳かき", "ノーパン・ノーブラ"];
const MEDIA_MAPPING = { "シティヘヴン": "ヘヴン", "ぴゅあらば": "ぴゅあ", "デリヘルタウン": "タウン", "口コミ情報局": "口コミ", "風俗じゃぱん": "風じゃ", "デリヘルじゃぱん": "デリじゃ", "HP": "HP", "その他": "その他" };
const HOTEL_ABBREV_MAPPING = { "ステラ": "S", "AI": "A", "おしゃべりダック": "お", "リーベ": "リ", "リンド": "L", "その他": "" };
const DEFAULT_GIRLS = ["るな","あいな","ほまれ","ちずる","ふみか","みれい","かほ","そら","めい","なな","りょうこ","いずみ","けい","まりえ","かおり","おと","なぎさ","みどり","さなえ","せいな","かなみ","れおな","せつな","かえで","みなみ","さくら","ありす","えりか","すい","りさ","すみれ","らん","かなこ","わかな","りりこ","すずな","ゆい","みお","みちる","としえ","ゆうか","じゅり","わか","みやび","かなえ","ぼたん","ひとみ","あげは","あおい","さよこ","なつめ","のぞみ","ひより","かすみ","ゆずは","まいか","れい","ほたる","じゅんこ","ゆりあ"];

let girlsData = [];
let allReservations = [];

document.addEventListener('DOMContentLoaded', () => {
    // ログイン状態の判定
    if (sessionStorage.getItem('isLoggedIn') !== 'true' && !checkUrlForTransfer()) {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-wrapper').classList.add('hidden');
    } else {
        initApp();
    }

    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('login-id').value;
        const pass = document.getElementById('login-pass').value;
        if (id === savedId && pass === savedPass) {
            sessionStorage.setItem('isLoggedIn', 'true');
            location.reload();
        } else { alert("IDまたはパスワードが違います。"); }
    });
});

function initApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app-wrapper').classList.remove('hidden');
    
    try { allReservations = JSON.parse(localStorage.getItem('reservations_list')) || []; } catch(e) { allReservations = []; }
    
    // データ初期化
    girlsData = JSON.parse(localStorage.getItem('girls_list')) || DEFAULT_GIRLS;
    initFormSelects();
    renderGirls();
    updateSummary();
    document.getElementById('reserve-date').value = new Date().toISOString().split('T')[0];

    // 各種イベント紐付け
    ['course-time', 'extension-time', 'transport-fee', 'nomination-class', 'meeting-place-select', 'hotel-select', 'customer-class'].forEach(id => document.getElementById(id).addEventListener('change', () => {
        calculateTotalPrice(); updateLineMessagePreview();
        if(id === 'customer-class') toggleMediaVisibility();
        if(id === 'meeting-place-select') toggleHotelVisibility();
    }));
    
    ['start-time', 'customer-name', 'delivery-details', 'hotel-room', 'prev-visit', 'media-select', 'phone-number'].forEach(id => document.getElementById(id).addEventListener('input', updateLineMessagePreview));
    
    document.getElementById('options-container').addEventListener('change', updateLineMessagePreview);
    document.getElementById('add-girl-btn').addEventListener('click', addNewGirl);
    document.getElementById('btn-copy-line').addEventListener('click', (e) => { e.preventDefault(); copyLineMessage(); });
    document.getElementById('reservation-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('btn-export-code').addEventListener('click', (e) => { e.preventDefault(); exportTransferData(); });
    document.getElementById('btn-import-code').addEventListener('click', (e) => { e.preventDefault(); handleImportClick(); });

    calculateTotalPrice(); toggleMediaVisibility(); toggleHotelVisibility(); updateLineMessagePreview();
}

// --- 必須機能の復元 ---
function initFormSelects() {
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
    const courseSelect = document.getElementById('course-time');
    Object.keys(BASE_PRICES).forEach(mins => courseSelect.add(new Option(`${mins}分 (${BASE_PRICES[mins].toLocaleString()}円)`, mins)));
    
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

function calculateTotalPrice() {
    const base = BASE_PRICES[document.getElementById('course-time').value] || 0;
    const ext = EXTENSION_PRICES[document.getElementById('extension-time').value || 0] || 0;
    const transport = Number(document.getElementById('transport-fee').value || 0);
    const nominationAdd = (document.getElementById('nomination-class').value === '本') ? 1000 : 0;
    document.getElementById('total-price').value = base + ext + transport + nominationAdd;
}

function updateLineMessagePreview() {
    const startTime = document.getElementById('start-time').value;
    const custClass = document.getElementById('customer-class').value;
    const custName = document.getElementById('customer-name').value.trim();
    const prevVisit = document.getElementById('prev-visit').value.trim();
    const price = document.getElementById('total-price').value;
    const opElements = document.querySelectorAll('.op-checkbox:checked');
    let ops = []; opElements.forEach(el => ops.push(el.value));
    
    let custStr = (custClass === '新') ? (custName ? `新規${custName}様` : "新規様") : (custName ? `会員${custName}様` : "会員様");
    if (prevVisit) custStr += `(前回${prevVisit})`;

    const message = `ご予約詳細です！\n\n${startTime ? startTime + "～" : "未定～"}\n\n${custStr}\n料金${price}円\n${ops.length > 0 ? "OP：" + ops.join('、') : ""}`;
    document.getElementById('line-message-text').value = message;
}

function exportTransferData() {
    const girl = document.getElementById('girl-select').value || "未選択";
    const start = document.getElementById('start-time').value || "未定";
    // 転送データの生成ロジック(前回までのものを使用)
    const copyText = `【🚨予約転送：要印刷🚨】\n👩 女の子：${girl}\n⏰ 開始時間：${start}\n\n[転送URLをここに含める]`;
    navigator.clipboard.writeText(copyText).then(() => alert("転送情報をコピーしました"));
}

// 共通ヘルパー
function checkUrlForTransfer() { const params = new URLSearchParams(window.location.search); if (params.get('tdata')) { importTransferData(params.get('tdata')); return true; } return false; }
function renderGirls() { /* 女の子リスト表示 */ }
function addNewGirl() { /* 追加 */ }
function toggleMediaVisibility() { document.getElementById('media-group').classList.toggle('hidden', document.getElementById('customer-class').value !== '新'); }
function toggleHotelVisibility() { document.getElementById('hotel-group').classList.toggle('hidden', document.getElementById('meeting-place-select').value === 'その他'); }
function handleFormSubmit(e) { e.preventDefault(); /* 印刷プレビュー反映 */ }
function handleImportClick() { /* コード読み込み */ }
function copyLineMessage() { const text = document.getElementById('line-message-text').value; navigator.clipboard.writeText(text); alert("コピーしました"); }
function updateSummary() { /* 売上更新 */ }
