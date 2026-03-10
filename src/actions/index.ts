import {
  createCandidate,
  updateCandidate,
  partialUpdateCandidate,
  deleteCandidate,
  sendMassEmail,
} from "./candidates";
import { createElection, updateElection, deleteElection } from "./elections";
import { createRace, updateRace, deleteRace, reorderRaces } from "./races";

export const server = {
  createCandidate,
  updateCandidate,
  partialUpdateCandidate,
  deleteCandidate,
  sendMassEmail,
  createElection,
  updateElection,
  deleteElection,
  createRace,
  updateRace,
  deleteRace,
  reorderRaces,
};
