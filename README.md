# Installation

1. clone this repo
2. install supabase-cli `npm install supabase --save-dev`
3. add the service key, webhook url for founder and champion in index.ts file directly (dont use env here)
4. login into supabase `npx supabase login`

## Note

(not recommended because it will install the whole supabase)

- for local development and testing you should have deno in your system and it should setup in your vscode settings..
- for running it locally use `npx supabase start` (you might also need to do `supabase init` and you should have docker in your system)

# Deployment

`npx supabase functions deploy <function-name>`

# In Short :

- make changes directly to index.ts file and deploy it and test it
