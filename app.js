// 初期データ設定
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

// ローカルストレージ連動用の状態管理
let girlsData = JSON.parse(localStorage.getItem('girls_list')) || ["さつき", "みか", "ひなた"];
let allReservations = JSON.parse(localStorage.getItem('reservations_list')) || [];

document.addEventListener('DOMContentLoaded', () => {
    initFormSelects();
    renderGirls();
    updateSummary();
    
    // 今日の日付を初期セット
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('reserve-date').value = todayStr;

    // イベントリスナー登録
    document.getElementById('course-time').addEventListener('change', calculateTotalPrice);
    document.getElementById('extension-time').addEventListener('change', calculateTotalPrice);
    document.getElementById('add-girl-btn').addEventListener('click', addNewGirl);
    document.getElementById('reservation-form').addEventListener('submit', handleFormSubmit);

    // 初回計算
    calculateTotalPrice();
});

// 選択肢（コース・延長・時刻・オプション）の初期生成
function initFormSelects() {
    const courseSelect = document.getElementById('course-time');
    Object.keys(BASE_PRICES).forEach(mins => {
        let opt = new Option(`${mins}分 (${BASE_PRICES[mins].toLocaleString()}円)`, mins);
        courseSelect.add(opt);
    });

    const extSelect = document.getElementById('extension-time');
    Object.keys(EXTENSION_PRICES).forEach(mins => {
        let label = mins == 0 ? "なし" : `+${mins}分 (+${EXTENSION_PRICES[mins].toLocaleString()}円)`;
        let opt = new Option(label, mins);
        extSelect.add(opt);
    });

    // 24時間表記を拡張した30時システム (5分刻み)
    const timeSelect = document.getElementById('start-time');
    for (let h = 9; h <= 30; h++) {
        for (let m = 0; m < 60; m += 5) {
            if (h === 30 && m > 0) break; // 30:00 でストップ
            let displayH = h;
            let timeStr = `${displayH}:${String(m).padStart(2, '0')}`;
            timeSelect.add(new Option(timeStr, timeStr));
        }
    }

    // オプションチェックボックスのレンダリング
    const optContainer = document.getElementById('options-container');
    OPTIONS_LIST.forEach((op, index) => {
        let lbl = document.createElement('label');
        lbl.innerHTML = `<input type="checkbox" class="op-checkbox" value="${op}"> ${op}`;
        optContainer.appendChild(lbl);
    });
}

// 料金の自動連動算出
function calculateTotalPrice() {
    const courseMins = document.getElementById('course-time').value;
    const extMins = document.getElementById('extension-time').value || 0;
    
    const base = BASE_PRICES[courseMins] || 0;
    const ext = EXTENSION_PRICES[extMins] || 0;
    
    document.getElementById('total-price').value = base + ext;
}

// 女の子リストの描画とプルダウンの同期
function renderGirls() {
    const listEl = document.getElementById('girl-list');
    const selectEl = document.getElementById('girl-select');
    
    listEl.innerHTML = '';
    // プルダウンを一度クリアして初期化
    selectEl.innerHTML = '<option value="">-- 女の子を選択してください --</option>';

    girlsData.forEach((girl, index) => {
        // 管理リスト追加
        let li = document.createElement('li');
        li.innerHTML = `<span>${girl}</span><span class="delete-girl" onclick="deleteGirl(${index})">× 削除</span>`;
        listEl.appendChild(li);

        // プルダウン追加
        selectEl.add(new Option(girl, girl));
    });
    
    localStorage.setItem('girls_list', JSON.stringify(girlsData));
}

function addNewGirl() {
    const input = document.getElementById('new-girl-name');
    const name = input.value.trim();
    if(name && !girlsData.includes(name)) {
        girlsData.push(name);
        input.value = '';
        renderGirls();
    }
}

function deleteGirl(index) {
    if(confirm("この女の子を削除しますか？")) {
        girlsData.splice(index, 1);
        renderGirls();
    }
}

// 確認電話時刻の算出ロジック
function calculateConfirmTime(startTimeStr) {
    let [h, m] = startTimeStr.split(':').map(Number);
    
    // 【特殊条件】9:30 の時のみ30分前の 9:00 にする
    if (h === 9 && m === 30) {
        return `(9:00)`;
    }
    
    // 原則は1時間前
    let targetH = h - 1;
    let targetM = m;
    
    return `(${targetH}:${String(targetM).padStart(2, '0')})`;
}

// 集計エリア（本日の件数・売上、全体件数・売上）の更新
function updateSummary() {
    const todayStr = new Date().toISOString().split('T')[0];
    
    let todayCount = 0;
    let todaySales = 0;
    let totalCount = allReservations.length;
    let totalSales = 0;

    allReservations.forEach(res => {
        totalSales += Number(res.price);
        if(res.date === todayStr) {
            todayCount++;
            todaySales += Number(res.price);
        }
    });

    document.getElementById('today-count').textContent = todayCount;
    document.getElementById('today-sales').textContent = todaySales.toLocaleString();
    document.getElementById('total-count').textContent = totalCount;
    document.getElementById('total-sales').textContent = totalSales.toLocaleString();
}

// フォーム送信時：レシートへの反映、およびデータ集計処理
function handleFormSubmit(e) {
    e.preventDefault();

    // 入力値の取得
    const dateVal = document.getElementById('reserve-date').value;
    const custType = document.getElementById('customer-type').value;
    const girl = document.getElementById('girl-select').value;
    const courseMins = Number(document.getElementById('course-time').value);
    const extMins = Number(document.getElementById('extension-time').value || 0);
    const price = document.getElementById('total-price').value;
    const startTime = document.getElementById('start-time').value;
    const custName = document.getElementById('customer-name').value;
    const guideStatus = document.getElementById('guide-status').value;
    const hotelRoom = document.getElementById('hotel-room').value;
    const phone = document.getElementById('phone-number').value;
    const meetingPlace = document.getElementById('meeting-place').value;
    const deliveryDetails = document.getElementById('delivery-details').value;
    const prevVisit = document.getElementById('prev-visit').value;

    // 選択されたOPの収集
    let selectedOps = [];
    document.querySelectorAll('.op-checkbox:checked').forEach(cb => {
        selectedOps.push(cb.value);
    });

    // 確認電話時間の計算
    const confirmTimeStr = calculateConfirmTime(startTime);

    // 日付フォーマット変換 (例: 2026-06-02 -> 6月2日)
    let formattedDate = "";
    if(dateVal) {
        const d = new Date(dateVal);
        formattedDate = `${d.getMonth() + 1}月${d.getDate()}日`;
    }

    // 🖨️ レシートプレビュー要素にデータを書き込み
    document.getElementById('p-date').textContent = formattedDate;
    document.getElementById('p-cust-type').textContent = custType || "—";
    document.getElementById('p-girl').textContent = girl;
    document.getElementById('p-duration').textContent = extMins > 0 ? `${courseMins} + ${extMins}` : courseMins;
    document.getElementById('p-price').textContent = `${Number(price).toLocaleString()}円`;
    document.getElementById('p-time').textContent = startTime;
    document.getElementById('p-confirm-time').textContent = confirmTimeStr;
    document.getElementById('p-cust-name').textContent = custName || "—";
    document.getElementById('p-guide').textContent = guideStatus || "未選択";
    document.getElementById('p-room').textContent = hotelRoom ? hotelRoom : ""; // 空白保証
    document.getElementById('p-phone').textContent = phone || "—";
    document.getElementById('p-location').textContent = meetingPlace || "—";
    document.getElementById('p-options').textContent = selectedOps.length > 0 ? selectedOps.join('、') : "なし";
    document.getElementById('p-details').textContent = deliveryDetails || "—";
    document.getElementById('p-prev').textContent = prevVisit || "—";

    // データの永続化
    allReservations.push({ date: dateVal, price: price });
    localStorage.setItem('reservations_list', JSON.stringify(allReservations));
    
    // 集計を再計算
    updateSummary();

    // 画面を自動スクロールして確認しやすくする
    document.getElementById('receipt-print-area').scrollIntoView({ behavior: 'smooth' });
}
