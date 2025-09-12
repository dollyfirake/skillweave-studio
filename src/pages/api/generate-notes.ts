import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nwrkxjbjxtctydwxxukj.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { video_id, video_title, video_description } = req.body;

    if (!video_id) {
      return res.status(400).json({ message: 'Video ID is required' });
    }

    // Call the Supabase Edge Function
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      },
      body: JSON.stringify({
        video_id,
        video_title,
        video_description
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Error from Supabase Function:', error);
      return res.status(response.status).json({ message: 'Error from Supabase Function', error });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in generate-notes API route:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
}
