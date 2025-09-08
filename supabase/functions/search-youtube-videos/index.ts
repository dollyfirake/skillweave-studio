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
const generateSearchQueries = (topic: string): string[] => {
  return [
    `${topic} tutorial complete guide`,
    `${topic} explained simply beginner`,
    `${topic} step by step guide`,
    `${topic} best practices tips`,
    `${topic} real world example practical`
  ];
};

// Calculate string similarity using simple algorithm
const calculateStringSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - editDistance) / longer.length;
};

// Simple Levenshtein distance implementation
const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Calculate relevance score based on keyword matching
const calculateRelevanceScore = (title: string, description: string, topic: string): number => {
  const topicWords = topic.toLowerCase().split(' ');
  const titleLower = title.toLowerCase();
  const descLower = description.toLowerCase();
  
  let titleMatches = 0;
  let descMatches = 0;
  
  topicWords.forEach(word => {
    if (titleLower.includes(word)) titleMatches++;
    if (descLower.includes(word)) descMatches++;
  });
  
  const titleScore = titleMatches / topicWords.length;
  const descScore = descMatches / topicWords.length;
  
  return (titleScore * 0.8 + descScore * 0.2) * 100;
};

// Parse YouTube duration format (PT4M13S) to seconds
const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
};

// Calculate optimal duration score (prefer 5-20 minute videos)
const calculateDurationScore = (duration: string): number => {
  const seconds = parseDuration(duration);
  const minutes = seconds / 60;
  
  if (minutes >= 5 && minutes <= 20) return 100;
  if (minutes >= 3 && minutes <= 30) return 80;
  if (minutes >= 1 && minutes <= 45) return 60;
  return 30;
};

// Calculate freshness score (prefer recent but not too recent)
const calculateFreshnessScore = (publishedAt: string): number => {
  const publishDate = new Date(publishedAt);
  const now = new Date();
  const daysDiff = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysDiff <= 30) return 70; // Very recent might be trending but unproven
  if (daysDiff <= 365) return 100; // Sweet spot - recent and proven
  if (daysDiff <= 1095) return 80; // Still relevant
  return 50; // Older content
};

// Calculate channel authority based on naming patterns
const calculateChannelAuthority = (channelTitle: string): number => {
  const authorityIndicators = [
    'university', 'academy', 'institute', 'school', 'education',
    'official', 'verified', 'expert', 'pro', 'master'
  ];
  
  const channelLower = channelTitle.toLowerCase();
  const hasAuthority = authorityIndicators.some(indicator => 
    channelLower.includes(indicator)
  );
  
  return hasAuthority ? 100 : 50;
};

// Calculate comprehensive quality score
const calculateQualityScore = (video: VideoWithStats, searchTopic: string): number => {
  const views = parseInt(video.statistics.viewCount) || 0;
  const likes = parseInt(video.statistics.likeCount) || 0;
  const comments = parseInt(video.statistics.commentCount) || 0;
  
  // Engagement Score (0-40 points)
  const likeRatio = views > 0 ? (likes / views) * 100 : 0;
  const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0;
  const engagementScore = Math.min(40, (likeRatio * 200) + (engagementRate * 1000));
  
  // Relevance Score (0-30 points)
  const relevanceScore = calculateRelevanceScore(
    video.snippet.title, 
    video.snippet.description, 
    searchTopic
  ) * 0.3;
  
  // Content Quality (0-20 points)
  const durationScore = calculateDurationScore(video.contentDetails.duration) * 0.1;
  const freshnessScore = calculateFreshnessScore(video.snippet.publishedAt) * 0.1;
  
  // Channel Authority (0-10 points)
  const authorityScore = calculateChannelAuthority(video.snippet.channelTitle) * 0.1;
  
  return engagementScore + relevanceScore + durationScore + freshnessScore + authorityScore;
};

// Remove duplicate videos and ensure channel diversity
const removeDuplicates = (videos: VideoWithStats[]): VideoWithStats[] => {
  const seen = new Set<string>();
  const channelCount = new Map<string, number>();
  const result: VideoWithStats[] = [];
  
  // Sort by quality score first
  const sortedVideos = videos.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  
  for (const video of sortedVideos) {
    // Check for exact duplicates
    const videoKey = `${video.snippet.title}-${video.snippet.channelTitle}`;
    if (seen.has(videoKey)) continue;
    
    // Limit videos per channel (max 2)
    const channelVideos = channelCount.get(video.snippet.channelTitle) || 0;
    if (channelVideos >= 2) continue;
    
    // Check for very similar titles
    const hasSimilar = result.some(existing => 
      calculateStringSimilarity(video.snippet.title, existing.snippet.title) > 0.85
    );
    if (hasSimilar) continue;
    
    seen.add(videoKey);
    channelCount.set(video.snippet.channelTitle, channelVideos + 1);
    result.push(video);
  }
  
  return result;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, maxResults = 12 } = await req.json();
    console.log('Searching YouTube for:', query);

    const apiKey = (globalThis as any).Deno?.env?.get('YOUTUBE_API_KEY');
    if (!apiKey) {
      throw new Error('YouTube API key not found');
    }

    // Generate multiple search queries
    const searchQueries = generateSearchQueries(query);
    const allVideos: VideoWithStats[] = [];

    // Search with multiple queries
    for (const searchQuery of searchQueries) {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(searchQuery)}&maxResults=15&key=${apiKey}&order=relevance&videoDuration=medium`;
      
      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) {
        console.error(`Search API error for "${searchQuery}":`, searchResponse.status);
        continue;
      }

      const searchData = await searchResponse.json();
      
      if (searchData.items && searchData.items.length > 0) {
        // Get detailed statistics for videos
        const videoIds = searchData.items.map((item: YouTubeVideo) => item.id.videoId).join(',');
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${videoIds}&key=${apiKey}`;
        
        const statsResponse = await fetch(detailsUrl);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          allVideos.push(...(statsData.items || []));
        }
      }
    }

    console.log(`Found ${allVideos.length} total videos`);

    // Calculate quality scores
    const scoredVideos = allVideos.map(video => ({
      ...video,
      qualityScore: calculateQualityScore(video, query)
    }));

    // Remove duplicates and ensure diversity
    const uniqueVideos = removeDuplicates(scoredVideos);

    // Select top 20% (Pareto principle)
    const topVideosCount = Math.max(maxResults, Math.ceil(uniqueVideos.length * 0.2));
    const selectedVideos = uniqueVideos.slice(0, topVideosCount);

    console.log(`Selected ${selectedVideos.length} high-quality videos`);

    // Transform to expected format
    const videos = selectedVideos.map((video) => ({
      id: video.id,
      title: video.snippet.title,
      creator: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
      qualityScore: video.qualityScore,
      viewCount: video.statistics.viewCount,
      likeCount: video.statistics.likeCount,
      duration: video.contentDetails.duration
    }));

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