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
            console.log('开始加载代理数据...');
            
            // 首先尝试从本地路径加载（Cloudflare Pages）
            let response = await fetch(config.dataUrl);
            
            // 如果本地加载失败，使用GitHub Raw URL
            if (!response.ok) {
                console.log('本地数据加载失败，尝试GitHub源...');
                response = await fetch(config.fallbackDataUrl);
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            const lines = text.trim().split('\n').filter(line => line.trim());
            
            console.log(`读取到 ${lines.length} 行数据`);
            
            // 解析每一行
            this.allProxies = lines
                .map(line => parseProxyLine(line))
                .filter(proxy => proxy !== null);
            
            console.log(`成功解析 ${this.allProxies.length} 条代理数据`);
            
            this.filteredProxies = [...this.allProxies];
            
            this.populateFilters();
            this.renderTable();
            this.updateStats();
            
            // 隐藏加载提示，显示表格
            document.getElementById('loadingMessage').style.display = 'none';
            document.getElementById('proxyTable').style.display = 'block';
            
        } catch (error) {
            console.error('数据加载失败:', error);
            const loadingMsg = document.getElementById('loadingMessage');
            loadingMsg.innerHTML = '<div>❌ 数据加载失败，请刷新页面重试</div><div style="font-size: 0.9em; margin-top: 10px;">错误信息: ' + error.message + '</div>';
        }
    }

    /**
     * 填充筛选器选项
     */
    populateFilters() {
        // 获取所有唯一的国家、端口和公司
        const countries = [...new Set(this.allProxies.map(p => p.countryName))].sort();
        const ports = [...new Set(this.allProxies.map(p => p.port))].sort((a, b) => parseInt(a) - parseInt(b));
        const companies = [...new Set(this.allProxies.map(p => p.company))].sort();
        
        const countrySelect = document.getElementById('countryFilter');
        const portSelect = document.getElementById('portFilter');
        const companySelect = document.getElementById('companyFilter');
        
        // 添加国家选项
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });
        
        // 添加端口选项
        ports.forEach(port => {
            const option = document.createElement('option');
            option.value = port;
            option.textContent = port;
            portSelect.appendChild(option);
        });
        
        // 添加公司选项
        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company;
            option.textContent = company.length > 50 ? company.substring(0, 50) + '...' : company;
            option.title = company;
            companySelect.appendChild(option);
        });
        
        console.log(`已加载 ${countries.length} 个国家，${ports.length} 个端口，${companies.length} 个公司`);
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
        
        table.style.display = 'block';
        noData.style.display = 'none';
        
        // 只渲染前N条记录以提高性能
        const displayProxies = this.filteredProxies.slice(0, config.maxDisplayRows);
        
        displayProxies.forEach(proxy => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="ip-cell">${proxy.ip}</td>
                <td class="port-cell">${proxy.port}</td>
                <td class="country-cell">${proxy.countryName}</td>
                <td class="company-cell" title="${proxy.company}">${proxy.company}</td>
                <td>
                    <button class="copy-btn" onclick="app.copyProxy('${proxy.ip}:${proxy.port}', this)">
                        📋 复制
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        if (this.filteredProxies.length > config.maxDisplayRows) {
            console.log(`仅显示前 ${config.maxDisplayRows} 条记录，共 ${this.filteredProxies.length} 条`);
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        const countryFilter = document.getElementById('countryFilter');
        const portFilter = document.getElementById('portFilter');
        const companyFilter = document.getElementById('companyFilter');
        
        countryFilter.addEventListener('change', () => this.applyFilters());
        portFilter.addEventListener('change', () => this.applyFilters());
        companyFilter.addEventListener('change', () => this.applyFilters());
    }

    /**
     * 应用筛选条件
     */
    applyFilters() {
        const countryFilter = document.getElementById('countryFilter').value;
        const portFilter = document.getElementById('portFilter').value;
        const companyFilter = document.getElementById('companyFilter').value;
        
        this.filteredProxies = this.allProxies.filter(proxy => {
            const matchesCountry = !countryFilter || proxy.countryName === countryFilter;
            const matchesPort = !portFilter || proxy.port === portFilter;
            const matchesCompany = !companyFilter || proxy.company === companyFilter;
            
            return matchesCountry && matchesPort && matchesCompany;
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
    async copyProxy(text, button) {
        const success = await copyToClipboard(text);
        
        if (success) {
            const originalText = button.innerHTML;
            button.innerHTML = '✅ 已复制';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('copied');
            }, 2000);
        } else {
            button.innerHTML = '❌ 失败';
            setTimeout(() => {
                button.innerHTML = '📋 复制';
            }, 2000);
        }
    }
}

// 页面加载完成后启动应用
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ProxyApp();
});
