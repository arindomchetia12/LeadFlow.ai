import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  aiAssistantsTable,
  automationsTable,
  businessesTable,
  conversationsTable,
  faqsTable,
  leadsTable,
  messagesTable,
  servicesTable,
} from "@workspace/db";
import {
  CreateLeadBody,
  GetAssistantResponse,
  GetBusinessResponse,
  GetConversationParams,
  GetConversationResponse,
  GetCurrentUserResponse,
  GetDashboardSummaryResponse,
  GetLeadParams,
  GetLeadResponse,
  GetAnalyticsResponse,
  ListAutomationsResponse,
  ListConversationsResponse,
  ListLeadsQueryParams,
  ListLeadsResponse,
  SendChatMessageBody,
  SendChatMessageParams,
  SendChatMessageResponse,
  UpdateAssistantBody,
  UpdateBusinessBody,
  UpdateConversationBody,
  UpdateConversationParams,
  UpdateLeadBody,
  UpdateLeadParams,
  UpdateAutomationBody,
} from "@workspace/api-zod";
import {
  classify,
  ensureWorkspace,
  findConversation,
  getWorkspace,
  iso,
  listLeadRows,
  scoreLead,
} from "../lib/leadflow";

const router: IRouter = Router();

function validationMessage(result: { error?: { message?: string } }) {
  return result.error?.message ?? "Invalid request";
}

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = key(item);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
}

async function assistantPayload(businessId: string) {
  const [assistant] = await db.select().from(aiAssistantsTable).where(eq(aiAssistantsTable.businessId, businessId)).limit(1);
  const services = await db.select({ name: servicesTable.name }).from(servicesTable).where(eq(servicesTable.businessId, businessId));
  const faqs = await db.select({ question: faqsTable.question, answer: faqsTable.answer }).from(faqsTable).where(eq(faqsTable.businessId, businessId));
  return GetAssistantResponse.parse({
    id: assistant?.id ?? businessId,
    name: assistant?.name ?? "Alex",
    greeting: assistant?.greeting ?? "Hi, how can I help you today?",
    tone: assistant?.tone ?? "Friendly",
    description: assistant?.description ?? "",
    instructions: assistant?.instructions ?? "",
    services: services.map((item) => item.name),
    faqs,
    openingHours: assistant?.openingHours ?? "",
    locations: assistant?.locations ?? "",
  });
}

function leadPayload(lead: typeof leadsTable.$inferSelect) {
  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    service: lead.service,
    budget: lead.budget,
    location: lead.location,
    timeline: lead.timeline,
    score: lead.score,
    status: lead.status,
    source: lead.source,
    createdAt: iso(lead.createdAt),
    conversationId: lead.conversationId,
  };
}

async function conversationPayload(conversation: typeof conversationsTable.$inferSelect, includeMessages = false) {
  const messages = includeMessages
    ? await db.select().from(messagesTable).where(eq(messagesTable.conversationId, conversation.id)).orderBy(messagesTable.createdAt)
    : [];
  return {
    id: conversation.id,
    visitorName: conversation.visitorName,
    status: conversation.status,
    startedAt: iso(conversation.startedAt),
    lastActivityAt: iso(conversation.lastActivityAt),
    messageCount: includeMessages ? messages.length : Number(conversation.leadId ? 5 : 2),
    leadId: conversation.leadId,
    ...(includeMessages ? { messages: messages.map((message) => ({ id: message.id, role: message.role, content: message.content, createdAt: iso(message.createdAt) })) } : {}),
  };
}

router.get("/auth/me", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  if (!workspace) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(GetCurrentUserResponse.parse({ id: workspace.user.id, name: workspace.user.name, email: workspace.user.email }));
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.sendStatus(204);
});

router.get("/business", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  if (!workspace) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(GetBusinessResponse.parse({
    id: workspace.business.id,
    name: workspace.business.name,
    slug: workspace.business.slug,
    industry: workspace.business.industry,
    description: workspace.business.description,
    location: workspace.business.location,
    website: workspace.business.website,
  }));
});

router.patch("/business", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  const parsed = UpdateBusinessBody.safeParse(req.body);
  if (!workspace || !parsed.success) {
    res.status(!workspace ? 401 : 400).json({ error: !workspace ? "Unauthorized" : validationMessage(parsed) });
    return;
  }
  const [business] = await db.update(businessesTable).set(parsed.data).where(eq(businessesTable.id, workspace.business.id)).returning();
  res.json(GetBusinessResponse.parse({
    id: business.id, name: business.name, slug: business.slug, industry: business.industry,
    description: business.description, location: business.location, website: business.website,
  }));
});

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  if (!workspace) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const leads = await listLeadRows(workspace.business.id);
  const conversations = await db.select().from(conversationsTable).where(eq(conversationsTable.businessId, workspace.business.id)).orderBy(desc(conversationsTable.lastActivityAt)).limit(5);
  const hot = leads.filter((lead) => lead.score >= 80).length;
  const warm = leads.filter((lead) => lead.score >= 50 && lead.score < 80).length;
  const cold = leads.filter((lead) => lead.score < 50).length;
  const converted = leads.filter((lead) => lead.status === "CONVERTED").length;
  const average = leads.length ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length) : 0;
  const metrics = [
    { label: "Total leads", value: leads.length, change: 12.4, format: "number" },
    { label: "Hot leads", value: hot, change: 8.2, format: "number" },
    { label: "Warm leads", value: warm, change: 4.6, format: "number" },
    { label: "Avg. score", value: average, change: 6.1, format: "score" },
    { label: "Pipeline value", value: hot * 1250000 + warm * 850000, change: 18.9, format: "currency" },
  ];
  const recentActivity = leads.slice(0, 5).map((lead) => ({
    id: lead.id,
    title: `${lead.name} became a ${lead.status.toLowerCase()} lead`,
    description: `${lead.service} · ${lead.source}`,
    timestamp: iso(lead.createdAt),
    kind: lead.status.toLowerCase(),
  }));
  if (!recentActivity.length) {
    recentActivity.push(...conversations.map((conversation) => ({
      id: conversation.id,
      title: "New conversation started",
      description: conversation.visitorName,
      timestamp: iso(conversation.lastActivityAt),
      kind: "conversation",
    })));
  }
  res.json(GetDashboardSummaryResponse.parse({ metrics, pipeline: { hot, warm, cold, converted }, recentActivity }));
});

router.get("/leads", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  const query = ListLeadsQueryParams.safeParse(req.query);
  if (!workspace || !query.success) {
    res.status(!workspace ? 401 : 400).json({ error: !workspace ? "Unauthorized" : validationMessage(query) });
    return;
  }
  const rows = await listLeadRows(workspace.business.id, query.data.search, query.data.status);
  const page = query.data.page ?? 1;
  const pageSize = query.data.pageSize ?? 20;
  const items = rows.slice((page - 1) * pageSize, page * pageSize).map(leadPayload);
  res.json(ListLeadsResponse.parse({ items, total: rows.length, page, pageSize }));
});

router.post("/leads", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!workspace || !parsed.success) {
    res.status(!workspace ? 401 : 400).json({ error: !workspace ? "Unauthorized" : validationMessage(parsed) });
    return;
  }
  const scored = scoreLead(parsed.data);
  const [lead] = await db.insert(leadsTable).values({
    id: randomUUID(),
    businessId: workspace.business.id,
    conversationId: parsed.data.conversationId ?? null,
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    service: parsed.data.service,
    budget: parsed.data.budget,
    location: parsed.data.location,
    timeline: parsed.data.timeline,
    source: parsed.data.source,
    score: scored.score,
    status: scored.status,
    qualificationReasons: scored.reasons,
  }).returning();
  res.status(201).json(GetLeadResponse.parse(leadPayload(lead)));
});

router.get("/leads/:leadId", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  const params = GetLeadParams.safeParse(req.params);
  if (!workspace || !params.success) {
    res.status(!workspace ? 401 : 400).json({ error: !workspace ? "Unauthorized" : validationMessage(params) });
    return;
  }
  const rows = await db.select().from(leadsTable).where(and(eq(leadsTable.id, params.data.leadId), eq(leadsTable.businessId, workspace.business.id))).limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  const lead = rows[0];
  const conversation = lead.conversationId ? await findConversation(workspace.business.id, lead.conversationId) : undefined;
  const detail = {
    ...leadPayload(lead),
    qualificationReasons: lead.qualificationReasons,
    conversation: conversation ? await conversationPayload(conversation, true) : {
      id: "none", visitorName: lead.name, status: "Resolved", startedAt: iso(lead.createdAt),
      lastActivityAt: iso(lead.createdAt), messageCount: 0, leadId: lead.id, messages: [],
    },
  };
  res.json(GetLeadResponse.parse(detail));
});

router.patch("/leads/:leadId", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  const params = UpdateLeadParams.safeParse(req.params);
  const parsed = UpdateLeadBody.safeParse(req.body);
  if (!workspace || !params.success || !parsed.success) {
    res.status(!workspace ? 401 : 400).json({ error: !workspace ? "Unauthorized" : !params.success ? validationMessage(params) : validationMessage(parsed) });
    return;
  }
  const [lead] = await db.update(leadsTable).set({ status: parsed.data.status }).where(and(eq(leadsTable.id, params.data.leadId), eq(leadsTable.businessId, workspace.business.id))).returning();
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  res.json(GetLeadResponse.parse(leadPayload(lead)));
});

router.delete("/leads/:leadId", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  const params = GetLeadParams.safeParse(req.params);
  if (!workspace || !params.success) {
    res.status(!workspace ? 401 : 400).json({ error: !workspace ? "Unauthorized" : validationMessage(params) });
    return;
  }
  const deleted = await db.delete(leadsTable).where(and(eq(leadsTable.id, params.data.leadId), eq(leadsTable.businessId, workspace.business.id))).returning();
  if (!deleted[0]) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/conversations", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  if (!workspace) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const rows = await db.select().from(conversationsTable).where(eq(conversationsTable.businessId, workspace.business.id)).orderBy(desc(conversationsTable.lastActivityAt));
  res.json(ListConversationsResponse.parse(await Promise.all(rows.map((row) => conversationPayload(row)))));
});

router.get("/conversations/:conversationId", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  const params = GetConversationParams.safeParse(req.params);
  if (!workspace || !params.success) {
    res.status(!workspace ? 401 : 400).json({ error: !workspace ? "Unauthorized" : validationMessage(params) });
    return;
  }
  const conversation = await findConversation(workspace.business.id, params.data.conversationId);
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const lead = conversation.leadId ? (await db.select().from(leadsTable).where(eq(leadsTable.id, conversation.leadId)).limit(1))[0] : undefined;
  res.json(GetConversationResponse.parse({ ...(await conversationPayload(conversation, true)), lead: lead ? leadPayload(lead) : null }));
});

router.patch("/conversations/:conversationId", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  const params = UpdateConversationParams.safeParse(req.params);
  const parsed = UpdateConversationBody.safeParse(req.body);
  if (!workspace || !params.success || !parsed.success) {
    res.status(!workspace ? 401 : 400).json({ error: !workspace ? "Unauthorized" : !params.success ? validationMessage(params) : validationMessage(parsed) });
    return;
  }
  const [conversation] = await db.update(conversationsTable).set({ status: parsed.data.status }).where(and(eq(conversationsTable.id, params.data.conversationId), eq(conversationsTable.businessId, workspace.business.id))).returning();
  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.json((await conversationPayload(conversation)) as never);
});

router.get("/assistant", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  if (!workspace) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(await assistantPayload(workspace.business.id));
});

router.patch("/assistant", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  const parsed = UpdateAssistantBody.safeParse(req.body);
  if (!workspace || !parsed.success) {
    res.status(!workspace ? 401 : 400).json({ error: !workspace ? "Unauthorized" : validationMessage(parsed) });
    return;
  }
  const [assistant] = await db.update(aiAssistantsTable).set({
    ...parsed.data,
    description: parsed.data.description ?? "",
    instructions: parsed.data.instructions ?? "",
    openingHours: parsed.data.openingHours ?? "",
    locations: parsed.data.locations ?? "",
  }).where(eq(aiAssistantsTable.businessId, workspace.business.id)).returning();
  if (parsed.data.services) {
    await db.delete(servicesTable).where(eq(servicesTable.businessId, workspace.business.id));
    await db.insert(servicesTable).values(parsed.data.services.map((name) => ({ id: randomUUID(), businessId: workspace.business.id, name, description: "", startingPrice: "", duration: "" })));
  }
  if (parsed.data.faqs) {
    await db.delete(faqsTable).where(eq(faqsTable.businessId, workspace.business.id));
    await db.insert(faqsTable).values(parsed.data.faqs.map((faq) => ({ id: randomUUID(), businessId: workspace.business.id, ...faq })));
  }
  res.json(await assistantPayload(workspace.business.id));
});

router.get("/automations", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  if (!workspace) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const rows = await db.select().from(automationsTable).where(eq(automationsTable.businessId, workspace.business.id));
  res.json(ListAutomationsResponse.parse(rows));
});

router.patch("/automations", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  const parsed = UpdateAutomationBody.safeParse(req.body);
  if (!workspace || !parsed.success) {
    res.status(!workspace ? 401 : 400).json({ error: !workspace ? "Unauthorized" : validationMessage(parsed) });
    return;
  }
  const [automation] = await db.update(automationsTable).set({ enabled: parsed.data.enabled }).where(and(eq(automationsTable.businessId, workspace.business.id), eq(automationsTable.key, parsed.data.key))).returning();
  if (!automation) {
    res.status(404).json({ error: "Automation not found" });
    return;
  }
  res.json(automation);
});

router.get("/analytics", async (req, res): Promise<void> => {
  const workspace = await getWorkspace(req);
  if (!workspace) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const leads = await listLeadRows(workspace.business.id);
  const conversations = await db.select().from(conversationsTable).where(eq(conversationsTable.businessId, workspace.business.id));
  const bySource = countBy(leads, (lead) => lead.source);
  const byService = countBy(leads, (lead) => lead.service);
  const dateMap = new Map<string, { leads: number; conversations: number }>();
  for (const lead of leads) {
    const date = iso(lead.createdAt).slice(0, 10);
    dateMap.set(date, { leads: (dateMap.get(date)?.leads ?? 0) + 1, conversations: dateMap.get(date)?.conversations ?? 0 });
  }
  for (const conversation of conversations) {
    const date = iso(conversation.startedAt).slice(0, 10);
    dateMap.set(date, { leads: dateMap.get(date)?.leads ?? 0, conversations: (dateMap.get(date)?.conversations ?? 0) + 1 });
  }
  const hot = leads.filter((lead) => lead.score >= 80).length;
  const warm = leads.filter((lead) => lead.score >= 50 && lead.score < 80).length;
  const cold = leads.filter((lead) => lead.score < 50).length;
  res.json(GetAnalyticsResponse.parse({
    totals: {
      conversations: conversations.length,
      leads: leads.length,
      hot,
      warm,
      cold,
      conversionRate: leads.length ? Number(((leads.filter((lead) => lead.status === "CONVERTED").length / leads.length) * 100).toFixed(1)) : 0,
      averageScore: leads.length ? Number((leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length).toFixed(1)) : 0,
    },
    bySource,
    byService,
    overTime: Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, value]) => ({ date, ...value })),
  }));
});

router.post("/chat/:businessSlug", async (req, res): Promise<void> => {
  const params = SendChatMessageParams.safeParse(req.params);
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ error: !params.success ? validationMessage(params) : validationMessage(parsed) });
    return;
  }
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.slug, params.data.businessSlug)).limit(1);
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return;
  }
  const [assistant] = await db.select().from(aiAssistantsTable).where(eq(aiAssistantsTable.businessId, business.id)).limit(1);
  let conversation = parsed.data.conversationId ? await findConversation(business.id, parsed.data.conversationId) : undefined;
  if (!conversation) {
    conversation = (await db.insert(conversationsTable).values({ id: randomUUID(), businessId: business.id, visitorName: "Website visitor", status: "Open" }).returning())[0];
  }
  await db.insert(messagesTable).values({ id: randomUUID(), conversationId: conversation.id, role: "user", content: parsed.data.message });
  const text = parsed.data.message.toLowerCase();
  const isContact = /@|phone|call|contact|reach|whatsapp|\+91/.test(text);
  const response = isContact
    ? "Thanks — I have that noted. An advisor from our team will follow up shortly. Is there a preferred time for a quick conversation?"
    : /price|cost|budget|₹|lakh|crore/.test(text)
      ? `We can help you explore options that match your budget. ${assistant?.name ?? "Alex"} can narrow this down with one quick question: what timeline are you working with?`
      : /service|offer|property|apartment|home|commercial/.test(text)
        ? `We offer guided options based on your goals, location, and timeline. What kind of property or service are you most interested in?`
        : `I can help you find the right next step with ${business.name}. What are you looking for today?`;
  await db.insert(messagesTable).values({ id: randomUUID(), conversationId: conversation.id, role: "assistant", content: response });
  await db.update(conversationsTable).set({ lastActivityAt: new Date() }).where(eq(conversationsTable.id, conversation.id));
  let leadId: string | null = null;
  if (isContact) {
    const [lead] = await db.insert(leadsTable).values({
      id: randomUUID(),
      businessId: business.id,
      conversationId: conversation.id,
      name: "Website visitor",
      email: text.match(/[^\s]+@[^\s]+/)?.[0] ?? "pending@leadflow.local",
      phone: text.match(/\+?\d[\d\s-]{7,}/)?.[0] ?? "Pending",
      service: "General enquiry",
      budget: "To be confirmed",
      location: "To be confirmed",
      timeline: "To be confirmed",
      score: 20,
      status: classify(20),
      source: "Website",
      qualificationReasons: [{ label: "Started a conversation", points: 20 }],
    }).returning();
    leadId = lead.id;
    await db.update(conversationsTable).set({ leadId }).where(eq(conversationsTable.id, conversation.id));
  }
  res.json(SendChatMessageResponse.parse({ conversationId: conversation.id, message: response, assistantName: assistant?.name ?? "Alex", leadCaptured: Boolean(leadId), leadId }));
});

export default router;