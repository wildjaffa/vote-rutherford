import { defineCollection } from "astro:content";
import prisma from "../lib/prisma";

// Custom loader to fetch from Prisma
// function prismaLoader<T extends { id: string }>(fetcher: () => Promise<T[]>) {
//   return {
//     name: "prisma-loader",
//     load: async (context: {
//       store: { set: (entry: { id: string; data: T }) => boolean };
//     }) => {
//       const items = await fetcher();
//       for (const item of items) {
//         context.store.set({ id: item.id, data: item });
//       }
//     },
//   };
// }

await prisma.$connect();

const elections = defineCollection({
  loader: async () => {
    return await prisma.election.findMany({
      include: {
        races: {
          include: {
            candidates: true,
          },
        },
        policyQuestions: true,
      },
    });
  },
});

const races = defineCollection({
  loader: async () => {
    return await prisma.race.findMany({
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
  },
});

const candidates = defineCollection({
  loader: async () => {
    return await prisma.candidate.findMany({
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
  },
});

await prisma.$disconnect();

export const collections = {
  elections,
  races,
  candidates,
};
