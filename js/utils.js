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

/**
 * 查询IP详细信息
 * @param {string} ip - IP地址
 * @returns {Promise<Object>} IP详细信息
 */
async function queryIPInfo(ip) {
    // 尝试多个API，直到成功
    for (const api of config.ipApis) {
        try {
            const url = api.url.replace('{ip}', ip);
            const response = await fetch(url);
            
            if (!response.ok) {
                console.warn(`${api.name} 查询失败，尝试下一个API...`);
                continue;
            }
            
            const data = await response.json();
            
            // 检查是否有错误
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
 * @param {string} ip - IP地址
 */
async function showIPDetails(ip) {
    // 创建模态框
    const modal = createModal();
    document.body.appendChild(modal);
    
    // 显示加载状态
    const content = modal.querySelector('.modal-content-body');
    content.innerHTML = `
        <div class="ip-loading">
            <div class="spinner"></div>
            <p>正在查询 ${ip} 的详细信息...</p>
        </div>
    `;
    
    try {
        const info = await queryIPInfo(ip);
        
        // 显示详细信息
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
                <div class="ip-info-item full-width">
                    <span class="ip-info-label">📌 坐标</span>
                    <span class="ip-info-value">
                        ${info.lat ? `纬度: ${info.lat}, 经度: ${info.lon}` : '未知'}
                        ${info.lat ? `<a href="https://www.google.com/maps?q=${info.lat},${info.lon}" target="_blank" style="margin-left: 10px; color: #667eea;">查看地图 🗺️</a>` : ''}
                    </span>
                </div>
            </div>
        `;
    } catch (error) {
        content.innerHTML = `
            <div class="ip-error">
                <p>❌ 查询失败: ${error.message}</p>
                <p style="font-size: 12px; color: #a0aec0; margin-top: 10px;">
                    可能原因：API限流或网络问题，请稍后重试
                </p>
            </div>
        `;
    }
}

/**
 * 创建模态框
 * @returns {HTMLElement} 模态框元素
 */
function createModal() {
    const modal = document.createElement('div');
    modal.className = 'ip-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>IP 详细信息</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-content-body"></div>
        </div>
    `;
    
    // 关闭按钮事件
    const closeBtn = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');
    
    const closeModal = () => {
        modal.classList.add('modal-closing');
        setTimeout(() => modal.remove(), 300);
    };
    
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    
    // ESC键关闭
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
    
    return modal;
}
