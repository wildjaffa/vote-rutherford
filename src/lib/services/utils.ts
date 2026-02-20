// common utilities used by service modules

export interface ServiceError extends Error {
  code?: number;
  details?: unknown;
}

export function makeError(
  message: string,
  code?: number,
  details?: unknown,
): ServiceError {
  const err = new Error(message) as ServiceError;
  if (code !== undefined) err.code = code;
  if (details !== undefined) err.details = details;
  return err;
}
