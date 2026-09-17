import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const id = () => text("id").primaryKey();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const usersTable = pgTable("users", {
  id: id(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  createdAt: createdAt(),
});

export const businessesTable = pgTable("businesses", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  industry: text("industry").notNull().default("Real Estate"),
  description: text("description").notNull().default(""),
  location: text("location"),
  website: text("website"),
  createdAt: createdAt(),
});

export const businessMembersTable = pgTable("business_members", {
  id: id(),
  businessId: text("business_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("owner"),
  createdAt: createdAt(),
});

export const servicesTable = pgTable("services", {
  id: id(),
  businessId: text("business_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  startingPrice: text("starting_price").notNull().default(""),
  duration: text("duration").notNull().default(""),
  active: boolean("active").notNull().default(true),
});

export const faqsTable = pgTable("faqs", {
  id: id(),
  businessId: text("business_id").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
});

export const aiAssistantsTable = pgTable("ai_assistants", {
  id: id(),
  businessId: text("business_id").notNull().unique(),
  name: text("name").notNull().default("Alex"),
  greeting: text("greeting").notNull().default("Hi, how can I help you today?"),
  tone: text("tone").notNull().default("Friendly"),
  description: text("description").notNull().default(""),
  instructions: text("instructions").notNull().default(""),
  openingHours: text("opening_hours").notNull().default("Mon–Sat, 9:00 AM–7:00 PM"),
  locations: text("locations").notNull().default(""),
});

export const qualificationRulesTable = pgTable("qualification_rules", {
  id: id(),
  businessId: text("business_id").notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  points: integer("points").notNull(),
});

export const conversationsTable = pgTable("conversations", {
  id: id(),
  businessId: text("business_id").notNull(),
  visitorName: text("visitor_name").notNull().default("Website visitor"),
  status: text("status").notNull().default("Open"),
  startedAt: createdAt(),
  lastActivityAt: createdAt(),
  leadId: text("lead_id"),
});

export const leadsTable = pgTable("leads", {
  id: id(),
  businessId: text("business_id").notNull(),
  conversationId: text("conversation_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  service: text("service").notNull(),
  budget: text("budget").notNull(),
  location: text("location").notNull(),
  timeline: text("timeline").notNull(),
  score: integer("score").notNull().default(0),
  status: text("status").notNull().default("COLD"),
  source: text("source").notNull().default("Website"),
  qualificationReasons: jsonb("qualification_reasons")
    .$type<Array<{ label: string; points: number }>>()
    .notNull()
    .default([]),
  createdAt: createdAt(),
});

export const messagesTable = pgTable("messages", {
  id: id(),
  conversationId: text("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: createdAt(),
});

export const automationsTable = pgTable("automations", {
  id: id(),
  businessId: text("business_id").notNull(),
  key: text("key").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});

export const followupsTable = pgTable("followups", {
  id: id(),
  businessId: text("business_id").notNull(),
  delayMinutes: integer("delay_minutes").notNull(),
  message: text("message").notNull(),
  enabled: boolean("enabled").notNull().default(true),
});

export const notificationsTable = pgTable("notifications", {
  id: id(),
  businessId: text("business_id").notNull(),
  leadId: text("lead_id"),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("mocked"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: createdAt(),
});

export const analyticsEventsTable = pgTable("analytics_events", {
  id: id(),
  businessId: text("business_id").notNull(),
  kind: text("kind").notNull(),
  source: text("source"),
  service: text("service"),
  createdAt: createdAt(),
});

export const insertUserSchema = createInsertSchema(usersTable);
export const insertBusinessSchema = createInsertSchema(businessesTable);
export const insertLeadSchema = createInsertSchema(leadsTable);
export type User = typeof usersTable.$inferSelect;
export type Business = typeof businessesTable.$inferSelect;
export type Lead = typeof leadsTable.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;