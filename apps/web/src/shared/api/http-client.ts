import { parseApiError } from './api-error'
import { apiBaseUrl } from './endpoints'

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export type HttpRequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  method?: HttpMethod
  body?: BodyInit | Record<string, unknown> | null
}

class HttpClient {
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      method: options.method ?? 'GET',
      headers: this.headersFor(options),
      body: this.bodyFor(options.body),
    })

    if (!response.ok) {
      throw await parseApiError(response)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  }

  async blob(path: string, options: HttpRequestOptions = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      method: options.method ?? 'GET',
      headers: this.headersFor(options),
      body: this.bodyFor(options.body),
    })

    if (!response.ok) {
      throw await parseApiError(response)
    }

    return {
      blob: await response.blob(),
      fileName: fileNameFromDisposition(
        response.headers.get('Content-Disposition'),
      ),
      contentType: response.headers.get('Content-Type') ?? 'application/octet-stream',
    }
  }

  get<T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  post<T>(path: string, body?: HttpRequestOptions['body'], options?: RequestInit) {
    return this.request<T>(path, { ...options, method: 'POST', body })
  }

  patch<T>(path: string, body?: HttpRequestOptions['body'], options?: RequestInit) {
    return this.request<T>(path, { ...options, method: 'PATCH', body })
  }

  private headersFor(options: HttpRequestOptions) {
    const headers = new Headers(options.headers)

    if (options.body !== undefined && !(options.body instanceof FormData)) {
      headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json')
    }

    return headers
  }

  private bodyFor(body: HttpRequestOptions['body']) {
    if (!body || typeof body === 'string' || body instanceof FormData) {
      return body
    }

    return JSON.stringify(body)
  }
}

export const httpClient = new HttpClient(apiBaseUrl)

export function apiRequest<T>(path: string, init?: HttpRequestOptions): Promise<T> {
  return httpClient.request<T>(path, init)
}

function fileNameFromDisposition(disposition: string | null) {
  const match = disposition?.match(/filename="?(?<fileName>[^";]+)"?/)

  return match?.groups?.fileName ?? 'download'
}
