ALTER TABLE "users" ADD COLUMN "is_bot" boolean DEFAULT false NOT NULL;

-- Insert pre-created bot users
INSERT INTO "users" ("id", "email", "name", "nickname", "is_admin", "is_whitelisted", "is_bot", "created_at", "updated_at")
VALUES
  ('bot_frn', 'frn_bot@bot.local', 'frn_bot', 'frn_bot', false, false, true, NOW(), NOW()),
  ('bot_johnathan', 'bot_johnathan@bot.local', 'bot johnathan', 'bot johnathan', false, false, true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
