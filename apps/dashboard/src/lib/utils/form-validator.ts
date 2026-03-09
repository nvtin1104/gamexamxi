import { z } from 'zod'

export function getFieldValidator<T extends z.ZodType>(schema: T) {
  return ({ value }: { value: unknown }) => {
    const result = schema.safeParse(value)
    if (!result.success) {
      const fieldErrors = result.error.issues.filter(
        (err) => err.path.length === 1
      )
      if (fieldErrors.length > 0) {
        return getIssueMessage(fieldErrors[0])
      }
    }
    return undefined
  }
}

export function getFormValidator<T extends z.ZodType>(schema: T) {
  return ({ value }: { value: unknown }) => {
    const result = schema.safeParse(value)
    if (!result.success) {
      return getIssuesMessages(result.error.issues)
    }
    return undefined
  }
}

function getIssueMessage(issue: z.ZodIssue): string {
  const info = issue as unknown as {
    code: string
    message: string
    validation?: string
    minimum?: number
    maximum?: number
    type?: string
  }

  switch (info.code) {
    case 'invalid_string':
      if (info.validation === 'url') return 'URL không hợp lệ'
      if (info.validation === 'email') return 'Email không hợp lệ'
      return 'Giá trị không hợp lệ'
    case 'too_small':
      if (info.type === 'string') return `Tối thiểu ${info.minimum} ký tự`
      if (info.type === 'number') return `Giá trị phải >= ${info.minimum}`
      return 'Giá trị quá nhỏ'
    case 'too_big':
      if (info.type === 'string') return `Tối đa ${info.maximum} ký tự`
      if (info.type === 'number') return `Giá trị phải <= ${info.maximum}`
      return 'Giá trị quá lớn'
    case 'invalid_enum_value':
      return 'Giá trị không hợp lệ'
    default:
      return info.message
  }
}

function getIssuesMessages(issues: z.ZodIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path[issue.path.length - 1]
      const fieldName = typeof path === 'string' ? path : ''
      const msg = getIssueMessage(issue)
      return fieldName ? `${fieldName}: ${msg}` : msg
    })
    .join('\n')
}
