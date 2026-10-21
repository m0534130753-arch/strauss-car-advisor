export type Source = "employee" | "payslip" | "representative" | "catalog" | "demo";

// A field with confirmed: false (e.g. from a payslip, before approval) never enters a calculation.
export type Field<T> = { value: T; source: Source; confirmed: boolean };

export type EmployeeProfile = {
  occupationId?: Field<string>;
  baseSalary?: Field<number>;
  commissions?: Field<number>;
  bonus?: Field<number>;
  pensionRate?: Field<number>; // percent: 6 means 6%
  studyFundRate?: Field<number>;
  creditPoints?: Field<number>;
  childrenUnder23?: Field<number>; // family track only
};
