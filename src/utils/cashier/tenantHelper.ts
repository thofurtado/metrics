export function getTenantDisplayName(): string {
  if (typeof window === 'undefined') return 'METRICS'
  try {
    const hostname = window.location.hostname
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const sub = hostname.split('.')[0]
      if (sub && sub !== 'www' && sub !== 'app' && sub !== 'api') {
        return sub.toUpperCase()
      }
    }
    const storedProfile = localStorage.getItem('company_profile') || localStorage.getItem('tenant_name')
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile)
        if (parsed.name) return String(parsed.name).toUpperCase()
      } catch {
        if (typeof storedProfile === 'string' && storedProfile.length < 40) {
          return storedProfile.toUpperCase()
        }
      }
    }
  } catch {}
  return 'METRICS'
}