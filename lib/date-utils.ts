// Date formatting utilities to avoid hydration errors
// These functions ensure consistent date formatting between server and client

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—"
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return "—"
    
    // Use a consistent format that works on both server and client
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  } catch {
    return "—"
  }
}

export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return "—"
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return "—"
    
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    const year = d.getFullYear()
    const month = months[d.getMonth()]
    const day = d.getDate()
    
    return `${month} ${day}, ${year}`
  } catch {
    return "—"
  }
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return "—"
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return "—"
    
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    
    return `${hours}:${minutes}`
  } catch {
    return "—"
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—"
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return "—"
    
    return `${formatDate(d)} ${formatTime(d)}`
  } catch {
    return "—"
  }
}

