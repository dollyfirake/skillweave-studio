// @deno-types="https://deno.land/x/types/deno.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

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

interface VideoWithStats {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    description: string;
    thumbnails: any;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  contentDetails: {
    duration: string;
  };
  qualityScore?: number;
}

// Generate multiple search queries for comprehensive coverage
function generateSearchQueries(topic: string): string[] {
  return [
    `learn ${topic} tutorial`,
    `best way to learn ${topic}`,
    `${topic} crash course`,
    `master ${topic} step by step`,
    `${topic} for beginners`
  ];
}

// Calculate string similarity using simple algorithm
function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Simple Levenshtein distance implementation
function levenshteinDistance(str1: string, str2: string): number {
  const track = Array(str2.length + 1).fill(null).map(() => 
    Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;
  
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  return track[str2.length][str1.length];
}

// Calculate relevance score based on keyword matching with null checks
function calculateRelevanceScore(title: string | undefined | null, description: string | undefined | null, topic: string): number {
  if (!title) return 0;
  
  const titleLower = title.toLowerCase();
  const descLower = (description || '').toLowerCase();
  const topicLower = topic.toLowerCase();
  
  // Check for exact match in title
  if (titleLower.includes(topicLower)) return 1.0;
  
  // Check for partial matches
  const titleWords = titleLower.split(/\s+/);
  const topicWords = topicLower.split(/\s+/);
  const matchingWords = topicWords.filter(word => 
    titleWords.some(tw => tw.includes(word) || word.includes(tw))
  );
  
  const wordMatchScore = matchingWords.length / Math.max(1, topicWords.length);
  
  // Check description for additional context
  const descScore = descLower.includes(topicLower) ? 0.3 : 0;
  
  return Math.min(1.0, wordMatchScore * 0.7 + descScore);
}

// Parse YouTube duration format (PT4M13S) to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  
  const hours = (parseInt(match[1]) || 0);
  const minutes = (parseInt(match[2]) || 0);
  const seconds = (parseInt(match[3]) || 0);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Calculate optimal duration score (prefer 5-20 minute videos)
function calculateDurationScore(duration: string): number {
  const seconds = parseDuration(duration);
  if (seconds === 0) return 0.5; // Unknown duration
  
  // Ideal range is 5-20 minutes (300-1200 seconds)
  if (seconds >= 300 && seconds <= 1200) return 1.0;
  
  // Outside ideal range, score decreases
  return Math.max(0.1, 1 - Math.abs(Math.log10(seconds/600)) / 5);
}

// Calculate freshness score (prefer recent but not too recent)
function calculateFreshnessScore(publishedAt: string): number {
  const publishedDate = new Date(publishedAt);
  const now = new Date();
  const ageInDays = (now.getTime() - publishedDate.getTime()) / (1000 * 3600 * 24);
  
  // Best age is between 30 days and 1 year
  if (ageInDays >= 30 && ageInDays <= 365) return 1.0;
  
  // Score decreases for very new or very old videos
  return Math.exp(-Math.pow(Math.max(0, Math.log(ageInDays/30)), 2) / 2);
}

// Calculate channel authority based on naming patterns
function calculateChannelAuthority(channelTitle: string): number {
  if (!channelTitle) return 0.5;
  
  const lowerTitle = channelTitle.toLowerCase();
  
  // Positive indicators
  if (lowerTitle.includes('official')) return 0.9;
  if (lowerTitle.includes('academy') || lowerTitle.includes('university')) return 0.85;
  
  // Negative indicators
  if (lowerTitle.includes('kids') || lowerTitle.includes('baby')) return 0.3;
  
  // Default score based on title length (longer titles might be more specific)
  return 0.5 + (channelTitle.length > 20 ? 0.2 : 0);
}

// Calculate comprehensive quality score with enhanced error handling
function calculateQualityScore(video: VideoWithStats, searchTopic: string): number {
  try {
    if (!video || !video.snippet || !video.statistics) return 0;
    
    const { snippet, statistics, contentDetails } = video;
    const { title, channelTitle, publishedAt, description } = snippet;
    const { viewCount, likeCount, commentCount } = statistics;
    
    // Calculate individual scores (0-1 range)
    const relevanceScore = calculateRelevanceScore(title, description, searchTopic);
    const durationScore = contentDetails ? calculateDurationScore(contentDetails.duration) : 0.5;
    const freshnessScore = calculateFreshnessScore(publishedAt);
    const channelScore = calculateChannelAuthority(channelTitle);
    
    // Calculate engagement metrics
    const views = parseInt(viewCount || '0');
    const likes = parseInt(likeCount || '0');
    const comments = parseInt(commentCount || '0');
    
    const engagementScore = views > 0 
      ? (likes / views) * 10 + (comments / views) * 50 
      : 0;
    const normalizedEngagement = Math.min(1, engagementScore * 10);
    
    // Weighted average of all scores
    const finalScore = (
      relevanceScore * 0.4 +
      durationScore * 0.2 +
      freshnessScore * 0.15 +
      channelScore * 0.15 +
      normalizedEngagement * 0.1
    );
    
    return Math.min(1, Math.max(0, finalScore)); // Ensure score is between 0 and 1
  } catch (error) {
    console.error('Error calculating quality score:', error);
    return 0.5; // Default score if calculation fails
  }
}

// Remove duplicate videos and ensure channel diversity
function removeDuplicates(videos: (VideoWithStats & { qualityScore: number })[]) {
  const seen = new Set<string>();
  const channelCount = new Map<string, number>();
  const maxVideosPerChannel = 2;
  
  return videos
    .filter(video => {
      // Skip if we've seen this video ID before
      if (seen.has(video.id)) return false;
      
      // Skip if we already have enough videos from this channel
      const channel = video.snippet.channelTitle;
      const count = channelCount.get(channel) || 0;
      if (count >= maxVideosPerChannel) return false;
      
      // Add to seen and update channel count
      seen.add(video.id);
      channelCount.set(channel, count + 1);
      
      return true;
    })
    .sort((a, b) => b.qualityScore - a.qualityScore);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: { 
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400' // 24 hours
      } 
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED'
    }), { 
      status: 405,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Allow': 'POST, OPTIONS'
      } 
    });
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON'
      }), { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      });
    }

    const { query, maxResults = 12 } = requestBody;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Query parameter is required and must be a non-empty string',
        code: 'INVALID_QUERY'
      }), { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      });
    }

    console.log('Searching YouTube for:', query);

    const apiKey = Deno.env.get('YOUTUBE_API_KEY');
    if (!apiKey) {
      console.error('YouTube API key not found in environment variables');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error. Please contact support.',
        code: 'CONFIGURATION_ERROR',
        requestId: crypto.randomUUID()
      }), { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Request-ID': crypto.randomUUID()
        } 
      });
    }

    // Generate multiple search queries
    const searchQueries = generateSearchQueries(query);
    const allVideos: VideoWithStats[] = [];

    // Search with multiple queries
    for (const searchQuery of searchQueries) {
      try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(searchQuery)}&maxResults=15&key=${apiKey}&order=relevance&videoDuration=medium`;
        
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error(`Search API error for "${searchQuery}":`, errorText);
          continue;
        }

        const searchData = await searchResponse.json();
        
        if (!searchData.items || !Array.isArray(searchData.items)) {
          console.warn(`Unexpected response format for query "${searchQuery}"`);
          continue;
        }
        
        if (searchData.items.length > 0) {
          // Get detailed statistics for videos
          const videoIds = searchData.items
            .filter((item: YouTubeVideo) => item.id?.videoId)
            .map((item: YouTubeVideo) => item.id.videoId);
          
          if (videoIds.length === 0) continue;
          
          const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails,snippet&id=${videoIds.join(',')}&key=${apiKey}`;
          
          const statsResponse = await fetch(detailsUrl);
          if (!statsResponse.ok) {
            console.error('Failed to fetch video details:', await statsResponse.text());
            continue;
          }
          
          const statsData = await statsResponse.json();
          if (statsData.items?.length > 0) {
            allVideos.push(...statsData.items);
          }
        }
      } catch (error) {
        console.error(`Error processing search query "${searchQuery}":`, error);
      }
    }

    console.log(`Found ${allVideos.length} total videos`);

    // Calculate quality scores and filter out invalid videos
    const validVideos = allVideos.filter((video): video is VideoWithStats & { id: string } => {
      // Ensure video has required fields
      const isValid = video?.id && 
                     video?.snippet?.title && 
                     video?.snippet?.channelTitle;
      if (!isValid) {
        console.log('Skipping invalid video:', video?.id);
        return false;
      }
      return true;
    });

    const scoredVideos = validVideos.map(video => ({
      ...video,
      qualityScore: calculateQualityScore(video, query)
    }));

    // Remove duplicates and ensure diversity
    const uniqueVideos = removeDuplicates(scoredVideos);

    // Select top videos based on quality score
    const selectedVideos = uniqueVideos
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, maxResults);

    console.log(`Selected ${selectedVideos.length} high-quality videos`);

    // Format the response
    const formattedVideos = selectedVideos.map(video => ({
      id: video.id,
      title: video.snippet.title,
      creator: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
      viewCount: video.statistics?.viewCount || '0',
      likeCount: video.statistics?.likeCount || '0',
      duration: video.contentDetails?.duration || 'PT0M0S',
      qualityScore: video.qualityScore
    }));

    return new Response(JSON.stringify({ 
      videos: formattedVideos
    }), { 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    });

  } catch (error) {
    console.error('Error in search-youtube-videos function:', error);
    
    return new Response(JSON.stringify({ 
      error: 'An error occurred while searching for videos',
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }), { 
      status: 500, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    });
  }
});
