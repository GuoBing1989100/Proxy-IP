// 工具函数

// 防抖函数
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

// 格式化数字
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// 解析代理行
function parseProxyLine(line) {
    const parts = line.trim().split('#');
    if (parts.length < 3) {
        console.warn('无效的代理行:', line);
        return null;
    }

    const [ipPort, countryCode, company] = parts;
    const [ip, port] = ipPort.split(':');
    
    if (!ip || !port) {
        console.warn('无效的IP或端口:', line);
        return null;
    }

    const countryName = countryNames[countryCode] || countryCode || '未知';

    return {
        ip: ip.trim(),
        port: port.trim(),
        countryCode: countryCode ? countryCode.trim() : 'XX',
        countryName: countryName,
        company: company ? company.trim() : '未知运营商'
    };
}

// 切换元素显示
function toggleElement(id, show) {
    const element = document.getElementById(id);
    if (element) {
        element.style.display = show ? 'block' : 'none';
    }
}

// 更新元素文本
function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

// 复制到剪贴板
function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '✅ 已复制';
        button.style.background = 'var(--success-color)';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    });
}

// 显示IP详情
function showIPDetails(ip) {
    const modal = document.createElement('div');
    modal.className = 'ip-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>🌐 IP 详细信息</h3>
                <button class="modal-close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
            </div>
            <div class="modal-content-body">
                <div class="ip-info-loading">
                    <div class="loading-spinner"></div>
                    <p>正在查询 ${ip} 的详细信息...</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // 查询IP信息
    const api = config.ipApis[0];
    fetch(api.url.replace('{ip}', ip))
        .then(res => res.json())
        .then(data => {
            const info = api.parse(data);
            const body = modal.querySelector('.modal-content-body');
            body.innerHTML = `
                <div class="ip-info-grid">
                    <div class="ip-info-item">
                        <span class="ip-info-label">IP 地址</span>
                        <span class="ip-info-value">${info.ip}</span>
                    </div>
                    <div class="ip-info-item">
                        <span class="ip-info-label">国家</span>
                        <span class="ip-info-value">${info.country}</span>
                    </div>
                    <div class="ip-info-item">
                        <span class="ip-info-label">地区</span>
                        <span class="ip-info-value">${info.region || '未知'}</span>
                    </div>
                    <div class="ip-info-item">
                        <span class="ip-info-label">城市</span>
                        <span class="ip-info-value">${info.city || '未知'}</span>
                    </div>
                    <div class="ip-info-item full-width">
                        <span class="ip-info-label">运营商 (ISP)</span>
                        <span class="ip-info-value">${info.isp || '未知'}</span>
                    </div>
                    <div class="ip-info-item full-width">
                        <span class="ip-info-label">组织</span>
                        <span class="ip-info-value">${info.org || '未知'}</span>
                    </div>
                </div>
            `;
        })
        .catch(error => {
            console.error('IP查询失败:', error);
            const body = modal.querySelector('.modal-content-body');
            body.innerHTML = `
                <div class="ip-error">
                    <p>❌ 查询失败，请稍后重试</p>
                </div>
            `;
        });
}
