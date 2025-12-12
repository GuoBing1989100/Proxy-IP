async function loadData() {
  try {
    const response = await fetch("Data/alive.txt");
    const text = await response.text();
    const lines = text.trim().split("\n");

    const countryFilter = document.getElementById("countryFilter").value.trim();
    const companyFilter = document.getElementById("companyFilter").value.trim();
    const ipFilter = document.getElementById("ipFilter").value.trim();

    const tbody = document.querySelector("#ipTable tbody");
    tbody.innerHTML = "";

    lines.forEach(line => {
      const [ip, port, country, company] = line.split(",");
      if ((countryFilter && country !== countryFilter) ||
          (companyFilter && !company.includes(companyFilter)) ||
          (ipFilter && ip !== ipFilter)) {
        return;
      }
      const row = `<tr>
        <td>${ip}</td>
        <td>${port}</td>
        <td>${country}</td>
        <td>${company}</td>
      </tr>`;
      tbody.innerHTML += row;
    });
  } catch (err) {
    console.error("加载数据失败:", err);
  }
}

// 页面加载时自动执行
window.onload = loadData;

// 每隔 1 小时自动刷新一次数据
setInterval(loadData, 60 * 60 * 1000);
