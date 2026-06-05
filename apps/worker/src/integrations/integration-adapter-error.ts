export class IntegrationAdapterError extends Error {
  constructor(
    message: string,
    readonly status: string,
    readonly retryable: boolean,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'IntegrationAdapterError';
  }
}
