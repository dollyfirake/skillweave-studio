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

// Calculate relevance score based on keyword matching with null checks
const calculateRelevanceScore = (title: string | undefined | null, description: string | undefined | null, topic: string): number => {
  // Handle null/undefined inputs
  const safeTitle = (title || '').toLowerCase().trim();
  const safeDesc = (description || '').toLowerCase().trim();
  const safeTopic = (topic || '').toLowerCase().trim();
  
  if (!safeTopic) return 0;
  
  const topicWords = safeTopic.split(' ').filter(word => word.length > 0);
  if (topicWords.length === 0) return 0;
  
  let titleMatches = 0;
  let descMatches = 0;
  
  topicWords.forEach(word => {
    if (word && safeTitle.includes(word)) titleMatches++;
    if (word && safeDesc.includes(word)) descMatches++;
  });
  
  const titleScore = titleMatches / topicWords.length;
  const descScore = descMatches / topicWords.length;
  
  // Calculate final score (80% title match, 20% description match)
  let score = (titleScore * 0.8 + descScore * 0.2) * 100;
  
  // Ensure score is between 0 and 100
  return Math.max(0, Math.min(100, score));
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

// Calculate comprehensive quality score with enhanced error handling
const calculateQualityScore = (video: VideoWithStats, searchTopic: string): number => {
  try {
    // Safely get statistics with default values
    const stats = video.statistics || {};
    const views = parseInt(stats.viewCount || '0') || 0;
    const likes = parseInt(stats.likeCount || '0') || 0;
    const comments = parseInt(stats.commentCount || '0') || 0;
    
    // Engagement Score (0-40 points)
    let engagementScore = 0;
    if (views > 100) { // Only calculate if we have reasonable view count
      const likeRatio = Math.min(100, (likes / views) * 100);
      const engagementRate = Math.min(100, ((likes + comments) / views) * 100);
      engagementScore = Math.min(40, (likeRatio * 0.2) + (engagementRate * 0.2));
    }
    
    // Get video details with fallbacks
    const snippet = video.snippet || {};
    const title = snippet.title || '';
    const description = snippet.description || '';
    const publishedAt = snippet.publishedAt || new Date().toISOString();
    const channelTitle = snippet.channelTitle || '';
    const duration = video.contentDetails?.duration || 'PT0M0S';
    
    // Calculate individual scores with error handling
    const relevanceScore = calculateRelevanceScore(title, description, searchTopic) * 0.3;
    const durationScore = calculateDurationScore(duration) * 0.1;
    const freshnessScore = calculateFreshnessScore(publishedAt) * 0.1;
    const authorityScore = calculateChannelAuthority(channelTitle) * 0.1;
    
    // Calculate final score with fallback for videos with missing engagement data
    let finalScore;
    if (views === 0 && likes === 0 && comments === 0) {
      // Base score for videos with missing engagement data
      finalScore = (relevanceScore + durationScore + freshnessScore + authorityScore) * 0.8;
    } else {
      finalScore = engagementScore + relevanceScore + durationScore + freshnessScore + authorityScore;
    }
    
    // Ensure score is within valid range
    return Math.max(0, Math.min(100, finalScore));
    
  } catch (error) {
    console.error('Error in calculateQualityScore:', error);
    console.error('Video data:', {
      id: video.id,
      title: video.snippet?.title,
      channel: video.snippet?.channelTitle,
      stats: video.statistics
    });
    return 0; // Return minimum score for videos with errors
  }
};

// Remove duplicate videos and ensure channel diversity
const removeDuplicates = (videos: (VideoWithStats & { qualityScore: number })[]) => {
  if (!Array.isArray(videos)) {
    console.error('Invalid videos input:', videos);
    return [];
  }

  const seen = new Set<string>();
  const channelCount = new Map<string, number>();
  const result: (VideoWithStats & { qualityScore: number })[] = [];
  
  // Filter out invalid videos first
  const validVideos = videos.filter(video => {
    if (!video || typeof video !== 'object') {
      console.error('Invalid video object:', video);
      return false;
    }
    const snippet = video.snippet || {};
    const hasRequiredFields = 
      snippet.title && 
      snippet.channelTitle && 
      typeof video.qualityScore === 'number';
    
    if (!hasRequiredFields) {
      console.error('Video missing required fields:', {
        id: video.id,
        hasTitle: !!snippet.title,
        hasChannel: !!snippet.channelTitle,
        hasScore: typeof video.qualityScore === 'number'
      });
      return false;
    }
    return true;
  });
  
  console.log(`Processing ${validVideos.length} valid videos out of ${videos.length}`);
  
  // Sort by quality score (highest first)
  const sortedVideos = [...validVideos].sort((a, b) => b.qualityScore - a.qualityScore);
  
  for (const video of sortedVideos) {
    try {
      const snippet = video.snippet || {};
      const title = snippet.title?.trim() || '';
      const channelTitle = snippet.channelTitle?.trim() || 'unknown';
      
      if (!title) {
        console.error('Video has empty title:', { id: video.id, channelTitle });
        continue;
      }
      
      // Check for exact duplicates
      const videoKey = `${title}-${channelTitle}`.toLowerCase();
      if (seen.has(videoKey)) {
        console.log(`Skipping duplicate video: ${title} by ${channelTitle}`);
        continue;
      }
      
      // Limit videos per channel (max 2)
      const channelVideos = channelCount.get(channelTitle) || 0;
      if (channelVideos >= 2) {
        console.log(`Skipping video from channel with too many videos: ${channelTitle}`);
        continue;
      }
      
      // Check for very similar titles (85% similarity threshold)
      const hasSimilar = result.some(existing => {
        const existingTitle = existing.snippet?.title?.trim() || '';
        return existingTitle && calculateStringSimilarity(title, existingTitle) > 0.85;
      });
      
      if (hasSimilar) {
        console.log(`Skipping similar video: ${title}`);
        continue;
      }
      
      seen.add(videoKey);
      channelCount.set(channelTitle, channelVideos + 1);
      result.push(video);
      
      console.log(`Added video: ${title} by ${channelTitle} (score: ${video.qualityScore.toFixed(1)})`);
    } catch (error) {
      console.error('Error processing video in removeDuplicates:', error, {
        videoId: video?.id,
        error: error.message
      });
    }
  }
  
  console.log(`Filtered ${videos.length} videos down to ${result.length} unique videos`);
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
      try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(searchQuery)}&maxResults=15&key=${apiKey}&order=relevance&videoDuration=medium`;
        
        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
          console.error(`Search API error for "${searchQuery}":`, await searchResponse.text());
          continue;
        }

        const searchData = await searchResponse.json();
        
        if (searchData.items?.length > 0) {
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

    const scoredVideos = validVideos.map(video => {
      try {
        return {
          ...video,
          qualityScore: calculateQualityScore(video, query)
        };
      } catch (error) {
        console.error(`Error calculating score for video ${video.id}:`, error);
        return null;
      }
    }).filter((video): video is VideoWithStats & { qualityScore: number } => video !== null);

    // Remove duplicates and ensure diversity
    const uniqueVideos = removeDuplicates(scoredVideos);

    // Select top 20% (Pareto principle)
    const topVideosCount = Math.max(maxResults, Math.ceil(uniqueVideos.length * 0.2));
    const selectedVideos = uniqueVideos.slice(0, topVideosCount);

    console.log(`Selected ${selectedVideos.length} high-quality videos`);

    // Transform to expected format with comprehensive error handling
    console.log(`Processing ${selectedVideos.length} selected videos`);
    
    const videos = selectedVideos.map((video, index) => {
      console.log(`Processing video ${index + 1}/${selectedVideos.length}`);
      console.log('Video object structure:', JSON.stringify({
        id: video?.id,
        hasSnippet: !!video?.snippet,
        hasTitle: !!video?.snippet?.title,
        snippetKeys: video?.snippet ? Object.keys(video.snippet) : 'no snippet',
        statistics: video?.statistics ? 'exists' : 'missing',
        contentDetails: video?.contentDetails ? 'exists' : 'missing'
      }, null, 2));
      
      if (!video?.snippet?.title) {
        console.error('Video missing required title:', {
          videoId: video?.id,
          snippet: video?.snippet,
          hasTitle: !!video?.snippet?.title,
          snippetKeys: video?.snippet ? Object.keys(video.snippet) : 'no snippet'
        });
      }
      try {
        // Safely extract video properties with fallbacks
        const snippet = video.snippet || {};
        const stats = video.statistics || {};
        const contentDetails = video.contentDetails || {};
        const thumbnails = snippet.thumbnails || {};
        
        // Get thumbnail URL with fallback chain
        const thumbnailUrl = thumbnails.medium?.url || 
                           thumbnails.high?.url || 
                           thumbnails.default?.url ||
                           'https://via.placeholder.com/320x180';
        
        // Format the video data with all required fields
        return {
          id: video.id || '',
          title: snippet.title || 'Untitled Video',
          creator: snippet.channelTitle || 'Unknown Creator',
          publishedAt: snippet.publishedAt || new Date().toISOString(),
          description: snippet.description || '',
          thumbnail: thumbnailUrl,
          qualityScore: video.qualityScore || 0,
          viewCount: stats.viewCount || '0',
          likeCount: stats.likeCount || '0',
          duration: contentDetails.duration || 'PT0M0S'
        };
      } catch (error) {
        console.error('Error processing video:', error);
        console.error('Problematic video data:', {
          id: video?.id,
          title: video?.snippet?.title,
          error: error.message
        });
        return null;
      }
    }).filter(video => video !== null); // Remove any null entries from failed processing

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