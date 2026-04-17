// ════════════════════════════════════════════════════════
// 🧠 1. تعريف حالات البقرة (State Machine)
// ════════════════════════════════════════════════════════
export const COW_STATES = {
  CALF: 'عجل',
  HEIFER: 'عجلة',
  OPEN: 'جاهزة للتلقيح',
  INSEMINATED: 'ملقحة',
  HEAT_WATCH: 'مراقبة الشبق',
  PREGNANCY_CHECK: 'فحص حمل',
  HEAT_READY: 'جاهزة (شبق)',
  PREGNANT: 'حامل',
  DRY: 'جافة',
  CLOSE_UP: 'قريبة للولادة',
  LACTATING: 'حلابة',
  SICK: 'مريضة',
  SOLD: 'مباعة'
};

const STATE_COLORS = {
  'حامل': 'green',
  'قريبة للولادة': 'orange',
  'مريضة': 'red',
  'جاهزة للتلقيح': 'blue',
  'جاهزة (شبق)': 'vibrant-blue',
  'مراقبة الشبق': 'yellow',
  'فحص حمل': 'purple',
  'جافة': 'gray',
  'ملقحة': 'light-blue',
  'حلابة': 'cyan',
  'عجلة': 'gray',
  'عجل': 'gray',
  'مباعة': 'dark'
};

// ─── دوال مساعدة ──────────────────────────────────────────
const getDaysBetween = (d1, d2) => {
  if (!d1 || !d2) return null;
  return Math.max(0, Math.floor((new Date(d2) - new Date(d1)) / 86400000));
};

const getAgeInMonths = (birthDate, defaultAge) => {
  if (birthDate) {
    const today = new Date().toISOString().split('T')[0];
    return getDaysBetween(birthDate, today) / 30.44;
  }
  return parseFloat(defaultAge) ? parseFloat(defaultAge) * 12 : 999;
};

// ════════════════════════════════════════════════════════
// 🧩 2. دوال الاشتقاق الأساسية (Base Status)
// ════════════════════════════════════════════════════════
export function getCowStatus(cow, inseminations = [], cowEvents = []) {
  if (!cow) return null;
  const today = new Date().toISOString().split('T')[0];

  let state = COW_STATES.LACTATING;
  let daysToBirth = null;
  let pregnancyDays = null;
  let daysSinceCalving = cow.lastBirthDate ? getDaysBetween(cow.lastBirthDate, today) : null;
  let isPregnant = false;

  const ageDays = cow.birthDate ? getDaysBetween(cow.birthDate, today) : (parseFloat(cow.age) ? parseFloat(cow.age) * 365 : 9999);
  const ageMonths = ageDays / 30.44;

  // حالة البيع
  if (cow.isSold || cow.status === 'مباعة') {
    return _buildPayload(COW_STATES.SOLD, cow, daysSinceCalving, daysToBirth, false, ageDays, []);
  }

  const cowIdMatches = (item) => item.cowFirestoreId === cow.firestoreId || item.cowId === cow.id;

  // 1️⃣ البحث عن آخر تلقيح نشط
  const activeInsem = [...inseminations]
    .filter(i => cowIdMatches(i) && ['pending', 'confirmed'].includes(i.status))
    .sort((a, b) => new Date(b.insemDate) - new Date(a.insemDate))[0];

  // 2️⃣ البحث عن آخر حدث "شبق" (HEAT)
  const lastHeatEvent = [...cowEvents]
    .filter(e => cowIdMatches(e) && e.type === 'HEAT')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  if (activeInsem) {
    if (activeInsem.status === 'confirmed') {
      isPregnant = true;
      pregnancyDays = getDaysBetween(activeInsem.insemDate, today);
      daysToBirth = Math.max(0, 280 - pregnancyDays);

      if (daysToBirth <= 20) state = COW_STATES.CLOSE_UP;
      else if (daysToBirth <= 60) state = COW_STATES.DRY;
      else state = COW_STATES.PREGNANT;
    } else if (activeInsem.status === 'pending') {
      const daysSinceInsem = getDaysBetween(activeInsem.insemDate, today);

      // كشف فشل التلقيح تلقائياً (Heat حدث بعد التلقيح خلال 30 يوم)
      const hasHeatAfterInsem = lastHeatEvent && new Date(lastHeatEvent.date) > new Date(activeInsem.insemDate);

      if (hasHeatAfterInsem && daysSinceInsem <= 30) {
        state = COW_STATES.HEAT_READY;
      } else if (daysSinceInsem < 18) {
        state = COW_STATES.INSEMINATED;
      } else if (daysSinceInsem <= 24) {
        state = COW_STATES.HEAT_WATCH;
      } else {
        state = COW_STATES.PREGNANCY_CHECK;
      }
    }
  } else {
    // التحقق من الجاهزية للتلقيح (عبر Heat Event حديث)
    const isHeatReady = lastHeatEvent && getDaysBetween(lastHeatEvent.date, today) <= 2;

    if (ageMonths < 6) {
      state = COW_STATES.CALF;
    } else if (ageMonths < 14) {
      state = COW_STATES.HEIFER;
    } else if (isHeatReady) {
      state = COW_STATES.HEAT_READY;
    } else if (daysSinceCalving !== null) {
      if (daysSinceCalving < 60) state = COW_STATES.LACTATING;
      else state = COW_STATES.OPEN;
    } else {
      state = COW_STATES.OPEN;
    }
  }

  // حالة المرض
  if (cow.status === 'مريضة' || cow.isSick) {
    state = COW_STATES.SICK;
  }

  const alerts = generateAlerts(cow, state, daysSinceCalving, daysToBirth, activeInsem);
  return _buildPayload(state, cow, daysSinceCalving, daysToBirth, isPregnant, ageDays, alerts);
}

function _buildPayload(state, cow, daysSinceCalving, daysToBirth, isPregnant, ageInDays, alerts) {
  const isSick = state === COW_STATES.SICK || cow.status === 'مريضة';
  return {
    state,
    daysToBirth,
    daysSinceCalving,
    isPregnant,
    isSick,
    ageInDays,
    alerts
  };
}

// ════════════════════════════════════════════════════════
// 🔔 3. الإشعارات
// ════════════════════════════════════════════════════════
export function generateAlerts(cow, state, daysSinceCalving, daysToBirth, activeInsem) {
  const alerts = [];
  const today = new Date().toISOString().split('T')[0];

  if (state === COW_STATES.SICK) {
    alerts.push({ id: 'SICK', type: 'danger', priority: 1, msg: '⚠️ مريضة – أوقف التلقيح واعزل الحليب' });
  }

  if (state === COW_STATES.OPEN) {
    alerts.push({ id: 'READY_TO_INSEMINATE', type: 'success', priority: 3, msg: '🟢 جاهزة للتلقيح (تجاوزت فترة الراحة)' });
  }

  if (activeInsem && activeInsem.status === 'pending') {
    const daysSinceInsem = getDaysBetween(activeInsem.insemDate, today);
    if (daysSinceInsem >= 21 && daysSinceInsem < 35) {
      alerts.push({ id: 'WATCH_HEAT', type: 'warning', priority: 2, msg: `🔄 راقب دورة الشياع (مر ${daysSinceInsem} يوم)` });
    }
    if (daysSinceInsem >= 35) {
      alerts.push({ id: 'PREGNANCY_CHECK', type: 'info', priority: 2, msg: `🔍 موعد فحص الحمل وتأكيده (مر ${daysSinceInsem} يوم)` });
    }
  }

  if (daysToBirth !== null) {
    if (daysToBirth <= 60 && daysToBirth > 20) {
      alerts.push({ id: 'DRY_OFF', type: 'warning', priority: 2, msg: `🌿 موعد التجفيف (باقي ${daysToBirth} يوم للولادة)` });
    }
    if (daysToBirth <= 20) {
      alerts.push({ id: 'CLOSE_TO_BIRTH', type: 'danger', priority: 1, msg: `🚨 قرب الولادة (باقي ${daysToBirth} يوم)` });
    }
  }

  return alerts;
}

// ════════════════════════════════════════════════════════
// 🚫 4. محرك القوانين (Rules Engine)
// ════════════════════════════════════════════════════════
export function validateAction(cowStatusObj, action) {
  const { state, isSick, daysSinceCalving, isPregnant } = cowStatusObj;

  switch (action) {
    case 'INSEMINATE':
      if (state === COW_STATES.SOLD) return { valid: false, reason: 'البقرة مباعة' };
      if (isSick) return { valid: false, reason: 'البقرة مريضة (لا يمكن التلقيح)' };
      if (state === COW_STATES.CALF || state === COW_STATES.HEIFER) {
        return { valid: false, reason: 'عمر البقرة غير مناسب للتلقيح' };
      }
      if (daysSinceCalving !== null && daysSinceCalving < 60) {
        return { valid: false, reason: `فترة الراحة VWP (مر ${daysSinceCalving} يوم فقط، الحد الأدنى 60)` };
      }
      if (isPregnant) return { valid: false, reason: 'البقرة حامل بالفعل' };
      if (state === COW_STATES.INSEMINATED) return { valid: false, reason: 'بانتظار فحص الحمل (تم تلقيحها)' };
      return { valid: true };

    case 'VACCINATE':
      // Basic fallback checks, real checks now happen in vaccineEngine
      if (state === COW_STATES.SOLD) return { valid: false, reason: '❌ البقرة مباعة' };
      return { valid: true };

    case 'TREAT':
      if (state === COW_STATES.SOLD) return { valid: false, reason: '❌ البقرة مباعة' };
      return { valid: true }; // العلاج مسموح في أي حالة

    default:
      return { valid: false, reason: 'أمر غير معرف' };
  }
}

/**
 * 💉 VACCINATE action is now handled by Vaccine Engine directly
 * Used only as generic passthrough if needed
 */
export function validateVaccineActionStub() {
  return { valid: true };
}

// ════════════════════════════════════════════════════════
// 🔥 5. تصدير البيانات الشاملة للواجهة (Display Data Generator)
// ════════════════════════════════════════════════════════
export function getCowDisplayData(cow, inseminations = [], cowEvents = []) {
  const statusDef = getCowStatus(cow, inseminations, cowEvents);
  if (!statusDef) return null;

  // 1️⃣ Theme & Priority Highlighting
  const theme = STATE_COLORS[statusDef.state] || 'gray';
  const isPulse = statusDef.state === COW_STATES.HEAT_READY;

  // 2️⃣ Smart Counter 
  let counter = { label: 'لا يوجد عداد', progress: 0, show: false };

  if (statusDef.daysToBirth !== null) {
    counter = {
      show: true,
      label: `باقي ${statusDef.daysToBirth} يوم للولادة`,
      progress: Math.max(0, Math.min(1, (280 - statusDef.daysToBirth) / 280))
    };
  } else if (statusDef.state === COW_STATES.INSEMINATED) {
    counter = { show: true, label: 'بانتظار فحص الحمل', progress: 0.5 };
  } else if (statusDef.state === COW_STATES.HEAT_WATCH) {
    counter = { show: true, label: 'فترة مراقبة الشبق النشطة', progress: 0.8 };
  } else if (statusDef.daysSinceCalving !== null && !statusDef.isPregnant) {
    counter = {
      show: true,
      label: `${statusDef.daysSinceCalving} يوم بعد الولادة`,
      progress: Math.min(1, statusDef.daysSinceCalving / 60)
    };
  }

  // 3️⃣ Action Priority System (Hybrid Hybrid)
  let actions = [];

  // فحص التلقيح
  if (statusDef.state === COW_STATES.HEAT_READY) {
    actions.push({ label: '⚡ تلقيح الآن', disabled: false, priority: 1, action: 'INSEMINATE' });
  } else if (statusDef.state === COW_STATES.HEAT_WATCH) {
    actions.push({ label: '🐄 تسجيل شبق', disabled: false, priority: 2, action: 'RECORD_HEAT' });
  } else if (statusDef.state === COW_STATES.PREGNANCY_CHECK) {
    actions.push({ label: '🔍 فحص الحمل (PD)', disabled: false, priority: 2, action: 'CONFIRM_PREGNANCY' });
  }

  const insemValidation = validateAction(statusDef, 'INSEMINATE');
  if (insemValidation.valid && statusDef.state !== COW_STATES.HEAT_READY) {
    actions.push({ label: 'تلقيح البقرة', disabled: false, priority: 4, action: 'INSEMINATE' });
  } else if (
    statusDef.state !== COW_STATES.SOLD &&
    statusDef.state !== COW_STATES.PREGNANT &&
    statusDef.state !== COW_STATES.CLOSE_UP &&
    statusDef.state !== COW_STATES.INSEMINATED &&
    statusDef.state !== COW_STATES.DRY
  ) {
    // إظهار سبب المنع على الزر مباشرة (UX Upgrade)
    actions.push({ label: insemValidation.reason, disabled: true, priority: 8, action: 'DISABLED_INSEMINATE' });
  }

  // Manual Override for failures
  if (statusDef.state === COW_STATES.INSEMINATED || statusDef.state === COW_STATES.HEAT_WATCH || statusDef.state === COW_STATES.PREGNANCY_CHECK) {
    actions.push({ label: 'تأكيد فشل التلقيح', disabled: false, priority: 9, action: 'MARK_FAILED' });
  }

  if (statusDef.state === COW_STATES.CLOSE_UP) {
    actions.push({ label: 'تسجيل ولادة', disabled: false, priority: 1, action: 'ADD_BIRTH' });
  }

  if (statusDef.state === COW_STATES.INSEMINATED) {
    actions.push({ label: 'تأكيد الفحص', disabled: false, priority: 1, action: 'CONFIRM_PREGNANCY' });
  }

  if (statusDef.state === COW_STATES.DRY) {
    actions.push({ label: 'مرحلة التجفيف للولادة', disabled: true, priority: 3, action: 'WAITING_BIRTH' });
  }

  if (statusDef.state === COW_STATES.SICK) {
    actions.push({ label: 'تحت العلاج', disabled: true, priority: 1, action: 'SICK_BLOCK' });
  }

  // 💉 فحص حالة التطعيم المركزية (Basic display level - deep checks in UI)
  const vaccineVal = validateAction(statusDef, 'VACCINATE');
  if (vaccineVal.valid) {
    actions.push({ label: 'جدولة تطعيم', disabled: false, priority: 4, action: 'VACCINATE' });
  } else if (statusDef.state !== COW_STATES.SOLD) {
    actions.push({ label: vaccineVal.reason, disabled: true, priority: 7, action: 'VACCINE_BLOCKED' });
  }

  // ترتيب حسب الأولوية القصوى (الأقل رقماً يظهر أولاً)
  actions.sort((a, b) => a.priority - b.priority);

  // Primary Action Fallback
  const primaryAction = actions.length > 0
    ? actions[0]
    : { label: 'لا يوجد إجراء', disabled: true, action: 'NONE' };

  return {
    ...statusDef,
    theme,
    counter,
    primaryAction,
    alerts: statusDef.alerts
  };
}

// ════════════════════════════════════════════════════════
// 📊 5. محرك قرارات لوحة التحكم (Decision Dashboard Engine)
// ════════════════════════════════════════════════════════
export function getDashboardDecisions(cows = [], inseminations = [], milkRecords = [], cowEvents = []) {
  // تفريغ وتجهيز هيكل البيانات للداشبورد المرجعي (Single Source of Truth)
  const dashboard = {
    summary: {
      totalCows: 0,
      milking: 0,
      heifers: 0,
      pregnant: 0,
      calves: 0
    },
    tasks: {
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0
    },
    alerts: {
      closeToBirth: 0,
      readyToInseminate: 0,
      sick: 0,
      needPregnancyCheck: 0,
      watchHeat: 0,
      dryOff: 0
    },
    lists: {
      sickCows: [],
      upcomingBirths: [],
      readyToInseminate: [],
      upcomingVax: [] // Can be populated externally or passed if needed
    },
    production: {
      todayMilk: 0,
      weeklyMilk: 0
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  // حساب إنتاج الحليب
  milkRecords.forEach(m => {
    if (!m.amount) return;
    if (m.date === todayStr) dashboard.production.todayMilk += m.amount;
    if (last7Days.includes(m.date)) dashboard.production.weeklyMilk += m.amount;
  });

  // المرور على الأبقار وتشغيل المحرك البيولوجي عليها
  cows.forEach(cow => {
    if (cow.isSold || cow.status === 'مباعة') return;
    dashboard.summary.totalCows++;

    const statusDef = getCowStatus(cow, inseminations, cowEvents);
    if (!statusDef) return;

    // تحديث الملخص العام (Summary)
    if (statusDef.state === COW_STATES.LACTATING) dashboard.summary.milking++;
    if (statusDef.state === COW_STATES.HEIFER) dashboard.summary.heifers++;
    if (statusDef.state === COW_STATES.CALF) dashboard.summary.calves++;
    if (statusDef.isPregnant) dashboard.summary.pregnant++;

    // معالجة الإشعارات المستخرجة (الترجمة السليمة لحالات القطيع إلى قرارات)
    if (statusDef.alerts && statusDef.alerts.length > 0) {
      statusDef.alerts.forEach(alert => {
        // ترتيب الأولويات بناءً على المحرك
        if (alert.priority === 1) dashboard.tasks.highPriority++;
        else if (alert.priority === 2) dashboard.tasks.mediumPriority++;
        else dashboard.tasks.lowPriority++;

        // تعداد الحالات الحرجة 
        switch (alert.id) {
          case 'SICK':
            dashboard.alerts.sick++;
            dashboard.lists.sickCows.push({ cow, alert });
            break;
          case 'CLOSE_TO_BIRTH':
            dashboard.alerts.closeToBirth++;
            dashboard.lists.upcomingBirths.push({ cow, alert, daysLeft: statusDef.daysToBirth });
            break;
          case 'READY_TO_INSEMINATE':
            dashboard.alerts.readyToInseminate++;
            dashboard.lists.readyToInseminate.push({ cow, alert });
            break;
          case 'PREGNANCY_CHECK':
            dashboard.alerts.needPregnancyCheck++;
            dashboard.lists.readyToInseminate.push({ cow, alert }); // نضمها للمراقبة والتلقيح
            break;
          case 'WATCH_HEAT':
            dashboard.alerts.watchHeat++;
            dashboard.lists.readyToInseminate.push({ cow, alert });
            break;
          case 'DRY_OFF':
            dashboard.alerts.dryOff++;
            dashboard.lists.upcomingBirths.push({ cow, alert, daysLeft: statusDef.daysToBirth });
            break;
        }
      });
    }
  });

  // ترتيب القوائم لتسهيل العرض
  dashboard.lists.upcomingBirths.sort((a, b) => a.daysLeft - b.daysLeft);

  return dashboard;
}
