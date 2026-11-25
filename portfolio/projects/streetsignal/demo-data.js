(function (root) {
  "use strict";
  const cities = [
    { id: "shanghai", name: "上海" },
    { id: "chengdu", name: "成都" },
    { id: "guangzhou", name: "广州" }
  ];
  const temperatures = [
    { id: "cool", name: "8–16°C" },
    { id: "mild", name: "17–24°C" },
    { id: "warm", name: "25–31°C" }
  ];
  const signals = [
    { id: "wide", name: "阔腿裤", denominator: "下装", base: [.29, .34, .24], slope: .008, temperature: [.02, 0, -.015] },
    { id: "stripe", name: "条纹衬衫", denominator: "上装", base: [.22, .18, .25], slope: .003, temperature: [-.02, .025, .015] },
    { id: "dot", name: "波点元素", denominator: "图案", base: [.08, .10, .075], slope: .009, temperature: [-.01, .01, .02] },
    { id: "down", name: "羽绒外套", denominator: "外套", base: [.10, .13, .035], slope: .002, temperature: [.22, -.02, -.035] },
    { id: "vest", name: "无袖背心", denominator: "上装", base: [.15, .12, .23], slope: -.002, temperature: [-.10, -.015, .13] }
  ];
  // Fixed fictional aggregates, deliberately unrelated to the video samples.
  const records = [];
  for (let week = 0; week < 16; week++) {
    const date = new Date(Date.UTC(2026, 6, 6 + week * 7)).toISOString().slice(0, 10);
    cities.forEach((city, c) => temperatures.forEach((temperature, t) => {
      const samples = 98 + c * 17 + t * 13 + ((week * 19 + c * 7 + t * 11) % 53);
      const elements = {};
      signals.forEach((signal, s) => {
        const valid = Math.floor(samples * (.78 + ((c + t + s) % 4) * .045));
        const wave = Math.sin(week * .9 + c + s) * .012;
        const rate = Math.max(.004, Math.min(.8, signal.base[c] + signal.slope * week + signal.temperature[t] + wave));
        elements[signal.id] = { count: Math.round(valid * rate), valid };
      });
      records.push({ week, date, city: city.id, temperature: temperature.id, samples, elements });
    }));
  }
  const rate = stats => stats.valid ? stats.count / stats.valid * 100 : 0;
  function aggregate(rows, signalId) {
    return rows.reduce((total, row) => ({
      samples: total.samples + row.samples,
      count: total.count + row.elements[signalId].count,
      valid: total.valid + row.elements[signalId].valid
    }), { samples: 0, count: 0, valid: 0 });
  }
  function query({ city = "shanghai", temperature = "all", weeks = 4, signal = "wide" } = {}) {
    if (!cities.some(item => item.id === city) || !["all", ...temperatures.map(item => item.id)].includes(temperature) ||
        ![4, 8].includes(weeks) || !signals.some(item => item.id === signal)) throw new Error("Invalid observation filter");
    const matching = records.filter(row => row.city === city && (temperature === "all" || row.temperature === temperature));
    const currentRows = matching.filter(row => row.week >= 16 - weeks);
    const previousRows = matching.filter(row => row.week >= 16 - weeks * 2 && row.week < 16 - weeks);
    const current = aggregate(currentRows, signal), previous = aggregate(previousRows, signal);
    const weekly = start => Array.from({ length: weeks }, (_, i) => {
      const rows = matching.filter(row => row.week === start + i);
      return { date: rows[0].date, ...aggregate(rows, signal) };
    });
    return {
      current, previous, delta: rate(current) - rate(previous),
      currentWeekly: weekly(16 - weeks), previousWeekly: weekly(16 - weeks * 2),
      ranking: signals.map(item => {
        const now = aggregate(currentRows, item.id), before = aggregate(previousRows, item.id);
        return { ...item, ...now, rate: rate(now), delta: rate(now) - rate(before) };
      }).sort((a, b) => b.rate - a.rate)
    };
  }
  const api = { cities, temperatures, signals, records, query, rate };
  root.StreetData = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
