CREATE TABLE "chat.conversation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat.message" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"parts" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat.conversation" ADD CONSTRAINT "chat.conversation_user_id_auth.user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth.user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat.message" ADD CONSTRAINT "chat.message_conversation_id_chat.conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat.conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_conversation_idx" ON "chat.message" USING btree ("conversation_id","created_at");