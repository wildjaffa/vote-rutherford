import { DistrictType } from "../../generated/prisma/enums";

export interface DistrictMapping {
  oldDistrictId: string;
  newDistrictId: string;
  type: DistrictType;
  name: string;
  number: number | null;
}

export interface ImportProgress {
  stage: string;
  processed: number;
  total?: number;
  message: string;
}

export interface ImportResult {
  success: boolean;
  districtMappings: DistrictMapping[];
  jobId: string;
  error?: string;
}

export interface DistrictImportJobData {
  jobId: string;
  csvContent: string;
  geoJsonFiles: Record<string, string>;
  entireCountyTypes: string[];
  userId: string;
  mode: "analyze" | "execute";
  confirmedMappings?: DistrictMapping[];
}
