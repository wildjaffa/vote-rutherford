import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import type { RaceWithCandidates } from "../../../../../lib/types";
import type { PolicyQuestion } from "../../../../../generated/prisma/client";

export const getStaticPaths = async () => {
  const races = await getCollection("races");
  return races.map((race) => ({
    params: {
      election: race.data.election.slug,
      race: race.data.slug,
    },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const { election: electionSlug, race: raceSlug } = params;

  if (!electionSlug || !raceSlug) {
    return new Response(null, { status: 404 });
  }

  const races = await getCollection("races");
  const race = races.find(
    (r) => r.data.slug === raceSlug && r.data.election.slug === electionSlug,
  );

  if (!race) {
    return new Response(null, { status: 404 });
  }

  // Get policy questions from the election
  // We need to fetch the elections collection to find the questions for this race's election
  // Optimization: In a real large scale app we might want to normalize this.
  const elections = await getCollection("elections");
  const election = elections.find((e) => e.data.id === race.data.electionId);
  const questions = election ? election.data.policyQuestions : [];

  const responseData = {
    race: race.data,
    questions,
  };

  return new Response(JSON.stringify(responseData), {
    headers: { "Content-Type": "application/json" },
  });
};

export interface GetRaceResponse {
  race: RaceWithCandidates;
  questions: PolicyQuestion[];
}
