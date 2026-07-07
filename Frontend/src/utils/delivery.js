/**
 * Utility functions for calculating and formatting expected delivery dates.
 */

export function getExpectedDeliveryDate(deliveryPromise) {
  if (!deliveryPromise) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const normalized = String(deliveryPromise).toLowerCase().trim()

  let days = 0
  if (normalized === 'today') {
    return today
  } else if (normalized === 'tomorrow') {
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return tomorrow
  } else {
    const match = normalized.match(/^(\d+)/)
    if (match) {
      days = parseInt(match[1], 10)
    } else {
      const parsedDate = new Date(deliveryPromise)
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate
      }
      return null
    }
  }

  // If tomorrow (1 day), return it directly even if it's Sunday
  if (days === 1) {
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    return tomorrow
  }

  // For multi-day spans, skip any Sundays encountered along the way
  const targetDate = new Date(today)
  let daysAdded = 0
  while (daysAdded < days) {
    targetDate.setDate(targetDate.getDate() + 1)
    if (targetDate.getDay() === 0) {
      // Sunday detected - skip this day (do not count it as a delivery day)
      continue
    }
    daysAdded++
  }
  return targetDate
}

export function formatDate(date) {
  if (!date) return ''
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getDeliveryOptionsForPromise(promise) {
  const normalizedPromise = String(promise || 'tomorrow').toLowerCase().trim()
  
  let maxDays = 1
  if (normalizedPromise === 'today') {
    maxDays = 0
  } else if (normalizedPromise === 'tomorrow') {
    maxDays = 1
  } else {
    const match = normalizedPromise.match(/^(\d+)/)
    if (match) {
      maxDays = parseInt(match[1], 10)
    }
  }

  const options = []
  options.push({ value: 'today', label: 'Today', days: 0 })
  if (maxDays >= 1) {
    options.push({ value: 'tomorrow', label: 'Tomorrow', days: 1 })
  }
  for (let i = 3; i <= maxDays; i++) {
    options.push({ value: `${i}_days`, label: `${i} Days`, days: i })
  }

  // Ensure the maximum promise itself is in the options and is the last option
  const lastOptionValue = maxDays === 0 ? 'today' : maxDays === 1 ? 'tomorrow' : `${maxDays}_days`
  if (!options.some(opt => opt.value === lastOptionValue)) {
    options.push({ value: lastOptionValue, label: `${maxDays} Days`, days: maxDays })
  }

  return options
}
