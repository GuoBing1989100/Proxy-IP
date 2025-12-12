// 主应用逻辑

class ProxyApp {
    constructor() {
        this.allProxies = [];
        this.filteredProxies = [];
        this.currentPage = 1;
        this.pageSize = 50;
        this.selectedRows = new Set();
        this.init();
    }

    async init() {
        await this.loadProxyData();
        this.setupEventListeners();
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
            this.renderTable();
            this.updateStats();
            
            toggleElement('loadingMessage', false);
            toggleElement('proxyTable', true);
            toggleElement('paginationContainer', true);
            
        } catch (error) {
            console.error('数据加载失败:', error);
            updateElementText('loadingMessage', '❌ 数据加载失败，请刷新页面重试');
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
            option.textContent = `${port}`;
            portSelect.appendChild(option);
        });

        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company;
            option.textContent = company.length > 50 ? company.substring(0, 50) + '...' : company;
            option.title = company;
            companySelect.appendChild(option);
        });

        console.log(`已加载 ${countries.length} 个国家，${ports.length} 个端口，${companies.length} 个公司`);
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
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="col-checkbox">
                    <input type="checkbox" class="row-checkbox" data-index="${globalIndex}" ${this.selectedRows.has(globalIndex) ? 'checked' : ''}>
                </td>
                <td class="col-ip">
                    <span class="ip-clickable" onclick="showIPDetails('${proxy.ip}')">${proxy.ip}</span>
                </td>
                <td class="col-port">
                    <span class="port-badge">${proxy.port}</span>
                </td>
                <td class="col-country">${proxy.countryName}</td>
                <td class="col-company" title="${proxy.company}">
                    ${proxy.company.length > 40 ? proxy.company.substring(0, 40) + '...' : proxy.company}
                </td>
                <td class="col-actions">
                    <button class="copy-btn" onclick="app.handleCopy('${proxy.ip}:${proxy.port}', this)">
                        📋 复制
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 更新分页信息
        document.getElementById('currentPage').textContent = this.currentPage;
        document.getElementById('totalPages').textContent = totalPages;
        document.getElementById('prevBtn').disabled = this.currentPage === 1;
        document.getElementById('nextBtn').disabled = this.currentPage === totalPages;

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

    handleCopy(text, btn) {
        copyToClipboard(text, btn);
    }

    applyFilters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        const countryFilter = document.getElementById('countryFilter').value.trim();
        const portFilter = document.getElementById('portFilter').value.trim();
        const companyFilter = document.getElementById('companyFilter').value.trim();

        console.log('筛选条件:', { searchTerm, countryFilter, portFilter, companyFilter });

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

        console.log(`筛选结果: ${this.filteredProxies.length} 条记录`);

        this.currentPage = 1;
        this.selectedRows.clear();
        this.renderTable();
        this.updateStats();
    }

    updateStats() {
        updateElementText('totalCount', formatNumber(this.allProxies.length));
        updateElementText('filteredCount', formatNumber(this.filteredProxies.length));
        
        const uniqueCountries = new Set(this.allProxies.map(p => p.countryCode));
        updateElementText('countryCount', uniqueCountries.size);

        const uniquePorts = new Set(this.allProxies.map(p => p.port));
        updateElementText('portCount', uniquePorts.size);
    }

    updateSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const visibleCheckboxes = document.querySelectorAll('.row-checkbox');
        const allChecked = Array.from(visibleCheckboxes).every(cb => cb.checked);
        const someChecked = Array.from(visibleCheckboxes).some(cb => cb.checked);
        
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = someChecked && !allChecked;
    }

    setupEventListeners() {
        const debouncedFilter = debounce(() => this.applyFilters(), 300);
        
        document.getElementById('searchInput').addEventListener('input', debouncedFilter);
        document.getElementById('countryFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('portFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('companyFilter').addEventListener('change', () => this.applyFilters());
    }
}

// 分页功能
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
}

// 复制选中
function copySelected() {
    if (app.selectedRows.size === 0) {
        alert('请先选择要复制的代理');
        return;
    }

    const selected = Array.from(app.selectedRows)
        .map(index => app.filteredProxies[index])
        .filter(proxy => proxy)
        .map(proxy => `${proxy.ip}:${proxy.port}`)
        .join('\n');

    navigator.clipboard.writeText(selected).then(() => {
        alert(`已复制 ${app.selectedRows.size} 个代理到剪贴板`);
    }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
    });
}

// 导出数据
function exportData() {
    const dataToExport = app.filteredProxies.length > 0 ? app.filteredProxies : app.allProxies;
    const csv = 'IP地址,端口,国家,运营商\n' + 
        dataToExport.map(p => `${p.ip},${p.port},${p.countryName},"${p.company}"`).join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `proxy-list-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
}

// 重置筛选
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('countryFilter').value = '';
    document.getElementById('portFilter').value = '';
    document.getElementById('companyFilter').value = '';
    app.applyFilters();
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
    window.location.reload(true);
}

// 创建全局应用实例
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ProxyApp();
});
