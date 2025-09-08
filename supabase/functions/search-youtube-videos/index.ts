import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YouTubeVideo {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, maxResults = 10 } = await req.json();
    console.log('Searching YouTube for:', query);

    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!youtubeApiKey) {
      throw new Error('YouTube API key not found');
    }

    // Search YouTube videos
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${youtubeApiKey}&order=relevance&videoDuration=medium`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('YouTube API response:', data);

    // Transform the response to our format
    const videos = data.items?.map((item: YouTubeVideo) => ({
      id: item.id?.videoId,
      title: item.snippet?.title,
      creator: item.snippet?.channelTitle,
      publishedAt: item.snippet?.publishedAt,
      description: item.snippet?.description,
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
    })) || [];

    return new Response(JSON.stringify({ videos }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in search-youtube-videos function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      videos: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});