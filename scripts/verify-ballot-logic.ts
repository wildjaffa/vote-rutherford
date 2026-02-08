import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function verifyBallotLogic() {
  console.log("🧪 Starting My Ballot Logic Verification...\n");

  try {
    // Step 1: Create or find a test VoterAddress
    console.log("Step 1: Creating/finding a test VoterAddress...");
    const testAddress = await prisma.voterAddress.upsert({
      where: {
        normalizedAddress: "123 TEST ST",
      },
      update: {},
      create: {
        address: "123 Test Street",
        normalizedAddress: "123 TEST ST",
        city: "Rutherford",
        zip: "37160",
        latitude: 36.1627,
        longitude: -86.3957,
      },
    });
    console.log(
      `✅ VoterAddress: ${testAddress.id} - ${testAddress.address}\n`,
    );

    // Step 2: Create or find test districts
    console.log("Step 2: Creating/finding test districts...");
    const testDistrict = await prisma.district.upsert({
      where: {
        type_name_number: {
          type: "STATE_HOUSE",
          name: "District 47",
          number: 47,
        },
      },
      update: {},
      create: {
        type: "STATE_HOUSE",
        name: "District 47",
        number: 47,
      },
    });
    console.log(`✅ District: ${testDistrict.id} - ${testDistrict.name}\n`);

    // Step 3: Link VoterAddress to District
    console.log("Step 3: Linking VoterAddress to District...");
    const link = await prisma.districtToVoterAddress.upsert({
      where: {
        districtId_voterAddressId: {
          districtId: testDistrict.id,
          voterAddressId: testAddress.id,
        },
      },
      update: {},
      create: {
        districtId: testDistrict.id,
        voterAddressId: testAddress.id,
      },
    });
    console.log(
      `✅ Link created: District ${testDistrict.id} -> VoterAddress ${testAddress.id}\n`,
    );

    // Step 4: Create or find a test Election in the future
    console.log("Step 4: Creating/finding a future test Election...");
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

    const testElection = await prisma.election.create({
      data: {
        name: "Test Election 2026",
        slug: `test-election-${Date.now()}`,
        description: "Test election for ballot verification",
        date: futureDate,
      },
    });
    console.log(`✅ Election: ${testElection.id} - ${testElection.name}\n`);

    // Step 5: Create a test Race linked to the District and Election
    console.log("Step 5: Creating a test Race...");
    const raceType = await prisma.raceType.findFirst({
      where: {},
    });

    if (!raceType) {
      console.error(
        "❌ No race types found in database. Please seed RaceType models.",
      );
      process.exit(1);
    }

    const testRace = await prisma.race.create({
      data: {
        name: "Test State House Race",
        slug: `test-race-${Date.now()}`,
        description: "Test race for ballot verification",
        electionId: testElection.id,
        raceTypeId: raceType.id,
        districtId: testDistrict.id,
        status: "active",
      },
    });
    console.log(
      `✅ Race: ${testRace.id} - ${testRace.name} (linked to district)\n`,
    );

    // Step 6: Run the ballot query logic
    console.log("Step 6: Running ballot query logic...");
    const ballotData = await prisma.voterAddress.findUnique({
      where: { id: testAddress.id },
      include: {
        districts: {
          include: {
            district: true,
          },
        },
      },
    });

    if (!ballotData) {
      console.error("❌ Failed to fetch voter address");
      process.exit(1);
    }

    const districtIds = ballotData.districts.map((d) => d.districtId);
    console.log(`📍 Districts for address: ${districtIds.join(", ")}`);

    const races = await prisma.race.findMany({
      where: {
        electionId: testElection.id,
        districtId: {
          in: districtIds,
        },
        deletedAt: null,
      },
    });

    if (races.length === 0) {
      console.error("❌ No races found for this address!");
      process.exit(1);
    }

    console.log(
      `✅ Found ${races.length} race(s) for this address and election\n`,
    );
    races.forEach((race) => {
      console.log(`   - ${race.name} (District: ${race.districtId})`);
    });

    // Step 7: Verify the race we created is in the results
    console.log("\nStep 7: Verifying created race is in results...");
    const foundRace = races.find((r) => r.id === testRace.id);
    if (foundRace) {
      console.log(
        `✅ Created test race WAS returned in ballot query: ${foundRace.name}\n`,
      );
    } else {
      console.error("❌ Created test race WAS NOT returned in ballot query!");
      process.exit(1);
    }

    console.log("✅ ALL VERIFICATION CHECKS PASSED!\n");
    console.log("Summary:");
    console.log(`- VoterAddress: ${testAddress.address}`);
    console.log(`- District: ${testDistrict.name}`);
    console.log(`- Election: ${testElection.name}`);
    console.log(`- Races found: ${races.length}`);
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyBallotLogic();
