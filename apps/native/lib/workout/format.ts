import {
  fromKg,
  toKg,
  type WeightUnit,
} from '@repo/backend/convex/domain/units';
import { ConvexError } from 'convex/values';

/** A weight in the member's unit, rounded to what a gym can load. */
export function weightInUnit(kg: number, unit: WeightUnit): number {
  return Number(fromKg(kg, unit).toFixed(2));
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${weightInUnit(kg, unit)} ${unit}`;
}

/** Parses a typed weight in the member's unit to kg; null when not a weight. */
export function parseWeightKg(text: string, unit: WeightUnit): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) && value >= 0
    ? toKg(value, unit)
    : null;
}

/** Parses a typed whole number; null when empty or not a whole number. */
export function parseWholeNumber(text: string): number | null {
  const value = Number(text.trim());
  return text.trim() !== '' && Number.isInteger(value) ? value : null;
}

/** Elapsed time as m:ss, or h:mm:ss from an hour on. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}`
    : `${minutes}:${rest}`;
}

/** The error code a Convex function threw, if it threw a domain error. */
export function errorCode(error: unknown): string | null {
  return error instanceof ConvexError && typeof error.data === 'string'
    ? error.data
    : null;
}
