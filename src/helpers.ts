export class FetchError extends Error {
  status: number;
  responseData: unknown;

  constructor(status: number, responseData: unknown) {
    super(`HTTP error ${status}`);
    this.status = status;
    this.responseData = responseData;
  }
}

export const isFetchError = (error: unknown): error is FetchError => error instanceof FetchError;
