/* =====================================================================
   MindGear native reminders (Capacitor LocalNotifications)
   This file only does anything when running inside the compiled native
   Android app. In a normal browser/PWA it quietly does nothing, so it
   never changes how the existing app behaves there.
   ===================================================================== */
(function () {
  function isNative() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  }

  function getLN() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  }

  // Deterministic small positive int ID from any string, so the same
  // item always maps to the same notification ID (lets us safely replace it).
  function idFromString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h) % 2147000000 + 1;
  }

  const SCHEDULED_KEY = 'mindgear-scheduled-notification-ids';
  // Must match the main app's STORE_KEY constant. Reading via localStorage
  // (rather than referencing the app's `state` variable directly) means this
  // file never needs to touch or depend on the app's internal script scope.
  const APP_STORE_KEY = 'maanas-data-v1';

  function getCurrentState() {
    try {
      const raw = localStorage.getItem(APP_STORE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function getPreviouslyScheduledIds() {
    try {
      const raw = localStorage.getItem(SCHEDULED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function savePreviouslyScheduledIds(ids) {
    try { localStorage.setItem(SCHEDULED_KEY, JSON.stringify(ids)); } catch (e) {}
  }

  function buildNotificationList(state) {
    const list = [];

    // --- Timetable: recurring daily at each block's start time ---
    (state.timetable || []).forEach(item => {
      if (!item.start) return;
      const [h, m] = item.start.split(':').map(Number);
      if (isNaN(h) || isNaN(m)) return;
      list.push({
        id: idFromString('tt-' + item.id),
        title: '⏰ ' + item.activity,
        body: 'Starting now (' + item.start + '–' + (item.end || '') + ')',
        schedule: { on: { hour: h, minute: m }, allowWhileIdle: true }
      });
    });

    // --- Birthdays: recurring yearly at 9:00 AM on that month/day ---
    (state.birthdays || []).forEach(b => {
      if (!b.date) return;
      const d = new Date(b.date + 'T00:00:00');
      if (isNaN(d)) return;
      list.push({
        id: idFromString('bday-' + b.id),
        title: '🎂 Birthday today',
        body: b.name + (b.note ? ' — ' + b.note : ''),
        schedule: { on: { month: d.getMonth() + 1, day: d.getDate(), hour: 9, minute: 0 }, allowWhileIdle: true }
      });
    });

    // --- Entertainment: one-time reminder on the "from" date (or "to" if that's all that's set) ---
    Object.keys(state.entertainment || {}).forEach(catKey => {
      const cat = state.entertainment[catKey];
      (cat.toConsume || []).forEach(item => {
        const dateStr = item.from || item.to;
        if (!dateStr) return;
        const timeStr = item.time || '09:00';
        const [h, m] = timeStr.split(':').map(Number);
        const at = new Date(dateStr + 'T00:00:00');
        if (isNaN(at)) return;
        at.setHours(isNaN(h) ? 9 : h, isNaN(m) ? 0 : m, 0, 0);
        if (at.getTime() < Date.now() - 60000) return; // skip anything already in the past
        list.push({
          id: idFromString('ent-' + item.id),
          title: '🎬 ' + cat.verb + ' reminder',
          body: item.title,
          schedule: { at }
        });
      });
    });

    // --- Custom sections: same treatment as entertainment to-do items ---
    (state.custom || []).forEach(c => {
      (c.subsections || []).forEach(sub => {
        (sub.toConsume || []).forEach(item => {
          const dateStr = item.from || item.to;
          if (!dateStr) return;
          const timeStr = item.time || '09:00';
          const [h, m] = timeStr.split(':').map(Number);
          const at = new Date(dateStr + 'T00:00:00');
          if (isNaN(at)) return;
          at.setHours(isNaN(h) ? 9 : h, isNaN(m) ? 0 : m, 0, 0);
          if (at.getTime() < Date.now() - 60000) return;
          list.push({
            id: idFromString('custom-' + item.id),
            title: '🔔 ' + c.name + ' · ' + sub.name,
            body: item.title,
            schedule: { at }
          });
        });
      });
    });

    return list;
  }

  async function scheduleAllReminders() {
    if (!isNative()) return;
    const LN = getLN();
    if (!LN) return;

    try {
      const perm = await LN.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LN.requestPermissions();
        if (req.display !== 'granted') return;
      }

      const oldIds = getPreviouslyScheduledIds();
      if (oldIds.length) {
        try { await LN.cancel({ notifications: oldIds.map(id => ({ id })) }); } catch (e) {}
      }

      const list = buildNotificationList(getCurrentState());
      if (list.length) {
        await LN.schedule({ notifications: list });
      }
      savePreviouslyScheduledIds(list.map(n => n.id));
    } catch (e) {
      console.error('MindGear: reminder scheduling failed', e);
    }
  }

  // Hook into the app's existing saveState without modifying its source:
  // wrap it once it's defined, so every save also refreshes reminders.
  function hookSaveState() {
    if (typeof window.saveState !== 'function' || window.__mindgearSaveStateHooked) return false;
    const originalSaveState = window.saveState;
    window.saveState = async function (...args) {
      const result = await originalSaveState.apply(this, args);
      scheduleAllReminders();
      return result;
    };
    window.__mindgearSaveStateHooked = true;
    return true;
  }

  // saveState is defined inside the app's own script, so poll briefly until
  // it exists, then hook it and do an initial schedule pass.
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    if (hookSaveState()) {
      clearInterval(poll);
      scheduleAllReminders();
    } else if (attempts > 100) {
      clearInterval(poll); // give up quietly after ~10s if something's off
    }
  }, 100);
})();
