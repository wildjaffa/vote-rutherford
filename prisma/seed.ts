import { LinkTypes, QualificationTypes } from "../src/constants";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("🌱 Starting database seed...");

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

  console.log("✓ Created user types and blob storage types");

  // Create qualification types
  const educationQualType = await prisma.qualificationType.upsert({
    where: { id: 1 },
    update: { value: QualificationTypes.EDUCATION },
    create: { value: QualificationTypes.EDUCATION },
  });

  const workExperienceQualType = await prisma.qualificationType.upsert({
    where: { id: 2 },
    update: { value: QualificationTypes.WORK_EXPERIENCE },
    create: { value: QualificationTypes.WORK_EXPERIENCE },
  });

  const politicalExperienceQualType = await prisma.qualificationType.upsert({
    where: { id: 3 },
    update: { value: QualificationTypes.POLITICAL_EXPERIENCE },
    create: { value: QualificationTypes.POLITICAL_EXPERIENCE },
  });

  const endoresementQualType = await prisma.qualificationType.upsert({
    where: { id: 4 },
    update: { value: QualificationTypes.ENDORSEMENT },
    create: { value: QualificationTypes.ENDORSEMENT },
  });

  const awardQualType = await prisma.qualificationType.upsert({
    where: { id: 5 },
    update: { value: QualificationTypes.AWARD },
    create: { value: QualificationTypes.AWARD },
  });

  const otherQualType = await prisma.qualificationType.upsert({
    where: { id: 6 },
    update: { value: QualificationTypes.OTHER },
    create: { value: QualificationTypes.OTHER },
  });

  console.log("✓ Created qualification types");

  // Create external link types
  const websiteLink = await prisma.externalLinkType.upsert({
    where: { id: 1 },
    update: { value: LinkTypes.WEBSITE },
    create: { value: LinkTypes.WEBSITE },
  });

  const facebookLink = await prisma.externalLinkType.upsert({
    where: { id: 2 },
    update: { value: LinkTypes.FACEBOOK },
    create: { value: LinkTypes.FACEBOOK },
  });

  // additional social / external link types
  const xLink = await prisma.externalLinkType.upsert({
    where: { id: 3 },
    update: { value: LinkTypes.X },
    create: { value: LinkTypes.X },
  });

  const instagramLink = await prisma.externalLinkType.upsert({
    where: { id: 4 },
    update: { value: LinkTypes.INSTAGRAM },
    create: { value: LinkTypes.INSTAGRAM },
  });

  const linkedInLink = await prisma.externalLinkType.upsert({
    where: { id: 5 },
    update: { value: LinkTypes.LINKEDIN },
    create: { value: LinkTypes.LINKEDIN },
  });

  const youtubeLink = await prisma.externalLinkType.upsert({
    where: { id: 6 },
    update: { value: LinkTypes.YOUTUBE },
    create: { value: LinkTypes.YOUTUBE },
  });

  const threadsLink = await prisma.externalLinkType.upsert({
    where: { id: 7 },
    update: { value: LinkTypes.THREADS },
    create: { value: LinkTypes.THREADS },
  });

  const wikipediaLink = await prisma.externalLinkType.upsert({
    where: { id: 8 },
    update: { value: LinkTypes.WIKIPEDIA },
    create: { value: LinkTypes.WIKIPEDIA },
  });

  const newsLink = await prisma.externalLinkType.upsert({
    where: { id: 9 },
    update: { value: LinkTypes.NEWS },
    create: { value: LinkTypes.NEWS },
  });

  const otherLink = await prisma.externalLinkType.upsert({
    where: { id: 10 },
    update: { value: LinkTypes.OTHER },
    create: { value: LinkTypes.OTHER },
  });

  const tiktokLink = await prisma.externalLinkType.upsert({
    where: { id: 11 },
    update: { value: LinkTypes.TIKTOK },
    create: { value: LinkTypes.TIKTOK },
  });

  console.log("✓ Created external link types");

  const cityRaceType = await prisma.raceType.upsert({
    where: { id: 1 },
    update: {},
    create: { value: "city" },
  });

  const countyRaceType = await prisma.raceType.upsert({
    where: { id: 2 },
    update: {},
    create: { value: "county" },
  });

  const stateRaceType = await prisma.raceType.upsert({
    where: { id: 3 },
    update: {},
    create: { value: "state" },
  });

  const federalRaceType = await prisma.raceType.upsert({
    where: { id: 4 },
    update: {},
    create: { value: "federal" },
  });

  // Create users
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@rutherford.local" },
    update: {},
    create: {
      email: "admin@rutherford.local",
      firstName: "Admin",
      lastName: "User",
      username: "admin",
      userTypeId: adminUserType.id,
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
      userTypeId: moderatorUserType.id,
    },
  });

  console.log("✓ Created users");

  // Create election with header image reference
  const headerImage = await prisma.blobStorageReference.create({
    data: {
      fileType: "image/jpeg",
      fileName: "election-2026-header.jpg",
      fileLocation: "elections/2026/header.jpg",
      blobStorageTypeId: imageStorageType.id,
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

  console.log("✓ Created election");

  // Create races
  const presidentialRace = await prisma.race.create({
    data: {
      name: "Presidential Race",
      description: "Vote for President of the United States",
      electionId: election.id,
      status: "active",
      raceTypeId: federalRaceType.id,
      slug: "presidential-race",
    },
  });

  const senateRace = await prisma.race.create({
    data: {
      name: "U.S. Senate Race",
      description: "Vote for U.S. Senator",
      electionId: election.id,
      status: "active",
      raceTypeId: federalRaceType.id,
      slug: "senate-race",
    },
  });

  console.log("✓ Created races");

  // Create candidates with profile images
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
    const profileImage = await prisma.blobStorageReference.create({
      data: {
        fileType: "image/jpeg",
        fileName: `${candidateValue.firstName.toLowerCase()}-profile.jpg`,
        fileLocation: `candidates/${candidateValue.firstName.toLowerCase()}/profile.jpg`,
        blobStorageTypeId: imageStorageType.id,
      },
    });

    const candidate = await prisma.candidate.create({
      data: {
        firstName: candidateValue.firstName,
        lastName: candidateValue.lastName,
        birthYear: candidateValue.birthYear,
        profileImageId: profileImage.id,
        raceId: i < 2 ? presidentialRace.id : senateRace.id,
        slug: `${candidateValue.firstName.toLowerCase()}-${candidateValue.lastName.toLowerCase()}`,
        externalLinks: {
          create: [
            {
              hyperlink: `https://${candidateValue.firstName.toLowerCase()}.example.com`,
              externalLinkTypeId: websiteLink.id,
            },
            {
              hyperlink: `https://facebook.com/${candidateValue.firstName.toLowerCase()}`,
              externalLinkTypeId: facebookLink.id,
            },
            {
              hyperlink: `https://x.com/${candidateValue.firstName.toLowerCase()}`,
              externalLinkTypeId: xLink.id,
            },
            {
              hyperlink: `https://instagram.com/${candidateValue.firstName.toLowerCase()}`,
              externalLinkTypeId: instagramLink.id,
            },
            {
              hyperlink: `https://linkedin.com/in/${candidateValue.firstName.toLowerCase()}`,
              externalLinkTypeId: linkedInLink.id,
            },
            {
              hyperlink: `https://youtube.com/${candidateValue.firstName.toLowerCase()}`,
              externalLinkTypeId: youtubeLink.id,
            },
            {
              hyperlink: `https://threads.net/${candidateValue.firstName.toLowerCase()}`,
              externalLinkTypeId: threadsLink.id,
            },
          ],
        },
      },
    });

    candidates.push(candidate);
  }

  console.log("✓ Created candidates with profile images and external links");

  // Create qualifications for candidates
  for (const candidate of candidates) {
    await prisma.candidateQualification.create({
      data: {
        candidateId: candidate.id,
        qualification_description: "Bachelor of Arts in Political Science",
        qualificationTypeId: educationQualType.id,
        qualification_url: "https://example.edu/verify",
      },
    });

    await prisma.candidateQualification.create({
      data: {
        candidateId: candidate.id,
        qualification_description: "10 years of experience in local politics",
        qualificationTypeId: politicalExperienceQualType.id,
        qualification_url: "https://example.gov/verify",
      },
    });
  }

  console.log("✓ Created candidate qualifications");

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
    prisma.policyQuestion.create({
      data: {
        electionId: election.id,
        questionText: "What is your education policy?",
        descriptionText:
          "Explain your approach to improving K-12 and higher education.",
        order: 3,
      },
    }),
  ]);

  console.log("✓ Created policy questions");

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

  console.log("✓ Linked policy questions to races");

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

  console.log("✓ Created candidate policy responses and clarifications");

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
