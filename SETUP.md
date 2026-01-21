# Anokhi's Bank - Setup Guide

This guide walks you through setting up the database and deploying to Netlify.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click **New Project**
3. Name it something like "anokhi-bank"
4. Choose a strong database password (save it somewhere safe!)
5. Select a region close to you
6. Wait for the project to be created (~2 minutes)

## Step 2: Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste it into the SQL editor
5. Click **Run** (or press Cmd+Enter)
6. You should see "Success" messages

### Verify it worked:
- Go to **Table Editor** in the sidebar
- You should see two tables: `balance` and `transactions`
- Click on `balance` - it should show a row with amount `21.00`

## Step 3: Get Your Supabase Credentials

1. Go to **Settings** (gear icon) > **API**
2. Copy these two values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under Project API Keys)

## Step 4: Deploy to Netlify

### If you already have the site on Netlify:

1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site settings** > **Environment variables**
4. Add these two variables:
   - `SUPABASE_URL` = your Project URL from Step 3
   - `SUPABASE_ANON_KEY` = your anon public key from Step 3
5. Go to **Deploys** and click **Trigger deploy** > **Deploy site**

### If this is a new Netlify deployment:

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com) and sign in
3. Click **Add new site** > **Import an existing project**
4. Connect your GitHub and select this repository
5. Leave the build settings as default
6. Before deploying, click **Show advanced** > **New variable**
7. Add both environment variables from Step 3
8. Click **Deploy site**

## Step 5: Test It!

1. Open your Netlify site URL
2. You should see your balance as $21.00
3. Try spending some money
4. Check the transaction history

## How the Weekly Allowance Works

The database automatically adds $4 to your balance every Sunday at 7:00 AM PST. This is handled by a scheduled job (pg_cron) running directly in Supabase - no action needed from you!

To verify the cron job is set up, run this SQL in Supabase:
```sql
SELECT * FROM cron.job;
```

You should see a job named `weekly-allowance`.

## Troubleshooting

### "Could not load balance" error
- Check that your environment variables are set correctly in Netlify
- Make sure there are no extra spaces in the values
- Redeploy after adding/changing environment variables

### Balance shows $0 or wrong amount
- Check the `balance` table in Supabase Table Editor
- You can manually update it with:
  ```sql
  UPDATE balance SET amount = 21.00 WHERE id = 1;
  ```

### Cron job not working
- pg_cron might not be enabled on free Supabase projects
- You can manually run the allowance function:
  ```sql
  SELECT add_weekly_allowance();
  ```

## Local Development (Optional)

To test locally with the Netlify CLI:

1. Install the Netlify CLI: `npm install -g netlify-cli`
2. Create a `.env` file with your credentials:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run `netlify dev` in the project folder
4. Open `http://localhost:8888`

