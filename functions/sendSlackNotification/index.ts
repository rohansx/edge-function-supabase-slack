// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "supabase";

// Load environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const FOUNDER_SLACK_WEBHOOK = Deno.env.get("FOUNDER_SLACK_WEBHOOK");
const CHAMPION_SLACK_WEBHOOK = Deno.env.get("CHAMPION_SLACK_WEBHOOK");

// Initialize Supabase client with the Service Role Key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const { data, error } = await supabase
      .from("slack_notifications_queue")
      .select("*");

    if (error) throw error;

    for (const record of data) {
      const {
        full_name,
        email,
        user_type,
        country,
        company,
        job_title,
        preferences,
      } = record.payload;

      const webhookUrl =
        user_type === 1 ? FOUNDER_SLACK_WEBHOOK : CHAMPION_SLACK_WEBHOOK;

      const message = {
        text: `User Preference Updated:\n\nUser Details:\nName: ${full_name}\nEmail: ${email}\nCountry: ${country}\nCompany: ${company}\nJob Title: ${job_title}\nPreferences: ${preferences}`,
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error(
          "Failed to send Slack notification:",
          await response.text()
        );
      } else {
        // Delete processed item from queue
        await supabase
          .from("slack_notifications_queue")
          .delete()
          .eq("id", record.id);
      }
    }

    return new Response("Notifications processed", { status: 200 });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sendSlackNotification' \
    --header 'Authorization: Bearer YOUR_AUTH_TOKEN' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sendSlackNotification' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

/*

CREATE OR REPLACE FUNCTION notify_slack_on_user_preference_update()
RETURNS TRIGGER AS $$
DECLARE
    user_data record;
    personal_details record;
    professional_details record;
    preference_details record;
    slack_payload json;
BEGIN
    -- Log that the trigger has fired
    RAISE NOTICE 'Trigger fired for user_id: %', NEW.user_id;

    -- Fetch data from the related tables
    SELECT * INTO user_data FROM users WHERE id = NEW.user_id;
    SELECT * INTO personal_details FROM user_personal_details WHERE user_id = NEW.user_id;
    SELECT * INTO professional_details FROM user_professional_details WHERE user_id = NEW.user_id;
    SELECT * INTO preference_details FROM user_preferences WHERE user_id = NEW.user_id;

    -- Construct the payload to send to the Edge Function
    slack_payload := json_build_object(
        'full_name', user_data.full_name,
        'email', user_data.email,
        'user_type', user_data.user_type,
        'country', personal_details.country,
        'timezone', personal_details.timezone,
        'company', professional_details.company,
        'job_title', professional_details.job_title,
        'preferences', preference_details.ideal_profile
    );

    -- Log the payload that will be sent
    RAISE NOTICE 'Payload: %', slack_payload;

    -- Call the Edge Function
    PERFORM http_post(
        'https://YOUR-SUPABASE-PROJECT-ID.supabase.co/functions/v1/sendSlackNotification',
        slack_payload::text,
        'application/json'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


*/
