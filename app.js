// 🔐 アカウント情報初期化
let savedId = localStorage.getItem('auth_id') || 'admin';
let savedPass = localStorage.getItem('auth_pass') || 'admin';

const BASE_PRICES = {
    60: 10000, 75: 13000, 90: 15000, 100: 13000, 120: 21000, 150: 27000,
    180: 33000, 240: 45000, 300: 57000, 360: 69000
};

// 延長分数上限600分 (30分刻み・6000円単位)
const EXTENSION_PRICES = {};
for (let i = 0; i <= 600; i += 30) {
    EXTENSION_PRICES[i] = (i / 30) * 6000;
}

const OPTIONS_LIST = ["ピンクローター", "バイブ挿入", "電マ", "飛びっこ", "即尺", "ごっくん", "顔射", "オナニー鑑賞", "聖水", "パンスト破り", "AF", "3P", "中出し", "乳首責め", "手コキ", "素股", "バック", "顔面騎乗", "その他"];
const MEDIA_MAPPING = { "シティヘヴン": "ヘヴン", "ぴゅあらば": "ぴゅあ", "デリヘルタウン": "タウン", "口コミ情報局": "口コミ", "風俗じゃぱん": "風じゃ", "その他": "その他" };
const HOTEL_ABBREV_MAPPING = { "ステラ": "S", "AI": "A", "おしゃべりダック": "お", "リーベ": "リ", "リンド": "L", "その他": "　" };

const DEFAULT_GIRLS = [
    "るな","あいな","ほまれ","ちずる","ふみか","みれい","かほ","そら","めい","なな",
    "りょうこ","いずみ","けい","まりえ","かおり","おと","なぎさ","みどり","さなえ","せいな",
    "かなみ","れおな","せつな","かえで","みなみ","さくら","ありす","えりか","すい","りさ",
    "すみれ","らん","かなこ","わかな","りりこ","すずな","ゆい","みお","みちる","としえ",
    "ゆうか","じゅり","わか","みやび","かなえ","ぼたん","ひとみ","あげは","あおい","さよこ",
    "なつめ","のぞみ","ひより","かすみ","ゆずは","まいか","れい","ほたる","じゅんこ","ゆりあ",
    "ちはる","やよい","きさき","まりあ","なるみ","こうめ","すばる"
];

let girlsData = [];
let allReservations = [];

try {
    allReservations = JSON.parse(localStorage.getItem('reservations_list')) || [];
} catch(e) {
    allReservations = [];
}

// ログイン状態を確認する関数
function isUserLoggedIn() {
    // sessionStorage または localStorage でログイン状態を確認
    return sessionStorage.getItem('isLoggedIn') === 'true' || localStorage.getItem('isUserLoggedIn') === 'true';
}

document.addEventListener('DOMContentLoaded', () => {
    initGirlsData();
    initFormSelects();
    renderGirls();
    updateSummary();

    document.getElementById('reserve-date').value = new Date().toISOString().split('T')[0];

    const importBtn = document.getElementById('btn-import-code');
    if (importBtn) importBtn.style.display = 'none';

    const isTransferred = checkUrlForTransfer();

    // 修正：sessionStorage と localStorage の両方でログイン状態を確認
    if (!isTransferred && !isUserLoggedIn()) {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-wrapper').classList.add('hidden');
    } else {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-wrapper').classList.remove('hidden');
    }

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('btn-emergency-reset').addEventListener('click', handleEmergencyReset);
    document.getElementById('btn-update-auth').addEventListener('click', handleAuthUpdate);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    
    const recalcEvents = ['course-time', 'extension-time', 'transport-fee', 'nomination-class', 'meeting-place-select', 'hotel-select', 'customer-class', 'point-use', 'discount-input'];
    recalcEvents.forEach(id => document.getElementById(id).addEventListener('change', () => {
        calculateTotalPrice();
        updateLineMessagePreview();
        if(id === 'customer-class') toggleMediaVisibility();
        if(id === 'meeting-place-select') toggleHotelVisibility();
    }));
    
    // ポイント使用・割引入力のイベント
    document.getElementById('point-use').addEventListener('input', () => {
        calculateTotalPrice();
        updateLineMessagePreview();
    });
    document.getElementById('discount-input').addEventListener('input', () => {
        calculateTotalPrice();
        updateLineMessagePreview();
    });

    const textEvents = ['start-time', 'customer-name', 'delivery-details', 'hotel-room', 'prev-visit', 'media-select', 'staff-name'];
    textEvents.forEach(id => document.getElementById(id).addEventListener('input', updateLineMessagePreview));
    document.getElementById('staff-name').addEventListener('change', updateLineMessagePreview);
    document.getElementById('options-container').addEventListener('change', updateLineMessagePreview);

    document.getElementById('add-girl-btn').addEventListener('click', addNewGirl);
    document.getElementById('btn-copy-line').addEventListener('click', copyLineMessage);
    document.getElementById('reservation-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('btn-export-code').addEventListener('click', exportTransferData);

    if (!isTransferred) {
        calculateTotalPrice();
        toggleMediaVisibility();
        toggleHotelVisibility();
        updateLineMessagePreview();
    }
});

// --- 🔐 認証関連 ---
function handleLogin(e) {
    e.preventDefault();
    const inputId = document.getElementById('login-id').value.trim();
    const inputPass = document.getElementById('login-pass').value.trim();

    if (inputId === savedId && inputPass === savedPass) {
        sessionStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('isUserLoggedIn', 'true');
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-wrapper').classList.remove('hidden');
    } else {
        alert("IDまたはパスワードが間違っています。");
    }
}

function handleEmergencyReset() {
    if(confirm("IDとパスワードを初期状態 (admin / admin) にリセットしますか？")) {
        localStorage.setItem('auth_id', 'admin'); localStorage.setItem('auth_pass', 'admin');
        savedId = 'admin'; savedPass = 'admin';
        document.getElementById('login-id').value = ''; document.getElementById('login-pass').value = '';
        alert("リセット完了しました。");
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
        localStorage.removeItem('isUserLoggedIn');
        location.reload();
    }
}

// --- 初期データ処理 ---
function initGirlsData() {
    if (localStorage.getItem('app_version') !== 'v6_3') {
        girlsData = DEFAULT_GIRLS.sort((a, b) => a.localeCompare(b, 'ja'));
        localStorage.setItem('girls_list', JSON.stringify(girlsData));
        localStorage.setItem('app_version', 'v6_3');
    } else {
        try { girlsData = JSON.parse(localStorage.getItem('girls_list')) || []; } catch(e) { girlsData = DEFAULT_GIRLS; }
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
    timeSelect.add(new Option("-- 未選択 --", "")); 
    for (let h = 9; h <= 30; h++) {
        for (let m = 0; m < 60; m += 10) { 
            if (h === 9 && m < 30) continue;
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
    
    // ポイント使用の選択肢を初期化
    const pointSelect = document.getElementById('point-use');
    pointSelect.add(new Option("なし (0P)", 0));
    for (let p = 1000; p <= 100000; p += 1000) {
        pointSelect.add(new Option(`${p.toLocaleString()}P`, p));
    }
}

function toggleMediaVisibility() { document.getElementById('media-group').classList.toggle('hidden', document.getElementById('customer-class').value !== '新'); }
function toggleHotelVisibility() { document.getElementById('hotel-group').classList.toggle('hidden', document.getElementById('meeting-place-select').value === 'その他'); }

function calculateTotalPrice() {
    const base = BASE_PRICES[document.getElementById('course-time').value] || 0;
    const ext = EXTENSION_PRICES[document.getElementById('extension-time').value || 0] || 0;
    const transport = Number(document.getElementById('transport-fee').value || 0);
    const nominationAdd = (document.getElementById('nomination-class').value === '本') ? 1000 : 0;
    
    // ポイント割引計算
    const pointUse = Number(document.getElementById('point-use').value || 0);
    const discountInput = Number(document.getElementById('discount-input').value || 0);
    const totalDiscount = pointUse + discountInput;
    
    const subtotal = base + ext + transport + nominationAdd;
    const finalPrice = Math.max(0, subtotal - totalDiscount);
    
    document.getElementById('total-price').value = finalPrice;
    document.getElementById('discount-amount').textContent = totalDiscount > 0 ? `-${totalDiscount.toLocaleString()}円` : "0円";
}

function renderGirls() {
    const listEl = document.getElementById('girl-list');
    const selectEl = document.getElementById('girl-select');
    listEl.innerHTML = ''; selectEl.innerHTML = '<option value="">-- 女の子を選択してください --</option>';

    girlsData.forEach((girl, index) => {
        let li = document.createElement('li');
        li.innerHTML = `<span>${girl}</span><span class="delete-girl" onclick="deleteGirl(${index})">× 削除</span>`;
        listEl.appendChild(li); selectEl.add(new Option(girl, girl));
    });
    localStorage.setItem('girls_list', JSON.stringify(girlsData));
}

function addNewGirl() {
    const input = document.getElementById('new-girl-name');
    const name = input.value.trim();
    if (name && !girlsData.includes(name)) {
        girlsData.push(name); girlsData.sort((a, b) => a.localeCompare(b, 'ja'));
        input.value = ''; renderGirls();
    }
}
function deleteGirl(index) { if (confirm("削除しますか？")) { girlsData.splice(index, 1); renderGirls(); } }

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
    document.getElementById('today-count').textContent = todayCount;
    document.getElementById('today-sales').textContent = todaySales.toLocaleString();
    document.getElementById('total-count').textContent = totalCount;
    document.getElementById('total-sales').textContent = totalSales.toLocaleString();
}

// 💬 LINE文章生成
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
    const staffName = document.getElementById('staff-name').value;
    const pointUse = Number(document.getElementById('point-use').value || 0);
    const discountInput = Number(document.getElementById('discount-input').value || 0);
    const totalDiscount = pointUse + discountInput;
    
    let selectedOps = [];
    document.querySelectorAll('.op-checkbox:checked').forEach(cb => selectedOps.push(cb.value));

    let nomStr = {'F': 'フリー', 'N': 'ネット指名', '本': '本指名'}[nominationClass] || "";
    let custStr = (custClass === '新') ? (custName ? `新規${custName}様` : "新規様") : (custName ? `会員${custName}様` : "会員様");
    if (prevVisit) custStr += `(前回${prevVisit})`;

    // 修正：「その他」選択時の場所表示
    let placeLine = (meetingPlace !== 'その他') ? (meetingPlace.endsWith("待ち合わせ") ? `${meetingPlace}\n` : `${meetingPlace}待ち合わせ\n`) : "";
    let detailLine = deliveryDetails ? `${deliveryDetails}\n` : "";
    let roomLine = hotelRoom ? `${hotelRoom}\n` : "";
    let block1 = (placeLine || detailLine || roomLine) ? `${placeLine}${detailLine}${roomLine}\n` : "\n";
    let opLine = selectedOps.length > 0 ? `OP：${selectedOps.join('、')}\n\n` : "";
    
    let hotelPriceStr = ""; let hotelLine = "";
    let isSpecialEvent = courseMins === 100; // 100分は新規イベント
    
    if (hotelSelect && hotelSelect !== 'その他' && meetingPlace !== 'その他' && !isSpecialEvent) {
        const HOTEL_PRICES = { 60: 2300, 75: 2500, 90: 2600, 120: 2900, 150: 3200, 180: 3500 };
        const hPrice = HOTEL_PRICES[courseMins];
        if (hPrice) hotelPriceStr = `(ホテル代${hPrice}円)`;
        if (!hotelRoom) hotelLine += `ホテル${hotelSelect}でお願いします\n`;
        if (hotelSelect !== 'ステラ') hotelLine += `ホテル代差額分はお客様払いです。\n`;
    }

    // 100分の場合はホテル代がお客様負担
    if (isSpecialEvent) {
        hotelLine += `※ホテル代お客様負担になります！\n`;
        if (hotelSelect && hotelSelect !== 'その他') {
            hotelLine += `\nホテル${hotelSelect}でお願いします\n`;
        }
    }

    const startTimeDisp = startTime ? `${startTime}～` : "未定～";
    let staffLine = staffName ? `\n\n担当：${staffName}` : "";
    
    // 割引適用時の注釈
    let discountNote = totalDiscount > 0 ? "\n※割引適用後の料金です" : "";

    const message = `ご予約詳細です！\n\n${startTimeDisp}\n\n${block1}${totalMins}分${nomStr}\n${custStr}\n料金${price}円${hotelPriceStr}${discountNote}\n${hotelLine}\n${opLine}よろしくお願いします${staffLine}`;
    document.getElementById('line-message-text').value = message;
}

function copyLineMessage() {
    const text = document.getElementById('line-message-text').value;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => { alert("LINE文章をコピーしました！"); }).catch(err => { alert("コピー失敗: " + err); });
}

function checkMissingFields() {
    let missing = [];
    if (!document.getElementById('start-time').value) missing.push("・開始時刻");
    if (!document.getElementById('customer-name').value.trim()) missing.push("・顧客名");
    if (!document.getElementById('phone-number').value.trim()) missing.push("・電話番号");
    
    const nomClass = document.getElementById('nomination-class').value;
    const girl = document.getElementById('girl-select').value;
    if (nomClass !== 'F' && !girl) missing.push("・女の子");

    if (missing.length > 0) return confirm("⚠️ 以下の項目が未入力です\n\n" + missing.join("\n") + "\n\nこのまま作業を進めますか？");
    return true;
}

// 🔄 超強力版: URL短縮システム（中継サーバー＋フォールバックでブロック回避）
async function exportTransferData() {
    if (!checkMissingFields()) return;

    const btn = document.getElementById('btn-export-code');
    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ 短縮URLを生成中...";
    btn.disabled = true;

    try {
        let selectedOps = [];
        document.querySelectorAll('.op-checkbox:checked').forEach(cb => selectedOps.push(cb.value));

        const rawData = {
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
            sn: document.getElementById('staff-name').value,
            pu: document.getElementById('point-use').value,
            di: document.getElementById('discount-input').value,
            ops: selectedOps
        };

        const compactData = {};
        Object.keys(rawData).forEach(key => {
            if (rawData[key] !== "" && rawData[key] !== "0" && rawData[key] !== 0 && !(Array.isArray(rawData[key]) && rawData[key].length === 0)) {
                compactData[key] = rawData[key];
            }
        });

        const code = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(compactData)))));
        const baseUrl = window.location.href.split('?')[0];
        const longUrl = `${baseUrl}?tdata=${code}`;

        const girl = compactData.g || "未選択";
        const startTime = compactData.st || "未定";
        const price = compactData.pr || "0";
        const staffName = compactData.sn || "未設定";

        let finalUrl = longUrl;

        // 🌟 スマホのセキュリティブロックをすり抜けるための強力な短縮処理
        try {
            // 第1ルート：安全な中継サーバー経由で is.gd を叩く
            const isgdUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`;
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(isgdUrl)}`;
            
            const res1 = await fetch(proxyUrl);
            const data1 = await res1.json();
            if (data1 && data1.contents) {
                const parsed = JSON.parse(data1.contents);
                if (parsed.shorturl) {
                    finalUrl = parsed.shorturl;
                }
            }
        } catch (e1) {
            console.warn("第1ルート失敗。TinyURLに切り替えます", e1);
            try {
                // 第2ルート：TinyURL を直接叩く（予備）
                const res2 = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
                if (res2.ok) {
                    const text2 = await res2.text();
                    if (text2 && text2.startsWith("http")) {
                        finalUrl = text2;
                    }
                }
            } catch (e2) {
                console.warn("URL短縮に完全に失敗しました", e2);
            }
        }

        const copyText = `【予約データ転送】\n\n👩 女の子：${girl}\n🕒 時間：${startTime}\n💵 金額：${Number(price).toLocaleString()}円\n👤 担当：${staffName}\n\nURL：${finalUrl}`;

        await navigator.clipboard.writeText(copyText);
        alert("✅ 短縮URLをコピーしました！\n\nLINE等で印刷用PCに送ってください。\n\n─────────\n" + copyText);

    } catch (err) {
        alert("❌ エラーが発生しました: " + err);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function checkUrlForTransfer() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('tdata');
    if (code) {
        sessionStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('isUserLoggedIn', 'true');
        importTransferData(code);
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
    }
    return false;
}

function importTransferData(code) {
    try {
        const jsonStr = decodeURIComponent(escape(atob(code)));
        const data = JSON.parse(jsonStr);

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
        if(data.sn) document.getElementById('staff-name').value = data.sn;
        if(data.pu) document.getElementById('point-use').value = data.pu;
        if(data.di) document.getElementById('discount-input').value = data.di;

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
            alert("✅ データの引き継ぎが完了しました！\n印刷プレビューを確認して、下部のボタンから印刷してください。");
        }, 300);

    } catch(e) {
        alert("❌ 引き継ぎURLの読み込みに失敗しました。URLが途切れていないか確認してください。");
        console.error(e);
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    if (!checkMissingFields()) return;
    processSubmit();
}

function processSubmit(skipValidation = false) {
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
    const mediaSelect = document.getElementById('media-select').value;

    let selectedOps = [];
    document.querySelectorAll('.op-checkbox:checked').forEach(cb => selectedOps.push(cb.value));

    // 修正：「その他」選択時は mediaSelect ではなく "その他" を使用
    let custTypeStr = (custClass === '新') 
        ? `新・${nominationClass}(${mediaSelect === 'その他' ? 'その他' : (MEDIA_MAPPING[mediaSelect] || mediaSelect)})`
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

    document.getElementById('p-date').textContent = formattedDate;
    document.getElementById('p-cust-type').textContent = custTypeStr;
    document.getElementById('p-girl').textContent = girl || "—";
    document.getElementById('p-duration').textContent = extMins > 0 ? `${courseMins}+${extMins}` : `${courseMins}`;
    document.getElementById('p-price').textContent = `${Number(price).toLocaleString()}円`;
    document.getElementById('p-time').textContent = startTime || "—";
    document.getElementById('p-confirm-time').textContent = calculateConfirmTime(startTime);
    document.getElementById('p-cust-name').textContent = custName || "—";
    document.getElementById('p-guide').textContent = guideStatus || "未選択";
    
    document.getElementById('p-hotel-name').textContent = hotelAbbrev;
    const pRoomEl = document.getElementById('p-room');
    pRoomEl.textContent = hotelRoom || ""; 
    const roomLen = hotelRoom.length;
    if (roomLen >= 14) pRoomEl.style.fontSize = "9px";
    else if (roomLen >= 10) pRoomEl.style.fontSize = "11px";
    else if (roomLen >= 7) pRoomEl.style.fontSize = "13px";
    else pRoomEl.style.fontSize = "16px";

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
