import { LinkTypes, QualificationTypes } from "../src/constants";
import prisma from "../src/lib/prisma";

async function seedBaseData() {
  console.log("📁 Seeding base lookup data...");

  // Create blob storage types
  const imageStorageType = await prisma.blobStorageType.upsert({
    where: { id: 1 },
    update: {},
    create: { value: "image" },
  });

  // Create user types
  const adminUserType = await prisma.userType.upsert({
    where: { id: 1 },
    update: {},
    create: { value: "admin" },
  });

  const moderatorUserType = await prisma.userType.upsert({
    where: { id: 2 },
    update: {},
    create: { value: "moderator" },
  });

  const voterUserType = await prisma.userType.upsert({
    where: { id: 3 },
    update: {},
    create: { value: "voter" },
  });

  console.log("  ✓ Created user types and blob storage types");

  // Create qualification types
  await prisma.qualificationType.upsert({
    where: { id: 1 },
    update: { value: QualificationTypes.EDUCATION },
    create: { value: QualificationTypes.EDUCATION },
  });

  await prisma.qualificationType.upsert({
    where: { id: 2 },
    update: { value: QualificationTypes.WORK_EXPERIENCE },
    create: { value: QualificationTypes.WORK_EXPERIENCE },
  });

  await prisma.qualificationType.upsert({
    where: { id: 3 },
    update: { value: QualificationTypes.POLITICAL_EXPERIENCE },
    create: { value: QualificationTypes.POLITICAL_EXPERIENCE },
  });

  await prisma.qualificationType.upsert({
    where: { id: 4 },
    update: { value: QualificationTypes.ENDORSEMENT },
    create: { value: QualificationTypes.ENDORSEMENT },
  });

  await prisma.qualificationType.upsert({
    where: { id: 5 },
    update: { value: QualificationTypes.AWARD },
    create: { value: QualificationTypes.AWARD },
  });

  await prisma.qualificationType.upsert({
    where: { id: 6 },
    update: { value: QualificationTypes.OTHER },
    create: { value: QualificationTypes.OTHER },
  });

  console.log("  ✓ Created qualification types");

  // Create external link types
  await prisma.externalLinkType.upsert({
    where: { id: 1 },
    update: { value: LinkTypes.WEBSITE },
    create: { value: LinkTypes.WEBSITE },
  });

  await prisma.externalLinkType.upsert({
    where: { id: 2 },
    update: { value: LinkTypes.FACEBOOK },
    create: { value: LinkTypes.FACEBOOK },
  });

  await prisma.externalLinkType.upsert({
    where: { id: 3 },
    update: { value: LinkTypes.X },
    create: { value: LinkTypes.X },
  });

  await prisma.externalLinkType.upsert({
    where: { id: 4 },
    update: { value: LinkTypes.INSTAGRAM },
    create: { value: LinkTypes.INSTAGRAM },
  });

  await prisma.externalLinkType.upsert({
    where: { id: 5 },
    update: { value: LinkTypes.LINKEDIN },
    create: { value: LinkTypes.LINKEDIN },
  });

  await prisma.externalLinkType.upsert({
    where: { id: 6 },
    update: { value: LinkTypes.YOUTUBE },
    create: { value: LinkTypes.YOUTUBE },
  });

  await prisma.externalLinkType.upsert({
    where: { id: 7 },
    update: { value: LinkTypes.THREADS },
    create: { value: LinkTypes.THREADS },
  });

  await prisma.externalLinkType.upsert({
    where: { id: 8 },
    update: { value: LinkTypes.WIKIPEDIA },
    create: { value: LinkTypes.WIKIPEDIA },
  });

  await prisma.externalLinkType.upsert({
    where: { id: 9 },
    update: { value: LinkTypes.NEWS },
    create: { value: LinkTypes.NEWS },
  });

  await prisma.externalLinkType.upsert({
    where: { id: 10 },
    update: { value: LinkTypes.OTHER },
    create: { value: LinkTypes.OTHER },
  });

  await prisma.externalLinkType.upsert({
    where: { id: 11 },
    update: { value: LinkTypes.TIKTOK },
    create: { value: LinkTypes.TIKTOK },
  });

  console.log("  ✓ Created external link types");

  await prisma.raceType.upsert({
    where: { id: 1 },
    update: {},
    create: { value: "city" },
  });

  await prisma.raceType.upsert({
    where: { id: 2 },
    update: {},
    create: { value: "county" },
  });

  await prisma.raceType.upsert({
    where: { id: 3 },
    update: {},
    create: { value: "state" },
  });

  await prisma.raceType.upsert({
    where: { id: 4 },
    update: {},
    create: { value: "federal" },
  });

  console.log("  ✓ Created race types");

  return {
    imageStorageTypeId: imageStorageType.id,
    adminUserTypeId: adminUserType.id,
    moderatorUserTypeId: moderatorUserType.id,
  };
}

async function seedSampleData(baseData: {
  imageStorageTypeId: number;
  adminUserTypeId: number;
  moderatorUserTypeId: number;
}) {
  console.log("🧪 Seeding sample/test data...");

  // Create users
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@rutherford.local" },
    update: {},
    create: {
      email: "admin@rutherford.local",
      firstName: "Admin",
      lastName: "User",
      username: "admin",
      userTypeId: baseData.adminUserTypeId,
    },
  });

  const moderatorUser = await prisma.user.upsert({
    where: { email: "moderator@rutherford.local" },
    update: {},
    create: {
      email: "moderator@rutherford.local",
      firstName: "Moderator",
      lastName: "User",
      username: "moderator",
      userTypeId: baseData.moderatorUserTypeId,
    },
  });

  console.log("  ✓ Created users");

  // Create election with header image reference
  const headerImage = await prisma.blobStorageReference.create({
    data: {
      fileType: "image/jpeg",
      fileName: "election-2026-header.jpg",
      fileLocation: "elections/2026/header.jpg",
      blobStorageTypeId: baseData.imageStorageTypeId,
    },
  });

  const election = await prisma.election.create({
    data: {
      name: "2026 Presidential Election",
      description: "The general election for President of the United States",
      date: new Date("2026-11-08"),
      headerImageId: headerImage.id,
      slug: "2026-presidential-election",
      usersToElections: {
        create: [{ userId: adminUser.id }, { userId: moderatorUser.id }],
      },
    },
  });

  console.log("  ✓ Created election");

  // Create races
  const presidentialRace = await prisma.race.create({
    data: {
      name: "Presidential Race",
      description: "Vote for President of the United States",
      electionId: election.id,
      status: "active",
      raceTypeId: 4, // federal
      slug: "presidential-race",
    },
  });

  const senateRace = await prisma.race.create({
    data: {
      name: "U.S. Senate Race",
      description: "Vote for U.S. Senator",
      electionId: election.id,
      status: "active",
      raceTypeId: 4, // federal
      slug: "senate-race",
    },
  });

  console.log("  ✓ Created races");

  // Create candidates
  const candidates = [];
  const candidateData = [
    { firstName: "Alice", lastName: "Johnson", birthYear: 1975 },
    { firstName: "Bob", lastName: "Smith", birthYear: 1968 },
    { firstName: "Carol", lastName: "Williams", birthYear: 1982 },
    { firstName: "David", lastName: "Brown", birthYear: 1972 },
  ];

  for (let i = 0; i < candidateData.length; i++) {
    const candidateValue = candidateData[i];
    if (!candidateValue) continue;

    const candidate = await prisma.candidate.create({
      data: {
        firstName: candidateValue.firstName,
        lastName: candidateValue.lastName,
        birthYear: candidateValue.birthYear,
        raceId: i < 2 ? presidentialRace.id : senateRace.id,
        slug: `${candidateValue.firstName.toLowerCase()}-${candidateValue.lastName.toLowerCase()}`,
        externalLinks: {
          create: [
            {
              hyperlink: `https://${candidateValue.firstName.toLowerCase()}.example.com`,
              externalLinkTypeId: 1, // website
            },
            {
              hyperlink: `https://facebook.com/${candidateValue.firstName.toLowerCase()}`,
              externalLinkTypeId: 2, // facebook
            },
          ],
        },
      },
    });

    candidates.push(candidate);
  }

  console.log("  ✓ Created candidates and external links");

  // Create qualifications for candidates
  for (const candidate of candidates) {
    await prisma.candidateQualification.create({
      data: {
        candidateId: candidate.id,
        qualification_description: "Bachelor of Arts in Political Science",
        qualificationTypeId: 1, // education
        qualification_url: "https://example.edu/verify",
      },
    });

    await prisma.candidateQualification.create({
      data: {
        candidateId: candidate.id,
        qualification_description: "10 years of experience in local politics",
        qualificationTypeId: 3, // political experience
        qualification_url: "https://example.gov/verify",
      },
    });
  }

  console.log("  ✓ Created candidate qualifications");

  // Create policy questions
  const policyQuestions = await Promise.all([
    prisma.policyQuestion.create({
      data: {
        electionId: election.id,
        questionText: "What is your stance on healthcare reform?",
        descriptionText:
          "Please explain your position on making healthcare more accessible and affordable.",
        order: 1,
      },
    }),
    prisma.policyQuestion.create({
      data: {
        electionId: election.id,
        questionText: "How would you address climate change?",
        descriptionText:
          "Describe your plan for reducing carbon emissions and addressing environmental concerns.",
        order: 2,
      },
    }),
  ]);

  console.log("  ✓ Created policy questions");

  // Link policy questions to races
  for (const question of policyQuestions) {
    await prisma.policyQuestionToRace.create({
      data: {
        policyQuestionId: question.id,
        raceId: presidentialRace.id,
      },
    });

    await prisma.policyQuestionToRace.create({
      data: {
        policyQuestionId: question.id,
        raceId: senateRace.id,
      },
    });
  }

  console.log("  ✓ Linked policy questions to races");

  // Create candidate policy responses
  for (const candidate of candidates) {
    for (const question of policyQuestions) {
      const response = await prisma.candidatePolicyResponse.create({
        data: {
          candidateId: candidate.id,
          policyQuestionId: question.id,
          requestSentAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          responseReceivedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          response: `This is ${candidate.firstName}'s detailed response to the policy question about ${question.questionText.toLowerCase()}. They believe strongly in taking action on this important issue.`,
        },
      });

      // Add a clarification for some responses
      if (Math.random() > 0.5) {
        await prisma.candidatePolicyResponseClarification.create({
          data: {
            candidatePolicyResponseId: response.id,
            clarification: `${candidate.firstName} clarifies that they meant to emphasize the importance of stakeholder engagement in implementing their proposed policy.`,
            clarificationReceivedAt: new Date(
              Date.now() - 10 * 24 * 60 * 60 * 1000,
            ),
          },
        });
      }
    }
  }

  console.log("  ✓ Created candidate policy responses and clarifications");
}

async function main() {
  console.log("🌱 Starting database seed...");

  const baseData = await seedBaseData();

  // Only seed sample data if SEED_SAMPLE_DATA is set to true
  // or if we're not in a production-like environment (optional)
  if (process.env.SEED_SAMPLE_DATA === "true") {
    await seedSampleData(baseData);
  } else {
    console.log(
      "ℹ Skipping sample data (set SEED_SAMPLE_DATA=true to include)",
    );
  }

  console.log("✅ Database seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
