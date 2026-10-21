import { z } from "zod";

export const GroupSchema = z.enum(["א", "ב", "ג", "ד"]);
export const CatalogGroupSchema = z.enum(["א", "ב", "ג", "ד", "משפחתי"]);
export const PropulsionSchema = z.enum(["petrol", "hybrid", "plugin", "electric"]);

export const MoneySchema = z.number().finite();
export const NonNegativeSchema = z.number().finite().nonnegative();
export const PositiveSchema = z.number().finite().positive();
export const RateSchema = z.number().finite().min(0).max(1);

// Registry codes are strings: a number would already have lost its leading zeros ('00885').
export const RegistryCodeSchema = z.string().regex(/^\d{5}$/);
