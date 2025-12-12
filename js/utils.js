// 工具函数

/**
 * 解析代理数据行
 * 格式: IP:PORT#国家代码#公司名称
 */
function parseProxyLine(line) {
    try {
        const parts = line.split('#');
        if (parts.length < 2) {
            console.warn('Invalid line format:', line);
            return null;
        }

        const [ipPort, countryCode, company = '未知'] = parts;
        const [ip, port] = ipPort.split(':');

        if (!ip || !port) {
            console.warn('Invalid IP:PORT format:', ipPort);
            return null;
        }

        return {
            ip: ip.trim(),
            port: port.trim(),
            countryCode: countryCode.trim().toUpperCase(),
            countryName: config.countryNames[countryCode.trim().toUpperCase()] || countryCode.trim(),
            company: company.trim()
        };
    } catch (error) {
        console.error('Error parsing line:', line, error);
        return null;
    }
}

/**
 * 防抖函数
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
 * 格式化数字
 */
function formatNumber(num) {
    return num.toLocaleString('zh-CN');
}

/**
 * 复制文本到剪贴板
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('复制失败:', err);
        // 降级方案
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (err) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}
