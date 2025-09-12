import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
};

// Helper to create consistent error responses
function createErrorResponse(message: string, status: number, details?: any) {
  return new Response(
    JSON.stringify({ 
      error: message,
      ...(details && { details })
    }),
    { 
      status,
      headers: { ...corsHeaders }
    }
  );
}

// Try multiple methods to get video content
async function getVideoContent(videoId: string, title: string, description: string) {
  const methods = [
    fetchYouTubeCaptions,
    fetchVideoDescription,
    () => Promise.resolve(`Video: ${title}\n\n${description}`)
  ];

  for (const method of methods) {
    try {
      const content = await method(videoId, title);
      if (content) return content;
    } catch (error) {
      console.warn(`Method ${method.name} failed:`, error.message);
    }
  }
  
  throw new Error('Could not retrieve video content');
}

// Fetch YouTube captions using YouTube Data API
async function fetchYouTubeCaptions(videoId: string): Promise<string | null> {
  const apiKey = Deno.env.get('YOUTUBE_API_KEY');
  if (!apiKey) throw new Error('YouTube API key not configured');

  const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
  const captionsResponse = await fetch(captionsUrl);
  
  if (!captionsResponse.ok) {
    throw new Error('Failed to fetch captions');
  }
  
  const captionsData = await captionsResponse.json();
  if (!captionsData.items?.length) return null;
  
  // For now, we'll return the first caption track's ID
  // Note: Downloading actual caption content requires additional permissions
  return `Captions available but not downloaded (${captionsData.items[0].snippet.language})`;
}

// Fallback: Use video description and title
async function fetchVideoDescription(videoId: string, title: string): Promise<string | null> {
  const apiKey = Deno.env.get('YOUTUBE_API_KEY');
  if (!apiKey) throw new Error('YouTube API key not configured');

  const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
  const response = await fetch(videoUrl);
  
  if (!response.ok) {
    throw new Error('Failed to fetch video details');
  }
  
  const data = await response.json();
  const snippet = data?.items?.[0]?.snippet;
  
  if (!snippet) return null;
  
  return `Title: ${snippet.title || title}

${snippet.description || 'No description available'}`;
}

// Generate notes using Hugging Face
async function generateNotes(content: string, title: string): Promise<string> {
  const apiKey = Deno.env.get('HUGGINGFACE_API_KEY');
  if (!apiKey) throw new Error('Hugging Face API key not configured');

  const prompt = `Create comprehensive study notes from the following video content. 
Focus on key concepts, important details, and actionable insights.

Video Title: ${title}

Content:
${content}

Notes:`;

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_length: 1000,
            min_length: 200,
            num_return_sequences: 1,
            temperature: 0.7,
            top_k: 50,
            top_p: 0.95,
            repetition_penalty: 1.2,
            no_repeat_ngram_size: 3,
            do_sample: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Hugging Face API error:', error);
      throw new Error('Failed to generate notes');
    }

    const result = await response.json();
    return result[0]?.generated_text || 'No notes could be generated';
  } catch (error) {
    console.error('Error generating notes:', error);
    // Fallback to a simple summary if AI generation fails
    return `## Summary of "${title}"\n\n` +
      'Here are the key points from the video:\n\n' +
      content.split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 10)
        .map((line, i) => `${i + 1}. ${line}`)
        .join('\n');
  }
}

// Main request handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { video_id, video_title, video_description } = await req.json();
    
    if (!video_id || !video_title) {
      return createErrorResponse('Missing required parameters', 400);
    }
    
    // Log the incoming request for debugging
    console.log('Generating notes for video:', {
      video_id,
      video_title,
      has_description: !!video_description
    });

    const videoId = video_id;
    const title = video_title || 'Untitled Video';
    const description = video_description || '';

    if (!videoId) {
      return createErrorResponse('Missing video_id parameter', 400);
    }
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Authorization header required', 401);
    }

    console.log('Initializing Supabase client...');
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration error - Missing URL or Key');
      return createErrorResponse('Server configuration error', 500);
    }
    
    console.log('Creating Supabase client...');
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    console.log('Verifying user...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError) {
      console.error('User verification error:', userError);
      return createErrorResponse('Unauthorized', 401);
    }
    
    if (!user) {
      console.error('No user found in session');
      return createErrorResponse('Unauthorized - No user found', 401);
    }
    
    console.log('User verified:', user.id);

    // Check for existing notes
    const { data: existingNote, error: fetchError } = await supabaseClient
      .from('notes')
      .select('content')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .single();

    if (existingNote && !fetchError) {
      return new Response(
        JSON.stringify({ 
          notes: existingNote.content, 
          fromCache: true 
        }),
        { headers: corsHeaders }
      );
    }

    // Get video content and generate notes
    const videoContent = await getVideoContent(videoId, title, description);
    const notesContent = await generateNotes(videoContent, title);
    const notesData = { 
      text: notesContent, 
      generated_at: new Date().toISOString(),
      video_title: title
    };

    // Save to database
    const { data: savedNote, error: saveError } = await supabaseClient
      .from('notes')
      .upsert({
        user_id: user.id,
        video_id: videoId,
        content: notesData,
        updated_at: new Date().toISOString(),
      })
      .select('content')
      .single();

    if (saveError) {
      console.error('Database save error:', saveError);
      // Still return the notes even if save fails
      return new Response(
        JSON.stringify({ 
          notes: notesData,
          warning: 'Notes generated but not saved',
          error: saveError.message 
        }),
        { headers: corsHeaders }
      );
    }

    // Return the generated notes
    return new Response(
      JSON.stringify({ 
        notes: savedNote.content, 
        fromCache: false 
      }),
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Server error:', error);
    return createErrorResponse(
      'Failed to generate notes', 
      500,
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }
});
