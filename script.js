let allData = [];

async function loadData() {
  try {
    const response = await fetch("Data/alive.txt");
    const text = await response.text();
    const lines = text.trim().split("\n");

    allData = lines.map(line => {
      const [ip, port, country, company] = line.split(",");
      return { ip, port, country, company };
    });

    populateCountryDropdown();
    renderTable();
  } catch (err) {
    console.error("加载数据失败:", err);
  }
}

function populateCountryDropdown() {
  const countrySet = new Set(allData.map(d => d.country));
  const select = document.getElementById("countryFilter");

  // 清空并重新生成选项
  select.innerHTML = '<option value="">全部</option>';
  countrySet.forEach(country => {
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    select.appendChild(option);
  });
}

function renderTable() {
  const countryFilter = document.getElementById("countryFilter").value.trim();
  const companyFilter = document.getElementById("companyFilter").value.trim();
  const ipFilter = document.getElementById("ipFilter").value.trim();

  const tbody = document.querySelector("#ipTable tbody");
  tbody.innerHTML = "";

  allData.forEach(d => {
    if ((countryFilter && d.country !== countryFilter) ||
        (companyFilter && !d.company.includes(companyFilter)) ||
        (ipFilter && d.ip !== ipFilter)) {
      return;
    }
    const row = `<tr>
      <td>${d.ip}</td>
      <td>${d.port}</td>
      <td>${d.country}</td>
      <td>${d.company}</td>
    </tr>`;
    tbody.innerHTML += row;
  });
}

// 页面加载时自动执行
window.onload = loadData;

// 每隔 1 小时自动刷新一次数据
setInterval(loadData, 60 * 60 * 1000);
