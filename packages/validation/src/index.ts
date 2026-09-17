import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(320);

export const uuidSchema = z.uuid();

export const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a local date in YYYY-MM-DD format");
