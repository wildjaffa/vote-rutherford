import { ActionError } from "astro:actions";
import { isServiceError } from "../lib/services/utils";

/**
 * Maps a service error or unknown error to an Astro ActionError.
 * This ensures consistent error handling across all actions.
 */
export function handleActionError(err: unknown, defaultMessage: string): never {
  const isForbidden = isServiceError(err) && err.code === 403;

  throw new ActionError({
    code: isForbidden ? "FORBIDDEN" : "INTERNAL_SERVER_ERROR",
    message: (err instanceof Error ? err.message : undefined) || defaultMessage,
  });
}
