// 🔐 アカウント情報初期化
let savedId = localStorage.getItem('auth_id') || 'admin';
let savedPass = localStorage.getItem('auth_pass') || 'admin';

const BASE_PRICES = {
    60: 10000, 75: 13000, 90: 15000, 120: 21000, 150: 27000,
    180: 33000, 240: 45000, 300: 57000, 360: 69000
};
const EXTENSION_PRICES = {};
for (let i = 0; i <= 600; i += 30) { EXTENSION_PRICES[i] = (i / 30) * 6000; }

// ... (他定数はそのまま維持)
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

    // 転送データのチェックを最優先
    if (!checkUrlForTransfer()) {
        checkAuth();
    }

    // イベント系 (略)
    document.getElementById('btn-export-code').addEventListener('click', exportTransferData);
    // ... 他イベント設定 ...
});

// --- 3番：転送メッセージの視認性向上 ---
function exportTransferData() {
    if (!checkMissingFields()) return;

    const girlName = document.getElementById('girl-select').value || "未選択";
    const startTime = document.getElementById('start-time').value || "未定";
    
    // データをまとめる
    const data = { /* (データ構造は前回同様) */ };
    const code = btoa(encodeURIComponent(JSON.stringify(data)));
    const baseUrl = window.location.href.split('?')[0];
    const transferUrl = `${baseUrl}?tdata=${code}`;

    // 視認性を高めたメッセージ
    const copyText = `【🚨予約転送：要印刷🚨】
👩 女の子：${girlName}
⏰ 開始時間：${startTime}

■ URLで開く（クリックするだけ）
${transferUrl}

■ 転送コード（URLが開けない場合）
${code}`;

    navigator.clipboard.writeText(copyText).then(() => {
        alert("転送用情報をコピーしました！\nLINE等で印刷用PCに送ってください。");
    });
}

// --- 他の機能 ---
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

// ... 以降の関数は前回のコードをそのまま維持してください ...
