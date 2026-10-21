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
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
});

/** One row per answered Likert item. */
export const responses = pgTable(
  "responses",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moduleId: text("module_id").notNull(),
    itemId: text("item_id").notNull(),
    value: integer("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemId] })],
);

/** One row per cognitive game item. `choice` is null when time ran out. */
export const cognitiveResponses = pgTable(
  "cognitive_responses",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: text("game_id").notNull(),
    itemId: text("item_id").notNull(),
    choice: integer("choice"),
    correct: boolean("correct").notNull(),
    ms: integer("ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemId] })],
);

export const moduleCompletions = pgTable(
  "module_completions",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moduleId: text("module_id").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.moduleId] })],
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
