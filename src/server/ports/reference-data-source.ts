import type { CarArrangement, EmployeeProfile, Occupation, Rules, Vehicle } from "@/server/domain/model";

// A demo employee for the login screen (ARCHITECTURE decision 3): a ready profile and today's arrangement.
export type SampleEmployee = {
  id: string;
  name: string;
  profile: EmployeeProfile;
  currentArrangement: CarArrangement;
  question: string;
};

export type ReferenceData = {
  rules: Rules;
  catalog: readonly Vehicle[];
  occupations: readonly Occupation[];
  sampleEmployees: readonly SampleEmployee[];
};

// Where the rules and the reference data come from: JSON files in the demo, an HR system in the pilot.
export interface ReferenceDataSource {
  load(): Promise<ReferenceData>;
}
