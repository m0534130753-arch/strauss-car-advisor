import type { Field } from "../model";

// A field that is missing or not yet confirmed (e.g. read from a payslip) does not count.
export function confirmedValue<T>(field: Field<T> | undefined): T | undefined {
  return field?.confirmed ? field.value : undefined;
}
