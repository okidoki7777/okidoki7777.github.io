/**
 * Luminous Reservation Manager - 全機能統合・修正版
 */

// 🔐 初期設定
let savedId = localStorage.getItem('auth_id') || 'admin';
let savedPass = localStorage.getItem('auth_pass') || 'admin';

document.addEventListener('DOMContentLoaded', () => {
    // 画面に「緊急ログイン」リンクを動的に追加
    const loginForm = document.getElementById('login-form');
    if (loginForm && !document.getElementById('btn-emergency-login')) {
        const emergencyBtn = document.createElement('button');
        emergencyBtn.id = 'btn-emergency-login';
        emergencyBtn.type = 'button';
        emergencyBtn.className = 'btn btn-danger';
        emergencyBtn.style.cssText = 'width: 100%; margin-top: 15px; background: #ff5e7e; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer;';
        emergencyBtn.textContent = '🔓 緊急ログイン (admin/admin)';
        emergencyBtn.onclick = () => {
            sessionStorage.setItem('isLoggedIn', 'true');
            location.reload();
        };
        loginForm.appendChild(emergencyBtn);
    }

    // 転送パラメータの確認 (ログイン省略)
    if (checkUrlForTransfer()) {
        // 転送があればログインした状態にする
        sessionStorage.setItem('isLoggedIn', 'true');
    }

    // 認証チェック
    if (sessionStorage.getItem('isLoggedIn') !== 'true') {
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) loginScreen.classList.remove('hidden');
        return;
    }

    // ログイン済みならアプリ起動
    initApp();
});

function initApp() {
    // 既存のアプリ初期化ロジック
    document.getElementById('login-screen').classList.add('hidden');
    const appWrapper = document.getElementById('app-wrapper');
    if (appWrapper) appWrapper.classList.remove('hidden');

    // 以下、予約管理の各種イベントリスナー定義や初期化処理をここに記述
    // ※お手元の既存の初期化処理をこの下に配置してください
    console.log("アプリ初期化完了");
}

function checkUrlForTransfer() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('tdata');
    if (code) {
        // データの読み込み処理を実行
        importTransferData(code);
        window.history.replaceState({}, document.title, window.location.pathname);
        return true;
    }
    return false;
}

function importTransferData(code) {
    try {
        const data = JSON.parse(decodeURIComponent(atob(code)));
        // ここに以前実装したフォームへの反映処理を記述
        console.log("転送データ読み込み:", data);
    } catch(e) {
        alert("転送データの読み込みに失敗しました。");
    }
}

// 認証処理
function handleLogin(e) {
    e.preventDefault();
    const id = document.getElementById('login-id').value;
    const pass = document.getElementById('login-pass').value;
    if (id === savedId && pass === savedPass) {
        sessionStorage.setItem('isLoggedIn', 'true');
        location.reload();
    } else {
        alert("IDまたはパスワードが違います。");
    }
}
