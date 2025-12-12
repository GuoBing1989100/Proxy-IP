// 主应用 - 最终修复版

class ProxyApp {
    constructor() {
        this.allProxies = [];
        this.filteredProxies = [];
        this.currentPage = 1;
        this.pageSize = 50;
        this.selectedRows = new Set();
        this.favorites = new Set();
        this.searchHistory = [];
        this.sortMethod = 'default';
        this.init();
    }

    async init() {
        console.log('🚀 应用初始化...');
        this.loadLocalData();
        await this.loadProxyData();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.showUpdateTime();
        this.loadQuickFilters();
    }

    loadLocalData() {
        try {
            const savedFavorites = localStorage.getItem('proxyFavorites');
            if (savedFavorites) {
                this.favorites = new Set(JSON.parse(savedFavorites));
                console.log('✅ 已加载', this.favorites.size, '个收藏');
            }

            const savedHistory = localStorage.getItem('searchHistory');
            if (savedHistory) {
                this.searchHistory = JSON.parse(savedHistory);
            }

            const savedTheme = localStorage.getItem('theme') || 'dark';
            document.body.setAttribute('data-theme', savedTheme);
            this.updateThemeIcon(savedTheme);
        } catch (error) {
            console.error('❌ 加载本地数据失败:', error);
        }
    }

    saveLocalData() {
        try {
            localStorage.setItem('proxyFavorites', JSON.stringify([...this.favorites]));
            localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.error('❌ 保存失败:', error);
        }
    }

    async loadProxyData() {
        console.log('📡 开始加载代理数据...');
        
        try {
            // 先尝试本地路径
            let response = await fetch(config.dataUrl);
            
            if (!response.ok) {
                console.log('⚠️ 本地数据加载失败，尝试备用源...');
                response = await fetch(config.fallbackDataUrl);
            }

            if (!response.ok) {
                throw new Error('数据加载失败');
            }

            const text = await response.text();
            console.log('📥 收到数据，长度:', text.length);
            
            const lines = text.trim().split('\n').filter(line => line.trim());
            console.log('📋 总行数:', lines.length);
            
            this.allProxies = lines
                .map(line => parseProxyLine(line))
                .filter(proxy => proxy !== null);
            
            console.log('✅ 成功解析', this.allProxies.length, '个代理');
            
            if (this.allProxies.length === 0) {
                throw new Error('没有有效的代理数据');
            }
            
            this.filteredProxies = [...this.allProxies];
            
            this.populateFilters();
            this.applySort();
            this.renderTable();
            this.updateStats();
            this.updateFavoritesBadge();
            
            toggleElement('loadingMessage', false);
            toggleElement('proxyTable', true);
            toggleElement('paginationContainer', true);
            
            this.showNotification('✅ 数据加载成功！共 ' + this.allProxies.length + ' 个代理', 'success');
            
        } catch (error) {
            console.error('❌ 加载失败:', error);
            document.getElementById('loadingMessage').innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">😢</div>
                    <h3 style="color: var(--danger-color); margin-bottom: 12px;">数据加载失败</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 24px;">
                        ${error.message}<br>
                        请检查网络连接或稍后重试
                    </p>
                    <button onclick="location.reload()" class="copy-btn" style="padding: 12px 32px;">
                        🔄 重新加载
                    </button>
                </div>
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

        countrySelect.innerHTML = '<option value="">🌏 全部国家</option>';
        portSelect.innerHTML = '<option value="">🔌 全部端口</option>';
        companySelect.innerHTML = '<option value="">🏢 全部运营商</option>';

        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = '🌍 ' + country;
            countrySelect.appendChild(option);
        });

        ports.forEach(port => {
            const option = document.createElement('option');
            option.value = port;
            option.textContent = `🔌 端口 ${port}`;
            portSelect.appendChild(option);
        });

        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company;
            const displayName = company.length > 45 ? company.substring(0, 45) + '...' : company;
            option.textContent = '🏢 ' + displayName;
            option.title = company;
            companySelect.appendChild(option);
        });

        console.log(`✅ 筛选器就绪: ${countries.length}国家, ${ports.length}端口, ${companies.length}运营商`);
    }

    loadQuickFilters() {
        const quickFilters = document.getElementById('quickFilters');
        const popularPorts = ['80', '443', '8080', '3128', '1080'];
        const popularCountries = ['美国', '日本', '新加坡', '香港', '德国'];

        let html = '<span class="quick-filter-label">🔥 热门筛选：</span>';
        
        popularPorts.forEach(port => {
            html += `<span class="quick-filter-tag" onclick="quickFilter('port', '${port}')">
                🔌 端口 ${port}
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
            noData.style.display = 'flex';
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
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="col-checkbox">
                    <input type="checkbox" class="row-checkbox" data-index="${globalIndex}" ${this.selectedRows.has(globalIndex) ? 'checked' : ''}>
                </td>
                <td class="col-star">
                    <button class="star-btn ${isFavorited ? 'favorited' : ''}" onclick="toggleFavorite('${proxy.ip}', '${proxy.port}')" title="${isFavorited ? '取消收藏' : '点击收藏'}">
                        ${isFavorited ? '⭐' : '☆'}
                    </button>
                </td>
                <td class="col-ip">
                    <span class="ip-clickable" onclick="showIPDetails('${proxy.ip}')" title="点击查看IP详情">${proxy.ip}</span>
                </td>
                <td class="col-port">
                    <span class="port-badge">${proxy.port}</span>
                </td>
                <td class="col-country">${proxy.countryName}</td>
                <td class="col-company" title="${proxy.company}">
                    ${proxy.company.length > 35 ? proxy.company.substring(0, 35) + '...' : proxy.company}
                </td>
                <td class="col-actions">
                    <button class="copy-btn" onclick="app.handleCopy('${proxy.ip}:${proxy.port}', this)" title="复制 IP:端口">
                        📋 复制
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

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

    updatePagination(totalPages, startIndex, endIndex) {
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
            this.searchHistory = this.searchHistory.slice(0, 10);
            this.saveLocalData();
        }

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

        this.currentPage = 1;
        this.selectedRows.clear();
        this.applySort();
        this.renderTable();
        this.updateStats();
        this.updateFilterTrend();
    }

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
            filterTrend.textContent = '等待筛选';
            filterTrend.style.color = 'var(--text-secondary)';
        } else {
            filterTrend.textContent = `匹配 ${percentage}%`;
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
        badge.style.display = this.favorites.size > 0 ? 'flex' : 'none';
    }

    showUpdateTime() {
        const updateTime = document.getElementById('updateTime');
        const now = new Date();
        const timeStr = now.toLocaleString('zh-CN', { 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit', 
            minute: '2-digit'
        });
        updateTime.textContent = `✅ 数据已更新 (${timeStr})`;
        
        setInterval(() => {
            const now = new Date();
            const timeStr = now.toLocaleString('zh-CN', { 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit', 
                minute: '2-digit'
            });
            updateTime.textContent = `✅ 数据已更新 (${timeStr})`;
        }, 60000);
    }

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
            border: 2px solid ${type === 'success' ? 'var(--success-color)' : 'var(--primary-color)'};
            border-radius: 12px;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            font-weight: 600;
            color: var(--text-primary);
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
        searchInput.addEventListener('focus', () => this.showSearchHistory());

        document.getElementById('countryFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('portFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('companyFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('sortFilter')?.addEventListener('change', () => {
            this.applySort();
            this.renderTable();
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-wrapper')) {
                document.getElementById('searchHistory').classList.remove('show');
            }
        });
    }

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

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
            
            if (e.ctrlKey && e.key === 'a' && !e.target.matches('input, textarea, select')) {
                e.preventDefault();
                selectAll();
            }
            
            if (e.ctrlKey && e.key === 'c' && !e.target.matches('input, textarea, select')) {
                if (this.selectedRows.size > 0) {
                    e.preventDefault();
                    copySelected();
                }
            }
            
            if (e.key === 'Escape') {
                closeFavorites();
            }
            
            if (e.key === '?' && !e.target.matches('input, textarea, select')) {
                toggleKeyboardHints();
            }
        });
    }

    updateThemeIcon(theme) {
        document.getElementById('themeIcon').textContent = theme === 'dark' ? '🌙' : '☀️';
    }
}

// === 全局函数 ===

// 分页
function prevPage() {
    if (app.currentPage > 1) {
        app.currentPage--;
        app.renderTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function nextPage() {
    const totalPages = Math.ceil(app.filteredProxies.length / app.pageSize);
    if (app.currentPage < totalPages) {
        app.currentPage++;
        app.renderTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function firstPage() {
    app.currentPage = 1;
    app.renderTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function lastPage() {
    const totalPages = Math.ceil(app.filteredProxies.length / app.pageSize);
    app.currentPage = totalPages;
    app.renderTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToPage() {
    const input = document.getElementById('pageInput');
    const page = parseInt(input.value);
    const totalPages = Math.ceil(app.filteredProxies.length / app.pageSize);
    
    if (page >= 1 && page <= totalPages) {
        app.currentPage = page;
        app.renderTable();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        input.value = app.currentPage;
        app.showNotification('⚠️ 页码超出范围', 'warning');
    }
}

function changePageSize() {
    app.pageSize = parseInt(document.getElementById('pageSizeFilter').value);
    app.currentPage = 1;
    app.renderTable();
    app.showNotification(`✅ 已切换到每页 ${app.pageSize} 条`, 'success');
}

// 选择
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
    app.showNotification(`✅ 已选择全部 ${app.filteredProxies.length} 个代理`, 'success');
}

// 复制
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
        app.showNotification('❌ 复制失败', 'error');
    });
}

// 收藏
function toggleFavorite(ip, port) {
    const key = `${ip}:${port}`;
    
    if (app.favorites.has(key)) {
        app.favorites.delete(key);
        app.showNotification('💔 已取消收藏', 'info');
    } else {
        app.favorites.add(key);
        app.showNotification('⭐ 已添加到收藏夹', 'success');
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
    
    if (added > 0) {
        app.showNotification(`⭐ 已添加 ${added} 个代理到收藏夹`, 'success');
    } else {
        app.showNotification('ℹ️ 这些代理已在收藏夹中', 'info');
    }
}

function openFavorites() {
    if (app.favorites.size === 0) {
        app.showNotification('📭 收藏夹是空的，快去收藏一些代理吧！', 'info');
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
                            🌍 ${proxy.countryName} · 🏢 ${proxy.company}
                        </div>
                    </div>
                    <div class="favorite-actions">
                        <button class="copy-btn" onclick="app.handleCopy('${ip}:${port}', this)">📋 复制</button>
                        <button class="copy-btn" style="background: var(--danger-color);" onclick="toggleFavorite('${ip}', '${port}'); openFavorites();">
                            🗑️ 移除
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

// 筛选
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('countryFilter').value = '';
    document.getElementById('portFilter').value = '';
    document.getElementById('companyFilter').value = '';
    document.getElementById('sortFilter').value = 'default';
    
    document.querySelectorAll('.quick-filter-tag').forEach(tag => {
        tag.classList.remove('active');
    });
    
    app.applyFilters();
    app.showNotification('🔄 已重置所有筛选条件', 'info');
}

function saveFilter() {
    const filter = {
        search: document.getElementById('searchInput').value,
        country: document.getElementById('countryFilter').value,
        port: document.getElementById('portFilter').value,
        company: document.getElementById('companyFilter').value,
        sort: document.getElementById('sortFilter').value
    };
    
    localStorage.setItem('savedFilter', JSON.stringify(filter));
    app.showNotification('💾 筛选方案已保存', 'success');
}

function loadFilter() {
    const saved = localStorage.getItem('savedFilter');
    if (!saved) {
        app.showNotification('⚠️ 没有保存的筛选方案', 'warning');
        return;
    }

    const filter = JSON.parse(saved);
    document.getElementById('searchInput').value = filter.search || '';
    document.getElementById('countryFilter').value = filter.country || '';
    document.getElementById('portFilter').value = filter.port || '';
    document.getElementById('companyFilter').value = filter.company || '';
    document.getElementById('sortFilter').value = filter.sort || 'default';
    
    app.applyFilters();
    app.showNotification('📂 筛选方案已加载', 'success');
}

function quickFilter(type, value) {
    if (type === 'port') {
        document.getElementById('portFilter').value = value;
    } else if (type === 'country') {
        document.getElementById('countryFilter').value = value;
    }
    
    app.applyFilters();
    
    document.querySelectorAll('.quick-filter-tag').forEach(tag => {
        tag.classList.remove('active');
    });
    event.target.classList.add('active');
}

// 网站功能
function addToBookmarks() {
    const title = '代理IP优选中心';
    const url = window.location.href;
    
    if (window.sidebar && window.sidebar.addPanel) {
        window.sidebar.addPanel(title, url, '');
        app.showNotification('✅ 请在侧边栏确认添加', 'success');
    } else if (window.external && ('AddFavorite' in window.external)) {
        window.external.AddFavorite(url, title);
        app.showNotification('✅ 已添加到收藏夹', 'success');
    } else {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const shortcut = isMac ? 'Cmd + D' : 'Ctrl + D';
        
        const modal = document.createElement('div');
        modal.className = 'bookmark-modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3>🔖 收藏本站</h3>
                    <button class="modal-close" onclick="this.closest('.bookmark-modal').remove()">&times;</button>
                </div>
                <div class="modal-content-body" style="text-align: center; padding: 40px 28px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">🔖</div>
                    <h3 style="color: var(--text-primary); margin-bottom: 12px; font-size: 20px;">
                        将本站添加到收藏夹
                    </h3>
                    <p style="color: var(--text-secondary); margin-bottom: 24px; line-height: 1.6;">
                        请按 <kbd style="padding: 4px 10px; background: var(--dark-bg); border: 1px solid var(--border-color); border-radius: 4px;">${shortcut}</kbd> 
                        将本站添加到浏览器收藏夹
                    </p>
                    <div style="background: var(--dark-bg); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 20px;">
                        <div style="color: var(--text-secondary); font-size: 13px; margin-bottom: 8px;">网站地址</div>
                        <div style="color: var(--primary-color); font-weight: 600; word-break: break-all;">${url}</div>
                    </div>
                    <button onclick="copyCurrentUrl(); this.closest('.bookmark-modal').remove();" class="copy-btn" style="width: 100%; padding: 12px;">
                        📋 复制网址
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
}

function copyCurrentUrl() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        app.showNotification('✅ 网址已复制，可以分享给朋友了', 'success');
    }).catch(err => {
        console.error('复制失败:', err);
        app.showNotification('❌ 复制失败', 'error');
    });
}

// 主题
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    app.updateThemeIcon(newTheme);
    app.showNotification(`${newTheme === 'dark' ? '🌙 已切换到深色模式' : '☀️ 已切换到浅色模式'}`, 'success');
}

// 快捷键提示
function toggleKeyboardHints() {
    const hints = document.getElementById('keyboardHints');
    hints.classList.toggle('show');
    
    if (hints.classList.contains('show')) {
        setTimeout(() => hints.classList.remove('show'), 5000);
    }
}

// 初始化
let app;
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎉 页面加载完成，启动应用...');
    app = new ProxyApp();
    
    setTimeout(() => {
        toggleKeyboardHints();
    }, 1500);
});

// 添加动画样式
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
