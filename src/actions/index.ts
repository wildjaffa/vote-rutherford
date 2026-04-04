import {
  createCandidate,
  updateCandidate,
  partialUpdateCandidate,
  deleteCandidate,
  sendMassEmail,
  promoteCandidate,
} from "./candidates";
import { createElection, updateElection, deleteElection } from "./elections";
import { createRace, updateRace, deleteRace, reorderRaces } from "./races";
import { createContact, updateContact, deleteContact } from "./contacts";

export const server = {
  createCandidate,
  updateCandidate,
  partialUpdateCandidate,
  deleteCandidate,
  sendMassEmail,
  promoteCandidate,
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
};
