import { and, desc, eq, ilike, or } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { randomUUID } from "node:crypto";
import type { Request } from "express";
import {
  aiAssistantsTable,
  automationsTable,
  businessMembersTable,
  businessesTable,
  conversationsTable,
  faqsTable,
  leadsTable,
  messagesTable,
  servicesTable,
  usersTable,
  db,
} from "@workspace/db";

const DEMO_CLERK_USER_ID = "demo-user";

export const getClerkUserId = (req: Request) => {
  const auth = getAuth(req);
  return auth?.userId ?? (process.env.NODE_ENV !== "production" ? DEMO_CLERK_USER_ID : null);
};

export async function ensureWorkspace(clerkUserId: string) {
  const existingUser = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);
  if (existingUser[0]) {
    const membership = await db
      .select({ business: businessesTable })
      .from(businessMembersTable)
      .innerJoin(
        businessesTable,
        eq(businessMembersTable.businessId, businessesTable.id),
      )
      .where(eq(businessMembersTable.userId, existingUser[0].id))
      .limit(1);
    if (membership[0]?.business) return { user: existingUser[0], business: membership[0].business };
  }

  const isDemo = clerkUserId === DEMO_CLERK_USER_ID;
  const userId = existingUser[0]?.id ?? randomUUID();
  const businessId = randomUUID();
  const businessName = isDemo ? "ABC Realty" : "Your business";
  const slugBase = businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slug = isDemo ? "abc-realty" : `${slugBase}-${businessId.slice(0, 6)}`;
  const user = existingUser[0] ?? (await db.insert(usersTable).values({
    id: userId,
    clerkUserId,
    name: isDemo ? "Arindam Ch." : "Business owner",
    email: isDemo ? "demo@leadflow.ai" : `${clerkUserId.slice(0, 10)}@leadflow.local`,
  }).returning())[0];
  const business = (await db.insert(businessesTable).values({
    id: businessId,
    name: businessName,
    slug,
    industry: "Real Estate",
    description: isDemo
      ? "A modern realty advisory helping buyers find exceptional homes and commercial spaces across Bengaluru."
      : "Tell your assistant what makes your business valuable.",
    location: isDemo ? "Bengaluru, India" : null,
    website: null,
  }).returning())[0];

  await db.insert(businessMembersTable).values({
    id: randomUUID(),
    businessId,
    userId: user.id,
    role: "owner",
  });
  await db.insert(aiAssistantsTable).values({
    id: randomUUID(),
    businessId,
    name: isDemo ? "Alex" : "Alex",
    greeting: isDemo
      ? "Hi, I’m Alex from ABC Realty. Are you looking to buy, rent, or invest?"
      : "Hi, how can I help you today?",
    tone: "Friendly",
    description: business.description,
    instructions: "Answer only from the business information. Ask one useful question at a time and offer a human handoff when needed.",
    locations: isDemo ? "Bengaluru" : "",
  });
  await db.insert(servicesTable).values(
    (isDemo
      ? [
          ["2BHK Apartments", "Move-in ready homes in connected neighborhoods.", "₹85L+", "30 min"],
          ["3BHK Apartments", "Spacious family homes with thoughtful amenities.", "₹1.4Cr+", "30 min"],
          ["Commercial Property", "High-visibility offices and retail spaces.", "₹2Cr+", "45 min"],
        ]
      : [["Your service", "Add a description in Business settings.", "", ""]]
    ).map(([name, description, startingPrice, duration]) => ({
      id: randomUUID(),
      businessId,
      name,
      description,
      startingPrice,
      duration,
    })),
  );
  await db.insert(faqsTable).values(
    (isDemo
      ? [
          ["Do you help with home loans?", "Yes. We connect buyers with trusted lending partners and help compare options."],
          ["Can I schedule a site visit?", "Absolutely. Share a preferred day and one of our advisors will confirm a slot."],
          ["Which areas do you cover?", "We currently focus on Bengaluru and nearby growth corridors."],
        ]
      : [["What do you offer?", "Add an answer in AI Assistant settings."]]
    ).map(([question, answer]) => ({ id: randomUUID(), businessId, question, answer })),
  );
  await db.insert(automationsTable).values([
    { id: randomUUID(), businessId, key: "owner-notification", label: "Owner notification", description: "Get notified when a qualified lead is ready for follow-up.", enabled: true },
    { id: randomUUID(), businessId, key: "lead-confirmation", label: "Lead confirmation", description: "Send an instant confirmation after a visitor shares contact details.", enabled: true },
    { id: randomUUID(), businessId, key: "follow-up", label: "Follow-up sequence", description: "Schedule a helpful follow-up for leads that need more time.", enabled: true },
    { id: randomUUID(), businessId, key: "calendar-booking", label: "Calendar booking", description: "Offer direct calendar booking during the conversation.", enabled: false },
  ]);

  if (isDemo) {
    const names = ["Priya Sharma", "Rohan Mehta", "Kavya Nair", "Vikram Rao", "Ananya Iyer", "Siddharth Jain", "Neha Kapoor", "Aarav Menon", "Ishita Bose", "Rahul Das", "Meera Joshi", "Aditya Singh", "Nandini Shah", "Karan Malhotra", "Sanya Verma", "Dev Patel", "Tanya Roy", "Manish Gupta", "Aditi Kulkarni", "Arjun Bhat"];
    const scores = [92, 88, 84, 81, 78, 74, 69, 65, 62, 58, 54, 50, 47, 43, 39, 35, 31, 26, 18, 12];
    await db.insert(leadsTable).values(names.map((name, index) => {
      const score = scores[index];
      return {
        id: randomUUID(),
        businessId,
        name,
        email: `${name.toLowerCase().replace(/ /g, ".")}@example.com`,
        phone: `+91 98${String(10000000 + index * 777777).slice(0, 8)}`,
        service: index % 3 === 0 ? "2BHK Apartments" : index % 3 === 1 ? "3BHK Apartments" : "Commercial Property",
        budget: index % 3 === 0 ? "₹85L – ₹1Cr" : index % 3 === 1 ? "₹1.4Cr – ₹1.8Cr" : "₹2Cr+",
        location: index % 2 === 0 ? "Indiranagar" : "Whitefield",
        timeline: index < 6 ? "Within 30 days" : index < 12 ? "1–3 months" : "Exploring",
        score,
        status: score >= 80 ? "HOT" : score >= 50 ? "WARM" : "COLD",
        source: index % 3 === 0 ? "Website" : index % 3 === 1 ? "Instagram" : "Referral",
        qualificationReasons: [
          ...(score >= 50 ? [{ label: "Service matches business offering", points: 20 }] : []),
          ...(index < 8 ? [{ label: "Urgent timeline", points: 20 }] : []),
          ...(index % 2 === 0 ? [{ label: "Complete contact information", points: 10 }] : []),
        ],
      };
    }));
  }

  return { user, business };
}

export async function getWorkspace(req: Request) {
  const clerkUserId = getClerkUserId(req);
  if (!clerkUserId) return null;
  return ensureWorkspace(clerkUserId);
}

export function iso(value: Date | string | null | undefined) {
  if (!value) return new Date().toISOString();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function classify(score: number) {
  return score >= 80 ? "HOT" : score >= 50 ? "WARM" : "COLD";
}

export function scoreLead(input: {
  service?: string;
  budget?: string;
  timeline?: string;
  email?: string;
  phone?: string;
}) {
  const reasons: Array<{ label: string; points: number }> = [];
  if (input.budget && /₹|cr|lakh|budget|1[0-9]/i.test(input.budget)) reasons.push({ label: "Budget matches target", points: 30 });
  if (input.timeline && /today|week|urgent|month|30/i.test(input.timeline)) reasons.push({ label: "Urgent timeline", points: 20 });
  if (input.service) reasons.push({ label: "Service matches business offering", points: 20 });
  if (input.email && input.phone) reasons.push({ label: "Complete contact information", points: 10 });
  const score = Math.min(100, reasons.reduce((sum, reason) => sum + reason.points, 0));
  return { score, status: classify(score), reasons };
}

export async function findConversation(businessId: string, conversationId: string) {
  const rows = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, conversationId), eq(conversationsTable.businessId, businessId)))
    .limit(1);
  return rows[0];
}

export async function listLeadRows(businessId: string, search?: string, status?: string) {
  const conditions = [eq(leadsTable.businessId, businessId)];
  if (status && status !== "ALL") conditions.push(eq(leadsTable.status, status));
  if (search) {
    conditions.push(or(
      ilike(leadsTable.name, `%${search}%`),
      ilike(leadsTable.email, `%${search}%`),
      ilike(leadsTable.service, `%${search}%`),
    )!);
  }
  return db.select().from(leadsTable).where(and(...conditions)).orderBy(desc(leadsTable.createdAt));
}
