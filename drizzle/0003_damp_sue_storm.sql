CREATE TABLE "chat.widget_snapshot" (
	"conversation_id" text NOT NULL,
	"widget_id" text NOT NULL,
	"state" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat.widget_snapshot_conversation_id_widget_id_pk" PRIMARY KEY("conversation_id","widget_id")
);
--> statement-breakpoint
ALTER TABLE "chat.widget_snapshot" ADD CONSTRAINT "chat.widget_snapshot_conversation_id_chat.conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat.conversation"("id") ON DELETE cascade ON UPDATE no action;