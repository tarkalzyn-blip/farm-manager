/* eslint-disable no-restricted-globals */

// ══════════════════════════════════
//  DATE HELPERS inside Worker
// ══════════════════════════════════
const daysBetween = (d1, d2) => {
  return Math.ceil((new Date(d2) - new Date(d1)) / 86400000)
}

const addDays = (date, n) => {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

const daysLeft = (insemDate) => {
  const today = new Date().toISOString().split('T')[0]
  const exp = addDays(insemDate, 280)
  return daysBetween(today, exp)
}

self.onmessage = (event) => {
  const {
    cows,
    milkRecords,
    finances,
    births,
    inseminations,
    vaccinations,
    dryPeriodDays = 80
  } = event.data

  const today = new Date().toISOString().split('T')[0]
  
  // Calculate active lists
  const activeCows = cows.filter(c => !c.isSold)
  const activeBirths = births.filter(b => !b.isSold)

  const getTags = (cow) => {
    const tags = []
    const ageMonths = cow.birthDate
      ? Math.floor((new Date(today) - new Date(cow.birthDate)) / (86400000 * 30.44))
      : (parseFloat(cow.age) ? parseFloat(cow.age) * 12 : 9999)

    if (ageMonths < 6 && (cow.gender === 'male' || cow.gender === 'ذكر')) return ['maleCalf']
    if (ageMonths < 6) return ['calf']
    if (cow.status === 'مريضة') tags.push('sick')
    
    const pendingInsem = inseminations.find(i =>
      (i.cowFirestoreId === cow.firestoreId || i.cowId === cow.id) && i.status === 'pending'
    )
    
    let hasCheckOrFailed = false
    if (pendingInsem) {
      const d = Math.ceil((new Date(today) - new Date(pendingInsem.insemDate)) / 86400000)
      tags.push(d < 23 ? 'check' : 'failed')
      hasCheckOrFailed = true
    }
    
    let isPregnant = false
    let isDry = false

    const confirmedInsem = inseminations.find(i =>
      (i.cowFirestoreId === cow.firestoreId || i.cowId === cow.id) && i.status === 'confirmed'
    )
    
    if (confirmedInsem) {
      isPregnant = true
      const exp = new Date(confirmedInsem.insemDate)
      exp.setDate(exp.getDate() + 280)
      const daysRemaining = Math.ceil((exp - new Date(today)) / 86400000)
      if (daysRemaining <= dryPeriodDays) isDry = true
    } else if (cow.status === 'حامل') {
      isPregnant = true
    } else if (cow.status === 'جافة') {
      isPregnant = true
      isDry = true
    }
    
    if (isPregnant) {
      tags.push('pregnant')
      if (isDry) tags.push('dry')
      else tags.push('milk')
    } else {
      const producesMilk = cow && typeof cow.milk !== 'undefined' && Number(cow.milk) > 0;
      if (ageMonths >= 21 || (hasCheckOrFailed && producesMilk)) tags.push('milk');
    }
    
    if (!isPregnant && !hasCheckOrFailed && ageMonths >= 21) {
      tags.push('noInsemination')
    }
      
    return tags
  }

  const calculatedStats = {
    totalCows:    activeCows.length,
    healthyCows:  activeCows.filter(c => c.status === 'سليمة').length,
    sickCows:     activeCows.filter(c => c.status === 'مريضة').length,
    milkingCows:  activeCows.filter(c => getTags(c).includes('milk')).length,
    pregnantCows: activeCows.filter(c => getTags(c).includes('pregnant')).length,
    dryCows:      activeCows.filter(c => getTags(c).includes('dry')).length,
    maleCalves:   activeCows.filter(c => getTags(c).includes('maleCalf')).length,
    femaleCalves: activeCows.filter(c => getTags(c).includes('calf')).length,
    checkCows:    activeCows.filter(c => getTags(c).includes('check')).length,
    failedCows:   activeCows.filter(c => getTags(c).includes('failed')).length,
    pendingCows:  activeCows.filter(c => c.status === 'pending_insem').length,
    todayMilk:    milkRecords.filter(m => m.date === today).reduce((s, m) => s + (m.amount || 0), 0),
    totalRevenue: finances.filter(f => f.kind === 'revenue').reduce((s, f) => s + (f.amount || 0), 0),
    totalExpenses: finances.filter(f => f.kind === 'expense').reduce((s, f) => s + (f.amount || 0), 0),
    totalBirths:   births.length,
    activeInseminations: inseminations.filter(i => i.status === 'pending' || i.status === 'confirmed'),
    upcomingVaccinations: vaccinations.filter(v => !v.done),
    soonBirths: inseminations.filter(i => {
      if (i.status !== 'confirmed') return false
      const d = daysLeft(i.insemDate)
      return d <= 20
    }),
    pendingAlerts: inseminations.filter(i => {
      if (i.status !== 'pending') return false
      const days = daysBetween(i.insemDate, today)
      return days >= 20 && days <= 23
    }),
    needsInsemination: activeCows.filter(c => {
      if (!c.lastBirthDate) return false
      const daysSinceBirth = daysBetween(c.lastBirthDate, today)
      if (daysSinceBirth < 60) return false
      const hasActive = inseminations.some(i =>
        (i.cowFirestoreId ? i.cowFirestoreId === c.firestoreId : i.cowId === c.id) &&
        (i.status === 'pending' || i.status === 'confirmed')
      )
      return !hasActive
    }),
    soldCowsCount: cows.filter(c => c.isSold).length,
    soldCalvesCount: births.filter(b => b.isSold).length,
  }

  // Send result back to main thread
  self.postMessage({ stats: calculatedStats, activeCows, activeBirths })
}
