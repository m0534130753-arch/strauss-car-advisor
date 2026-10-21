import type { Group } from "./group";

export type Occupation = {
  id: string;
  name: string;
  group: Group;
  carRequired: boolean;
  waiverAllowed: boolean;
  maintenanceAmount: number; // 0 when there is no waiver; waiverAllowed decides
};
