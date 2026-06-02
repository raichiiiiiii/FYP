export class ApiError extends Error {
  readonly status: number
  readonly statusText: string
  readonly body: unknown

  constructor(
    message: string,
    status: number,
    statusText: string,
    body: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
    this.body = body
  }
}

export async function parseApiError(response: Response) {
  const rawBody = await response.text()
  const body = parseResponseBody(rawBody)
  const message =
    getBodyMessage(body) ||
    rawBody ||
    `Request failed with ${response.status} ${response.statusText}`

  return new ApiError(message, response.status, response.statusText, body)
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message
  }

  return fallback
}

function parseResponseBody(rawBody: string) {
  if (!rawBody) {
    return null
  }

  try {
    return JSON.parse(rawBody) as unknown
  } catch {
    return rawBody
  }
}

function getBodyMessage(body: unknown) {
  if (!body || typeof body !== 'object') {
    return ''
  }

  const record = body as Record<string, unknown>
  const message = record.message

  if (typeof message === 'string') {
    return message
  }

  if (Array.isArray(message)) {
    return message.filter((item) => typeof item === 'string').join(', ')
  }

  return ''
}
