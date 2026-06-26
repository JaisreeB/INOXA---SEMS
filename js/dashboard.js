/**
 * ==========================================================
 * Inoxa SEMS - dashboard.js
 * Dashboard UI controller: sensor card updates, device
 * controls, alerts, analytics, and simulated data engine.
 *
 * Data Source Abstraction:
 * Replace `DataSimulator.nextFrame()` with a call to
 * Firebase RTDB listener or MQTT message handler to go live.
 * ==========================================================
 */

'use strict';

/* =========================================================
   DATA SIMULATOR
   Replace this module with Firebase / MQTT adapter.
   ========================================================= */
const DataSimulator = (() => {
  // Seed values
  let _power    = 250;
  let _voltage  = 230;
  let _current  = 1.0;
  let _temp     = 30;
  let _humidity = 55;
  let _light    = 600;
  let _airIdx   = 0; // 0=Good, 1=Moderate, 2=Poor
  let _water    = 1.5;
  let _energy   = 0; // accumulated kWh
  let _prevPower = 250;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const walk  = (v, step, min, max) => clamp(v + (Math.random() - 0.5) * 2 * step, min, max);

  const AIR_QUALITY = ['Good', 'Moderate', 'Poor'];

  const nextFrame = () => {
    _power    = walk(_power,    20,  180, 350);
    _voltage  = walk(_voltage,  2,   218, 242);
    _current  = _power / _voltage;
    _temp     = walk(_temp,     0.5, 24,  37);
    _humidity = walk(_humidity, 2,   38,  72);
    _light    = walk(_light,    40,  280, 950);
    _water    = walk(_water,    0.3, 0,   3.2);

    // Randomly shift air quality
    if (Math.random() < 0.02) _airIdx = (_airIdx + 1) % 3;

    // Energy delta (kWh per second)
    const energyDelta = _power / 3600 / 1000;
    _energy += energyDelta;

    const motion = Math.random() < 0.15;
    const trend  = _power > _prevPower ? 'up' : _power < _prevPower ? 'down' : 'flat';
    _prevPower   = _power;

    return {
      power:       +_power.toFixed(1),
      voltage:     +_voltage.toFixed(1),
      current:     +_current.toFixed(3),
      temperature: +_temp.toFixed(1),
      humidity:    +_humidity.toFixed(1),
      light:       +_light.toFixed(0),
      airQuality:  AIR_QUALITY[_airIdx],
      airIndex:    _airIdx,
      water:       +_water.toFixed(2),
      motion,
      energy:      +_energy.toFixed(4),
      energyDelta: +energyDelta.toFixed(6),
      powerTrend:  trend,
      timestamp:   new Date(),
    };
  };

  return { nextFrame };
})();

/* =========================================================
   DASHBOARD CONTROLLER
   ========================================================= */
const InoxaDashboard = (() => {

  /* ── Sensor card element cache ── */
  const EL = {};
  const get = (id) => document.getElementById(id);

  const cacheElements = () => {
    // Sensor value elements
    const ids = [
      'valPower', 'valVoltage', 'valCurrent', 'valEnergy',
      'valTemp', 'valHumidity', 'valLight', 'valAir',
      'valMotion', 'valWater',
      // Trend
      'trendPower', 'trendVoltage',
      // Card containers (for status color)
      'cardPower', 'cardTemp', 'cardAir', 'cardMotion',
      // Analytics
      'anaTodayUsage', 'anaWeekUsage', 'anaMonthUsage',
      'anaPeakHour', 'anaBill', 'anaCarbon',
      // Header
      'lastUpdated', 'clockDisplay', 'liveEnergy',
    ];
    ids.forEach(id => { EL[id] = get(id); });
  };

  /* ── Flash effect on update ── */
  const flash = (el) => {
    if (!el) return;
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 300);
  };

  /* ── Format helpers ── */
  const fmt  = (v, d = 1) => v.toFixed(d);
  const fmtTime = (d) => d.toLocaleTimeString('en-US', { hour12: false });

  /* ── Update sensor cards ── */
  const updateSensorCards = (data) => {
    const setVal = (elId, text, doFlash = true) => {
      const el = EL[elId];
      if (!el) return;
      el.textContent = text;
      if (doFlash) flash(el);
    };

    setVal('valPower',    `${fmt(data.power, 1)}`);
    setVal('valVoltage',  `${fmt(data.voltage, 1)}`);
    setVal('valCurrent',  `${fmt(data.current, 3)}`);
    setVal('valEnergy',   `${fmt(data.energy * 1000, 3)}`);
    setVal('valTemp',     `${fmt(data.temperature, 1)}`);
    setVal('valHumidity', `${fmt(data.humidity, 1)}`);
    setVal('valLight',    `${data.light}`);
    setVal('valAir',      data.airQuality);
    setVal('valMotion',   data.motion ? 'Detected' : 'Clear');
    setVal('valWater',    `${fmt(data.water, 2)}`);

    // Power trend
    if (EL.trendPower) {
      const icons = { up: '↑', down: '↓', flat: '→' };
      const classes = { up: 'trend-up', down: 'trend-down', flat: 'trend-flat' };
      EL.trendPower.textContent  = `${icons[data.powerTrend]} ${data.powerTrend}`;
      EL.trendPower.className    = `card-trend ${classes[data.powerTrend]}`;
    }

    // Power card color
    if (EL.cardPower) {
      EL.cardPower.className = EL.cardPower.className.replace(/status-\w+/, '');
      EL.cardPower.classList.add(data.power > 300 ? 'status-warn' : 'status-good');
    }

    // Temp card color
    if (EL.cardTemp) {
      EL.cardTemp.className = EL.cardTemp.className.replace(/status-\w+/, '');
      EL.cardTemp.classList.add(data.temperature > 33 ? 'status-warn' : 'status-info');
    }

    // Air quality card
    if (EL.cardAir) {
      EL.cardAir.className = EL.cardAir.className.replace(/status-\w+/, '');
      const airClasses = ['status-good', 'status-warn', 'status-bad'];
      EL.cardAir.classList.add(airClasses[data.airIndex]);
    }

    // Motion card
    if (EL.cardMotion) {
      EL.cardMotion.className = EL.cardMotion.className.replace(/status-\w+/, '');
      EL.cardMotion.classList.add(data.motion ? 'status-warn' : 'status-info');
    }

    // Live energy in header
    if (EL.liveEnergy) EL.liveEnergy.textContent = fmt(data.energy * 1000, 3);

    // Last updated
    if (EL.lastUpdated) EL.lastUpdated.textContent = `Updated: ${fmtTime(data.timestamp)}`;
  };

  /* ── Analytics panel ── */
  let _totalEnergy     = 0;
  let _weeklyEnergy    = 0;
  let _monthlyEnergy   = 0;
  let _peakPower       = 0;
  let _tickCount       = 0;
  const RATE_PER_KWH   = 8.5; // ₹/kWh (configurable)
  const CARBON_FACTOR  = 0.82; // kg CO₂ per kWh

  const updateAnalytics = (data) => {
    const deltaKwh = data.energyDelta;

    _totalEnergy   += deltaKwh;
    _weeklyEnergy  += deltaKwh;
    _monthlyEnergy += deltaKwh;
    if (data.power > _peakPower) _peakPower = data.power;
    _tickCount++;

    // Update DOM every 5 ticks to reduce DOM thrashing
    if (_tickCount % 5 !== 0) return;

    const todayKwh   = _totalEnergy * 1000;      // simulate scaling
    const weekKwh    = _weeklyEnergy * 7000;
    const monthKwh   = _monthlyEnergy * 30000;
    const bill       = monthKwh * RATE_PER_KWH;
    const carbonSaved = monthKwh * 0.12 * CARBON_FACTOR; // 12% from savings

    const setAna = (id, val) => { if (EL[id]) EL[id].textContent = val; };
    setAna('anaTodayUsage', `${todayKwh.toFixed(2)} Wh`);
    setAna('anaWeekUsage',  `${(weekKwh / 1000).toFixed(3)} kWh`);
    setAna('anaMonthUsage', `${(monthKwh / 1000).toFixed(2)} kWh`);
    setAna('anaPeakHour',   `${fmt(_peakPower, 0)} W`);
    setAna('anaBill',       `₹${bill.toFixed(2)}`);
    setAna('anaCarbon',     `${carbonSaved.toFixed(3)} kg`);
  };

  /* ── Alerts ── */
  const alertsEl = () => get('alertsList');
  const alertQueue = [];
  let alertCount = 0;

  const ALERT_DEFS = [
    { condition: (d) => d.power > 320,           type: 'alert-warn',    icon: '⚡', msg: 'High Power Consumption' },
    { condition: (d) => d.voltage > 238,          type: 'alert-danger',  icon: '🔺', msg: 'Voltage Spike Detected' },
    { condition: (d) => d.motion,                 type: 'alert-info',    icon: '🚶', msg: 'Motion Detected' },
    { condition: (d) => d.temperature > 33,       type: 'alert-warn',    icon: '🌡️', msg: 'High Temperature Alert' },
    { condition: (d) => d.airIndex === 2,         type: 'alert-danger',  icon: '💨', msg: 'Poor Air Quality Detected' },
    { condition: (d) => d.water > 2.8,            type: 'alert-warn',    icon: '💧', msg: 'High Water Flow Rate' },
    { condition: (d) => d.humidity > 65,          type: 'alert-info',    icon: '☁️', msg: 'Elevated Humidity' },
    { condition: (d) => d.power < 200,            type: 'alert-success', icon: '✅', msg: 'Low Energy Mode Active' },
  ];

  const checkAlerts = (data) => {
    const el = alertsEl();
    if (!el) return;

    ALERT_DEFS.forEach(def => {
      if (def.condition(data)) {
        // Rate-limit: same alert max once per 15s
        const key = def.msg;
        const last = alertQueue.find(a => a.key === key);
        if (last && (Date.now() - last.time < 15000)) return;

        // Remove old entry
        const idx = alertQueue.findIndex(a => a.key === key);
        if (idx >= 0) alertQueue.splice(idx, 1);
        alertQueue.push({ key, time: Date.now() });

        addAlert(el, def.type, def.icon, def.msg, data.timestamp);
      }
    });
  };

  const addAlert = (container, type, icon, msg, ts) => {
    const item = document.createElement('div');
    item.className = `alert-item ${type}`;
    item.innerHTML = `
      <span class="alert-icon">${icon}</span>
      <div class="alert-content">
        <div class="alert-title">${msg}</div>
        <div class="alert-time">${fmtTime(ts)}</div>
      </div>
    `;
    container.prepend(item);
    alertCount++;
    // Keep max 20 alerts
    while (container.children.length > 20) container.removeChild(container.lastChild);

    // Update badge
    const badge = get('alertBadge');
    if (badge) badge.textContent = alertCount;
  };

  /* ── Device Control Panel ── */
  const initDeviceControls = () => {
    const devices = document.querySelectorAll('.device-toggle');
    devices.forEach(toggle => {
      toggle.addEventListener('change', () => {
        const row    = toggle.closest('.device-row');
        const stateEl = row.querySelector('.device-state');
        const isOn   = toggle.checked;
        if (stateEl) stateEl.textContent = isOn ? 'ON  •  Running' : 'OFF  •  Standby';

        // Log to console (replace with Firebase write / MQTT publish)
        const name = row.querySelector('.device-name')?.textContent;
        console.log(`[Inoxa SEMS] Device "${name}" → ${isOn ? 'ON' : 'OFF'}`);
        // Future: FirebaseAdapter.setDevice(name, isOn);
      });
    });
  };

  /* ── Clock ── */
  const initClock = () => {
    const el = EL.clockDisplay;
    if (!el) return;
    const tick = () => {
      el.textContent = new Date().toLocaleTimeString('en-US', {
        hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    };
    tick();
    setInterval(tick, 1000);
  };

  /* ── Main data loop ── */
  let _loopId = null;

  const startDataLoop = () => {
    const tick = () => {
      const data = DataSimulator.nextFrame();

      // Update UI components
      updateSensorCards(data);
      updateAnalytics(data);
      checkAlerts(data);

      // Update charts (via InoxaCharts module)
      if (typeof InoxaCharts !== 'undefined') {
        InoxaCharts.update(data);
      }

      // Future Firebase adapter:
      // FirebaseAdapter.onData(callback) replaces this loop
    };

    tick(); // immediate first tick
    _loopId = setInterval(tick, 1000);
  };

  const stopDataLoop = () => {
    if (_loopId) clearInterval(_loopId);
  };

  /* ── Sidebar active link ── */
  const initSidebarNav = () => {
    const links = document.querySelectorAll('.sidebar-link[data-target]');
    const sections = {};
    links.forEach(link => {
      const target = link.dataset.target;
      sections[target] = document.getElementById(target);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          links.forEach(l => l.classList.remove('active'));
          const link = document.querySelector(`.sidebar-link[data-target="${e.target.id}"]`);
          if (link) link.classList.add('active');
        }
      });
    }, { threshold: 0.3 });

    Object.values(sections).forEach(s => { if (s) io.observe(s); });

    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = sections[link.dataset.target];
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  };

  /* ── Public Init ── */
  const init = () => {
    cacheElements();
    initDeviceControls();
    initClock();
    initSidebarNav();

    // Initialize charts first
    if (typeof InoxaCharts !== 'undefined') InoxaCharts.init();

    // Start data loop
    startDataLoop();

    // Cleanup on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopDataLoop();
      else startDataLoop();
    });

    console.log('[Inoxa SEMS] Dashboard initialized ✓');
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', InoxaDashboard.init);
