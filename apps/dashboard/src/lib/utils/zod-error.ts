const fieldNameMap: Record<string, string> = {
  name: 'Tên',
  email: 'Email',
  password: 'Mật khẩu',
  thumbnail: 'Ảnh thumbnail',
  logo: 'Logo',
  description: 'Mô tả',
  linkSocial: 'Liên kết mạng xã hội',
  url: 'URL',
  handle: 'Tài khoản',
  isPublic: 'Công khai',
  type: 'Loại',
  level: 'Cấp độ',
  parentId: 'ID cha',
  startDate: 'Ngày bắt đầu',
  endDate: 'Ngày kết thúc',
  result: 'Kết quả',
  status: 'Trạng thái',
  prize: 'Giải thưởng',
}

interface ZodIssueInput {
  validation?: string
  code: string
  message?: string
  path: (string | number)[]
  type?: string
  minimum?: number
  maximum?: number
}

function getFieldName(path: (string | number)[]): string {
  const field = path[path.length - 1]
  return fieldNameMap[String(field)] || String(field)
}

function getValidationMessage(issue: ZodIssueInput): string {
  const fieldName = getFieldName(issue.path)

  switch (issue.code) {
    case 'invalid_string':
      if (issue.validation === 'url') {
        return `${fieldName} không hợp lệ`
      }
      if (issue.validation === 'email') {
        return `${fieldName} không đúng định dạng email`
      }
      if (issue.validation === 'uuid') {
        return `${fieldName} không hợp lệ`
      }
      return `${fieldName} không hợp lệ`
    case 'too_small':
      if (issue.type === 'string') {
        return `${fieldName} phải có ít nhất ${issue.minimum} ký tự`
      }
      if (issue.type === 'number') {
        return `${fieldName} phải lớn hơn hoặc bằng ${issue.minimum}`
      }
      return `${fieldName} quá nhỏ`
    case 'too_big':
      if (issue.type === 'string') {
        return `${fieldName} không được vượt quá ${issue.maximum} ký tự`
      }
      if (issue.type === 'number') {
        return `${fieldName} phải nhỏ hơn hoặc bằng ${issue.maximum}`
      }
      return `${fieldName} quá lớn`
    case 'invalid_enum_value':
      return `${fieldName} không hợp lệ`
    case 'custom':
      return issue.message || `${fieldName} không hợp lệ`
    case 'invalid_type':
      return `${fieldName} không đúng định dạng`
    default:
      return issue.message || `${fieldName} không hợp lệ`
  }
}

export interface ZodErrorResponse {
  success: false
  error: {
    issues: ZodIssueInput[]
    name: 'ZodError'
  }
}

export function isZodError(error: unknown): error is ZodErrorResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'success' in error &&
    (error as Record<string, unknown>).success === false &&
    'error' in error &&
    typeof (error as Record<string, unknown>).error === 'object'
  )
}

export function mapZodError(error: unknown): string {
  if (!isZodError(error)) {
    return error instanceof Error ? error.message : 'Lỗi không xác định'
  }

  const { issues } = error.error

  if (issues.length === 1) {
    return getValidationMessage(issues[0])
  }

  const messages = issues.map((issue) => getValidationMessage(issue))
  return messages.join('\n')
}
