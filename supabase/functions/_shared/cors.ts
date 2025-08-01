// Reusable CORS headers for Edge Functions invoked from the browser
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or restrict to your frontend domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};
