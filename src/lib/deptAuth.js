import { supabase } from './supabaseClient'

const STORAGE_KEY = 'huddle_dept_session'
const SESSION_HOURS = 12

export const DEPARTMENTS = [
  { value: 'service_desk', label: 'Service Desk', sections: ['service_desk', 'sla'] },
  { value: 'network', label: 'Network', sections: ['network'] },
  { value: 'security', label: 'IT Security', sections: ['phishing', 'cyber_safe'] },
]

export function getDepartmentInfo(value) {
  return DEPARTMENTS.find((d) => d.value === value) || null
}

export async function loginDepartment(department, password) {
  const { data, error } = await supabase.rpc('verify_department_password', {
    p_department: department,
    p_password: password,
  })
  if (error) throw error
  if (!data) return false

  const session = { department, loggedInAt: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return true
}

export function getDepartmentSession() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    const ageHours = (Date.now() - session.loggedInAt) / (1000 * 60 * 60)
    if (ageHours > SESSION_HOURS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function logoutDepartment() {
  localStorage.removeItem(STORAGE_KEY)
}
