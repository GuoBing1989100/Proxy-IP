// 主应用逻辑

class ProxyApp {
    constructor() {
        this.allProxies = [];
        this.filteredProxies = [];
        this.init();
    }

    async init() {
        await this.loadProxyData();
        this.setupEventListeners();
    }

    /**
     * 从服务器加载代理数据
     */
    async loadProxyData() {
        try {
            // 首先尝试从本地路径加载
            let response = await fetch(config.dataUrl);
            
            // 如果本地加载失败，使用GitHub Raw URL
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
            
        } catch (error) {
            console.error('数据加载失败:', error);
            updateElementText('loadingMessage', '数据加载失败，请刷新页面重试');
        }
    }

    /**
     * 填充筛选器选项
     */
    populateFilters() {
        // 获取所有唯一的国家和公司
        const countries = [...new Set(this.allProxies.map(p => p.countryName))].sort();
        const companies = [...new Set(this.allProxies.map(p => p.company))].sort();

        const countrySelect = document.getElementById('countryFilter');
        const companySelect = document.getElementById('companyFilter');

        // 添加国家选项
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });

        // 添加公司选项（只显示前100个，避免下拉框过长）
        companies.slice(0, 100).forEach(company => {
            const option = document.createElement('option');
            option.value = company;
            option.textContent = company.length > 40 ? company.substring(0, 40) + '...' : company;
            companySelect.appendChild(option);
        });
    }

    /**
     * 渲染代理表格
     */
    renderTable() {
        const tbody = document.getElementById('proxyTableBody');
        const table = document.getElementById('proxyTable');
        const noData = document.getElementById('noDataMessage');
        
        tbody.innerHTML = '';

        if (this.filteredProxies.length === 0) {
            table.style.display = 'none';
            noData.style.display = 'block';
            return;
        }

        table.style.display = 'table';
        noData.style.display = 'none';

        // 只渲染前1000条记录以提高性能
        const displayProxies = this.filteredProxies.slice(0, 1000);
        
        displayProxies.forEach(proxy => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${proxy.ip}</td>
                <td>${proxy.port}</td>
                <td>${proxy.countryName}</td>
                <td title="${proxy.company}">${proxy.company.length > 50 ? proxy.company.substring(0, 50) + '...' : proxy.company}</td>
                <td>
                    <button class="copy-btn" onclick="app.handleCopy('${proxy.ip}:${proxy.port}', this)">
                        复制
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 如果有更多记录未显示，添加提示
        if (this.filteredProxies.length > 1000) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" style="text-align: center; color: #a0aec0; padding: 20px;">
                    显示前 1000 条记录，共 ${formatNumber(this.filteredProxies.length)} 条匹配结果
                </td>
            `;
            tbody.appendChild(row);
        }
    }

    /**
     * 处理复制操作
     */
    handleCopy(text, btn) {
        copyToClipboard(text, btn);
    }

    /**
     * 应用筛选条件
     */
    applyFilters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const countryFilter = document.getElementById('countryFilter').value;
        const companyFilter = document.getElementById('companyFilter').value;

        this.filteredProxies = this.allProxies.filter(proxy => {
            const matchesSearch = !searchTerm || 
                proxy.ip.toLowerCase().includes(searchTerm) ||
                proxy.countryName.toLowerCase().includes(searchTerm) ||
                proxy.company.toLowerCase().includes(searchTerm);
            
            const matchesCountry = !countryFilter || proxy.countryName === countryFilter;
            const matchesCompany = !companyFilter || proxy.company === companyFilter;

            return matchesSearch && matchesCountry && matchesCompany;
        });

        this.renderTable();
        this.updateStats();
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        updateElementText('totalCount', formatNumber(this.allProxies.length));
        updateElementText('filteredCount', formatNumber(this.filteredProxies.length));
        
        const uniqueCountries = new Set(this.allProxies.map(p => p.countryCode));
        updateElementText('countryCount', uniqueCountries.size);
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 使用防抖优化搜索性能
        const debouncedFilter = debounce(() => this.applyFilters(), 300);
        
        document.getElementById('searchInput').addEventListener('input', debouncedFilter);
        document.getElementById('countryFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('companyFilter').addEventListener('change', () => this.applyFilters());
    }
}

// 创建全局应用实例
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ProxyApp();
});
