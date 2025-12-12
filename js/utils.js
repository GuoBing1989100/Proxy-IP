// 工具函数模块

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @param {HTMLElement} btn - 按钮元素（用于显示反馈）
 */
function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.textContent;
        btn.textContent = '已复制!';
        btn.style.background = '#48bb78';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 1000);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    });
}

/**
 * 获取国家的中文名称
 * @param {string} countryCode - 国家代码
 * @returns {string} 国家中文名称
 */
function getCountryName(countryCode) {
    return countryNames[countryCode] || countryCode;
}

/**
 * 解析代理数据行
 * @param {string} line - 数据行
 * @returns {Object} 代理对象
 */
function parseProxyLine(line) {
    const parts = line.split(',');
    return {
        ip: parts[0]?.trim() || '',
        port: parts[1]?.trim() || '',
        countryCode: parts[2]?.trim() || '',
        countryName: getCountryName(parts[2]?.trim() || ''),
        company: parts[3]?.trim() || '未知'
    };
}

/**
 * 显示/隐藏元素
 * @param {string} elementId - 元素ID
 * @param {boolean} show - 是否显示
 */
function toggleElement(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

/**
 * 更新元素文本内容
 * @param {string} elementId - 元素ID
 * @param {string} text - 文本内容
 */
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 格式化数字（添加千分位）
 * @param {number} num - 数字
 * @returns {string} 格式化后的字符串
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
