// 国家代码映射
const countryNames = {
    'AD': '安道尔', 'AE': '阿联酋', 'AF': '阿富汗', 'AG': '安提瓜和巴布达', 
    'AL': '阿尔巴尼亚', 'AM': '亚美尼亚', 'AR': '阿根廷', 'AT': '奥地利',
    'AU': '澳大利亚', 'AZ': '阿塞拜疆', 'BA': '波黑', 'BD': '孟加拉国', 
    'BE': '比利时', 'BG': '保加利亚', 'BH': '巴林', 'BR': '巴西', 
    'BY': '白俄罗斯', 'CA': '加拿大', 'CH': '瑞士', 'CL': '智利', 
    'CN': '中国', 'CO': '哥伦比亚', 'CR': '哥斯达黎加', 'CZ': '捷克', 
    'DE': '德国', 'DK': '丹麦', 'DO': '多米尼加', 'DZ': '阿尔及利亚', 
    'EC': '厄瓜多尔', 'EE': '爱沙尼亚', 'EG': '埃及', 'ES': '西班牙', 
    'FI': '芬兰', 'FR': '法国', 'GB': '英国', 'GR': '希腊', 
    'HK': '香港', 'HR': '克罗地亚', 'HU': '匈牙利', 'ID': '印度尼西亚', 
    'IE': '爱尔兰', 'IL': '以色列', 'IN': '印度', 'IQ': '伊拉克', 
    'IR': '伊朗', 'IS': '冰岛', 'IT': '意大利', 'JP': '日本', 
    'KE': '肯尼亚', 'KR': '韩国', 'KZ': '哈萨克斯坦', 'LB': '黎巴嫩', 
    'LT': '立陶宛', 'LU': '卢森堡', 'LV': '拉脱维亚', 'MA': '摩洛哥', 
    'MD': '摩尔多瓦', 'MX': '墨西哥', 'MY': '马来西亚', 'NG': '尼日利亚', 
    'NL': '荷兰', 'NO': '挪威', 'NZ': '新西兰', 'PE': '秘鲁', 
    'PH': '菲律宾', 'PK': '巴基斯坦', 'PL': '波兰', 'PT': '葡萄牙', 
    'RO': '罗马尼亚', 'RS': '塞尔维亚', 'RU': '俄罗斯', 'SA': '沙特阿拉伯', 
    'SE': '瑞典', 'SG': '新加坡', 'SI': '斯洛文尼亚', 'SK': '斯洛伐克', 
    'TH': '泰国', 'TR': '土耳其', 'TW': '台湾', 'UA': '乌克兰', 
    'US': '美国', 'UY': '乌拉圭', 'VE': '委内瑞拉', 'VN': '越南', 
    'ZA': '南非'
};

// 配置
const config = {
    // 数据源 - 请确保路径正确
    dataUrl: './Data/alive.txt',
    // 备用数据源 - GitHub Raw 链接
    fallbackDataUrl: 'https://raw.githubusercontent.com/GuoBing1989100/Proxy-IP/main/Data/alive.txt',
    
    // IP查询API
    ipApis: [
        {
            name: 'ip-api.com',
            url: 'http://ip-api.com/json/{ip}?lang=zh-CN',
            parse: (data) => ({
                ip: data.query,
                country: data.country,
                countryCode: data.countryCode,
                region: data.regionName,
                city: data.city,
                isp: data.isp,
                org: data.org
            })
        }
    ]
};
