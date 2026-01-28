import { defineCollection } from "astro:content";
import prisma from "../lib/prisma";

// Custom loader to fetch from Prisma
function prismaLoader<T extends { id: string }>(fetcher: () => Promise<T[]>) {
  return {
    name: "prisma-loader",
    load: async ({ store }: { store: any }) => {
      const items = await fetcher();
      for (const item of items) {
        store.set({
          id: item.id,
          data: item,
        });
      }
    },
  };
}

const elections = defineCollection({
  loader: prismaLoader(async () => {
    return prisma.election.findMany({
      include: {
        races: {
          include: {
            candidates: true,
          },
        },
        policyQuestions: true,
      },
    });
  }),
});

const races = defineCollection({
  loader: prismaLoader(async () => {
    return prisma.race.findMany({
      include: {
        election: true,
        candidates: {
          include: {
            profileImage: true,
            policyResponses: {
              include: {
                policyQuestion: true,
              },
            },
          },
        },
      },
    });
  }),
});

const candidates = defineCollection({
  loader: prismaLoader(async () => {
    return prisma.candidate.findMany({
      include: {
        race: {
          include: {
            election: true,
          },
        },
        profileImage: true,
        historicalLink: true,
        externalLinks: {
          include: {
            externalLinkType: true,
          },
        },
        qualifications: {
          include: {
            qualificationType: true,
          },
        },
        policyResponses: {
          include: {
            policyQuestion: true,
          },
        },
      },
    });
  }),
});

export const collections = {
  elections,
  races,
  candidates,
};
