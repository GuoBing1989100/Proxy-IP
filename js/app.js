// 主应用逻辑
class ProxyApp {
    constructor() {
        this.allProxies = [];
        this.filteredProxies = [];
        this.displayedCount = 0;
        this.batchSize = 100;
        this.init();
    }

    async init() {
        await this.loadProxyData();
        this.setupEventListeners();
        this.setupThemeToggle();
    }

    /**
     * 从服务器加载代理数据
     */
    async loadProxyData() {
        const maxRetries = 3;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                this.showProgress(true);
                
                let response = await fetch(config.dataUrl);
                
                if (!response.ok) {
                    console.log('主数据源加载失败，尝试备用数据源...');
                    response = await fetch(config.fallbackDataUrl);
                }

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const text = await response.text();
                
                if (!text || text.trim().length === 0) {
                    throw new Error('数据为空');
                }

                const lines = text.trim().split('\n').filter(line => line.trim());
                
                this.allProxies = lines.map(line => this.parseProxyLine(line)).filter(p => p.ip);
                this.filteredProxies = [...this.allProxies];
                
                console.log(`✅ 成功加载 ${this.allProxies.length} 条代理数据`);
                
                // 先设置事件监听器
                this.setupEventListeners();
                
                // 再填充筛选器
                this.populateFilters();
                
                // 渲染表格
                this.renderTable();
                this.updateStats();
                
                toggleElement('loadingMessage', false);
                toggleElement('proxyTable', true);
                document.getElementById('exportBtn').style.display = 'inline-flex';
                this.showProgress(false);
                
                return;

            } catch (error) {
                retryCount++;
                console.error(`❌ 数据加载失败 (尝试 ${retryCount}/${maxRetries}):`, error);
                
                if (retryCount < maxRetries) {
                    const delay = Math.pow(2, retryCount) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    updateElementText('loadingMessage', '❌ 数据加载失败，请检查网络连接后刷新页面重试');
                    this.showProgress(false);
                }
            }
        }
    }

    /**
     * 解析代理数据行
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
        console.log('🔄 开始填充筛选器...');
        
        // 提取唯一值并排序
        const countries = [...new Set(this.allProxies.map(p => p.countryName).filter(c => c))].sort();
        const companies = [...new Set(this.allProxies.map(p => p.company).filter(c => c))].sort();
        const ports = [...new Set(this.allProxies.map(p => p.port).filter(p => p))].sort((a, b) => {
            return parseInt(a) - parseInt(b);
        });

        console.log(`📊 统计: ${countries.length} 个国家, ${companies.length} 个公司, ${ports.length} 个端口`);

        const countrySelect = document.getElementById('countryFilter');
        const companySelect = document.getElementById('companyFilter');
        const portSelect = document.getElementById('portFilter');

        if (!countrySelect || !companySelect || !portSelect) {
            console.error('❌ 筛选器元素未找到！');
            return;
        }

        // 清空并重建选项
        countrySelect.innerHTML = '<option value="">全部国家</option>';
        companySelect.innerHTML = '<option value="">全部公司</option>';
        portSelect.innerHTML = '<option value="">全部端口</option>';

        // 添加国家选项
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });

        // 添加公司选项
        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company;
            option.textContent = company.length > 50 ? company.substring(0, 50) + '...' : company;
            option.title = company;
            companySelect.appendChild(option);
        });

        // 添加端口选项
        ports.forEach(port => {
            const option = document.createElement('option');
            option.value = port;
            option.textContent = port;
            portSelect.appendChild(option);
        });

        console.log('✅ 筛选器填充完成');
        console.log(`   - 国家选项数: ${countrySelect.options.length}`);
        console.log(`   - 公司选项数: ${companySelect.options.length}`);
        console.log(`   - 端口选项数: ${portSelect.options.length}`);
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        const countryFilter = document.getElementById('countryFilter');
        const companyFilter = document.getElementById('companyFilter');
        const portFilter = document.getElementById('portFilter');
        const exportBtn = document.getElementById('exportBtn');

        if (!countryFilter || !companyFilter || !portFilter) {
            console.error('❌ 无法找到筛选器元素');
            return;
        }

        // 移除旧的事件监听器（如果有）
        const newCountryFilter = countryFilter.cloneNode(true);
        const newCompanyFilter = companyFilter.cloneNode(true);
        const newPortFilter = portFilter.cloneNode(true);
        
        countryFilter.parentNode.replaceChild(newCountryFilter, countryFilter);
        companyFilter.parentNode.replaceChild(newCompanyFilter, companyFilter);
        portFilter.parentNode.replaceChild(newPortFilter, portFilter);

        // 添加新的事件监听器
        document.getElementById('countryFilter').addEventListener('change', (e) => {
            console.log('🌍 国家筛选:', e.target.value);
            this.applyFilters();
        });

        document.getElementById('companyFilter').addEventListener('change', (e) => {
            console.log('🏢 公司筛选:', e.target.value);
            this.applyFilters();
        });

        document.getElementById('portFilter').addEventListener('change', (e) => {
            console.log('🔌 端口筛选:', e.target.value);
            this.applyFilters();
        });

        exportBtn.addEventListener('click', () => this.exportToCSV());

        console.log('✅ 事件监听器设置完成');
    }

    /**
     * 应用筛选条件
     */
    applyFilters() {
        const selectedCountry = document.getElementById('countryFilter').value;
        const selectedCompany = document.getElementById('companyFilter').value;
        const selectedPort = document.getElementById('portFilter').value;

        console.log('🔍 应用筛选:', { 
            country: selectedCountry || '全部', 
            company: selectedCompany || '全部', 
            port: selectedPort || '全部' 
        });

        this.filteredProxies = this.allProxies.filter(proxy => {
            const matchCountry = !selectedCountry || proxy.countryName === selectedCountry;
            const matchCompany = !selectedCompany || proxy.company === selectedCompany;
            const matchPort = !selectedPort || proxy.port === selectedPort;

            return matchCountry && matchCompany && matchPort;
        });

        console.log(`📊 筛选结果: ${this.filteredProxies.length} / ${this.allProxies.length}`);

        this.renderTable();
        this.updateStats();
    }

    /**
     * 渲染代理表格
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
                <td>${proxy.ip}</td>
                <td>${proxy.port}</td>
                <td>${proxy.countryName}</td>
                <td title="${proxy.company}">${this.truncateText(proxy.company, 60)}</td>
                <td>
                    <button class="copy-btn" onclick="window.app.copyProxy('${proxy.ip}:${proxy.port}', this)">
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
     * 截断长文本
     */
    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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

        console.log('📥 CSV 导出完成');
    }

    /**
     * 显示/隐藏进度条
     */
    showProgress(show) {
        const progressBar = document.getElementById('progressBar');
        if (!progressBar) return;
        
        progressBar.style.display = show ? 'block' : 'none';
        
        if (show) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                const progressFill = document.getElementById('progressFill');
                if (progressFill) {
                    progressFill.style.width = progress + '%';
                }
                if (progress >= 90) clearInterval(interval);
            }, 200);
        } else {
            const progressFill = document.getElementById('progressFill');
            if (progressFill) {
                progressFill.style.width = '100%';
            }
        }
    }

    /**
     * 主题切换
     */
    setupThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;
        
        const currentTheme = localStorage.getItem('theme') || 'light';
        
        document.documentElement.setAttribute('data-theme', currentTheme);
        themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

        themeToggle.addEventListener('click', () => {
            const theme = document.documentElement.getAttribute('data-theme');
            const newTheme = theme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            
            console.log('🎨 主题切换:', newTheme);
        });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 应用初始化...');
    window.app = new ProxyApp();
});
