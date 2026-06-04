// 🔐 アカウント情報初期化
let savedId = localStorage.getItem('auth_id') || 'admin';
let savedPass = localStorage.getItem('auth_pass') || 'admin';

const BASE_PRICES = {
    60: 10000, 75: 13000, 90: 15000, 120: 21000, 150: 27000,
    180: 33000, 240: 45000, 300: 57000, 360: 69000
};

// 延長分数上限600分 (30分刻み・6000円単位)
const EXTENSION_PRICES = {};
for (let i = 0; i <= 600; i += 30) {
    EXTENSION_PRICES[i] = (i / 30) * 6000;
}

const OPTIONS_LIST = ["ピンクローター", "バイブ挿入", "電マ", "飛びっこ", "即尺", "ごっくん", "顔射", "オナニー鑑賞", "聖水", "パンスト破り", "AF", "3P", "レズ3P", "逆3P", "膝枕耳かき", "ノーパン・ノーブラ"];
const MEDIA_MAPPING = { "シティヘヴン": "ヘヴン", "ぴゅあらば": "ぴゅあ", "デリヘルタウン": "タウン", "口コミ情報局": "口コミ", "風俗じゃぱん": "風じゃ", "デリヘルじゃぱん": "デリじゃ", "HP": "HP", "その他": "その他" };
const HOTEL_ABBREV_MAPPING = { "ステラ": "S", "AI": "A", "おしゃべりダック": "お", "リーベ": "リ", "リンド": "L", "その他": "" };

const DEFAULT_GIRLS = [
    "るな","あいな","ほまれ","ちずる","ふみか","みれい","かほ","そら","めい","なな",
    "りょうこ","いずみ","けい","まりえ","かおり","おと","なぎさ","みどり","さなえ","せいな",
    "かなみ","れおな","せつな","かえで","みなみ","さくら","ありす","えりか","すい","りさ",
    "すみれ","らん","かなこ","わかな","りりこ","すずな","ゆい","みお","みちる","としえ",
    "ゆうか","じゅり","わか","みやび","かなえ","ぼたん","ひとみ","あげは","あおい","さよこ",
    "なつめ","のぞみ","ひより","かすみ","ゆずは","まいか","れい","ほたる","じゅんこ","ゆりあ"
];

let girlsData = [];
let allReservations = [];

try {
    allReservations = JSON.parse(localStorage.getItem('reservations_list')) || [];
} catch(e) {
    allReservations = [];
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
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
    
    // リアルタイム再計算・LINE文章連動イベントの整理
    const recalcEvents = ['course-time', 'extension-time', 'transport-fee', 'nomination-class', 'meeting-place-select', 'hotel-select', 'customer-class'];
    recalcEvents.forEach(id => document.getElementById(id).addEventListener('change', () => {
        calculateTotalPrice();
        updateLineMessagePreview();
        if(id === 'customer-class') toggleMediaVisibility();
        if(id === 'meeting-place-select') toggleHotelVisibility();
    }));

    const textEvents = ['start-time', 'customer-name', 'delivery-details', 'hotel-room', 'prev-visit', 'media-select'];
    textEvents.forEach(id => document.getElementById(id).addEventListener('input', updateLineMessagePreview));
    document.getElementById('options-container').addEventListener('change', updateLineMessagePreview);

    document.getElementById('add-girl-btn').addEventListener('click', addNewGirl);
    document.getElementById('btn-copy-line').addEventListener('click', copyLineMessage);
    document.getElementById('reservation-form').addEventListener('submit', handleFormSubmit);

    calculateTotalPrice();
    toggleMediaVisibility();
    toggleHotelVisibility();
    updateLineMessagePreview();
});

// --- 🔐 認証関連 ---
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
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-wrapper').classList.remove('hidden');
    } else {
        alert("IDまたはパスワードが間違っています。\n\n大文字・小文字の違いや、文字の最後に空白が入っていないか確認してください。");
    }
}

function handleEmergencyReset() {
    if(confirm("IDとパスワードを初期状態 (admin / admin) にリセットしますか？\n※予約データや女の子リストは消えません。")) {
        localStorage.setItem('auth_id', 'admin');
        localStorage.setItem('auth_pass', 'admin');
        savedId = 'admin'; savedPass = 'admin';
        document.getElementById('login-id').value = '';
        document.getElementById('login-pass').value = '';
        alert("リセットが完了しました。\n\nID: admin\nパスワード: admin\n\nでログインしてください。");
    }
}

function handleAuthUpdate() {
    const newId = document.getElementById('new-auth-id').value.trim();
    const newPass = document.getElementById('new-auth-pass').value.trim();
    if (!newId || !newPass) return alert("新しいIDとパスワードを両方入力してください。");
    if (confirm("変更しますか？")) {
        localStorage.setItem('auth_id', newId); localStorage.setItem('auth_pass', newPass);
        savedId = newId; savedPass = newPass;
        document.getElementById('new-auth-id').value = ''; document.getElementById('new-auth-pass').value = '';
        alert("更新しました！");
    }
}

function handleLogout() {
    if (confirm("ログアウトしますか？")) {
        sessionStorage.removeItem('isLoggedIn');
        document.getElementById('app-wrapper').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('login-id').value = ''; document.getElementById('login-pass').value = '';
    }
}

// --- 初期データ処理 ---
function initGirlsData() {
    if (localStorage.getItem('app_version') !== 'v6_1') {
        girlsData = DEFAULT_GIRLS.sort((a, b) => a.localeCompare(b, 'ja'));
        localStorage.setItem('girls_list', JSON.stringify(girlsData));
        localStorage.setItem('app_version', 'v6_1');
    } else {
        try {
            girlsData = JSON.parse(localStorage.getItem('girls_list')) || [];
        } catch(e) {
            girlsData = DEFAULT_GIRLS;
        }
    }
}

function initFormSelects() {
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

    const timeSelect = document.getElementById('start-time');
    for (let h = 9; h <= 30; h++) {
        for (let m = 0; m < 60; m += 5) {
            if (h === 30 && m > 0) break;
            timeSelect.add(new Option(`${h}:${String(m).padStart(2, '0')}`, `${h}:${String(m).padStart(2, '0')}`));
        }
    }

    const optContainer = document.getElementById('options-container');
    OPTIONS_LIST.forEach(op => {
        let lbl = document.createElement('label');
        lbl.innerHTML = `<input type="checkbox" class="op-checkbox" value="${op}"> ${op}`;
        optContainer.appendChild(lbl);
    });
}

function toggleMediaVisibility() {
    document.getElementById('media-group').classList.toggle('hidden', document.getElementById('customer-class').value !== '新');
}
function toggleHotelVisibility() {
    document.getElementById('hotel-group').classList.toggle('hidden', document.getElementById('meeting-place-select').value === 'その他');
}

function calculateTotalPrice() {
    const base = BASE_PRICES[document.getElementById('course-time').value] || 0;
    const ext = EXTENSION_PRICES[document.getElementById('extension-time').value || 0] || 0;
    const transport = Number(document.getElementById('transport-fee').value || 0);
    const nominationAdd = (document.getElementById('nomination-class').value === '本') ? 1000 : 0;
    document.getElementById('total-price').value = base + ext + transport + nominationAdd;
}

function renderGirls() {
    const listEl = document.getElementById('girl-list');
    const selectEl = document.getElementById('girl-select');
    listEl.innerHTML = ''; selectEl.innerHTML = '<option value="">-- 女の子を選択してください --</option>';

    girlsData.forEach((girl, index) => {
        let li = document.createElement('li');
        li.innerHTML = `<span>${girl}</span><span class="delete-girl" onclick="deleteGirl(${index})">× 削除</span>`;
        listEl.appendChild(li);
        selectEl.add(new Option(girl, girl));
    });
    localStorage.setItem('girls_list', JSON.stringify(girlsData));
}

function addNewGirl() {
    const input = document.getElementById('new-girl-name');
    const name = input.value.trim();
    if (name && !girlsData.includes(name)) {
        girlsData.push(name);
        girlsData.sort((a, b) => a.localeCompare(b, 'ja'));
        input.value = '';
        renderGirls();
    }
}
function deleteGirl(index) {
    if (confirm("削除しますか？")) { girlsData.splice(index, 1); renderGirls(); }
}

function calculateConfirmTime(startTimeStr) {
    let [h, m] = startTimeStr.split(':').map(Number);
    if (h === 9 && m >= 30 && m <= 59) return `(9:00)`;
    return `(${h - 1}:${String(m).padStart(2, '0')})`;
}

function updateSummary() {
    const todayStr = new Date().toISOString().split('T')[0];
    let todayCount = 0, todaySales = 0, totalCount = allReservations.length, totalSales = 0;
    allReservations.forEach(res => {
        totalSales += Number(res.price);
        if (res.date === todayStr) { todayCount++; todaySales += Number(res.price); }
    });
    document.getElementById('today-count').textContent = todayCount;
    document.getElementById('today-sales').textContent = todaySales.toLocaleString();
    document.getElementById('total-count').textContent = totalCount;
    document.getElementById('total-sales').textContent = totalSales.toLocaleString();
}

// 💬 LINE文章の自動生成
function updateLineMessagePreview() {
    const startTime = document.getElementById('start-time').value;
    const meetingPlace = document.getElementById('meeting-place-select').value;
    const deliveryDetails = document.getElementById('delivery-details').value.trim();
    
    const courseMins = Number(document.getElementById('course-time').value);
    const extMins = Number(document.getElementById('extension-time').value || 0);
    const totalMins = courseMins + extMins;

    const nominationClass = document.getElementById('nomination-class').value;
    const custClass = document.getElementById('customer-class').value;
    const custName = document.getElementById('customer-name').value.trim();
    const price = document.getElementById('total-price').value;
    const hotelSelect = document.getElementById('hotel-select').value;
    const hotelRoom = document.getElementById('hotel-room').value.trim();
    const prevVisit = document.getElementById('prev-visit').value.trim();
    
    let selectedOps = [];
    document.querySelectorAll('.op-checkbox:checked').forEach(cb => selectedOps.push(cb.value));

    // 指名区分の生成
    let nomStr = {'F': 'フリー', 'N': 'ネット指名', '本': '本指名'}[nominationClass] || "";
    if (nominationClass === '本' && prevVisit) {
        nomStr += `(前回${prevVisit})`;
    }

    let custStr = (custClass === '新') ? (custName ? `新規${custName}様` : "新規様") : (custName ? `会員${custName}様` : "会員様");

    // 待ち合わせ場所 (「待ち合わせ」の重複を防ぐ)
    let placeLine = "";
    if (meetingPlace !== 'その他') {
        placeLine = meetingPlace.endsWith("待ち合わせ") ? `${meetingPlace}\n` : `${meetingPlace}待ち合わせ\n`;
    }

    // デリ詳細と部屋番号
    let detailLine = deliveryDetails ? `${deliveryDetails}\n` : "";
    let roomLine = hotelRoom ? `${hotelRoom}\n` : "";
    
    // 第1ブロックの結合
    let block1 = (placeLine || detailLine || roomLine) ? `${placeLine}${detailLine}${roomLine}\n` : "\n";

    let opLine = selectedOps.length > 0 ? `OP：${selectedOps.join('、')}\n\n` : "";
    
    // ホテル代の計算とテキスト生成
    let hotelPriceStr = "";
    let hotelLine = "";
    if (hotelSelect && hotelSelect !== 'その他' && meetingPlace !== 'その他') {
        const HOTEL_PRICES = { 60: 2300, 75: 2500, 90: 2600, 120: 2900, 150: 3200, 180: 3500 };
        const hPrice = HOTEL_PRICES[courseMins];
        
        if (hPrice) hotelPriceStr = `(ホテル代${hPrice}円)`;
        
        // 部屋番号が入力されている場合は「ホテル〇〇でお願いします」を非表示にする（二重入力対策）
        if (!hotelRoom) {
            hotelLine += `ホテル${hotelSelect}でお願いします\n`;
        }
        
        // 差額アナウンス
        if (hotelSelect !== 'ステラ') {
            hotelLine += `ホテル代差額分はお客様払いです。\n`;
        }
    }

    const message = `ご予約詳細です！\n\n${startTime}～\n\n${block1}${totalMins}分${nomStr}\n${custStr}\n料金${price}円${hotelPriceStr}\n\n${opLine}${hotelLine}よろしくお願いいたします\n\n担当者：○○`;
    document.getElementById('line-message-text').value = message;
}

function copyLineMessage() {
    const text = document.getElementById('line-message-text').value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => { alert("LINE文章をコピーしました！"); }).catch(err => { alert("コピー失敗: " + err); });
}

function handleFormSubmit(e) {
    e.preventDefault();
    updateLineMessagePreview();

    const dateVal = document.getElementById('reserve-date').value;
    const custClass = document.getElementById('customer-class').value;
    const nominationClass = document.getElementById('nomination-class').value;
    const girl = document.getElementById('girl-select').value;
    const courseMins = document.getElementById('course-time').value;
    const extMins = Number(document.getElementById('extension-time').value || 0);
    const price = document.getElementById('total-price').value;
    const startTime = document.getElementById('start-time').value;
    const custName = document.getElementById('customer-name').value.trim();
    const guideStatus = document.getElementById('guide-status').value;
    const hotelSelect = document.getElementById('hotel-select').value;
    const hotelRoom = document.getElementById('hotel-room').value.trim();
    const phone = document.getElementById('phone-number').value.trim();
    const meetingPlace = document.getElementById('meeting-place-select').value;
    const deliveryDetails = document.getElementById('delivery-details').value.trim();
    const prevVisit = document.getElementById('prev-visit').value.trim();

    let selectedOps = [];
    document.querySelectorAll('.op-checkbox:checked').forEach(cb => selectedOps.push(cb.value));

    let custTypeStr = (custClass === '新') 
        ? `新・${nominationClass}(${MEDIA_MAPPING[document.getElementById('media-select').value] || document.getElementById('media-select').value})`
        : `${custClass}・${nominationClass}`;

    let locationStr = (meetingPlace === 'その他') ? "" : meetingPlace;
    
    let formattedDate = "";
    if (dateVal) {
        const d = new Date(dateVal);
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        formattedDate = `${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`;
    }

    let hotelAbbrev = "";
    if (meetingPlace !== 'その他' && hotelSelect !== 'その他') {
        hotelAbbrev = HOTEL_ABBREV_MAPPING[hotelSelect] || "";
    }

    // 🖨️ レシートプレビュー反映
    document.getElementById('p-date').textContent = formattedDate;
    document.getElementById('p-cust-type').textContent = custTypeStr;
    document.getElementById('p-girl').textContent = girl;
    document.getElementById('p-duration').textContent = extMins > 0 ? `${courseMins}+${extMins}` : `${courseMins}`;
    document.getElementById('p-price').textContent = `${Number(price).toLocaleString()}円`;
    document.getElementById('p-time').textContent = startTime;
    document.getElementById('p-confirm-time').textContent = calculateConfirmTime(startTime);
    document.getElementById('p-cust-name').textContent = custName || "—";
    document.getElementById('p-guide').textContent = guideStatus || "未選択";
    
    // ホテル略称と部屋番号（文字数による自動サイズ調整）
    document.getElementById('p-hotel-name').textContent = hotelAbbrev;
    const pRoomEl = document.getElementById('p-room');
    pRoomEl.textContent = hotelRoom || ""; 
    const roomLen = hotelRoom.length;
    if (roomLen >= 14) {
        pRoomEl.style.fontSize = "9px";
    } else if (roomLen >= 10) {
        pRoomEl.style.fontSize = "11px";
    } else if (roomLen >= 7) {
        pRoomEl.style.fontSize = "13px";
    } else {
        pRoomEl.style.fontSize = "16px"; // 通常サイズ
    }

    document.getElementById('p-phone').textContent = phone || "—";
    document.getElementById('p-location').textContent = locationStr;
    document.getElementById('p-options').textContent = selectedOps.length > 0 ? selectedOps.join('、') : "なし";
    document.getElementById('p-details').textContent = deliveryDetails || "—";
    document.getElementById('p-prev').textContent = prevVisit || "—";

    allReservations.push({ date: dateVal, price: price });
    localStorage.setItem('reservations_list', JSON.stringify(allReservations));
    updateSummary();

    document.getElementById('receipt-print-area').scrollIntoView({ behavior: 'smooth' });
}
