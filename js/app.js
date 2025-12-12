// 主应用逻辑
class ProxyApp {
    constructor() {
        this.allProxies = [];
        this.filteredProxies = [];
        this.displayedCount = 0;
        this.batchSize = 100;
        this.observer = null;
        this.searchTimeout = null;
        this.init();
    }

    async init() {
        await this.loadProxyData();
        this.setupEventListeners();
        this.setupThemeToggle();
        this.setupInfiniteScroll();
    }

    /**
     * 从服务器加载代理数据（带重试机制）
     */
    async loadProxyData() {
        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                this.showProgress(true);
                
                // 首先尝试从本地路径加载
                let response = await fetch(config.dataUrl);
                
                // 如果本地加载失败，使用GitHub Raw URL
                if (!response.ok) {
                    console.log('本地数据加载失败，使用GitHub源...');
                    response = await fetch(config.fallbackDataUrl);
                }

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const text = await response.text();
                
                // 数据完整性检查
                if (!text || text.trim().length === 0) {
                    throw new Error('数据为空');
                }

                const lines = text.trim().split('\n').filter(line => line.trim());
                
                this.allProxies = lines.map(line => this.parseProxyLine(line)).filter(p => p.ip);
                this.filteredProxies = [...this.allProxies];
                
                this.populateFilters();
                this.renderTable();
                this.updateStats();
                
                toggleElement('loadingMessage', false);
                toggleElement('proxyTable', true);
                document.getElementById('exportBtn').style.display = 'block';
                this.showProgress(false);
                
                return; // 成功加载，退出重试循环

            } catch (error) {
                retryCount++;
                console.error(`数据加载失败 (尝试 ${retryCount}/${maxRetries}):`, error);
                
                if (retryCount < maxRetries) {
                    // 指数退避
                    const delay = Math.pow(2, retryCount) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    // 最终失败
                    updateElementText('loadingMessage', '❌ 数据加载失败，请检查网络连接后刷新页面重试');
                    this.showProgress(false);
                }
            }
        }
    }

    /**
     * 解析代理数据行（带数据清理）
     */
    parseProxyLine(line) {
        const parts = line.split(',');
        return {
            ip: this.sanitizeHtml(parts[0]?.trim() || ''),
            port: this.sanitizeHtml(parts[1]?.trim() || ''),
            countryCode: this.sanitizeHtml(parts[2]?.trim() || ''),
            countryName: getCountryName(parts[2]?.trim() || ''),
            company: this.sanitizeHtml(parts[3]?.trim() || '未知')
        };
    }

    /**
     * HTML转义防止XSS
     */
    sanitizeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * 填充筛选器选项
     */
    populateFilters() {
        const countries = [...new Set(this.allProxies.map(p => p.countryName))].sort();
        const companies = [...new Set(this.allProxies.map(p => p.company))].sort();

        const countrySelect = document.getElementById('countryFilter');
        const companySelect = document.getElementById('companyFilter');

        countrySelect.innerHTML = '<option value="">全部国家</option>';
        companySelect.innerHTML = '<option value="">全部公司</option>';

        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });

        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company;
            option.textContent = company.length > 50 ? company.substring(0, 50) + '...' : company;
            option.title = company;
            companySelect.appendChild(option);
        });

        console.log(`已加载 ${countries.length} 个国家，${companies.length} 个公司`);
    }

    /**
     * 渲染代理表格（使用虚拟滚动）
     */
    renderTable(append = false) {
        const tbody = document.getElementById('proxyTableBody');
        const table = document.getElementById('proxyTable');
        const noData = document.getElementById('noDataMessage');

        if (!append) {
            tbody.innerHTML = '';
            this.displayedCount = 0;
        }

        if (this.filteredProxies.length === 0) {
            table.style.display = 'none';
            noData.style.display = 'block';
            return;
        }

        table.style.display = 'table';
        noData.style.display = 'none';

        const start = this.displayedCount;
        const end = Math.min(start + this.batchSize, this.filteredProxies.length);
        const displayProxies = this.filteredProxies.slice(start, end);

        const fragment = document.createDocumentFragment();
        
        displayProxies.forEach(proxy => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${this.highlightText(proxy.ip)}</td>
                <td>${proxy.port}</td>
                <td>${proxy.countryName}</td>
                <td title="${proxy.company}">${this.truncateText(proxy.company, 60)}</td>
                <td>
                    <button class="copy-btn" onclick="app.copyProxy('${proxy.ip}:${proxy.port}', this)">
                        📋 复制
                    </button>
                </td>
            `;
            fragment.appendChild(row);
        });

        tbody.appendChild(fragment);
        this.displayedCount = end;
    }

    /**
     * 高亮搜索词
     */
    highlightText(text) {
        const searchTerm = document.getElementById('searchInput').value.trim();
        if (!searchTerm) return text;
        
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }

    /**
     * 截断长文本
     */
    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    /**
     * 设置无限滚动
     */
    setupInfiniteScroll() {
        const tableWrapper = document.querySelector('.table-wrapper');
        
        if (!tableWrapper) return;

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.displayedCount < this.filteredProxies.length) {
                    this.renderTable(true);
                }
            });
        }, { threshold: 0.1 });

        // 观察表格底部
        const sentinel = document.createElement('div');
        sentinel.id = 'scroll-sentinel';
        tableWrapper.appendChild(sentinel);
        this.observer.observe(sentinel);
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const countryFilter = document.getElementById('countryFilter');
        const companyFilter = document.getElementById('companyFilter');
        const exportBtn = document.getElementById('exportBtn');

        // 防抖搜索
        searchInput.addEventListener('input', () => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => this.applyFilters(), 300);
        });

        countryFilter.addEventListener('change', () => this.applyFilters());
        companyFilter.addEventListener('change', () => this.applyFilters());
        exportBtn.addEventListener('click', () => this.exportToCSV());

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }

    /**
     * 应用筛选条件
     */
    applyFilters() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        const selectedCountry = document.getElementById('countryFilter').value;
        const selectedCompany = document.getElementById('companyFilter').value;

        this.filteredProxies = this.allProxies.filter(proxy => {
            const matchSearch = !searchTerm || 
                proxy.ip.toLowerCase().includes(searchTerm) || 
                proxy.company.toLowerCase().includes(searchTerm);
            
            const matchCountry = !selectedCountry || proxy.countryName === selectedCountry;
            const matchCompany = !selectedCompany || proxy.company === selectedCompany;

            return matchSearch && matchCountry && matchCompany;
        });

        this.renderTable();
        this.updateStats();
    }

    /**
     * 更新统计信息
     */
    updateStats() {
        document.getElementById('totalCount').textContent = formatNumber(this.allProxies.length);
        document.getElementById('filteredCount').textContent = formatNumber(this.filteredProxies.length);
        
        const uniqueCountries = new Set(this.allProxies.map(p => p.countryName));
        document.getElementById('countryCount').textContent = uniqueCountries.size;
    }

    /**
     * 复制代理地址
     */
    copyProxy(proxyText, btn) {
        copyToClipboard(proxyText, btn);
    }

    /**
     * 导出为CSV
     */
    exportToCSV() {
        const headers = ['IP地址', '端口', '国家', '运营商/公司'];
        const rows = this.filteredProxies.map(proxy => [
            proxy.ip,
            proxy.port,
            proxy.countryName,
            proxy.company
        ]);

        let csvContent = headers.join(',') + '\n';
        csvContent += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `proxy-ip-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * 显示/隐藏进度条
     */
    showProgress(show) {
        const progressBar = document.getElementById('progressBar');
        progressBar.style.display = show ? 'block' : 'none';
        
        if (show) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                document.getElementById('progressFill').style.width = progress + '%';
                if (progress >= 90) clearInterval(interval);
            }, 200);
        }
    }

    /**
     * 主题切换
     */
    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        const currentTheme = localStorage.getItem('theme') || 'light';
        
        document.documentElement.setAttribute('data-theme', currentTheme);
        themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

        themeToggle.addEventListener('click', () => {
            const theme = document.documentElement.getAttribute('data-theme');
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
        });
    }
}

// 全局实例
let app;

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app = new ProxyApp();
});
