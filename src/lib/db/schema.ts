import { pgTable, text, boolean, timestamp, integer, uuid, jsonb, unique } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  nickname: text('nickname'),
  imageUrl: text('image_url'),
  isAdmin: boolean('is_admin').default(false).notNull(),
  isWhitelisted: boolean('is_whitelisted').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const games = pgTable('games', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: timestamp('date').notNull(),
  status: text('status', { enum: ['scheduled', 'confirmed', 'completed', 'cancelled'] }).default('scheduled').notNull(),
  participants: jsonb('participants').$type<string[]>().default([]).notNull(), // Array of user IDs
  waitlist: jsonb('waitlist').$type<string[]>().default([]).notNull(), // Array of user IDs in waitlist order
  teams: jsonb('teams').$type<{ team1: string[], team2: string[] }>(),
  result: jsonb('result').$type<{ team1Score: number, team2Score: number, notes?: string, mvp?: string | string[] }>(),
  reservationInfo: jsonb('reservation_info').$type<{
    location: string,
    time: string,
    cost?: number,
    reservedBy: string,
    mapsLink?: string,
    paymentAlias?: string
  }>(),
  adminNotificationSent: boolean('admin_notification_sent').default(false).notNull(),
  adminNotificationTimeout: timestamp('admin_notification_timeout'),
  customTime: text('custom_time'), // Custom time if not 10am
  calendarEventId: text('calendar_event_id'), // Google Calendar event ID
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const monthlyAvailability = pgTable('monthly_availability', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  month: integer('month').notNull(), // 1-12
  year: integer('year').notNull(),
  availableSundays: jsonb('available_sundays').$type<number[]>().default([]).notNull(),
  cannotPlayAnyDay: boolean('cannot_play_any_day').default(false).notNull(),
  hasVoted: boolean('has_voted').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate entries for same user/month/year
  userMonthYear: unique('user_month_year').on(table.userId, table.month, table.year),
}));

export const reminderStatus = pgTable('reminder_status', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  lastReminderSent: timestamp('last_reminder_sent').defaultNow().notNull(),
  reminderCount: integer('reminder_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const adminNotifications = pgTable('admin_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type', { enum: ['match_ready', 'voting_reminder'] }).notNull(),
  gameId: uuid('game_id').references(() => games.id, { onDelete: 'cascade' }),
  month: integer('month'),
  year: integer('year'),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  actionRequired: boolean('action_required').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const mvpVotes = pgTable('mvp_votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  votedForId: text('voted_for_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mvpVoteStatus = pgTable('mvp_vote_status', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  voterId: text('voter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  hasVoted: boolean('has_voted').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Ensure one vote status per voter per game
  oneStatusPerGameVoter: unique('one_status_per_game_voter').on(table.gameId, table.voterId),
}));

export const dayVotes = pgTable('day_votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  day: integer('day').notNull(),
  votedAt: timestamp('voted_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Unique constraint to prevent duplicate votes for same user/day
  userYearMonthDay: unique('user_year_month_day').on(table.userId, table.year, table.month, table.day),
}));

// Export types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type MonthlyAvailability = typeof monthlyAvailability.$inferSelect;
export type NewMonthlyAvailability = typeof monthlyAvailability.$inferInsert;
export type ReminderStatus = typeof reminderStatus.$inferSelect;
export type NewReminderStatus = typeof reminderStatus.$inferInsert;
export type AdminNotification = typeof adminNotifications.$inferSelect;
export type NewAdminNotification = typeof adminNotifications.$inferInsert;
export type MvpVote = typeof mvpVotes.$inferSelect;
export type NewMvpVote = typeof mvpVotes.$inferInsert;
export type MvpVoteStatus = typeof mvpVoteStatus.$inferSelect;
export type NewMvpVoteStatus = typeof mvpVoteStatus.$inferInsert;
export type DayVote = typeof dayVotes.$inferSelect;
export type NewDayVote = typeof dayVotes.$inferInsert;