import { z } from "astro/zod";

export interface CanValidate<T> {
  validate(data: unknown): {
    success: boolean;
    data?: T;
    errors?: z.ZodError<T>;
  };
}
