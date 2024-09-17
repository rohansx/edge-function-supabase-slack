import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Load environment variables
const SUPABASE_URL = "https://khcpxinwheaivuwgnxue.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoY3B4aW53aGVhaXZ1d2dueHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyMzA1NDQ3NywiZXhwIjoyMDM4NjMwNDc3fQ.6PvOZOTYta7I8I8ueIbwAtzQyGo-ToPiriCqbak_R_E";

// Webhooks for different user types
const FOUNDER_SLACK_WEBHOOK =
  "https://hooks.slack.com/services/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";
const CHAMPION_SLACK_WEBHOOK =
  "https://hooks.slack.com/services/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";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    // Fetch all records from the slack_notifications_queue table
    const { data, error } = await supabase.from("slack_notifications_queue")
      .select("*");

    if (error) {
      console.error("Supabase query error:", error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log("No records found in the queue.");
      return new Response("No records to process.", { status: 200 });
    }

    console.log("Data fetched:", data);

    for (const record of data) {
      console.log("Record:", record);

      const {
        full_name,
        email,
        user_type,
        country,
        company,
        job_title,
        preferences,
      } = record.payload;

      // console.log("User details:", { full_name, email, user_type });

      let message;

      // Define message for Founder (user_type = 1)
      if (user_type === 1) {
        const formattedPreferencesFounder = `
        • Startup Name: ${preferences.startup_name}
        • About: ${preferences.about}
        • Ideal Champion Profile: ${preferences.ideal_profile}
        • Looking For: ${preferences.looking_for.join(", ")}
        • Budget: ${preferences.budget}
        `;

        message = {
          text:
            `🚀 Founder onboarded!!\n\n👤 Name: ${full_name}\n📧 Email: ${email}\n🌍 Country: ${country}\n🏢 Company: ${company}\n💼 Job Title: ${job_title}\n🎯 Preferences:\n${formattedPreferencesFounder}`,
        };
      } // Define message for Champion (user_type = 2)
      else if (user_type === 2) {
        const formattedPreferencesChampion = `
        • About: ${preferences.about}
        • Tech Tools: ${preferences.tech_tools}
        • Looking For: ${preferences.looking_for.join(", ")}
        • Excited About: ${preferences.excited_tech}
        • Price Per Session: ${preferences.price_per_session}
        • Nightmare Scenarios: ${preferences.nightmare_scenarios}
        • Specific Challenges: ${preferences.specific_challenges}
        `;

        message = {
          text:
            `🏆 Champion onboarded!!\n\n👤 Name: ${full_name}\n📧 Email: ${email}\n🌍 Country: ${country}\n🏢 Company: ${company}\n💼 Job Title: ${job_title}\n🎯 Preferences:\n${formattedPreferencesChampion}`,
        };
      }

      const webhookUrl = user_type === 1
        ? FOUNDER_SLACK_WEBHOOK
        : CHAMPION_SLACK_WEBHOOK;

      console.log("Using webhook URL:", webhookUrl);

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error(
          "Failed to send Slack notification:",
          await response.text(),
        );
      } else {
        console.log("Notification sent successfully.");

        // Optionally delete processed item from queue
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

  1. Run supabase start (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/sendSlackNotification' \
    --header 'Authorization: Bearer YOUR_AUTH_TOKEN' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

/* To invoke locally:

  1. Run supabase start (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'https://khcpxinwheaivuwgnxue.supabase.co/functions/v1/sendSlackNotification' \
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
