import {
  createCandidate,
  updateCandidate,
  partialUpdateCandidate,
  deleteCandidate,
  sendMassEmail,
  promoteCandidate,
  moveCandidate,
  resendEmail,
} from "./candidates";
import { createElection, updateElection, deleteElection } from "./elections";
import { createRace, updateRace, deleteRace, reorderRaces } from "./races";
import { createContact, updateContact, deleteContact } from "./contacts";
import {
  startDistrictImport,
  getDistrictImportStatus,
  confirmDistrictImport,
} from "./districtImport";

export const server = {
  createCandidate,
  updateCandidate,
  partialUpdateCandidate,
  deleteCandidate,
  sendMassEmail,
  promoteCandidate,
  moveCandidate,
  resendEmail,
  createElection,
  updateElection,
  deleteElection,
  createRace,
  updateRace,
  deleteRace,
  reorderRaces,
  createContact,
  updateContact,
  deleteContact,
  startDistrictImport,
  getDistrictImportStatus,
  confirmDistrictImport,
};
