/**
 * ==========================================================
 * Inoxa SEMS - charts.js
 * Chart.js chart initialization and real-time update logic.
 * Modular – can be extended to use Firebase / MQTT data.
 * ==========================================================
 */

'use strict';

const InoxaCharts = (() => {

  /* ── Chart.js Global Defaults ── */
  const applyGlobalDefaults = () => {
    Chart.defaults.color = '#64748b';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.05)';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size   = 11;
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15,23,42,0.95)';
    Chart.defaults.plugins.tooltip.borderColor     = 'rgba(255,255,255,0.1)';
    Chart.defaults.plugins.tooltip.borderWidth     = 1;
    Chart.defaults.plugins.tooltip.padding         = 10;
    Chart.defaults.plugins.tooltip.titleColor      = '#f1f5f9';
    Chart.defaults.plugins.tooltip.bodyColor       = '#94a3b8';
    Chart.defaults.plugins.tooltip.cornerRadius    = 8;
  };

  /* ── Shared helpers ── */
  const MAX_POINTS = 30; // Keep last N data points
  const now = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const makeLabels = (n) => Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.now() - (n - 1 - i) * 1000);
    return d.toLocaleTimeString('en-US', { hour12: false });
  });

  const makeDataset = (color, fill = true) => ({
    data: [],
    borderColor: color,
    backgroundColor: fill ? `${color}18` : 'transparent',
    borderWidth: 2,
    fill: fill,
    tension: 0.4,
    pointRadius: 0,
    pointHoverRadius: 4,
    pointHoverBackgroundColor: color,
  });

  const lineChartConfig = (label, color, yMin, yMax, unit = '') => ({
    type: 'line',
    data: {
      labels: makeLabels(MAX_POINTS),
      datasets: [makeDataset(color)],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: {
            maxTicksLimit: 5,
            color: '#475569',
            font: { size: 10 },
          },
        },
        y: {
          min: yMin, max: yMax,
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: {
            color: '#475569',
            font: { size: 10 },
            callback: (v) => `${v}${unit}`,
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${label}: ${ctx.parsed.y.toFixed(2)}${unit}`,
          },
        },
      },
    },
  });

  /* ── Chart Instances ── */
  const charts = {};

  /* ── Push a new data point ── */
  const pushPoint = (chartKey, value) => {
    const ch = charts[chartKey];
    if (!ch) return;
    const ds = ch.data.datasets[0];
    ds.data.push(value);
    ch.data.labels.push(now());
    if (ds.data.length > MAX_POINTS) {
      ds.data.shift();
      ch.data.labels.shift();
    }
    ch.update('none'); // no animation for smooth real-time
  };

  /* ── Initialize all charts ── */
  const initCharts = () => {
    const defs = [
      { key: 'power',   canvas: 'chartPower',   label: 'Power',       color: '#f59e0b', yMin: 100, yMax: 400, unit: 'W'  },
      { key: 'voltage', canvas: 'chartVoltage',  label: 'Voltage',     color: '#2196f3', yMin: 200, yMax: 250, unit: 'V'  },
      { key: 'current', canvas: 'chartCurrent',  label: 'Current',     color: '#8b5cf6', yMin: 0,   yMax: 2,   unit: 'A'  },
      { key: 'temp',    canvas: 'chartTemp',     label: 'Temperature', color: '#ef4444', yMin: 20,  yMax: 45,  unit: '°C' },
      { key: 'humidity',canvas: 'chartHumidity', label: 'Humidity',    color: '#06b6d4', yMin: 30,  yMax: 80,  unit: '%'  },
      { key: 'energy',  canvas: 'chartEnergy',   label: 'Energy',      color: '#2ecc71', yMin: 0,   yMax: 1,   unit: 'kWh'},
    ];

    defs.forEach(({ key, canvas, label, color, yMin, yMax, unit }) => {
      const el = document.getElementById(canvas);
      if (!el) return;
      charts[key] = new Chart(el, lineChartConfig(label, color, yMin, yMax, unit));
      // Pre-fill with initial data
      for (let i = 0; i < MAX_POINTS; i++) pushPoint(key, (yMin + yMax) / 2);
    });
  };

  /* ── Sparkline mini-charts ── */
  const sparklines = {};

  const initSparklines = () => {
    const defs = [
      { key: 'spark-power',   canvas: 'sparkPower',   color: '#f59e0b' },
      { key: 'spark-voltage', canvas: 'sparkVoltage',  color: '#2196f3' },
      { key: 'spark-current', canvas: 'sparkCurrent',  color: '#8b5cf6' },
      { key: 'spark-temp',    canvas: 'sparkTemp',     color: '#ef4444' },
    ];

    defs.forEach(({ key, canvas, color }) => {
      const el = document.getElementById(canvas);
      if (!el) return;
      sparklines[key] = new Chart(el, {
        type: 'line',
        data: {
          labels: Array(10).fill(''),
          datasets: [{
            data: Array(10).fill(0),
            borderColor: color,
            backgroundColor: `${color}20`,
            borderWidth: 1.5,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
          }],
        },
        options: {
          responsive: false,
          animation: { duration: 0 },
          scales: { x: { display: false }, y: { display: false } },
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
        },
      });
    });
  };

  const pushSparkline = (key, value) => {
    const sp = sparklines[key];
    if (!sp) return;
    sp.data.datasets[0].data.push(value);
    sp.data.datasets[0].data.shift();
    sp.update('none');
  };

  /* ── Public API ── */
  const update = (data) => {
    pushPoint('power',    data.power);
    pushPoint('voltage',  data.voltage);
    pushPoint('current',  data.current);
    pushPoint('temp',     data.temperature);
    pushPoint('humidity', data.humidity);
    pushPoint('energy',   data.energyDelta);

    pushSparkline('spark-power',   data.power);
    pushSparkline('spark-voltage', data.voltage);
    pushSparkline('spark-current', data.current);
    pushSparkline('spark-temp',    data.temperature);
  };

  const init = () => {
    applyGlobalDefaults();
    initCharts();
    initSparklines();
    console.log('[Inoxa Charts] Charts initialized ✓');
  };

  return { init, update };
})();
