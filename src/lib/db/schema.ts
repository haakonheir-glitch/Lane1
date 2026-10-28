import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Session ids are SHA-256 hashes of the cookie token, so a leaked table can't be replayed. */
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  ageRange: text("age_range"),
  situation: text("situation"),
  clarityGoal: text("clarity_goal"),
  city: text("city"),
  /** Current job, resolved through the taxonomy search (role id when known, always a lane id). */
  currentRoleId: text("current_role_id"),
  currentLaneId: text("current_lane_id"),
  currentTitle: text("current_title"),
  /** Years in the current job: "0" | "lt2" | "2to5" | "5plus". */
  currentYears: text("current_years"),
  /** Lanes the person is considering (up to 3), from the same search. */
  considering: jsonb("considering").$type<{ laneId: string; roleId: string | null; title: string }[]>(),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
});

/** One run of an assessment session (S1–S5). A retake is a new row with attempt + 1. */
export const assessmentSessions = pgTable("assessment_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id", { enum: ["S1", "S2", "S3", "S4", "S5"] }).notNull(),
  attempt: integer("attempt").notNull().default(1),
  status: text("status", { enum: ["in_progress", "completed", "discarded"] }).notNull().default("in_progress"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  deviceClass: text("device_class"),
  inputType: text("input_type"),
  viewport: text("viewport"),
  effort: integer("effort"),
  confidence: text("confidence", { enum: ["ok", "low"] }),
  flags: jsonb("flags").$type<string[]>(),
});

/** One row per questionnaire step (Likert, choice, text, q-sort, ideas, checks). */
export const itemResponses = pgTable(
  "item_responses",
  {
    sessionRowId: uuid("session_row_id")
      .notNull()
      .references(() => assessmentSessions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    itemId: text("item_id").notNull(),
    module: text("module").notNull(),
    blockId: text("block_id").notNull(),
    /** Number, option index(es), text, q-sort map or idea list. null = skipped. */
    value: jsonb("value"),
    skipped: boolean("skipped").notNull().default(false),
    rtMs: integer("rt_ms").notNull(),
    deviceClass: text("device_class"),
    inputType: text("input_type"),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sessionRowId, t.position] })],
);

/** One row per cognitive/behavioural trial. Items are regenerated from the seed, never stored. */
export const taskTrials = pgTable(
  "task_trials",
  {
    sessionRowId: uuid("session_row_id")
      .notNull()
      .references(() => assessmentSessions.id, { onDelete: "cascade" }),
    taskId: text("task_id").notNull(),
    attempt: integer("attempt").notNull(),
    trialIndex: integer("trial_index").notNull(),
    practice: boolean("practice").notNull().default(false),
    /** { response, correct, rtMs, rapidGuess, … } or { kind: "end" } for the attempt marker. */
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sessionRowId, t.taskId, t.attempt, t.trialIndex, t.practice] })],
);

export const sessionScores = pgTable("session_scores", {
  sessionRowId: uuid("session_row_id")
    .primaryKey()
    .references(() => assessmentSessions.id, { onDelete: "cascade" }),
  scores: jsonb("scores").notNull(),
  scoredAt: timestamp("scored_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Claude-written profile reports (PLAN D49). `factsHash` fingerprints the scores a report was
 * written from: the same scores reuse the stored report instead of calling the API again.
 */
export const profileReports = pgTable("profile_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  factsHash: text("facts_hash").notNull(),
  facts: jsonb("facts").notNull(),
  report: jsonb("report").notNull(),
  model: text("model").notNull(),
  /** When the person agreed to send their scores to Anthropic for this report. */
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Outcome check-in consent (Phase 3): the person opted in, at the end of their report, to two
 * questions 6 and 12 months later. Deleting the row withdraws consent. No email is sent yet: the
 * check-in is offered in the app when it is due (consentedAt + 6 or 12 months).
 */
export const outcomeConsents = pgTable("outcome_consents", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull(),
});

/**
 * One outcome check-in answer per wave: what the person does now (resolved through the job-title
 * search, stored like profiles.current_*; null = not working) and how fulfilled they are, 1–7.
 * Not the same as the removed sprint table check_ins.
 */
export const outcomeCheckIns = pgTable(
  "outcome_check_ins",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    wave: text("wave", { enum: ["6m", "12m"] }).notNull(),
    laneId: text("lane_id"),
    roleId: text("role_id"),
    /** The matched job title as the person picked it; null when not working. */
    title: text("title"),
    /** 1 (not at all) – 7 (completely). */
    fulfilment: integer("fulfilment").notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.wave] })],
);

export const sprints = pgTable("sprints", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  laneId: text("lane_id").notNull(),
  templateId: text("template_id").notNull(),
  status: text("status", { enum: ["active", "completed", "abandoned"] }).notNull(),
  /** ISO date (YYYY-MM-DD) of day 1. */
  startedOn: text("started_on").notNull(),
  days: integer("days").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  wantsToContinue: boolean("wants_to_continue"),
  closingNote: text("closing_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sprintTasks = pgTable(
  "sprint_tasks",
  {
    sprintId: uuid("sprint_id")
      .notNull()
      .references(() => sprints.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    done: boolean("done").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.sprintId, t.day] })],
);

export const checkIns = pgTable(
  "check_ins",
  {
    sprintId: uuid("sprint_id")
      .notNull()
      .references(() => sprints.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    energy: integer("energy").notNull(),
    flow: integer("flow").notNull(),
    continue: integer("continue").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sprintId, t.day] })],
);

export const logEntries = pgTable(
  "log_entries",
  {
    sprintId: uuid("sprint_id")
      .notNull()
      .references(() => sprints.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    values: jsonb("values").$type<Record<string, number>>().notNull(),
    note: text("note"),
  },
  (t) => [primaryKey({ columns: [t.sprintId, t.day] })],
);
