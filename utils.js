/**
 * 雲川水月 晚班結帳系統
 * utils.js - 通用工具函數庫
 * 版本: 1.1.0
 */

const Utils = {
    // ===== 格式化函數 =====
    format: {
        currency: function(num) {
            return '$' + (num || 0).toLocaleString();
        },
        
        weekday: function(dateStr) {
            const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const date = new Date(dateStr);
            return days[date.getDay()];
        },
        
        percent: function(num) {
            return (num || 0).toFixed(1) + '%';
        }
    },

    // ===== UI 工具 =====
    ui: {
        showToast: function(message, type = 'success') {
            const toast = document.getElementById('toast');
            if (!toast) return;
            
            toast.textContent = message;
            toast.className = 'toast ' + type + ' show';

            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        },

        toggleSection: function(header) {
            const content = header.nextElementSibling;
            const toggle = header.querySelector('.section-toggle');
            
            if (content && toggle) {
                content.classList.toggle('collapsed');
                toggle.classList.toggle('collapsed');
            }
        },
        
        closeModal: function(modalId = 'confirm-modal') {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('show');
            }
        }
    },

    // ===== 網路請求 =====
    api: {
        callGAS: function(config, functionName, params, onSuccess, onError) {
            // 檢查是否有設定 API URL
            if (!config.WEB_APP_URL || config.WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
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

            const url = config.WEB_APP_URL + '?' + queryParams.toString();

            // Debug log - 請求資訊
            console.log('📤 API 請求:', functionName, params);
            console.log('🔗 完整 URL:', url);

            // 建立 script 標籤
            const script = document.createElement('script');
            script.src = url;

            // JSONP 回調
            window[callbackName] = function(response) {
                console.log('📥 API 回應:', JSON.stringify(response, null, 2));
                cleanup();
                if (onSuccess) {
                    onSuccess(response);
                }
            };

            // 清理函數
            function cleanup() {
                delete window[callbackName];
                if (script.parentNode) {
                    document.head.removeChild(script);
                }
                clearTimeout(timeoutId);
            }

            // 超時處理
            const timeoutId = setTimeout(() => {
                console.error('⏱️ API 請求超時:', functionName);
                cleanup();
                if (onError) {
                    onError({ status: 'error', message: '請求超時' });
                }
            }, config.API_TIMEOUT || 30000);

            // 錯誤處理
            script.onerror = function(e) {
                console.error('❌ API 網路錯誤:', functionName, e);
                cleanup();
                if (onError) {
                    onError({ status: 'error', message: '網路錯誤' });
                }
            };

            document.head.appendChild(script);
        }
    }
};

// 匯出給全域使用
window.Utils = Utils;

