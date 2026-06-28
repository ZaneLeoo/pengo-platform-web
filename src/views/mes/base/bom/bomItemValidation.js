export function isPositiveNumber(value) {
  return value !== null && value !== undefined && Number(value) > 0
}

export function validatePositiveNumber(message) {
  return (_rule, value) => {
    if (isPositiveNumber(value)) {
      return Promise.resolve()
    }
    return Promise.reject(new Error(message))
  }
}
