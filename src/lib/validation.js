import { showToast } from '../store/ui'

const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (typeof value === 'number') return Number.isNaN(value)
  if (Array.isArray(value)) return value.length === 0
  if (value instanceof Set || value instanceof Map) return value.size === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

export const validateRequiredFields = (fields = {}, options = {}) => {
  const missing = Object.entries(fields).filter(([, value]) => isEmptyValue(value))
  if (missing.length === 0) return true

  const message = options.message || `Please fill the required field${missing.length > 1 ? 's' : ''}: ${missing.map(([label]) => label).join(', ')}.`
  const title = options.title || 'Missing information'

  if (typeof options.notify === 'function') {
    options.notify({ title, message, missing })
  } else {
    showToast(message, { type: 'warning', title })
  }
  return false
}

export default validateRequiredFields
