/**
 * 雲川水月 晚班結帳系統
 * checkout.js - 結帳邏輯與 API 呼叫
 * 版本: 1.0.0
 */

// ===== 確認送出 =====
function confirmSubmit() {
    // 收集表單資料
    const formData = collectFormData();

    // 驗證必填欄位
    const validation = validateForm(formData);
    if (!validation.isValid) {
        showToast(validation.message, 'error');
        return;
    }

    // 顯示確認摘要
    showConfirmModal(formData);
}

// ===== 收集表單資料 =====
function collectFormData() {
    const dateValue = document.getElementById('checkout-date').value;

    return {
        // 基本資訊
        remarks: document.getElementById('remarks').value.trim(),
        date: dateValue,
        weekday: getWeekday(dateValue),
        reservationCount: getNumberValue('reservation-count'),
        reservationGroups: getNumberValue('reservation-groups'),

        // 營業額
        totalRevenue: getNumberValue('total-revenue'),
        totalCustomers: getNumberValue('total-customers'),
        avgPrice: calculateAvgPrice(),
        cashAmount: getNumberValue('cash-amount'),
        cardAmount: getNumberValue('card-amount'),

        // 品項分析
        foodRevenue: getNumberValue('food-revenue'),
        foodRatio: calculateFoodRatio(),
        setRevenue: getNumberValue('set-revenue'),
        setRatio: calculateSetRatio(),
        setGroups: getNumberValue('set-groups'),

        // 時段來客
        lunchCustomers: getNumberValue('lunch-customers'),
        afternoonCustomers: getNumberValue('afternoon-customers'),
        dinnerCustomers: getNumberValue('dinner-customers'),

        // 年齡分佈
        ageUnder35: getNumberValue('age-under35'),
        age35to50: getNumberValue('age-35to50'),
        ageOver50: getNumberValue('age-over50'),

        // 顧客來源
        vegGroups: getNumberValue('veg-groups'),
        localGroups: getNumberValue('local-groups'),
        meatGroups: getNumberValue('meat-groups'),
        mediaGroups: getNumberValue('media-groups'),
        returnGroups: getNumberValue('return-groups'),
        returnRate: calculateReturnRateValue(),
        socialGroups: getNumberValue('social-groups'),
        walkinGroups: getNumberValue('walkin-groups'),
        outtownGroups: getNumberValue('outtown-groups'),

        // 店卡
        cardSigned: getNumberValue('card-signed'),
        cardUsed: getNumberValue('card-used'),

        // 結帳人 (從登入狀態取得)
        staff: App.state.currentUser
    };
}

// ===== 輔助函數 =====
function getNumberValue(id) {
    const value = document.getElementById(id).value;
    return value === '' ? 0 : parseFloat(value) || 0;
}

function calculateAvgPrice() {
    const revenue = getNumberValue('total-revenue');
    const customers = getNumberValue('total-customers');
    return customers > 0 ? Math.round(revenue / customers) : 0;
}

function calculateFoodRatio() {
    const food = getNumberValue('food-revenue');
    const set = getNumberValue('set-revenue');
    const total = food + set;
    return total > 0 ? food / total : 0;
}

function calculateSetRatio() {
    const food = getNumberValue('food-revenue');
    const set = getNumberValue('set-revenue');
    const total = food + set;
    return total > 0 ? set / total : 0;
}

function calculateReturnRateValue() {
    const returnGroups = getNumberValue('return-groups');
    const reservationGroups = getNumberValue('reservation-groups');
    return reservationGroups > 0 ? returnGroups / reservationGroups : 0;
}

// ===== 表單驗證 =====
function validateForm(data) {
    if (!data.date) {
        return { isValid: false, message: '請選擇結帳日期' };
    }

    if (!data.staff) {
        return { isValid: false, message: '尚未登入，請重新整理頁面' };
    }

    if (data.totalRevenue <= 0) {
        return { isValid: false, message: '請輸入營業額' };
    }

    if (data.totalCustomers <= 0) {
        return { isValid: false, message: '請輸入來客數' };
    }

    return { isValid: true };
}

// ===== 顯示確認視窗 =====
function showConfirmModal(data) {
    const summary = document.getElementById('confirm-summary');

    summary.innerHTML = `
        <div class="preview-card">
            <div class="preview-row">
                <span class="preview-label">日期</span>
                <span class="preview-value">${data.date} (${data.weekday})</span>
            </div>
            <div class="preview-row">
                <span class="preview-label">結帳人</span>
                <span class="preview-value">${data.staff}</span>
            </div>
            <div class="preview-row">
                <span class="preview-label">營業額</span>
                <span class="preview-value">${formatCurrency(data.totalRevenue)}</span>
            </div>
            <div class="preview-row">
                <span class="preview-label">來客數</span>
                <span class="preview-value">${data.totalCustomers} 人</span>
            </div>
            <div class="preview-row">
                <span class="preview-label">客單價</span>
                <span class="preview-value">${formatCurrency(data.avgPrice)}</span>
            </div>
            <div class="preview-row">
                <span class="preview-label">現金 / 刷卡</span>
                <span class="preview-value">${formatCurrency(data.cashAmount)} / ${formatCurrency(data.cardAmount)}</span>
            </div>
            ${data.remarks ? `
            <div class="preview-row">
                <span class="preview-label">備註</span>
                <span class="preview-value">${data.remarks}</span>
            </div>
            ` : ''}
        </div>
    `;

    document.getElementById('confirm-modal').classList.add('show');
}

// ===== 送出結帳 =====
function submitCheckout() {
    if (App.state.isSubmitting) {
        return;
    }

    const formData = collectFormData();
    App.state.isSubmitting = true;

    // 更新按鈕狀態
    const submitBtn = document.querySelector('.modal-btn.confirm');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="loading-spinner"></span> 送出中...';
    submitBtn.disabled = true;

    // 準備送出資料 (對應 Google Sheet 欄位順序)
    const rowData = [
        formData.remarks,           // A: 備註
        formData.date,              // B: 日期
        formData.weekday,           // C: 星期
        formData.reservationCount || '', // D: 訂位人數
        formData.totalRevenue,      // E: 營業額
        formData.totalCustomers,    // F: 日來客數
        formData.avgPrice,          // G: 平均客單價
        formData.cashAmount || '',  // H: 實收現金
        formData.cardAmount || '',  // I: 信用卡
        formData.foodRevenue,       // J: 食物營業額
        formData.foodRatio,         // K: 食物佔比
        formData.setRevenue,        // L: 套餐營業額
        formData.setRatio,          // M: 套餐佔比
        formData.reservationGroups, // N: 訂位組數
        formData.setGroups,         // O: 點購套餐組數
        formData.lunchCustomers,    // P: 午餐來客
        formData.afternoonCustomers, // Q: 下午來客
        formData.dinnerCustomers,   // R: 晚餐來客
        formData.ageUnder35,        // S: 35y以下
        formData.age35to50,         // T: 35y-50y
        formData.ageOver50,         // U: 50y up
        formData.vegGroups,         // V: 蔬食組數
        formData.localGroups,       // W: 附近居民
        formData.meatGroups,        // X: 葷食組數
        formData.mediaGroups,       // Y: 媒體曝光
        formData.returnGroups,      // Z: 回頭客組數
        formData.returnRate,        // AA: 回頭客率
        formData.socialGroups,      // AB: IG、FB
        formData.walkinGroups,      // AC: 自來客組數
        formData.outtownGroups,     // AD: 外地前往
        formData.cardSigned,        // AE: 簽名店卡
        formData.cardUsed,          // AF: 使用店卡
        formData.staff              // AG: 結帳人
    ];

    // 呼叫後端 API
    callGAS('submitCheckout', { rowData: rowData, staffName: formData.staff }, function(response) {
        App.state.isSubmitting = false;
        closeModal();

        if (response.status === 'success') {
            showToast('結帳資料已送出！', 'success');

            // 重設表單
            resetForm();
        } else {
            showToast('送出失敗：' + (response.message || '未知錯誤'), 'error');
        }

        // 恢復按鈕
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;

    }, function(error) {
        App.state.isSubmitting = false;
        closeModal();
        showToast('連線錯誤，請稍後再試', 'error');

        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    });
}

// ===== 呼叫 Google Apps Script API =====
function callGAS(functionName, params, onSuccess, onError) {
    // 檢查是否有設定 API URL
    if (!App.config.WEB_APP_URL || App.config.WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
        console.warn('⚠️ 尚未設定 WEB_APP_URL，使用模擬模式');
        // 模擬成功回應 (開發測試用)
        setTimeout(() => {
            onSuccess({ status: 'success', message: '模擬送出成功' });
        }, 1500);
        return;
    }

    // 構建 URL
    const queryParams = new URLSearchParams();
    queryParams.append('function', functionName);

    // 將參數轉為 JSON 字串
    if (params) {
        Object.keys(params).forEach(key => {
            queryParams.append(key, JSON.stringify(params[key]));
        });
    }

    const callbackName = 'gasCallback_' + Date.now();
    queryParams.append('callback', callbackName);

    const url = App.config.WEB_APP_URL + '?' + queryParams.toString();

    // JSONP 回調
    window[callbackName] = function(response) {
        delete window[callbackName];
        document.head.removeChild(script);
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

// ===== 重設表單 =====
function resetForm() {
    // 保留日期和結帳人
    const currentDate = document.getElementById('checkout-date').value;
    const currentStaff = document.getElementById('checkout-staff').value;

    // 清空所有數字輸入
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.value = '';
    });

    // 清空備註
    document.getElementById('remarks').value = '';

    // 清除快速標籤狀態
    document.querySelectorAll('.quick-tag').forEach(btn => {
        btn.classList.remove('active');
    });

    // 重設計算結果
    document.getElementById('avg-price').textContent = '$0';
    document.getElementById('food-ratio').textContent = '0%';
    document.getElementById('set-ratio').textContent = '0%';
    document.getElementById('return-rate').textContent = '0%';

    // 恢復日期和結帳人
    document.getElementById('checkout-date').value = currentDate;
    document.getElementById('checkout-staff').value = currentStaff;

    // 滾動到頂部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== 匯出函數 =====
window.confirmSubmit = confirmSubmit;
window.submitCheckout = submitCheckout;
window.resetForm = resetForm;
