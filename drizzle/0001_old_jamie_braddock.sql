CREATE TABLE "mvp_vote_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"voter_id" text NOT NULL,
	"has_voted" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "one_status_per_game_voter" UNIQUE("game_id","voter_id")
);
--> statement-breakpoint
ALTER TABLE "mvp_vote_status" ADD CONSTRAINT "mvp_vote_status_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mvp_vote_status" ADD CONSTRAINT "mvp_vote_status_voter_id_users_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;