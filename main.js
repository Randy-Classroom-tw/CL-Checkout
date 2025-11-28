/**
 * 雲川水月 晚班結帳系統
 * main.js - 系統配置與初始化
 * 版本: 1.1.0
 */

// ===== 系統配置 =====
const App = {
    config: {
        // 結帳系統 Web App URL
        WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbxvtiNX8l0NbiqG1CNVLqRHO6X2vh5o0XCoqMZ-N9Ami1orCVn3N98L5BLnXkRmA0HsTw/exec',

        // API 超時設定 (毫秒)
        API_TIMEOUT: 30000,

        // 版本
        VERSION: '1.1.0'
    },

    // 當前狀態
    state: {
        currentUser: null,
        lastFour: null,
        isLoggedIn: false,
        isSubmitting: false
    }
};

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    console.log('🌙 雲川水月結帳系統 v' + App.config.VERSION);

    // 設定今日日期為預設值
    setDefaultDate();

    // 綁定 Enter 鍵登入
    document.getElementById('login-lastfour').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });

    // 綁定所有數字輸入框的預設值
    initNumberInputs();

    console.log('✅ 系統初始化完成');
}

// ===== 設定預設日期 =====
function setDefaultDate() {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    document.getElementById('checkout-date').value = dateStr;
}

// ===== 初始化數字輸入框 =====
function initNumberInputs() {
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        // 聚焦時選取全部
        input.addEventListener('focus', function() {
            this.select();
        });

        // 空白時預設為 0
        input.addEventListener('blur', function() {
            if (this.value === '' || this.value === null) {
                this.value = '';
            }
        });
    });
}

// ===== 登入處理 (後四碼驗證) =====
function handleLogin() {
    const lastFourInput = document.getElementById('login-lastfour');
    const lastFour = lastFourInput.value.trim();
    const loginBtn = document.getElementById('login-btn');

    if (!lastFour) {
        showToast('請輸入身分證後四碼', 'error');
        return;
    }

    if (lastFour.length !== 4) {
        showToast('請輸入4位數字', 'error');
        return;
    }

    // 顯示載入狀態
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loading-spinner"></span> 驗證中...';

    // 呼叫後端驗證
    callGAS('verifyUser', { lastFour: lastFour }, function(response) {
        loginBtn.disabled = false;
        loginBtn.textContent = '登入';

        if (response.status === 'success') {
            App.state.isLoggedIn = true;
            App.state.currentUser = response.userName;
            App.state.lastFour = lastFour;

            // 更新顯示的使用者名稱
            document.getElementById('current-user').textContent = response.userName;

            // 顯示主畫面
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('main-screen').style.display = 'block';
            document.getElementById('submit-section').style.display = 'block';

            showToast('歡迎，' + response.userName, 'success');
            console.log('✅ 使用者已登入: ' + response.userName);
        } else {
            showToast(response.message || '驗證失敗', 'error');
            lastFourInput.value = '';
            lastFourInput.focus();
        }
    }, function(error) {
        loginBtn.disabled = false;
        loginBtn.textContent = '登入';
        showToast('連線錯誤，請稍後再試', 'error');
    });
}

// ===== 區塊展開/摺疊 =====
function toggleSection(header) {
    const content = header.nextElementSibling;
    const toggle = header.querySelector('.section-toggle');

    content.classList.toggle('collapsed');
    toggle.classList.toggle('collapsed');
}

// ===== 快速標籤 =====
function addQuickTag(tag) {
    const textarea = document.getElementById('remarks');
    const currentValue = textarea.value.trim();

    // 切換標籤狀態
    const tagButtons = document.querySelectorAll('.quick-tag');
    tagButtons.forEach(btn => {
        if (btn.textContent === tag) {
            btn.classList.toggle('active');
        }
    });

    // 如果已有內容，添加分隔
    if (currentValue) {
        if (currentValue.includes(tag)) {
            // 移除該標籤
            textarea.value = currentValue.replace(tag, '').replace(/^[、\s]+|[、\s]+$/g, '').replace(/[、\s]{2,}/g, '、');
        } else {
            textarea.value = tag;
        }
    } else {
        textarea.value = tag;
    }
}

// ===== 計算函數 =====

// 計算平均客單價
function calculateSummary() {
    const revenue = parseFloat(document.getElementById('total-revenue').value) || 0;
    const customers = parseFloat(document.getElementById('total-customers').value) || 0;

    let avgPrice = 0;
    if (customers > 0) {
        avgPrice = Math.round(revenue / customers);
    }

    document.getElementById('avg-price').textContent = '$' + avgPrice.toLocaleString();
}

// 計算品項佔比
function calculateItemRatio() {
    const foodRevenue = parseFloat(document.getElementById('food-revenue').value) || 0;
    const setRevenue = parseFloat(document.getElementById('set-revenue').value) || 0;
    const total = foodRevenue + setRevenue;

    let foodRatio = 0;
    let setRatio = 0;

    if (total > 0) {
        foodRatio = ((foodRevenue / total) * 100).toFixed(1);
        setRatio = ((setRevenue / total) * 100).toFixed(1);
    }

    document.getElementById('food-ratio').textContent = foodRatio + '%';
    document.getElementById('set-ratio').textContent = setRatio + '%';
}

// 計算回頭客率
function calculateReturnRate() {
    const returnGroups = parseFloat(document.getElementById('return-groups').value) || 0;
    const reservationGroups = parseFloat(document.getElementById('reservation-groups').value) || 0;

    let rate = 0;
    if (reservationGroups > 0) {
        rate = ((returnGroups / reservationGroups) * 100).toFixed(1);
    }

    document.getElementById('return-rate').textContent = rate + '%';
}

// ===== Toast 提示 =====
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== Modal 控制 =====
function closeModal() {
    document.getElementById('confirm-modal').classList.remove('show');
}

// ===== 工具函數 =====
function getWeekday(dateStr) {
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const date = new Date(dateStr);
    return days[date.getDay()];
}

function formatCurrency(num) {
    return '$' + (num || 0).toLocaleString();
}

// ===== 呼叫 Google Apps Script API =====
function callGAS(functionName, params, onSuccess, onError) {
    // 檢查是否有設定 API URL
    if (!App.config.WEB_APP_URL || App.config.WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
        console.warn('⚠️ 尚未設定 WEB_APP_URL，使用模擬模式');

        // 模擬回應 (開發測試用)
        setTimeout(() => {
            if (functionName === 'verifyUser') {
                // 模擬驗證成功
                onSuccess({ status: 'success', message: '驗證成功', userName: '測試用戶' });
            } else if (functionName === 'submitCheckout') {
                onSuccess({ status: 'success', message: '模擬送出成功' });
            } else {
                onSuccess({ status: 'success' });
            }
        }, 1000);
        return;
    }

    // 構建 URL
    const queryParams = new URLSearchParams();
    queryParams.append('function', functionName);

    // 將參數加入
    if (params) {
        Object.keys(params).forEach(key => {
            if (typeof params[key] === 'object') {
                queryParams.append(key, JSON.stringify(params[key]));
            } else {
                queryParams.append(key, params[key]);
            }
        });
    }

    const callbackName = 'gasCallback_' + Date.now();
    queryParams.append('callback', callbackName);

    const url = App.config.WEB_APP_URL + '?' + queryParams.toString();

    // JSONP 回調
    window[callbackName] = function(response) {
        delete window[callbackName];
        if (script.parentNode) {
            document.head.removeChild(script);
        }
        clearTimeout(timeoutId);

        if (onSuccess) {
            onSuccess(response);
        }
    };

    // 建立 script 標籤
    const script = document.createElement('script');
    script.src = url;

    // 超時處理
    const timeoutId = setTimeout(() => {
        delete window[callbackName];
        if (script.parentNode) {
            document.head.removeChild(script);
        }
        if (onError) {
            onError({ status: 'error', message: '請求超時' });
        }
    }, App.config.API_TIMEOUT);

    // 錯誤處理
    script.onerror = function() {
        delete window[callbackName];
        clearTimeout(timeoutId);
        if (onError) {
            onError({ status: 'error', message: '網路錯誤' });
        }
    };

    document.head.appendChild(script);
}

// ===== 匯出給其他模組使用 =====
window.App = App;
window.showToast = showToast;
window.closeModal = closeModal;
window.getWeekday = getWeekday;
window.formatCurrency = formatCurrency;
window.callGAS = callGAS;
