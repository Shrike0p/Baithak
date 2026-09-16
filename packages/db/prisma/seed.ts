import { prisma } from "../src/index";
import type { PlanCategory } from "@prisma/client";

const USERS = [
  { id: "user_seed_ananya", name: "Ananya", age: 25, occupation: "Designer", gender: "WOMAN" as const, trustScore: 4.8, vibeTags: ["Bollywood", "Travel", "Drinks"], bio: "Designer, playlist hoarder, always down for a late dinner." },
  { id: "user_seed_prakhar", name: "Prakhar", age: 27, occupation: "Design", gender: "MAN" as const, trustScore: 4.8, vibeTags: ["Bollywood", "Music", "Dancing"], bio: "Hosts a house party most weekends. Making sure no one feels like the odd one out." },
  { id: "user_seed_rahul", name: "Rahul", age: 26, occupation: "Product", gender: "MAN" as const, trustScore: 4.7, vibeTags: ["Football", "Music", "Chill"], bio: "Will argue about football and playlists in equal measure." },
  { id: "user_seed_priya", name: "Priya", age: 24, occupation: "Filmmaker", gender: "WOMAN" as const, trustScore: 4.9, vibeTags: ["Movies", "Food", "Dance"], bio: "Filmmaker. Knows every hole-in-the-wall dosa place in the city." },
  { id: "user_seed_karan", name: "Karan", age: 27, occupation: "Founder", gender: "MAN" as const, trustScore: 4.6, vibeTags: ["Tech", "Trips", "Games"], bio: "Building something. Needs to leave the laptop at home more often." },
  { id: "user_seed_maya", name: "Maya", age: 28, occupation: "Architect", gender: "WOMAN" as const, trustScore: 4.9, vibeTags: ["Music", "Drinks", "Art"], bio: "Rooftops, records, and long conversations." },
  { id: "user_seed_dev", name: "Dev", age: 26, occupation: "Chef", gender: "MAN" as const, trustScore: 4.7, vibeTags: ["Food", "Travel", "Music"], bio: "Cooks for a living, still says yes to dinner plans." },
  { id: "user_seed_sara", name: "Sara", age: 24, occupation: "Writer", gender: "WOMAN" as const, trustScore: 4.8, vibeTags: ["Bollywood", "Movies", "Chill"], bio: "New to Bangalore. Looking for a regular Sunday crowd." },
];

const DAY = 24 * 60 * 60 * 1000;

const PLANS = [
  {
    id: "plan_seed_saturday",
    imageUrl: "/assets/house-party.jpg",
    hostId: "user_seed_prakhar",
    title: "Saturday House Party",
    category: "HOUSE_PARTY" as PlanCategory,
    vibeTags: ["Bollywood", "Drinks", "Dancing", "Chill"],
    neighborhood: "HSR Layout, Bangalore",
    exactAddress: "12th Cross, HSR Layout, Bangalore",
    startsAt: new Date(Date.now() + 2 * DAY),
    capacity: 16,
    guests: ["user_seed_ananya", "user_seed_rahul", "user_seed_priya"],
    firstTimers: ["user_seed_priya"],
  },
  {
    id: "plan_seed_rooftop",
    imageUrl: "/assets/rooftop-drinks.jpg",
    hostId: "user_seed_maya",
    title: "Rooftop Drinks",
    category: "DRINKS" as PlanCategory,
    vibeTags: ["Chill", "Music", "Drinks"],
    neighborhood: "Indiranagar, Bangalore",
    exactAddress: "100 Ft Road, Indiranagar, Bangalore",
    startsAt: new Date(Date.now() + 4 * DAY),
    capacity: 12,
    guests: ["user_seed_ananya", "user_seed_karan"],
    firstTimers: ["user_seed_karan"],
  },
  {
    id: "plan_seed_gamenight",
    imageUrl: "/assets/game-night.jpg",
    hostId: "user_seed_karan",
    title: "Game Night",
    category: "GAME_NIGHT" as PlanCategory,
    vibeTags: ["Games", "Chill", "Food"],
    neighborhood: "Koramangala, Bangalore",
    exactAddress: "5th Block, Koramangala, Bangalore",
    startsAt: new Date(Date.now() + 5 * DAY),
    capacity: 10,
    guests: ["user_seed_rahul", "user_seed_priya"],
    firstTimers: ["user_seed_rahul", "user_seed_priya"],
  },
  // A night that already happened — gives the Memories tab real content.
  {
    id: "plan_seed_past_rooftop",
    imageUrl: "/assets/rooftop-drinks.jpg",
    hostId: "user_seed_prakhar",
    title: "Last Saturday",
    category: "HOUSE_PARTY" as PlanCategory,
    vibeTags: ["Bollywood", "Drinks", "Dancing"],
    neighborhood: "HSR Layout, Bangalore",
    exactAddress: "12th Cross, HSR Layout, Bangalore",
    startsAt: new Date(Date.now() - 6 * DAY),
    capacity: 14,
    status: "COMPLETED" as const,
    guests: ["user_seed_ananya", "user_seed_rahul", "user_seed_maya", "user_seed_priya"],
    firstTimers: ["user_seed_maya"],
  },
  {
    id: "plan_seed_dinner",
    imageUrl: "/assets/dinner-party.jpg",
    hostId: "user_seed_priya",
    title: "Bring-a-dish Dinner",
    category: "DINNER" as PlanCategory,
    vibeTags: ["Food", "Chill", "Music"],
    neighborhood: "Bellandur, Bangalore",
    exactAddress: "Green Glen Layout, Bellandur, Bangalore",
    startsAt: new Date(Date.now() + 6 * DAY),
    capacity: 12,
    guests: ["user_seed_maya"],
    firstTimers: ["user_seed_maya"],
  },
];

async function main() {
  for (const u of USERS) {
    await prisma.user.upsert({ where: { id: u.id }, update: u, create: u });
  }

  for (const p of PLANS) {
    const { guests, firstTimers, ...plan } = p as typeof p & { status?: "COMPLETED" };
    await prisma.plan.upsert({ where: { id: plan.id }, update: plan, create: plan });

    const members = [
      { userId: plan.hostId, role: "HOST" as const, firstTime: false },
      ...guests.map((userId) => ({
        userId,
        role: "GUEST" as const,
        firstTime: firstTimers.includes(userId),
      })),
    ];

    // Seed is authoritative: drop anyone no longer listed for this plan so
    // re-running after editing the lists above doesn't leave stale attendees.
    await prisma.planAttendee.deleteMany({
      where: { planId: plan.id, userId: { notIn: members.map((m) => m.userId) } },
    });

    for (const m of members) {
      await prisma.planAttendee.upsert({
        where: { planId_userId: { planId: plan.id, userId: m.userId } },
        update: { role: m.role, firstTime: m.firstTime },
        create: { planId: plan.id, ...m },
      });
    }
  }

  // Memories for the night that already happened.
  const MEMORIES = [
    { url: "/assets/house-party.jpg", caption: "The living room, about an hour in" },
    { url: "/assets/rooftop-drinks.jpg", caption: "Terrace shift" },
    { url: "/assets/game-night.jpg", caption: "Someone found the cards" },
    { url: "/assets/dinner-party.jpg", caption: "2am biryani run" },
  ];

  await prisma.photo.deleteMany({ where: { planId: "plan_seed_past_rooftop" } });
  await prisma.photo.createMany({
    data: MEMORIES.map((m, i) => ({
      planId: "plan_seed_past_rooftop",
      uploaderId: i % 2 === 0 ? "user_seed_prakhar" : "user_seed_ananya",
      url: m.url,
      caption: m.caption,
      takenAt: new Date(Date.now() - 6 * DAY + i * 60 * 60 * 1000),
    })),
  });

  // Soft targets on the flagship plan so "group health" has something to say.
  await prisma.crowdPreference.upsert({
    where: { planId: "plan_seed_saturday" },
    update: {},
    create: {
      planId: "plan_seed_saturday",
      ageMin: 23,
      ageMax: 30,
      preferredVibes: ["Social", "Music", "Chill"],
      targetWomen: 6,
      targetMen: 6,
      targetCouples: 2,
      connectionPreference: "OPEN",
    },
  });

  // Ananya hosts one too, so the default signed-in user has an applicant queue.
  await prisma.plan.upsert({
    where: { id: "plan_seed_ananya_dinner" },
    update: {},
    create: {
      id: "plan_seed_ananya_dinner",
      imageUrl: "/assets/dinner-party.jpg",
      hostId: "user_seed_ananya",
      title: "Long Table Sunday",
      category: "DINNER",
      vibeTags: ["Food", "Music", "Chill", "Bollywood"],
      neighborhood: "Koramangala, Bangalore",
      exactAddress: "6th Block, Koramangala, Bangalore",
      startsAt: new Date(Date.now() + 8 * DAY),
      capacity: 12,
    },
  });
  await prisma.planAttendee.upsert({
    where: {
      planId_userId: { planId: "plan_seed_ananya_dinner", userId: "user_seed_ananya" },
    },
    update: {},
    create: {
      planId: "plan_seed_ananya_dinner",
      userId: "user_seed_ananya",
      role: "HOST",
      firstTime: false,
    },
  });
  await prisma.crowdPreference.upsert({
    where: { planId: "plan_seed_ananya_dinner" },
    update: {},
    create: {
      planId: "plan_seed_ananya_dinner",
      ageMin: 23,
      ageMax: 32,
      preferredVibes: ["Food", "Music"],
      targetWomen: 5,
      targetMen: 5,
      connectionPreference: "OPEN",
    },
  });

  const APPLICANTS = [
    { id: "user_seed_rahul", bringingWith: "SOLO" as const, note: "Heard about this from Priya. I'll bring wine." },
    { id: "user_seed_priya", bringingWith: "ONE_FRIEND" as const, note: null },
    { id: "user_seed_maya", bringingWith: "SOLO" as const, note: "Been meaning to cook for people again." },
    { id: "user_seed_karan", bringingWith: "GROUP" as const, note: "Three of us, all easy going." },
    { id: "user_seed_dev", bringingWith: "SOLO" as const, note: "Chef here — happy to help in the kitchen." },
    { id: "user_seed_sara", bringingWith: "SOLO" as const, note: "New to Bangalore, looking for a Sunday crowd." },
  ];

  for (const a of APPLICANTS) {
    await prisma.application.upsert({
      where: {
        planId_applicantId: { planId: "plan_seed_ananya_dinner", applicantId: a.id },
      },
      update: {},
      create: {
        planId: "plan_seed_ananya_dinner",
        applicantId: a.id,
        bringingWith: a.bringingWith,
        note: a.note,
      },
    });
  }

  // A pending request so the Plans page has something in "Requested"
  await prisma.application.upsert({
    where: {
      planId_applicantId: { planId: "plan_seed_dinner", applicantId: "user_seed_ananya" },
    },
    update: {},
    create: {
      planId: "plan_seed_dinner",
      applicantId: "user_seed_ananya",
      bringingWith: "SOLO",
      note: "Would love to join, I'll bring dessert.",
    },
  });

  console.log(`Seeded: ${USERS.length} users, ${PLANS.length} plans`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
