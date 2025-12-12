// 工具函数模块

/**
 * 复制文本到剪贴板
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
 */
function getCountryName(countryCode) {
    return countryNames[countryCode] || countryCode;
}

/**
 * 解析代理数据行
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
 */
function toggleElement(elementId, show) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

/**
 * 更新元素文本内容
 */
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
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
 * 格式化数字（添加千分位）
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 查询IP详细信息
 */
async function queryIPInfo(ip) {
    for (const api of config.ipApis) {
        try {
            const url = api.url.replace('{ip}', ip);
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn(`${api.name} 查询失败，尝试下一个API...`);
                continue;
            }
            
            const data = await response.json();
            
            if (data.status === 'fail' || data.error) {
                console.warn(`${api.name} 返回错误，尝试下一个API...`);
                continue;
            }
            
            return api.parse(data);
        } catch (error) {
            console.warn(`${api.name} 查询出错:`, error);
            continue;
        }
    }
    
    throw new Error('所有IP查询API均失败');
}

/**
 * 显示IP详细信息模态框
 */
async function showIPDetails(ip) {
    const modal = createModal();
    document.body.appendChild(modal);
    
    const content = modal.querySelector('.modal-content-body');
    content.innerHTML = `
        <div class="ip-loading">
            <div class="spinner"></div>
            <p>正在查询 ${ip} 的详细信息...</p>
        </div>
    `;
    
    try {
        const info = await queryIPInfo(ip);
        
        content.innerHTML = `
            <div class="ip-info-grid">
                <div class="ip-info-item">
                    <span class="ip-info-label">🌐 IP地址</span>
                    <span class="ip-info-value">${info.ip}</span>
                </div>
                <div class="ip-info-item">
                    <span class="ip-info-label">🏳️ 国家</span>
                    <span class="ip-info-value">${info.country} (${info.countryCode})</span>
                </div>
                <div class="ip-info-item">
                    <span class="ip-info-label">📍 地区</span>
                    <span class="ip-info-value">${info.region || '未知'}</span>
                </div>
                <div class="ip-info-item">
                    <span class="ip-info-label">🏙️ 城市</span>
                    <span class="ip-info-value">${info.city || '未知'}</span>
                </div>
                <div class="ip-info-item">
                    <span class="ip-info-label">📮 邮编</span>
                    <span class="ip-info-value">${info.zip || '未知'}</span>
                </div>
                <div class="ip-info-item">
                    <span class="ip-info-label">🕐 时区</span>
                    <span class="ip-info-value">${info.timezone || '未知'}</span>
                </div>
                <div class="ip-info-item">
                    <span class="ip-info-label">📡 ISP</span>
                    <span class="ip-info-value">${info.isp || '未知'}</span>
                </div>
                <div class="ip-info-item">
                    <span class="ip-info-label">🏢 组织</span>
                    <span class="ip-info-value">${info.org || '未知'}</span>
                </div>
                <div class="ip-info-item">
                    <span class="ip-info-label">🔢 AS号</span>
                    <span class="ip-info-value">${info.as || '未知'}</span>
                </div>
                <div class="
