// 主应用逻辑 - 超级增强版

class ProxyApp {
    constructor() {
        this.allProxies = [];
        this.filteredProxies = [];
        this.currentPage = 1;
        this.pageSize = 50;
        this.selectedRows = new Set();
        this.favorites = new Set();
        this.searchHistory = [];
        this.speedCache = new Map();
        this.sortMethod = 'default';
        this.init();
    }

    async init() {
        this.loadLocalData();
        await this.loadProxyData();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.showUpdateTime();
        this.animateStats();
        this.loadQuickFilters();
    }

    // 加载本地数据
    loadLocalData() {
        try {
            const savedFavorites = localStorage.getItem('proxyFavorites');
            if (savedFavorites) {
                this.favorites = new Set(JSON.parse(savedFavorites));
            }

            const savedHistory = localStorage.getItem('searchHistory');
            if (savedHistory) {
                this.searchHistory = JSON.parse(savedHistory);
            }

            const savedTheme = localStorage.getItem('theme') || 'dark';
            document.body.setAttribute('data-theme', savedTheme);
            this.updateThemeIcon(savedTheme);
        } catch (error) {
            console.error('加载本地数据失败:', error);
        }
    }

    // 保存本地数据
    saveLocalData() {
        try {
            localStorage.setItem('proxyFavorites', JSON.stringify([...this.favorites]));
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('保存本地数据失败:', error);
        }
    }

    async loadProxyData() {
        try {
            let response = await fetch(config.dataUrl);
            
            if (!response.ok) {
                console.log('本地数据加载失败，使用GitHub源...');
                response = await fetch(config.fallbackDataUrl);
            }

            const text = await response.text();
            const lines = text.trim().split('\n').filter(line => line.trim());
            
            this.allProxies = lines.map(line => parseProxyLine(line));
            this.filteredProxies = [...this.allProxies];
            
            this.populateFilters();
            this.applySort();
            this.renderTable();
            this.updateStats();
            this.updateFavoritesBadge();
            
            toggleElement('loadingMessage', false);
            toggleElement('proxyTable', true);
            toggleElement('paginationContainer', true);
            
            // 显示更新成功
            this.showNotification('✅ 数据加载成功！', 'success');
            
        } catch (error) {
            console.error('数据加载失败:', error);
            document.getElementById('loadingMessage').innerHTML = `
                <div class="loading-spinner"></div>
                <p class="loading-text" style="color: var(--danger-color);">❌ 数据加载失败</p>
                <p class="loading-subtext">请检查网络连接或稍后重试</p>
                <button onclick="location.reload()" class="refresh-btn" style="margin-top: 20px;">
                    🔄 重新加载
                </button>
            `;
        }
    }

    populateFilters() {
        const countries = [...new Set(this.allProxies.map(p => p.countryName))].sort();
        const ports = [...new Set(this.allProxies.map(p => p.port))].sort((a, b) => Number(a) - Number(b));
        const companies = [...new Set(this.allProxies.map(p => p.company))].sort();

        const countrySelect = document.getElementById('countryFilter');
        const portSelect = document.getElementById('portFilter');
        const companySelect = document.getElementById('companyFilter');

        countrySelect.innerHTML = '<option value="">全部国家</option>';
        portSelect.innerHTML = '<option value="">全部端口</option>';
        companySelect.innerHTML = '<option value="">全部公司</option>';

        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });

        ports.forEach(port => {
            const option = document.createElement('option');
            option.value = port;
            option.textContent = `端口 ${port}`;
            portSelect.appendChild(option);
        });

        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company;
            option.textContent = company.length > 50 ? company.substring(0, 50) + '...' : company;
            option.title = company;
            companySelect.appendChild(option);
        });

        console.log(`✅ 已加载 ${countries.length} 个国家，${ports.length} 个端口，${companies.length} 个公司`);
    }

    // 加载快速筛选标签
    loadQuickFilters() {
        const quickFilters = document.getElementById('quickFilters');
        const popularPorts = ['80', '443', '8080', '3128', '1080'];
        const popularCountries = ['美国', '日本', '新加坡', '香港', '德国'];

        let html = '<span class="quick-filter-label">快速筛选：</span>';
        
        popularPorts.forEach(port => {
            html += `<span class="quick-filter-tag" onclick="quickFilter('port', '${port}')">
                🔌 ${port}
            </span>`;
        });

        popularCountries.forEach(country => {
            html += `<span class="quick-filter-tag" onclick="quickFilter('country', '${country}')">
                🌍 ${country}
            </span>`;
        });

        quickFilters.innerHTML = html;
    }

    renderTable() {
        const tbody = document.getElementById('proxyTableBody');
        const table = document.getElementById('proxyTable');
        const noData = document.getElementById('noDataMessage');
        
        tbody.innerHTML = '';

        if (this.filteredProxies.length === 0) {
            table.style.display = 'none';
            noData.style.display = 'block';
            toggleElement('paginationContainer', false);
            return;
        }

        table.style.display = 'table';
        noData.style.display = 'none';
        toggleElement('paginationContainer', true);

        const totalPages = Math.ceil(this.filteredProxies.length / this.pageSize);
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredProxies.length);
        const displayProxies = this.filteredProxies.slice(startIndex, endIndex);
        
        displayProxies.forEach((proxy, index) => {
            const globalIndex = startIndex + index;
            const proxyKey = `${proxy.ip}:${proxy.port}`;
            const isFavorited = this.favorites.has(proxyKey);
            const speed = this.speedCache.get(proxyKey);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="col-checkbox">
                    <input type="checkbox" class="row-checkbox" data-index="${globalIndex}" ${this.selectedRows.has(globalIndex) ? 'checked' : ''}>
                </td>
                <td class="col-star">
                    <button class="star-btn ${isFavorited ? 'favorited' : ''}" onclick="toggleFavorite('${proxy.ip}', '${proxy.port}')" title="${isFavorited ? '取消收藏' : '添加收藏'}">
                        ${isFavorited ? '⭐' : '☆'}
                    </button>
                </td>
                <td class="col-ip">
                    <span class="ip-clickable" onclick="showIPDetails('${proxy.ip}')" title="点击查看详情">${proxy.ip}</span>
                </td>
                <td class="col-port">
                    <span class="port-badge">${proxy.port}</span>
                </td>
                <td class="col-country">${proxy.countryName}</td>
                <td class="col-company" title="${proxy.company}">
                    ${proxy.company.length > 40 ? proxy.company.substring(0, 40) + '...' : proxy.company}
                </td>
                <td class="col-speed">
                    ${this.getSpeedBadge(speed)}
                </td>
                <td class="col-actions">
                    <button class="copy-btn" onclick="app.handleCopy('${proxy.ip}:${proxy.port}', this)" title="复制IP:端口">
                        📋 复制
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 更新分页信息
        this.updatePagination(totalPages, startIndex, endIndex);

        // 添加checkbox事件
        document.querySelectorAll('.row-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                if (e.target.checked) {
                    this.selectedRows.add(index);
                } else {
                    this.selectedRows.delete(index);
                }
                this.updateSelectAllCheckbox();
            });
        });
    }

    getSpeedBadge(speed) {
        if (!speed) {
            return '<span class="speed-badge speed-unknown">未测试</span>';
        }
        if (speed < 200) {
            return `<span class="speed-badge speed-fast">${speed}ms</span>`;
        } else if (speed < 500) {
            return `<span class="speed-badge speed-medium">${speed}ms</span>`;
        } else {
            return `<span class="speed-badge speed-slow">${speed}ms</span>`;
        }
    }

    updatePagination(totalPages, startIndex, endIndex) {
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = totalPages;
        document.getElementById('pageInput').value = this.currentPage;
        document.getElementById('pageInput').max = totalPages;
        document.getElementById('rangeStart').textContent = startIndex + 1;
        document.getElementById('rangeEnd').textContent = endIndex;
        document.getElementById('totalItems').textContent = this.filteredProxies.length;
        
        document.getElementById('prevBtn').disabled = this.currentPage === 1;
        document.getElementById('nextBtn').disabled = this.currentPage === totalPages;
        document.getElementById('firstBtn').disabled = this.currentPage === 1;
        document.getElementById('lastBtn').disabled = this.currentPage === totalPages;
    }

    handleCopy(text, btn) {
        copyToClipboard(text, btn);
    }

    applyFilters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        const countryFilter = document.getElementById('countryFilter').value.trim();
        const portFilter = document.getElementById('portFilter').value.trim();
        const companyFilter = document.getElementById('companyFilter').value.trim();

        // 保存搜索历史
        if (searchTerm && !this.searchHistory.includes(searchTerm)) {
            this.searchHistory.unshift(searchTerm);
            this.searchHistory = this.searchHistory.slice(0, 10); // 只保留10条
            this.saveLocalData();
        }

        console.log('🔍 筛选条件:', { searchTerm, countryFilter, portFilter, companyFilter });

        this.filteredProxies = this.allProxies.filter(proxy => {
            const matchesSearch = !searchTerm || 
                proxy.ip.toLowerCase().includes(searchTerm) ||
                proxy.countryName.toLowerCase().includes(searchTerm) ||
                proxy.company.toLowerCase().includes(searchTerm) ||
                proxy.port.includes(searchTerm);
            
            const matchesCountry = !countryFilter || proxy.countryName === countryFilter;
            const matchesPort = !portFilter || proxy.port === portFilter;
            const matchesCompany = !companyFilter || proxy.company === companyFilter;

            return matchesSearch && matchesCountry && matchesPort && matchesCompany;
        });

        console.log(`✅ 筛选结果: ${this.filteredProxies.length} 条记录`);

        this.currentPage = 1;
        this.selectedRows.clear();
        this.applySort();
        this.renderTable();
        this.updateStats();
        this.updateFilterTrend();
    }

    // 应用排序
    applySort() {
        const sortMethod = document.getElementById('sortFilter')?.value || this.sortMethod;
        this.sortMethod = sortMethod;

        switch(sortMethod) {
            case 'ip-asc':
                this.filteredProxies.sort((a, b) => a.ip.localeCompare(b.ip));
                break;
            case 'ip-desc':
                this.filteredProxies.sort((a, b) => b.ip.localeCompare(a.ip));
                break;
            case 'port-asc':
                this.filteredProxies.sort((a, b) => Number(a.port) - Number(b.port));
                break;
            case 'port-desc':
                this.filteredProxies.sort((a, b) => Number(b.port) - Number(a.port));
                break;
            case 'country-asc':
                this.filteredProxies.sort((a, b) => a.countryName.localeCompare(b.countryName));
                break;
            case 'country-desc':
                this.filteredProxies.sort((a, b) => b.countryName.localeCompare(a.countryName));
                break;
            default:
                // 默认排序，保持原始顺序
                break;
        }
    }

    updateStats() {
        updateElementText('totalCount', formatNumber(this.allProxies.length));
        updateElementText('filteredCount', formatNumber(this.filteredProxies.length));
        
        const uniqueCountries = new Set(this.allProxies.map(p => p.countryCode));
        updateElementText('countryCount', uniqueCountries.size);

        const uniquePorts = new Set(this.allProxies.map(p => p.port));
        updateElementText('portCount', uniquePorts.size);
    }

    updateFilterTrend() {
        const filterTrend = document.getElementById('filterTrend');
        const percentage = ((this.filteredProxies.length / this.allProxies.length) * 100).toFixed(1);
        
        if (this.filteredProxies.length === this.allProxies.length) {
            filterTrend.textContent = '未筛选';
            filterTrend.style.color = 'var(--text-secondary)';
        } else {
            filterTrend.textContent = `${percentage}% 匹配`;
            filterTrend.style.color = 'var(--warning-color)';
        }
    }

    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const visibleCheckboxes = document.querySelectorAll('.row-checkbox');
        const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);
        const someChecked = Array.from(visibleCheckboxes).some(cb => cb.checked);
        
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = someChecked && !allChecked;
    }

    updateFavoritesBadge() {
        const badge = document.getElementById('favoritesBadge');
        badge.textContent = this.favorites.size;
        badge.style.display = this.favorites.size > 0 ? 'block' : 'none';
    }

    // 显示更新时间
    showUpdateTime() {
        const updateTime = document.getElementById('updateTime');
        const now = new Date();
        const timeStr = now.toLocaleString('zh-CN', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        updateTime.textContent = `最后更新: ${timeStr}`;
        
        // 每分钟更新一次
        setInterval(() => {
            const now = new Date();
            const timeStr = now.toLocaleString('zh-CN', { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            updateTime.textContent = `最后更新: ${timeStr}`;
        }, 60000);
    }

    // 动画统计卡片
    animateStats() {
        setTimeout(() => {
            document.querySelectorAll('.stat-card').forEach(card => {
                card.classList.add('animated');
            });
        }, 100);
    }

    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    setupEventListeners() {
        const debouncedFilter = debounce(() => this.applyFilters(), 300);
        
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', debouncedFilter);
        
        // 搜索框聚焦显示历史
        searchInput.addEventListener('focus', () => {
            this.showSearchHistory();
        });

        document.getElementById('countryFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('portFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('companyFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('sortFilter')?.addEventListener('change', () => {
            this.applySort();
            this.renderTable();
        });

        // 点击其他地方隐藏搜索历史
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-wrapper')) {
                document.getElementById('searchHistory').classList.remove('show');
            }
        });
    }

    // 显示搜索历史
    showSearchHistory() {
        const historyContainer = document.getElementById('searchHistory');
        
        if (this.searchHistory.length === 0) {
            historyContainer.classList.remove('show');
            return;
        }

        let html = '';
        this.searchHistory.forEach((term, index) => {
            html += `
                <div class="search-history-item" onclick="app.useSearchHistory('${term}')">
                    <span>🔍 ${term}</span>
                    <span class="search-history-remove" onclick="event.stopPropagation(); app.removeSearchHistory(${index})">×</span>
                </div>
            `;
        });

        historyContainer.innerHTML = html;
        historyContainer.classList.add('show');
    }

    useSearchHistory(term) {
        document.getElementById('searchInput').value = term;
        this.applyFilters();
        document.getElementById('searchHistory').classList.remove('show');
    }

    removeSearchHistory(index) {
        this.searchHistory.splice(index, 1);
        this.saveLocalData();
        this.showSearchHistory();
    }

    // 键盘快捷键
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+F - 聚焦搜索
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
            
            // Ctrl+A - 全选
            if (e.ctrlKey && e.key === 'a' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                selectAll();
            }
            
            // Ctrl+C - 复制选中
            if (e.ctrlKey && e.key === 'c' && !e.target.matches('input, textarea')) {
                if (this.selectedRows.size > 0) {
                    e.preventDefault();
                    copySelected();
                }
            }
            
            // Esc - 关闭弹窗
            if (e.key === 'Escape') {
                closeFavorites();
                closeStats();
            }
            
            // ? - 显示/隐藏快捷键提示
            if (e.key === '?' && !e.target.matches('input, textarea')) {
                toggleKeyboardHints();
            }
        });
    }
}

// 分页功能
function prevPage() {
    if (app.currentPage > 1) {
        app.currentPage--;
        app.renderTable();
        scrollToTop();
    }
}

function nextPage() {
    const totalPages = Math.ceil(app.filteredProxies.length / app.pageSize);
    if (app.currentPage < totalPages) {
        app.currentPage++;
        app.renderTable();
        scrollToTop();
    }
}

function firstPage() {
    app.currentPage = 1;
    app.renderTable();
    scrollToTop();
}

function lastPage() {
    const totalPages = Math.ceil(app.filteredProxies.length / app.pageSize);
    app.currentPage = totalPages;
    app.renderTable();
    scrollToTop();
}

function goToPage() {
    const input = document.getElementById('pageInput');
    const page = parseInt(input.value);
    const totalPages = Math.ceil(app.filteredProxies.length / app.pageSize);
    
    if (page >= 1 && page <= totalPages) {
        app.currentPage = page;
        app.renderTable();
        scrollToTop();
    } else {
        input.value = app.currentPage;
    }
}

function changePageSize() {
    app.pageSize = parseInt(document.getElementById('pageSizeFilter').value);
    app.currentPage = 1;
    app.renderTable();
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 全选功能
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.row-checkbox');
    
    checkboxes.forEach(cb => {
        cb.checked = selectAllCheckbox.checked;
        const index = parseInt(cb.dataset.index);
        if (selectAllCheckbox.checked) {
            app.selectedRows.add(index);
        } else {
            app.selectedRows.delete(index);
        }
    });
}

function selectAll() {
    app.filteredProxies.forEach((_, index) => {
        app.selectedRows.add(index);
    });
    app.renderTable();
    app.showNotification(`✅ 已选择 ${app.filteredProxies.length} 个代理`, 'success');
}

// 复制选中
function copySelected() {
    if (app.selectedRows.size === 0) {
        app.showNotification('⚠️ 请先选择要复制的代理', 'warning');
        return;
    }

    const selected = Array.from(app.selectedRows)
        .map(index => app.filteredProxies[index])
        .filter(proxy => proxy)
        .map(proxy => `${proxy.ip}:${proxy.port}`)
        .join('\n');

    navigator.clipboard.writeText(selected).then(() => {
        app.showNotification(`✅ 已复制 ${app.selectedRows.size} 个代理`, 'success');
    }).catch(err => {
        console.error('复制失败:', err);
        app.showNotification('❌ 复制失败，请手动复制', 'error');
    });
}

// 收藏功能
function toggleFavorite(ip, port) {
    const key = `${ip}:${port}`;
    
    if (app.favorites.has(key)) {
        app.favorites.delete(key);
        app.showNotification('💔 已取消收藏', 'info');
    } else {
        app.favorites.add(key);
        app.showNotification('⭐ 已添加到收藏', 'success');
    }
    
    app.saveLocalData();
    app.updateFavoritesBadge();
    app.renderTable();
}

function addToFavorites() {
    if (app.selectedRows.size === 0) {
        app.showNotification('⚠️ 请先选择要收藏的代理', 'warning');
        return;
    }

    let added = 0;
    app.selectedRows.forEach(index => {
        const proxy = app.filteredProxies[index];
        if (proxy) {
            const key = `${proxy.ip}:${proxy.port}`;
            if (!app.favorites.has(key)) {
                app.favorites.add(key);
                added++;
            }
        }
    });

    app.saveLocalData();
    app.updateFavoritesBadge();
    app.renderTable();
    app.showNotification(`⭐ 已添加 ${added} 个代理到收藏`, 'success');
}

function openFavorites() {
    if (app.favorites.size === 0) {
        app.showNotification('📭 收藏夹是空的', 'info');
        return;
    }

    const modal = document.getElementById('favoritesModal');
    const list = document.getElementById('favoritesList');
    
    let html = '';
    app.favorites.forEach(key => {
        const [ip, port] = key.split(':');
        const proxy = app.allProxies.find(p => p.ip === ip && p.port === port);
        
        if (proxy) {
            html += `
                <div class="favorite-item">
                    <div class="favorite-info">
                        <div class="favorite-ip">${ip}:${port}</div>
                        <div class="favorite-details">
                            ${proxy.countryName} · ${proxy.company}
                        </div>
                    </div>
                    <div class="favorite-actions">
                        <button class="copy-btn" onclick="app.handleCopy('${ip}:${port}', this)">📋 复制</button>
                        <button class="copy-btn" style="background: var(--danger-color);" onclick="toggleFavorite('${ip}', '${port}'); openFavorites();">
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            `;
        }
    });
    
    list.innerHTML = html || '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">收藏夹是空的</p>';
    modal.style.display = 'flex';
}

function closeFavorites() {
    document.getElementById('favoritesModal').style.display = 'none';
}

// 统计图表
function showStats() {
    const modal = document.getElementById('statsModal');
    modal.style.display = 'flex';
    
    // 渲染国家分布图
    renderCountryChart();
    
    // 渲染端口统计图
    renderPortChart();
}

function closeStats() {
    document.getElementById('statsModal').style.display = 'none';
}

function renderCountryChart() {
    const countryCount = {};
    app.allProxies.forEach(proxy => {
        countryCount[proxy.countryName] = (countryCount[proxy.countryName] || 0) + 1;
    });

    const sorted = Object.entries(countryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const max = sorted[0][1];
    let html = '';

    sorted.forEach(([country, count]) => {
        const percentage = (count / max * 100).toFixed(1);
        html += `
            <div class="chart-bar">
                <div class="chart-label">${country}</div>
                <div class="chart-bar-container">
                    <div class="chart-bar-fill" style="width: ${percentage}%">
                        <span class="chart-value">${count}</span>
                    </div>
                </div>
            </div>
        `;
    });

    document.getElementById('countryChart').innerHTML = html;
}

function renderPortChart() {
    const portCount = {};
    app.allProxies.forEach(proxy => {
        portCount[proxy.port] = (portCount[proxy.port] || 0) + 1;
    });

    const sorted = Object.entries(portCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const max = sorted[0][1];
    let html = '';

    sorted.forEach(([port, count]) => {
        const percentage = (count / max * 100).toFixed(1);
        html += `
            <div class="chart-bar">
                <div class="chart-label">端口 ${port}</div>
                <div class="chart-bar-container">
                    <div class="chart-bar-fill" style="width: ${percentage}%">
                        <span class="chart-value">${count}</span>
                    </div>
                </div>
            </div>
        `;
    });

    document.getElementById('portChart').innerHTML = html;
}

// 导出数据
function exportData() {
    const dataToExport = app.filteredProxies.length > 0 ? app.filteredProxies : app.allProxies;
    const csv = 'IP地址,端口,国家代码,国家,运营商\n' + 
        dataToExport.map(p => `${p.ip},${p.port},${p.countryCode},${p.countryName},"${p.company}"`).join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `proxy-list-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    
    app.showNotification(`✅ 已导出 ${dataToExport.length} 条数据`, 'success');
}

// 重置筛选
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('countryFilter').value = '';
    document.getElementById('portFilter').value = '';
    document.getElementById('companyFilter').value = '';
    document.getElementById('sortFilter').value = 'default';
    app.applyFilters();
    app.showNotification('🔄 已重置所有筛选条件', 'info');
}

// 保存筛选条件
function saveFilter() {
    const filter = {
        search: document.getElementById('searchInput').value,
        country: document.getElementById('countryFilter').value,
        port: document.getElementById('portFilter').value,
        company: document.getElementById('companyFilter').value,
        sort: document.getElementById('sortFilter').value
    };
    
    localStorage.setItem('savedFilter', JSON.stringify(filter));
    app.showNotification('💾 筛选条件已保存', 'success');
}

// 加载筛选条件
function loadFilter() {
    const saved = localStorage.getItem('savedFilter');
    if (!saved) {
        app.showNotification('⚠️ 没有保存的筛选条件', 'warning');
        return;
    }

    const filter = JSON.parse(saved);
    document.getElementById('searchInput').value = filter.search || '';
    document.getElementById('countryFilter').value = filter.country || '';
    document.getElementById('portFilter').value = filter.port || '';
    document.getElementById('companyFilter').value = filter.company || '';
    document.getElementById('sortFilter').value = filter.sort || 'default';
    
    app.applyFilters();
    app.showNotification('📂 筛选条件已加载', 'success');
}

// 快速筛选
function quickFilter(type, value) {
    if (type === 'port') {
        document.getElementById('portFilter').value = value;
    } else if (type === 'country') {
        document.getElementById('countryFilter').value = value;
    }
    
    app.applyFilters();
    
    // 高亮选中的标签
    document.querySelectorAll('.quick-filter-tag').forEach(tag => {
        tag.classList.remove('active');
    });
    event.target.classList.add('active');
}

// 智能推荐
function recommendFastest() {
    app.showNotification('🚀 智能推荐功能开发中...', 'info');
    // TODO: 实现智能推荐逻辑
}

// 显示热门国家
function showPopularCountries() {
    const countryCount = {};
    app.allProxies.forEach(proxy => {
        countryCount[proxy.countryName] = (countryCount[proxy.countryName] || 0) + 1;
    });

    const popular = Object.entries(countryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([country, count]) => `${country} (${count})`)
        .join(', ');

    app.showNotification(`🔥 热门国家: ${popular}`, 'info');
}

// 测试速度
function testSpeed() {
    app.showNotification('🎯 批量测速功能开发中...', 'info');
    // TODO: 实现批量测速逻辑
}

function testSelected() {
    if (app.selectedRows.size === 0) {
        app.showNotification('⚠️ 请先选择要测试的代理', 'warning');
        return;
    }
    app.showNotification('🎯 测速功能开发中...', 'info');
    // TODO: 实现测速逻辑
}

// 主题切换
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    app.updateThemeIcon(newTheme);
    app.showNotification(`${newTheme === 'dark' ? '🌙' : '☀️'} 已切换到${newTheme === 'dark' ? '深色' : '浅色'}模式`, 'info');
}

ProxyApp.prototype.updateThemeIcon = function(theme) {
    document.getElementById('themeIcon').textContent = theme === 'dark' ? '🌙' : '☀️';
};

// 快捷键提示
function toggleKeyboardHints() {
    const hints = document.getElementById('keyboardHints');
    hints.classList.toggle('show');
    
    if (hints.classList.contains('show')) {
        setTimeout(() => hints.classList.remove('show'), 5000);
    }
}

// 清除缓存并重载
function clearCacheAndReload() {
    if ('caches' in window) {
        caches.keys().then(function(names) {
            for (let name of names) {
                caches.delete(name);
            }
        });
    }
    
    localStorage.removeItem('proxyFavorites');
    localStorage.removeItem('searchHistory');
    localStorage.removeItem('savedFilter');
    
    app.showNotification('🔄 正在刷新...', 'info');
    setTimeout(() => window.location.reload(true), 500);
}

// 创建全局应用实例
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ProxyApp();
    
    // 显示快捷键提示3秒
    setTimeout(() => {
        toggleKeyboardHints();
    }, 1000);
});

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
