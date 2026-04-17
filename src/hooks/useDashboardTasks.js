import { useMemo } from 'react';
import { useFarm } from '../context/FarmContext';

/**
 * Adapter hook to transform dashboard lists into a standardized ActiveTasks[] format.
 * @param {string} category - 'COWS' or 'CALVES'
 */
export function useDashboardTasks(category = 'COWS') {
  const { splitStats, splitDashboard, daysBetween } = useFarm();
  
  const stats     = category === 'COWS' ? splitStats?.cows : splitStats?.calves;
  const dashboard = category === 'COWS' ? splitDashboard?.cows : splitDashboard?.calves;

  return useMemo(() => {
    if (!dashboard) return [];
    
    const tasks = [];
    const today = new Date().toISOString().split('T')[0];

    // ─── TASK GENERATION ENGINE ───
    const allCows = dashboard.lists?.sickCows || []; // Sick cows
    const birthList = dashboard.lists?.upcomingBirths || []; // Birth related
    const breedingList = dashboard.lists?.readyToInseminate || []; // Insem/PD related
    
    // Combine all sources
    const combinedLists = [...allCows, ...birthList, ...breedingList];

    combinedLists.forEach(item => {
      const alert = item.alert;
      if (!alert) return;

      const code = alert.code;
      const action = alert.action;
      const days = item.daysLeft || item.daysSinceCalving || item.daysSinceInsem || item.daysSinceHeat || item.daysSick || 0;
      
      let type = alert.type || 'info'; 
      let priority = alert.priority ?? 3;
      let icon = '⚡';
      let title = alert.msg;
      let actionLabel = '';
      let actionType = '';

      // 1️⃣ UI Look & Feel based on Biological Code
      switch (code) {
        case 'SICK': icon = '🚑'; break;
        case 'BIRTH_OVERDUE': icon = '🚨'; break;
        case 'BIRTH_UPCOMING': icon = '⏳'; break;
        case 'DRY_OFF_ACTIVE': icon = '🌿'; break;
        case 'DRY_OFF_UPCOMING': icon = '📅'; break;
        case 'POST_CALVING_DELAY': icon = '🐄'; break;
        case 'HEAT_WATCH': icon = '🔥'; break;
        default: icon = '⚡';
      }

      // 2️⃣ Action Layer: Map Action Keys to UI Labels & Types
      switch (action) {
        case 'TREAT':
          actionLabel = 'تلقي العلاج'; actionType = 'treat'; break;
        case 'INSEMINATE':
          actionLabel = 'تم التلقيح'; actionType = 'inseminate'; break;
        case 'RECORD_HEAT':
          actionLabel = 'متابعة'; actionType = 'heat'; break;
        case 'DRY_OFF':
          actionLabel = 'تم التنشيف'; actionType = 'dry_off'; break;
        case 'ADD_BIRTH':
          actionLabel = 'تسجيل ولادة'; actionType = 'birth'; break;
        case 'SET_DATE':
          actionLabel = 'تحديد موعد'; actionType = 'set_date'; break;
        default:
          actionLabel = 'تفاصيل'; actionType = 'details';
      }

      tasks.push({
        id: `${code}-${item.cow.id}`,
        cow: item.cow,
        cowWrapper: item,
        category,
        type,
        priority,
        icon,
        title,
        actionLabel,
        actionType,
        days: Math.abs(days)
      });
    });

    // ─── CALF SPECIFIC LOGIC ───
    if (category === 'CALVES' && stats.growth) {
      if (stats.growth.needsWeaning) {
        stats.growth.needsWeaning.forEach(calf => {
          tasks.push({
            id: `wean-${calf.id}`,
            cow: calf,
            cowWrapper: { cow: calf },
            category: 'CALVES',
            type: 'warning',
            priority: 3,
            icon: '🍼',
            title: 'جاهز للفطام',
            actionLabel: 'فطام',
            actionType: 'wean',
            days: calf.growth?.ageDays || 0
          });
        });
      }
    }

    // ─── DEDUPLICATION LOGIC ───
    const uniqueTasksMap = new Map();

    tasks.forEach(task => {
      const cowId = task.cow?.id;
      
      // Keep tasks without cow ID intact
      if (!cowId) {
        uniqueTasksMap.set(task.id, task);
        return;
      }

      if (!uniqueTasksMap.has(cowId)) {
        uniqueTasksMap.set(cowId, task);
      } else {
        const existing = uniqueTasksMap.get(cowId);
        // Priority (lower number = higher priority)
        if (task.priority < existing.priority) {
          uniqueTasksMap.set(cowId, task);
        } else if (task.priority === existing.priority) {
          // If equal priority, prefer the one with highest days (severity)
          if ((task.days || 0) > (existing.days || 0)) {
            uniqueTasksMap.set(cowId, task);
          }
        }
      }
    });

    const uniqueTasks = Array.from(uniqueTasksMap.values());

    // ─── FINAL SMART SORTING ───
    return uniqueTasks.sort((a, b) => {
      // 1. Order by Priority (ASC: -1, 0, 1, 2...)
      if (a.priority !== b.priority) return a.priority - b.priority;
      
      // 2. Secondary: Severity magnitude (DESC: more days first)
      return (b.days || 0) - (a.days || 0);
    });

  }, [category, stats, dashboard, daysBetween]);
}
