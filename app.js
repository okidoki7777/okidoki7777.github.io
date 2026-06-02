// 🔐 アカウント情報初期化 (なければ admin / admin)
let savedId = localStorage.getItem('auth_id') || 'admin';
let savedPass = localStorage.getItem('auth_pass') || 'admin';

// データ設定
const BASE_PRICES = {
    60: 10000, 75: 13000, 90: 15000, 120: 21000, 150: 27000,
    180: 33000, 240: 45000, 300: 57000, 360: 69000
};
const EXTENSION_PRICES = {
    0: 0, 30: 6000, 60: 12000, 90: 18000, 120: 24000
};
const OPTIONS_LIST = [
    "ピンクローター", "バイブ挿入", "電マ", "飛びっこ", "即尺",
    "ごっくん", "顔射", "オナニー鑑賞", "聖水", "パンスト破り",
    "AF", "3P", "レズ3P", "逆3P", "膝枕耳かき", "ノーパン・ノーブラ"
];
const MEDIA_MAPPING = {
    "シティヘヴン": "ヘヴン", "ぴゅあらば": "ぴゅあ", "デリヘルタウン": "タウン",
    "口コミ情報局": "口コミ", "風俗じゃぱん": "風じゃ", "デリヘルじゃぱん": "デリじゃ",
    "HP": "HP", "その他": "その他"
};

let girlsData = JSON.parse(localStorage.getItem('girls_list')) || ["さつき", "みか", "ひなた"];
let allReservations = JSON.parse(localStorage.getItem('reservations_list')) || [];

document.addEventListener('DOMContentLoaded', () => {
    // 🔐 認証チェック (SessionStorageをチェック)
    checkAuth();

    // 初期化と描画
    initFormSelects();
    renderGirls();
    updateSummary();

    // 日付を今日に
    document.getElementById('reserve-date').value = new Date().toISOString().split('T')[0];

    // イベントリスナー
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('btn-update-auth').addEventListener('click', handleAuthUpdate);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    
    document.getElementById('customer-class').addEventListener('change', toggleMediaVisibility);
    document.getElementById('course-time').addEventListener('change', calculateTotalPrice);
    document.getElementById('extension-time').addEventListener('change', calculateTotalPrice);
    document.getElementById('transport-fee').addEventListener('change', calculateTotalPrice);
    document.getElementById('nomination-class').addEventListener('change', calculateTotalPrice);
    document.getElementById('add-girl-btn').addEventListener('click', addNewGirl);
    document.getElementById('reservation-form').addEventListener('submit', handleFormSubmit);

    calculateTotalPrice();
    toggleMediaVisibility();
});

// --- 🔐 認証関連ロジック ---
function checkAuth() {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-wrapper').classList.remove('hidden');
    }
}

function handleLogin(e) {
    e.preventDefault();
    const inputId = document.getElementById('login-id').value;
    const inputPass = document.getElementById('login-pass').value;

    if (inputId === savedId && inputPass === savedPass) {
        sessionStorage.setItem('isLoggedIn', 'true');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-wrapper').classList.remove('hidden');
    } else {
        alert("IDまたはパスワードが間違っています。");
    }
}

function handleAuthUpdate() {
    const newId = document.getElementById('new-auth-id').value.trim();
    const newPass = document.getElementById('new-auth-pass').value.trim();

    if (!newId || !newPass) {
        alert("新しいIDとパスワードを両方入力してください。");
        return;
    }

    if (confirm("IDとパスワードを変更しますか？次回のログインから必要になります。")) {
        localStorage.setItem('auth_id', newId);
        localStorage.setItem('auth_pass', newPass);
        savedId = newId;
        savedPass = newPass;
        document.getElementById('new-auth-id').value = '';
        document.getElementById('new-auth-pass').value = '';
        alert("認証情報を更新しました！");
    }
}

function handleLogout() {
    if (confirm("ログアウトしますか？")) {
        sessionStorage.removeItem('isLoggedIn');
        document.getElementById('app-wrapper').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('login-id').value = '';
        document.getElementById('login-pass').value = '';
    }
}
// ------------------------------

function initFormSelects() {
    const courseSelect = document.getElementById('course-time');
    Object.keys(BASE_PRICES).forEach(mins => {
        courseSelect.add(new Option(`${mins}分 (${BASE_PRICES[mins].toLocaleString()}円)`, mins));
    });

    const extSelect = document.getElementById('extension-time');
    Object.keys(EXTENSION_PRICES).forEach(mins => {
        let label = mins == 0 ? "なし" : `+${mins}分 (+${EXTENSION_PRICES[mins].toLocaleString()}円)`;
        extSelect.add(new Option(label, mins));
    });

    const transSelect = document.getElementById('transport-fee');
    transSelect.add(new Option("なし (0円)", 0));
    for (let f = 1000; f <= 15000; f += 1000) {
        transSelect.add(new Option(`${f.toLocaleString()}円`, f));
    }

    const timeSelect = document.getElementById('start-time');
    for (let h = 9; h <= 30; h++) {
        for (let m = 0; m < 60; m += 5) {
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

function toggleMediaVisibility() {
    const custClass = document.getElementById('customer-class').value;
    const mediaGroup = document.getElementById('media-group');
    if (custClass === '新') {
        mediaGroup.classList.remove('hidden');
    } else {
        mediaGroup.classList.add('hidden');
    }
}

function calculateTotalPrice() {
    const courseMins = document.getElementById('course-time').value;
    const extMins = document.getElementById('extension-time').value || 0;
    const transport = Number(document.getElementById('transport-fee').value || 0);
    const nomination = document.getElementById('nomination-class').value;

    let base = BASE_PRICES[courseMins] || 0;
    let ext = EXTENSION_PRICES[extMins] || 0;
    let nominationAdd = (nomination === '本') ? 1000 : 0;

    document.getElementById('total-price').value = base + ext + transport + nominationAdd;
}

function renderGirls() {
    const listEl = document.getElementById('girl-list');
    const selectEl = document.getElementById('girl-select');
    listEl.innerHTML = '';
    selectEl.innerHTML = '<option value="">-- 女の子を選択してください --</option>';

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
        input.value = '';
        renderGirls();
    }
}

function deleteGirl(index) {
    if (confirm("この女の子を削除しますか？")) {
        girlsData.splice(index, 1);
        renderGirls();
    }
}

function calculateConfirmTime(startTimeStr) {
    let [h, m] = startTimeStr.split(':').map(Number);
    // 9:30〜9:59の予約は、一律(9:00)にする
    if (h === 9 && m >= 30 && m <= 59) return `(9:00)`;
    let targetH = h - 1;
    return `(${targetH}:${String(m).padStart(2, '0')})`;
}

function updateSummary() {
    const todayStr = new Date().toISOString().split('T')[0];
    let todayCount = 0, todaySales = 0, totalCount = allReservations.length, totalSales = 0;

    allReservations.forEach(res => {
        totalSales += Number(res.price);
        if (res.date === todayStr) {
            todayCount++;
            todaySales += Number(res.price);
        }
    });

    document.getElementById('today-count').textContent = todayCount;
    document.getElementById('today-sales').textContent = todaySales.toLocaleString();
    document.getElementById('total-count').textContent = totalCount;
    document.getElementById('total-sales').textContent = totalSales.toLocaleString();
}

function handleFormSubmit(e) {
    e.preventDefault();

    const dateVal = document.getElementById('reserve-date').value;
    const custClass = document.getElementById('customer-class').value;
    const nominationClass = document.getElementById('nomination-class').value;
    const girl = document.getElementById('girl-select').value;
    const courseMins = Number(document.getElementById('course-time').value);
    const extMins = Number(document.getElementById('extension-time').value || 0);
    const price = document.getElementById('total-price').value;
    const startTime = document.getElementById('start-time').value;
    const custName = document.getElementById('customer-name').value;
    const guideStatus = document.getElementById('guide-status').value;
    const hotelRoom = document.getElementById('hotel-room').value;
    const phone = document.getElementById('phone-number').value;
    const meetingPlace = document.getElementById('meeting-place-select').value;
    const deliveryDetails = document.getElementById('delivery-details').value;
    const prevVisit = document.getElementById('prev-visit').value;

    let selectedOps = [];
    document.querySelectorAll('.op-checkbox:checked').forEach(cb => selectedOps.push(cb.value));

    let custTypeStr = "";
    if (custClass === '新') {
        const mediaSelected = document.getElementById('media-select').value;
        const mediaAbbrev = MEDIA_MAPPING[mediaSelected] || mediaSelected;
        custTypeStr = `新・${nominationClass}(${mediaAbbrev})`;
    } else {
        custTypeStr = `${custClass}・${nominationClass}`;
    }

    let locationStr = (meetingPlace === 'その他') ? "" : meetingPlace;
    const confirmTimeStr = calculateConfirmTime(startTime);

    let formattedDate = "";
    if (dateVal) {
        const d = new Date(dateVal);
        formattedDate = `${d.getMonth() + 1}月${d.getDate()}日`;
    }

    // 🖨️ レシートへ値を代入
    document.getElementById('p-date').textContent = formattedDate;
    document.getElementById('p-cust-type').textContent = custTypeStr;
    document.getElementById('p-girl').textContent = girl;
    document.getElementById('p-duration').textContent = extMins > 0 ? `${courseMins}+${extMins}` : `${courseMins}`;
    document.getElementById('p-price').textContent = `${Number(price).toLocaleString()}円`;
    document.getElementById('p-time').textContent = startTime;
    document.getElementById('p-confirm-time').textContent = confirmTimeStr;
    document.getElementById('p-cust-name').textContent = custName || "—";
    document.getElementById('p-guide').textContent = guideStatus || "未選択";
    document.getElementById('p-room').textContent = hotelRoom || "";
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
