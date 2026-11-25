(function () {
  "use strict";
  const data = window.StreetData;
  const $ = selector => document.querySelector(selector);
  const state = { city: "shanghai", temperature: "all", weeks: 4, signal: "wide" };
  const number = value => value.toLocaleString("zh-CN");
  const percent = stats => `${data.rate(stats).toFixed(1)}%`;
  const delta = value => `${value >= 0 ? "+" : ""}${value.toFixed(1)} pp`;
  const cityName = () => data.cities.find(city => city.id === state.city).name;
  const signalName = () => data.signals.find(signal => signal.id === state.signal).name;
  const temperatureName = () => state.temperature === "all" ? "全部温度" : data.temperatures.find(item => item.id === state.temperature).name;
  let currentResult, toastTimer;
  function icons() { window.lucide?.createIcons(); }
  function showToast(message) {
    $("#toast").textContent = message;
    $("#toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("#toast").hidden = true; }, 3500);
  }
  function range(result) { return `${result.currentWeekly[0].date} — 2026-10-25`; }
  function notes(result) {
    const name = signalName(), r = percent(result.current);
    const enough = result.current.valid >= 150 && result.previous.valid >= 150;
    const change = result.delta > 2 ? "上升" : result.delta < -2 ? "下降" : "相对平稳";
    return [
      {
        title: `${name}：${change}的观察信号`, tag: "模拟观察",
        text: `${cityName()} · ${temperatureName()}，当前 ${r}，较上一等长周期 ${delta(result.delta)}。分母为 ${number(result.current.valid)} 个有效样本，不是城市人口比例。`
      },
      {
        title: !enough ? "暂不形成商品建议" : result.delta > 2 ? "列入小规模选款测试" : result.delta < -2 ? "先复核，再考虑调整投入" : "保持观察，不急于调整品类占比", tag: "规则建议",
        text: !enough ? "当前或对比周期有效样本不足 150，仅展示观察值。150 是本演示的提示门槛，不代表统计显著性。" : result.delta > 2 ? `可把${name}纳入当地候选款测试；先结合品牌客群、售罄和毛利数据，再判断是否扩大。不是直接增加采购比例的依据。` : result.delta < -2 ? "先检查温度构成、采样地点和可见性是否变化，再结合销售复核；穿着比例下降不等于需求必然下降。" : "当前变化未超过演示的 2 pp 观察阈值。暂不据此加码，等待后续周期与真实销售证据。"
      },
      {
        title: "需要补齐的商业证据", tag: "待验证",
        text: "使用授权真实样本验证识别质量与重复计数误差，再比较简单基线；只有接入销售与库存，才能检验它是否改善商品决策。"
      }
    ];
  }
  function chart(result) {
    const w = Math.max(280, $("#trend-chart").clientWidth), h = $("#trend-chart").clientHeight;
    const left = 32, right = 24, top = 16, bottom = 30;
    const all = [...result.currentWeekly, ...result.previousWeekly];
    const max = Math.min(100, Math.max(20, Math.ceil(Math.max(...all.map(data.rate)) / 10) * 10));
    const x = i => left + i * (w - left - right) / (state.weeks - 1);
    const y = value => top + (1 - value / max) * (h - top - bottom);
    const line = rows => rows.map((row, i) => `${i ? "L" : "M"}${x(i)},${y(data.rate(row))}`).join(" ");
    const grid = Array.from({ length: 5 }, (_, i) => {
      const value = max * i / 4, py = y(value);
      return `<line x1="${left}" y1="${py}" x2="${w - right}" y2="${py}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${left - 8}" y="${py + 3}" text-anchor="end" fill="var(--muted)" font-size="9">${Number(value.toFixed(1))}%</text>`;
    }).join("");
    const labels = result.currentWeekly.map((row, i) => `<text x="${x(i)}" y="${h - 9}" text-anchor="middle" fill="var(--muted)" font-size="9">${row.date.slice(5).replace("-", "/")}</text>`).join("");
    const dots = result.currentWeekly.map((row, i) => `<circle cx="${x(i)}" cy="${y(data.rate(row))}" r="3.5" fill="var(--paper)" stroke="var(--green)" stroke-width="1.7"><title>${row.date}：${percent(row)}，${row.count}/${row.valid}（模拟）</title></circle>`).join("");
    const path = line(result.currentWeekly);
    $("#trend-chart").innerHTML = `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${cityName()}${signalName()}模拟周度出现比例，当前周期与上一等长周期对比" style="font-family:ui-monospace,monospace">${grid}<path d="${path} L${x(state.weeks - 1)},${h - bottom} L${left},${h - bottom} Z" fill="var(--green)" fill-opacity=".04"/><path d="${line(result.previousWeekly)}" fill="none" stroke="#7b8b92" stroke-width="1.5" stroke-dasharray="5 5"/><path d="${path}" fill="none" stroke="var(--green)" stroke-width="2"/>${dots}${labels}</svg>`;
  }
  function render() {
    const result = data.query(state);
    currentResult = result;
    const selected = data.signals.find(item => item.id === state.signal);
    const strongest = [...result.ranking].sort((a, b) => b.delta - a.delta)[0];
    $("#date-range").textContent = range(result);
    $("#kpis").innerHTML = [
      ["有效穿搭样本 · 模拟", number(result.current.samples), "套", `${state.weeks} 周合并 · 非视频帧数`],
      ["当前最高频元素", result.ranking[0].name, "", `出现比例 ${result.ranking[0].rate.toFixed(1)}% · 各项分母独立`],
      ["上升最明显的元素", strongest.name, "", `${delta(strongest.delta)} · 对比上一等长周期`],
      ["温度分组", state.temperature === "all" ? "3" : "1", "组", `${temperatureName()} · 非实时气象记录`]
    ].map(([label, value, unit, detail]) => `<div class="kpi"><div class="kpi-label">${label}</div><div class="kpi-number">${value}<small>${unit}</small></div><div class="kpi-detail">${detail}</div></div>`).join("");
    $("#signal-tabs").innerHTML = data.signals.map(item => `<button type="button" role="tab" id="tab-${item.id}" aria-controls="trend-chart" aria-selected="${item.id === state.signal}" tabindex="${item.id === state.signal ? 0 : -1}" data-signal="${item.id}">${item.name}</button>`).join("");
    $("#trend-chart").setAttribute("aria-labelledby", `tab-${state.signal}`);
    $("#chart-caption").textContent = `${cityName()} / ${temperatureName()} / ${selected.name}`;
    $("#signal-rate").textContent = percent(result.current);
    $("#signal-delta").textContent = `${delta(result.delta)} 较上期`;
    $("#signal-denominator").textContent = `${number(result.current.count)} / ${number(result.current.valid)} 个${selected.denominator}有效样本 · 模拟`;
    $("#ranking").innerHTML = result.ranking.map((item, i) => `<button class="rank-item ${item.id === state.signal ? "selected" : ""}" data-signal="${item.id}" aria-label="查看${item.name}趋势，模拟比例${item.rate.toFixed(1)}%" aria-pressed="${item.id === state.signal}"><span class="rank-number">0${i + 1}</span><span class="rank-name">${item.name}<span class="rank-track"><span class="rank-fill" style="width:${item.rate}%"></span></span></span><span class="rank-value">${item.rate.toFixed(1)}%</span></button>`).join("");
    $("#regional-title").textContent = `${selected.name} · 城市对比`;
    $("#regional-comparison").innerHTML = data.cities.map(city => {
      const item = data.query({ ...state, city: city.id }).current;
      return `<div class="city-row ${city.id === state.city ? "current" : ""}"><span>${city.name}</span><div class="city-bar"><span style="width:${data.rate(item)}%"></span></div><strong>${percent(item)}</strong></div>`;
    }).join("");
    $("#decision-notes").innerHTML = notes(result).map((note, i) => `<article class="decision-note"><span>0${i + 1}</span><div><h3>${note.title}<span class="note-tag">${note.tag}</span></h3><p>${note.text}</p></div></article>`).join("");
    chart(result); icons();
  }
  $("#filters").addEventListener("submit", event => event.preventDefault());
  $("#filters").addEventListener("change", () => {
    state.city = $("#city").value; state.temperature = $("#temperature").value; state.weeks = Number($("#period").value);
    render();
  });
  $("#reset-filters").addEventListener("click", () => {
    Object.assign(state, { city: "shanghai", temperature: "all", weeks: 4, signal: "wide" });
    $("#filters").reset(); render(); showToast("已恢复默认观察范围");
  });
  $("#overview").addEventListener("click", event => {
    const button = event.target.closest("[data-signal]");
    if (button) {
      const restoreTabFocus = button.getAttribute("role") === "tab";
      state.signal = button.dataset.signal; render();
      if (restoreTabFocus) $(`#tab-${state.signal}`).focus();
    }
  });
  $("#signal-tabs").addEventListener("keydown", event => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = data.signals.findIndex(item => item.id === state.signal);
    const next = event.key === "Home" ? 0 : event.key === "End" ? data.signals.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + data.signals.length) % data.signals.length;
    state.signal = data.signals[next].id; render(); $(`#tab-${state.signal}`).focus();
  });
  function route() {
    const view = ["overview", "method"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "overview";
    document.querySelectorAll(".view").forEach(section => { section.hidden = section.id !== view; });
    document.querySelectorAll("[data-view]").forEach(link => {
      link.classList.toggle("active", link.dataset.view === view);
      if (link.dataset.view === view) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
    document.dispatchEvent(new CustomEvent("workspace-view", { detail: view }));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  $("#open-data").addEventListener("click", () => {
    $("#dialog-title").textContent = `${cityName()} · ${signalName()} · ${temperatureName()}`;
    $("#weekly-table").innerHTML = [
      ...currentResult.currentWeekly.map(row => ({ ...row, period: "当前周期" })),
      ...currentResult.previousWeekly.map(row => ({ ...row, period: "上一周期" }))
    ].map(row => `<tr><td>${row.period}</td><td>${row.date}</td><td>${number(row.count)}</td><td>${number(row.valid)}</td><td>${percent(row)}</td></tr>`).join("");
    $("#data-dialog").showModal();
  });
  $("#close-data").addEventListener("click", () => $("#data-dialog").close());
  $("#data-dialog").addEventListener("click", event => {
    if (event.target === $("#data-dialog")) {
      const bounds = event.target.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.target.close();
    }
  });
  function download(content, filename, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`已导出 ${filename}`);
  }
  $("#download-report").addEventListener("click", () => {
    const result = currentResult;
    const text = `# StreetSignal 区域穿着观察简报

> 全部统计为模拟数据 S-01，不代表真实人群、实时天气或市场预测。视频不参与统计。

## 观察范围

- 城市：${cityName()}
- 温度：${temperatureName()}（模拟分组）
- 当前周期：${range(result)}
- 对比周期：${result.previousWeekly[0].date} 起的上一等长 ${state.weeks} 周
- 有效穿搭样本：${result.current.samples} 套（模拟）

## 元素分布

| 元素 | 出现样本 | 对应有效样本 | 出现比例 | 较上期（百分点） |
| --- | ---: | ---: | ---: | ---: |
${result.ranking.map(item => `| ${item.name} | ${item.count} | ${item.valid} | ${item.rate.toFixed(1)}% | ${delta(item.delta)} |`).join("\n")}

## ${signalName()} · 观察与行动

${notes(result).map(note => `### ${note.title}（${note.tag}）\n\n${note.text}`).join("\n\n")}

## 口径与限制

比例 = 含元素的样本数 / 对应单品可判断的有效样本数；元素可共现。周期比例由计数合并得到，非周比例的简单平均。变化为百分点。150 样本和 2 pp 仅为演示规则，不表示统计显著性。

固定模拟数据覆盖 ${data.records[0].date} 至 2026-10-25，由场景规则生成；不含个人记录。不能外推城市人口偏好、购买意愿或销量。真实采集、数据许可、隐私与安装权限需另行审查。
`;
    download(text, `streetsignal-${state.city}-${state.signal}-SIMULATED.md`, "text/markdown;charset=utf-8");
  });
  $("#download-data").addEventListener("click", () => {
    const rows = [["dataset", "week_start", "city", "temperature_band", "samples",
      ...data.signals.flatMap(signal => [`${signal.id}_occurrences`, `${signal.id}_eligible_samples`])]];
    data.records.forEach(row => rows.push(["SIMULATED-S01", row.date, row.city, row.temperature, row.samples,
      ...data.signals.flatMap(signal => [row.elements[signal.id].count, row.elements[signal.id].valid])]));
    download("\uFEFF" + rows.map(row => row.join(",")).join("\r\n"), "streetsignal-SIMULATED-S01.csv", "text/csv;charset=utf-8");
  });
  render(); route();
  new ResizeObserver(() => {
    if (!$("#overview").hidden && currentResult) chart(currentResult);
  }).observe($("#trend-chart"));
})();
