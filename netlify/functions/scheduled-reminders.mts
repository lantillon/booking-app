import type { Config, Context } from '@netlify/functions';

// This function runs every 30 minutes to check for reminders
export default async (req: Request, context: Context) => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://classy-salamander-a85b81.netlify.app';
  const cronSecret = process.env.CRON_SECRET || 'default-secret-change-me';

  console.log(`[${new Date().toISOString()}] Running scheduled reminders check...`);

  try {
    const response = await fetch(`${siteUrl}/api/reminders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`,
      },
    });

    const result = await response.json();
    console.log('Reminders result:', JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error running scheduled reminders:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Run every 30 minutes
export const config: Config = {
  schedule: '*/30 * * * *',
};
