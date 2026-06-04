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

const OPTIONS_LIST = ["ピンクローター", "バイブ挿入", "電マ", "飛びっこ", "即尺", "ごっくん", "顔射", "オナニー鑑賞", "聖水", "パンスト破り", "AF", "3P"];
const MEDIA_MAPPING = { "シティヘヴン": "ヘヴン", "ぴゅあらば": "ぴゅあ", "デリヘルタウン": "タウン", "口コミ情報局": "口コミ", "風俗じゃぱん": "風じゃ" };
const HOTEL_ABBREV_MAPPING = { "ステラ": "S", "AI": "A", "おしゃべりダック": "お", "リーベ": "リ", "リンド": "L", "その他": "" };
const STAFF_LIST = ["奥山", "高野", "橋本", "田辺", "秋田"];

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
    // URLからの転送データがあるかチェック（ログイン前）
    const params = new URLSearchParams(window.location.search);
    const hasTransferData = params.has('tdata');
    
    // 転送データがあればログインをスキップ
    if (hasTransferData) {
        sessionStorage.setItem('isLoggedIn', 'true');
    }
    
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
    const recalcEvents = ['course-time', 'extension-time', 'transport-fee', 'nomination-class', 'meeting-place-select', 'hotel-select', 'customer-class', 'staff-select'];
    recalcEvents.forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('change', () => {
                calculateTotalPrice();
                updateLineMessagePreview();
                if(id === 'customer-class') toggleMediaVisibility();
                if(id === 'meeting-place-select') toggleHotelVisibility();
            });
        }
    });

    const textEvents = ['start-time', 'customer-name', 'delivery-details', 'hotel-room', 'prev-visit', 'media-select', 'phone-number'];
    textEvents.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', updateLineMessagePreview);
    });
    const optContainer = document.getElementById('options-container');
    if(optContainer) optContainer.addEventListener('change', updateLineMessagePreview);

    const addGirlBtn = document.getElementById('add-girl-btn');
    if(addGirlBtn) addGirlBtn.addEventListener('click', addNewGirl);
    
    const copyLineBtn = document.getElementById('btn-copy-line');
    if(copyLineBtn) copyLineBtn.addEventListener('click', copyLineMessage);
    
    const reservationForm = document.getElementById('reservation-form');
    if(reservationForm) reservationForm.addEventListener('submit', handleFormSubmit);

    // 🔄 転送システム連動
    const exportBtn = document.getElementById('btn-export-code');
    if(exportBtn) exportBtn.addEventListener('click', exportTransferData);
    
    const importBtn = document.getElementById('btn-import-code');
    if(importBtn) importBtn.addEventListener('click', handleImportClick);

    calculateTotalPrice();
    toggleMediaVisibility();
    toggleHotelVisibility();
    updateLineMessagePreview();

    checkUrlForTransfer();
});

// --- 🔐 認証関連 ---
function checkAuth() {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        const loginScreen = document.getElementById('login-screen');
        const appWrapper = document.getElementById('app-wrapper');
        if(loginScreen) loginScreen.classList.add('hidden');
        if(appWrapper) appWrapper.classList.remove('hidden');
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
        checkUrlForTransfer();
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
    if (localStorage.getItem('app_version') !== 'v6_3') {
        girlsData = DEFAULT_GIRLS.sort((a, b) => a.localeCompare(b, 'ja'));
        localStorage.setItem('girls_list', JSON.stringify(girlsData));
        localStorage.setItem('app_version', 'v6_3');
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
    if(!courseSelect) return;
    
    // コース時間を初期化（重複追加防止）
    courseSelect.innerHTML = '<option value="">-- 時間を選択してください --</option>';
    Object.keys(BASE_PRICES).forEach(mins => courseSelect.add(new Option(`${mins}分 (${BASE_PRICES[mins].toLocaleString()}円)`, mins)));

    const extSelect = document.getElementById('extension-time');
    if(extSelect) {
        extSelect.innerHTML = '';
        Object.keys(EXTENSION_PRICES).forEach(mins => {
            let label = mins == 0 ? "なし" : `+${mins}分 (+${EXTENSION_PRICES[mins].toLocaleString()}円)`;
            extSelect.add(new Option(label, mins));
        });
    }

    const transSelect = document.getElementById('transport-fee');
    if(transSelect) {
        transSelect.innerHTML = '';
        transSelect.add(new Option("なし (0円)", 0));
        for (let f = 1000; f <= 15000; f += 1000) transSelect.add(new Option(`${f.toLocaleString()}円`, f));
    }

    // 開始時刻 9:30～30:00 (10分単位)
    const timeSelect = document.getElementById('start-time');
    if(timeSelect) {
        timeSelect.innerHTML = '';
        timeSelect.add(new Option("-- 未選択 --", "")); 
        for (let h = 9; h <= 30; h++) {
            for (let m = 0; m < 60; m += 10) {
                // 9時台は30分以降のみ
                if (h === 9 && m < 30) continue;
                // 30時台は00分のみ
                if (h === 30 && m > 0) break;
                timeSelect.add(new Option(`${h}:${String(m).padStart(2, '0')}`, `${h}:${String(m).padStart(2, '0')}`));
            }
        }
    }

    // 担当者選択
    const staffSelect = document.getElementById('staff-select');
    if(staffSelect) {
        staffSelect.innerHTML = '<option value="">-- 担当者を選択してください --</option>';
        STAFF_LIST.forEach(staff => staffSelect.add(new Option(staff, staff)));
    }

    const optContainer = document.getElementById('options-container');
    if(optContainer) {
        optContainer.innerHTML = ''; // 重複追加防止
        OPTIONS_LIST.forEach(op => {
            let lbl = document.createElement('label');
            lbl.innerHTML = `<input type="checkbox" class="op-checkbox" value="${op}"> ${op}`;
            optContainer.appendChild(lbl);
        });
    }
}

function toggleMediaVisibility() {
    const mediaGroup = document.getElementById('media-group');
    if(mediaGroup) {
        mediaGroup.classList.toggle('hidden', document.getElementById('customer-class').value !== '新');
    }
}

function toggleHotelVisibility() {
    const hotelGroup = document.getElementById('hotel-group');
    if(hotelGroup) {
        hotelGroup.classList.toggle('hidden', document.getElementById('meeting-place-select').value === 'その他');
    }
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
    if(!listEl || !selectEl) return;
    
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
    if(!input) return;
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
    if (!startTimeStr) return "";
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
    const todayCountEl = document.getElementById('today-count');
    const todaySalesEl = document.getElementById('today-sales');
    const totalCountEl = document.getElementById('total-count');
    const totalSalesEl = document.getElementById('total-sales');
    
    if(todayCountEl) todayCountEl.textContent = todayCount;
    if(todaySalesEl) todaySalesEl.textContent = todaySales.toLocaleString();
    if(totalCountEl) totalCountEl.textContent = totalCount;
    if(totalSalesEl) totalSalesEl.textContent = totalSales.toLocaleString();
}

// 💬 LINE文章の自動生成
function updateLineMessagePreview() {
    const startTimeEl = document.getElementById('start-time');
    const meetingPlaceEl = document.getElementById('meeting-place-select');
    const deliveryDetailsEl = document.getElementById('delivery-details');
    const courseTimeEl = document.getElementById('course-time');
    const extensionTimeEl = document.getElementById('extension-time');
    const nominationClassEl = document.getElementById('nomination-class');
    const customerClassEl = document.getElementById('customer-class');
    const customerNameEl = document.getElementById('customer-name');
    const totalPriceEl = document.getElementById('total-price');
    const hotelSelectEl = document.getElementById('hotel-select');
    const hotelRoomEl = document.getElementById('hotel-room');
    const transportFeeEl = document.getElementById('transport-fee');
    const prevVisitEl = document.getElementById('prev-visit');
    const staffSelectEl = document.getElementById('staff-select');
    const lineMessageEl = document.getElementById('line-message-text');
    
    if(!lineMessageEl) return;

    const startTime = startTimeEl ? startTimeEl.value : "";
    const meetingPlace = meetingPlaceEl ? meetingPlaceEl.value : "";
    const deliveryDetails = deliveryDetailsEl ? deliveryDetailsEl.value.trim() : "";
    const courseMins = courseTimeEl ? Number(courseTimeEl.value) : 0;
    const extMins = extensionTimeEl ? Number(extensionTimeEl.value || 0) : 0;
    const totalMins = courseMins + extMins;
    const nominationClass = nominationClassEl ? nominationClassEl.value : "";
    const custClass = customerClassEl ? customerClassEl.value : "";
    const custName = customerNameEl ? customerNameEl.value.trim() : "";
    const price = totalPriceEl ? totalPriceEl.value : "0";
    const hotelSelect = hotelSelectEl ? hotelSelectEl.value : "";
    const hotelRoom = hotelRoomEl ? hotelRoomEl.value.trim() : "";
    const transportFee = transportFeeEl ? Number(transportFeeEl.value || 0) : 0;
    const prevVisit = prevVisitEl ? prevVisitEl.value.trim() : "";
    const staffName = staffSelectEl ? staffSelectEl.value : "";
    
    let selectedOps = [];
    document.querySelectorAll('.op-checkbox:checked').forEach(cb => selectedOps.push(cb.value));

    // 指名区分の生成
    let nomStr = {'F': 'フリー', 'N': 'ネット指名', '本': '本指名'}[nominationClass] || "";

    // 顧客名の生成 + 前回の欄があれば横に付与する
    let custStr = (custClass === '新') ? (custName ? `新規${custName}様` : "新規様") : (custName ? `会員${custName}様` : "会員様");
    if (prevVisit) {
        custStr += `(前回${prevVisit})`;
    }

    // 待ち合わせ場所
    let placeLine = "";
    if (meetingPlace && meetingPlace !== 'その他') {
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
    if (hotelSelect && hotelSelect !== 'その他' && meetingPlace && meetingPlace !== 'その他') {
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

    // 担当者情報
    let staffLine = staffName ? `担当者：${staffName}\n` : "";

    const startTimeDisp = startTime ? `${startTime}～` : "未定～";

    const message = `ご予約詳細です！\n\n${startTimeDisp}\n\n${block1}${totalMins}分${nomStr}\n${custStr}\n料金${price}円${hotelPriceStr}\n\n${opLine}${staffLine}${hotelLine}よろしくお願いします`;
    lineMessageEl.value = message;
}

function copyLineMessage() {
    const text = document.getElementById('line-message-text').value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => { alert("LINE文章をコピーしました！"); }).catch(err => { alert("コピー失敗: " + err); });
}

// ⚠️ 未入力チェックロジック (警告は出すが強行できる)
function checkMissingFields() {
    let missing = [];
    
    const startTimeEl = document.getElementById('start-time');
    const customerNameEl = document.getElementById('customer-name');
    const phoneNumberEl = document.getElementById('phone-number');
    const nominationClassEl = document.getElementById('nomination-class');
    const girlSelectEl = document.getElementById('girl-select');
    
    if(!startTimeEl || !startTimeEl.value) missing.push("・開始時刻");
    if(!customerNameEl || !customerNameEl.value.trim()) missing.push("・顧客名");
    if(!phoneNumberEl || !phoneNumberEl.value.trim()) missing.push("・電話番号");
    
    const nomClass = nominationClassEl ? nominationClassEl.value : "";
    const girl = girlSelectEl ? girlSelectEl.value : "";
    // Fフリー以外で、女の子が選ばれていない場合のみ警告
    if (nomClass !== 'F' && !girl) {
        missing.push("・女の子");
    }

    if (missing.length > 0) {
        return confirm("⚠️ 以下の項目が未入力です\n\n" + missing.join("\n") + "\n\nこのまま作業を進めますか？");
    }
    return true; // 漏れがない場合はそのまま進む
}

// 🔄 PC引き継ぎ・転送システム
function exportTransferData() {
    if (!checkMissingFields()) return;

    let selectedOps = [];
    document.querySelectorAll('.op-checkbox:checked').forEach(cb => selectedOps.push(cb.value));

    const data = {
        d: document.getElementById('reserve-date').value,
        cc: document.getElementById('customer-class').value,
        nc: document.getElementById('nomination-class').value,
        g: document.getElementById('girl-select').value,
        ct: document.getElementById('course-time').value,
        et: document.getElementById('extension-time').value,
        tf: document.getElementById('transport-fee').value,
        pr: document.getElementById('total-price').value,
        st: document.getElementById('start-time').value,
        cn: document.getElementById('customer-name').value,
        gs: document.getElementById('guide-status').value,
        hs: document.getElementById('hotel-select').value,
        hr: document.getElementById('hotel-room').value,
        pn: document.getElementById('phone-number').value,
        mp: document.getElementById('meeting-place-select').value,
        dd: document.getElementById('delivery-details').value,
        pv: document.getElementById('prev-visit').value,
        ms: document.getElementById('media-select').value,
        ss: document.getElementById('staff-select').value,
        ops: selectedOps
    };

    const code = btoa(encodeURIComponent(JSON.stringify(data)));
    const baseUrl = window.location.href.split('?')[0];
    const transferUrl = `${baseUrl}?tdata=${code}`;

    const copyText = `【予約データ転送】\n以下のURLを印刷用PCで開くか、コードを読み込んでください。\n\n■ URLで開く（クリックするだけ）\n${transferUrl}\n\n■ コードで読み込む\n${code}`;

    navigator.clipboard.writeText(copyText).then(() => {
        alert("転送用URLとコードをコピーしました！\nLINE等で印刷用PCに送ってください。");
    }).catch(err => {
        alert("コピー失敗: " + err);
    });
}

function handleImportClick() {
    const code = prompt("LINE等で送られてきた【転送コード】（英数字の羅列）を貼り付けてください：");
    if(code) { importTransferData(code.trim()); }
}

function checkUrlForTransfer() {
    if (sessionStorage.getItem('isLoggedIn') !== 'true') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('tdata');
    if (code) {
        importTransferData(code);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

function importTransferData(code) {
    try {
        const data = JSON.parse(decodeURIComponent(atob(code)));

        if(data.d) document.getElementById('reserve-date').value = data.d;
        if(data.cc) document.getElementById('customer-class').value = data.cc;
        if(data.nc) document.getElementById('nomination-class').value = data.nc;
        
        if(data.g) {
            if(!girlsData.includes(data.g)) {
                girlsData.push(data.g);
                girlsData.sort((a, b) => a.localeCompare(b, 'ja'));
                renderGirls();
            }
            document.getElementById('girl-select').value = data.g;
        }

        if(data.ct) document.getElementById('course-time').value = data.ct;
        if(data.et) document.getElementById('extension-time').value = data.et;
        if(data.tf) document.getElementById('transport-fee').value = data.tf;
        if(data.pr) document.getElementById('total-price').value = data.pr;
        if(data.st) document.getElementById('start-time').value = data.st;
        if(data.cn) document.getElementById('customer-name').value = data.cn;
        if(data.gs) document.getElementById('guide-status').value = data.gs;
        if(data.hs) document.getElementById('hotel-select').value = data.hs;
        if(data.hr) document.getElementById('hotel-room').value = data.hr;
        if(data.pn) document.getElementById('phone-number').value = data.pn;
        if(data.mp) document.getElementById('meeting-place-select').value = data.mp;
        if(data.dd) document.getElementById('delivery-details').value = data.dd;
        if(data.pv) document.getElementById('prev-visit').value = data.pv;
        if(data.ms) document.getElementById('media-select').value = data.ms;
        if(data.ss) document.getElementById('staff-select').value = data.ss;

        document.querySelectorAll('.op-checkbox').forEach(cb => cb.checked = false);
        if(data.ops && Array.isArray(data.ops)) {
            document.querySelectorAll('.op-checkbox').forEach(cb => {
                if(data.ops.includes(cb.value)) cb.checked = true;
            });
        }

        toggleMediaVisibility();
        toggleHotelVisibility();
        calculateTotalPrice();
        updateLineMessagePreview();

        setTimeout(() => {
            processSubmit(true);
            alert("データの引き継ぎが完了しました！\n印刷プレビューを確認して、下部のボタンから印刷してください。");
        }, 300);

    } catch(e) {
        alert("コードの読み込みに失敗しました。正しいコードかURLを使用してください。");
        console.error(e);
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    if (!checkMissingFields()) return;
    processSubmit();
}

// 実際の登録・プレビュー反映処理
function processSubmit(skipValidation = false) {
    updateLineMessagePreview();

    const dateVal = document.getElementById('reserve-date').value;
    const custClass = document.getElementById('customer-class').value;
    const nominationClass = document.getElementById('nomination-class').value;
    const girlEl = document.getElementById('girl-select');
    const girl = girlEl ? girlEl.value : "";
    const courseTimeEl = document.getElementById('course-time');
    const courseMins = courseTimeEl ? courseTimeEl.value : "";
    const extMinsEl = document.getElementById('extension-time');
    const extMins = extMinsEl ? Number(extMinsEl.value || 0) : 0;
    const priceEl = document.getElementById('total-price');
    const price = priceEl ? priceEl.value : "0";
    const startTimeEl = document.getElementById('start-time');
    const startTime = startTimeEl ? startTimeEl.value : "";
    const custNameEl = document.getElementById('customer-name');
    const custName = custNameEl ? custNameEl.value.trim() : "";
    const guideStatusEl = document.getElementById('guide-status');
    const guideStatus = guideStatusEl ? guideStatusEl.value : "";
    const hotelSelectEl = document.getElementById('hotel-select');
    const hotelSelect = hotelSelectEl ? hotelSelectEl.value : "";
    const hotelRoomEl = document.getElementById('hotel-room');
    const hotelRoom = hotelRoomEl ? hotelRoomEl.value.trim() : "";
    const phoneEl = document.getElementById('phone-number');
    const phone = phoneEl ? phoneEl.value.trim() : "";
    const meetingPlaceEl = document.getElementById('meeting-place-select');
    const meetingPlace = meetingPlaceEl ? meetingPlaceEl.value : "";
    const deliveryDetailsEl = document.getElementById('delivery-details');
    const deliveryDetails = deliveryDetailsEl ? deliveryDetailsEl.value.trim() : "";
    const prevVisitEl = document.getElementById('prev-visit');
    const prevVisit = prevVisitEl ? prevVisitEl.value.trim() : "";
    const mediaSelectEl = document.getElementById('media-select');
    const mediaSelect = mediaSelectEl ? mediaSelectEl.value : "";
    const staffSelectEl = document.getElementById('staff-select');
    const staffSelect = staffSelectEl ? staffSelectEl.value : "";

    let selectedOps = [];
    document.querySelectorAll('.op-checkbox:checked').forEach(cb => selectedOps.push(cb.value));

    let custTypeStr = (custClass === '新') 
        ? `新・${nominationClass}(${MEDIA_MAPPING[mediaSelect] || mediaSelect})`
        : `${custClass}・${nominationClass}`;

    let locationStr = (meetingPlace === 'その他' || !meetingPlace) ? "" : meetingPlace;
    
    let formattedDate = "";
    if (dateVal) {
        const d = new Date(dateVal);
        const days = ['日', '月', '火', '水', '木', '金', '土'];
        formattedDate = `${d.getMonth() + 1}月${d.getDate()}日(${days[d.getDay()]})`;
    }

    let hotelAbbrev = "";
    if (meetingPlace && meetingPlace !== 'その他' && hotelSelect && hotelSelect !== 'その他') {
        hotelAbbrev = HOTEL_ABBREV_MAPPING[hotelSelect] || "";
    }

    // 🖨️ レシートプレビュー反映
    const pDateEl = document.getElementById('p-date');
    const pCustTypeEl = document.getElementById('p-cust-type');
    const pGirlEl = document.getElementById('p-girl');
    const pDurationEl = document.getElementById('p-duration');
    const pPriceEl = document.getElementById('p-price');
    const pTimeEl = document.getElementById('p-time');
    const pConfirmTimeEl = document.getElementById('p-confirm-time');
    const pCustNameEl = document.getElementById('p-cust-name');
    const pGuideEl = document.getElementById('p-guide');
    const pHotelNameEl = document.getElementById('p-hotel-name');
    const pRoomEl = document.getElementById('p-room');
    const pPhoneEl = document.getElementById('p-phone');
    const pLocationEl = document.getElementById('p-location');
    const pOptionsEl = document.getElementById('p-options');
    const pDetailsEl = document.getElementById('p-details');
    const pPrevEl = document.getElementById('p-prev');
    const pStaffEl = document.getElementById('p-staff');
    
    if(pDateEl) pDateEl.textContent = formattedDate;
    if(pCustTypeEl) pCustTypeEl.textContent = custTypeStr;
    if(pGirlEl) pGirlEl.textContent = girl || "—";
    if(pDurationEl) pDurationEl.textContent = extMins > 0 ? `${courseMins}+${extMins}` : `${courseMins}`;
    if(pPriceEl) pPriceEl.textContent = `${Number(price).toLocaleString()}円`;
    if(pTimeEl) pTimeEl.textContent = startTime || "—";
    if(pConfirmTimeEl) pConfirmTimeEl.textContent = calculateConfirmTime(startTime);
    if(pCustNameEl) pCustNameEl.textContent = custName || "—";
    if(pGuideEl) pGuideEl.textContent = guideStatus || "未選択";
    
    if(pHotelNameEl) pHotelNameEl.textContent = hotelAbbrev;
    if(pRoomEl) {
        pRoomEl.textContent = hotelRoom || ""; 
        const roomLen = hotelRoom.length;
        if (roomLen >= 14) pRoomEl.style.fontSize = "9px";
        else if (roomLen >= 10) pRoomEl.style.fontSize = "11px";
        else if (roomLen >= 7) pRoomEl.style.fontSize = "13px";
        else pRoomEl.style.fontSize = "16px";
    }

    if(pPhoneEl) pPhoneEl.textContent = phone || "—";
    if(pLocationEl) pLocationEl.textContent = locationStr;
    if(pOptionsEl) pOptionsEl.textContent = selectedOps.length > 0 ? selectedOps.join('、') : "なし";
    if(pDetailsEl) pDetailsEl.textContent = deliveryDetails || "—";
    if(pPrevEl) pPrevEl.textContent = prevVisit || "—";
    if(pStaffEl) pStaffEl.textContent = staffSelect || "—";

    allReservations.push({ date: dateVal, price: price });
    localStorage.setItem('reservations_list', JSON.stringify(allReservations));
    updateSummary();

    const receiptArea = document.getElementById('receipt-print-area');
    if(receiptArea) receiptArea.scrollIntoView({ behavior: 'smooth' });
}
