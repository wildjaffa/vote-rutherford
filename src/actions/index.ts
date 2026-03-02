import {
  createCandidate,
  updateCandidate,
  deleteCandidate,
} from "./candidates";
import { createElection, updateElection, deleteElection } from "./elections";
import { createRace, updateRace, deleteRace } from "./races";

export const server = {
  createCandidate,
  updateCandidate,
  deleteCandidate,
  createElection,
  updateElection,
  deleteElection,
  createRace,
  updateRace,
  deleteRace,
};
