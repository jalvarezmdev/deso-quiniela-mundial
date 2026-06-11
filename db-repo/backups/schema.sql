


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "text" NOT NULL,
    "phase" "text" NOT NULL,
    "group_name" "text",
    "home_team_id" "text" NOT NULL,
    "away_team_id" "text" NOT NULL,
    "kickoff_at" timestamp with time zone NOT NULL,
    "status" "text" NOT NULL,
    "home_goals" integer,
    "away_goals" integer,
    "qualified_team_id" "text",
    "manual_override" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "external_match_ref" "text",
    CONSTRAINT "chk_matches_groups_without_qualified" CHECK ((("phase" <> 'groups'::"text") OR ("qualified_team_id" IS NULL))),
    CONSTRAINT "chk_matches_knockout_final_requires_qualified" CHECK ((NOT (("phase" <> 'groups'::"text") AND ("status" = 'final'::"text") AND ("qualified_team_id" IS NULL)))),
    CONSTRAINT "chk_matches_live_or_final_has_scores" CHECK ((("status" = 'scheduled'::"text") OR (("home_goals" IS NOT NULL) AND ("away_goals" IS NOT NULL)))),
    CONSTRAINT "chk_matches_qualified_in_match" CHECK ((("qualified_team_id" IS NULL) OR ("qualified_team_id" = "home_team_id") OR ("qualified_team_id" = "away_team_id"))),
    CONSTRAINT "chk_matches_scheduled_clean" CHECK ((("status" <> 'scheduled'::"text") OR (("home_goals" IS NULL) AND ("away_goals" IS NULL) AND ("qualified_team_id" IS NULL)))),
    CONSTRAINT "chk_matches_score_nonnegative" CHECK (((("home_goals" IS NULL) OR ("home_goals" >= 0)) AND (("away_goals" IS NULL) OR ("away_goals" >= 0)))),
    CONSTRAINT "chk_matches_status" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'live'::"text", 'final'::"text"]))),
    CONSTRAINT "chk_matches_team_distinct" CHECK (("home_team_id" <> "away_team_id"))
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phase_submissions" (
    "user_id" "uuid" NOT NULL,
    "phase" "text" NOT NULL,
    "confirmed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "auto_confirmed" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."phase_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phase_window_overrides" (
    "phase" "text" NOT NULL,
    "opens_at" timestamp with time zone NOT NULL,
    "closes_at" timestamp with time zone NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."phase_window_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."predictions" (
    "user_id" "uuid" NOT NULL,
    "phase" "text" NOT NULL,
    "match_id" "text" NOT NULL,
    "home_goals" integer NOT NULL,
    "away_goals" integer NOT NULL,
    "predicted_qualified_team_id" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_predictions_groups_without_qualified" CHECK ((("phase" <> 'groups'::"text") OR ("predicted_qualified_team_id" IS NULL)))
);


ALTER TABLE "public"."predictions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "nickname" "text" NOT NULL,
    "team_id" "text" NOT NULL,
    "pin_hash" "text" NOT NULL,
    "is_admin" boolean DEFAULT false NOT NULL,
    "onboarding_completed" boolean DEFAULT false NOT NULL,
    "token_version" integer DEFAULT 1 NOT NULL,
    "last_login_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "flag" "text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phase_submissions"
    ADD CONSTRAINT "phase_submissions_pkey" PRIMARY KEY ("user_id", "phase");



ALTER TABLE ONLY "public"."phase_window_overrides"
    ADD CONSTRAINT "phase_window_overrides_pkey" PRIMARY KEY ("phase");



ALTER TABLE ONLY "public"."predictions"
    ADD CONSTRAINT "predictions_pkey" PRIMARY KEY ("user_id", "phase", "match_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_matches_phase_kickoff" ON "public"."matches" USING "btree" ("phase", "kickoff_at");



CREATE INDEX "idx_matches_phase_kickoff_active" ON "public"."matches" USING "btree" ("phase", "kickoff_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_matches_status" ON "public"."matches" USING "btree" ("status");



CREATE INDEX "idx_matches_status_active" ON "public"."matches" USING "btree" ("status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_phase_window_overrides_active" ON "public"."phase_window_overrides" USING "btree" ("phase") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_predictions_user" ON "public"."predictions" USING "btree" ("user_id");



CREATE INDEX "idx_teams_active" ON "public"."teams" USING "btree" ("id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "ux_matches_source_external_active" ON "public"."matches" USING "btree" ("source", "external_match_ref") WHERE (("deleted_at" IS NULL) AND ("external_match_ref" IS NOT NULL));



CREATE UNIQUE INDEX "ux_profiles_email_active" ON "public"."profiles" USING "btree" ("lower"("email")) WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "ux_profiles_nickname_active" ON "public"."profiles" USING "btree" ("lower"("nickname")) WHERE ("deleted_at" IS NULL);



CREATE OR REPLACE TRIGGER "trg_profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "fk_matches_away_team" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "fk_matches_home_team" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "fk_matches_qualified_team" FOREIGN KEY ("qualified_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."predictions"
    ADD CONSTRAINT "fk_predictions_qualified_team" FOREIGN KEY ("predicted_qualified_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."phase_submissions"
    ADD CONSTRAINT "phase_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."predictions"
    ADD CONSTRAINT "predictions_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."predictions"
    ADD CONSTRAINT "predictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "matches_public_read" ON "public"."matches" FOR SELECT USING (true);



ALTER TABLE "public"."phase_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."phase_window_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."predictions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "predictions_owner_rw" ON "public"."predictions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_no_access" ON "public"."profiles" USING (false) WITH CHECK (false);



CREATE POLICY "submissions_owner_rw" ON "public"."phase_submissions" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE TABLE IF NOT EXISTS "public"."match_points" (
    "user_id" "uuid" NOT NULL,
    "match_id" "text" NOT NULL,
    "phase" "text" NOT NULL,
    "points" integer DEFAULT 0 NOT NULL,
    "computed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."match_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."site_config" OWNER TO "postgres";


ALTER TABLE ONLY "public"."match_points"
    ADD CONSTRAINT "match_points_pkey" PRIMARY KEY ("user_id", "match_id");



ALTER TABLE ONLY "public"."site_config"
    ADD CONSTRAINT "site_config_pkey" PRIMARY KEY ("key");



CREATE INDEX "idx_match_points_phase" ON "public"."match_points" USING "btree" ("phase");



CREATE INDEX "idx_match_points_user" ON "public"."match_points" USING "btree" ("user_id");



ALTER TABLE ONLY "public"."match_points"
    ADD CONSTRAINT "match_points_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id");



ALTER TABLE ONLY "public"."match_points"
    ADD CONSTRAINT "match_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE "public"."match_points" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_config" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Public can read match_points for leaderboard" ON "public"."match_points" FOR SELECT USING (true);


CREATE POLICY "Public can read site_config" ON "public"."site_config" FOR SELECT USING (true);


CREATE POLICY "Users can read own match_points" ON "public"."match_points" FOR SELECT USING (("auth"."uid"() = "user_id"));



GRANT ALL ON TABLE "public"."match_points" TO "anon";
GRANT ALL ON TABLE "public"."match_points" TO "authenticated";
GRANT ALL ON TABLE "public"."match_points" TO "service_role";



GRANT ALL ON TABLE "public"."site_config" TO "anon";
GRANT ALL ON TABLE "public"."site_config" TO "authenticated";
GRANT ALL ON TABLE "public"."site_config" TO "service_role";



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."phase_submissions" TO "anon";
GRANT ALL ON TABLE "public"."phase_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."phase_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."phase_window_overrides" TO "anon";
GRANT ALL ON TABLE "public"."phase_window_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."phase_window_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."predictions" TO "anon";
GRANT ALL ON TABLE "public"."predictions" TO "authenticated";
GRANT ALL ON TABLE "public"."predictions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































