import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Analyze topic complexity to determine module structure
const analyzeTopicComplexity = (topic: string): 'simple' | 'medium' | 'complex' => {
  const complexTopics = [
    'machine learning', 'artificial intelligence', 'blockchain', 'quantum computing',
    'cybersecurity', 'data science', 'deep learning', 'neural networks',
    'cryptocurrency', 'advanced programming', 'system design', 'devops'
  ];
  
  const simpleTopics = [
    'excel', 'powerpoint', 'email', 'social media', 'basic photography',
    'cooking', 'fitness', 'meditation', 'time management', 'productivity'
  ];
  
  const topicLower = topic.toLowerCase();
  
  if (complexTopics.some(complex => topicLower.includes(complex))) {
    return 'complex';
  }
  
  if (simpleTopics.some(simple => topicLower.includes(simple))) {
    return 'simple';
  }
  
  return 'medium';
};

// Generate adaptive module structure based on topic complexity
const generateModuleStructure = (topic: string, videoCount: number) => {
  const complexity = analyzeTopicComplexity(topic);
  
  if (complexity === 'simple' || videoCount <= 8) {
    return [
      { title: 'Getting Started', description: 'Essential basics and fundamentals', order_index: 0 },
      { title: 'Practical Application', description: 'Putting knowledge into practice', order_index: 1 }
    ];
  } else if (complexity === 'complex' && videoCount >= 16) {
    return [
      { title: 'Foundation', description: 'Prerequisites and basic concepts', order_index: 0 },
      { title: 'Core Principles', description: 'Main theories and methodologies', order_index: 1 },
      { title: 'Advanced Techniques', description: 'Sophisticated applications and methods', order_index: 2 },
      { title: 'Real-World Implementation', description: 'Case studies and practical projects', order_index: 3 }
    ];
  }
  
  // Default medium complexity structure
  return [
    { title: 'Fundamentals', description: 'Core concepts and basics', order_index: 0 },
    { title: 'Intermediate Concepts', description: 'Building on the fundamentals', order_index: 1 },
    { title: 'Advanced Applications', description: 'Real-world applications and mastery', order_index: 2 }
  ];
};

// Categorize videos by learning level using keyword analysis
const categorizeVideosByLevel = (videos: any[]) => {
  const categorized = {
    beginner: [] as any[],
    intermediate: [] as any[],
    advanced: [] as any[],
    practical: [] as any[]
  };
  
  videos.forEach(video => {
    const title = video.title.toLowerCase();
    const description = video.description?.toLowerCase() || '';
    const content = title + ' ' + description;
    
    // Beginner indicators
    const beginnerKeywords = [
      'beginner', 'basic', 'intro', 'introduction', 'start', 'getting started',
      'fundamentals', 'basics', 'learn', 'tutorial', 'explained', 'simple'
    ];
    
    // Advanced indicators
    const advancedKeywords = [
      'advanced', 'expert', 'master', 'professional', 'deep dive', 'complex',
      'sophisticated', 'enterprise', 'production', 'optimization', 'architecture'
    ];
    
    // Practical indicators
    const practicalKeywords = [
      'project', 'build', 'create', 'example', 'case study', 'real world',
      'hands on', 'practice', 'implementation', 'demo', 'walkthrough'
    ];
    
    const hasBeginnerTerms = beginnerKeywords.some(keyword => content.includes(keyword));
    const hasAdvancedTerms = advancedKeywords.some(keyword => content.includes(keyword));
    const hasPracticalTerms = practicalKeywords.some(keyword => content.includes(keyword));
    
    // Categorize based on strongest indicators
    if (hasPracticalTerms && !hasBeginnerTerms) {
      categorized.practical.push(video);
    } else if (hasAdvancedTerms) {
      categorized.advanced.push(video);
    } else if (hasBeginnerTerms) {
      categorized.beginner.push(video);
    } else {
      categorized.intermediate.push(video);
    }
  });
  
  return categorized;
};

// Distribute videos intelligently across modules
const distributeVideosIntelligently = (videos: any[], modules: any[]) => {
  const categorized = categorizeVideosByLevel(videos);
  const distribution = [];
  
  if (modules.length === 2) {
    // Simple structure: Basics + Application
    distribution.push({
      ...modules[0],
      videos: [...categorized.beginner, ...categorized.intermediate.slice(0, 2)]
    });
    distribution.push({
      ...modules[1],
      videos: [...categorized.practical, ...categorized.advanced]
    });
  } else if (modules.length === 4) {
    // Complex structure: Foundation + Core + Advanced + Implementation
    distribution.push({
      ...modules[0],
      videos: categorized.beginner.slice(0, 4)
    });
    distribution.push({
      ...modules[1],
      videos: categorized.intermediate.slice(0, 4)
    });
    distribution.push({
      ...modules[2],
      videos: categorized.advanced.slice(0, 4)
    });
    distribution.push({
      ...modules[3],
      videos: categorized.practical.slice(0, 4)
    });
  } else {
    // Default 3-module structure
    const videosPerModule = Math.ceil(videos.length / 3);
    
    distribution.push({
      ...modules[0],
      videos: [...categorized.beginner, ...categorized.intermediate].slice(0, videosPerModule)
    });
    distribution.push({
      ...modules[1],
      videos: categorized.intermediate.slice(videosPerModule / 2).concat(
        categorized.advanced.slice(0, videosPerModule / 2)
      ).slice(0, videosPerModule)
    });
    distribution.push({
      ...modules[2],
      videos: [...categorized.advanced, ...categorized.practical].slice(0, videosPerModule)
    });
  }
  
  // Fill empty modules with remaining videos if needed
  const allAssignedVideos = distribution.flatMap(module => module.videos);
  const unassignedVideos = videos.filter(video => 
    !allAssignedVideos.some(assigned => assigned.id === video.id)
  );
  
  // Distribute unassigned videos to modules with fewer videos
  unassignedVideos.forEach(video => {
    const moduleWithFewestVideos = distribution.reduce((min, module) => 
      module.videos.length < min.videos.length ? module : min
    );
    moduleWithFewestVideos.videos.push(video);
  });
  
  return distribution;
};

// Helper function to parse YouTube duration to seconds
const parseDurationToSeconds = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, videos } = await req.json();
    console.log('Creating course for topic:', topic);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Set the auth token
    supabase.auth.getSession = async () => {
      return { 
        data: { 
          session: { 
            access_token: authHeader.replace('Bearer ', ''),
            user: null 
          } 
        }, 
        error: null 
      };
    };

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Create course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        topic_name: topic,
        description: `Learn ${topic} through curated YouTube videos`,
        created_by: user.id
      })
      .select()
      .single();

    if (courseError) {
      throw new Error(`Failed to create course: ${courseError.message}`);
    }

    console.log('Course created:', course);

    // Generate adaptive module structure based on topic complexity and video count
    const moduleStructure = generateModuleStructure(topic, videos.length);
    
    const { data: createdModules, error: modulesError } = await supabase
      .from('modules')
      .insert(
        moduleStructure.map(module => ({
          ...module,
          course_id: course.id
        }))
      )
      .select();

    if (modulesError) {
      throw new Error(`Failed to create modules: ${modulesError.message}`);
    }

    console.log('Modules created:', createdModules);

    // Distribute videos intelligently across modules
    const moduleDistribution = distributeVideosIntelligently(videos, moduleStructure);
    const videoInserts = [];

    moduleDistribution.forEach((moduleData, moduleIndex) => {
      const targetModule = createdModules[moduleIndex];
      
      moduleData.videos.forEach((video: any, videoIndex: number) => {
        videoInserts.push({
          module_id: targetModule.id,
          youtube_video_id: video.id,
          title: video.title,
          creator_name: video.creator,
          order_index: videoIndex,
          duration: video.duration ? parseDurationToSeconds(video.duration) : null
        });
      });
    });

    const { data: createdVideos, error: videosError } = await supabase
      .from('videos')
      .insert(videoInserts)
      .select();

    if (videosError) {
      throw new Error(`Failed to create videos: ${videosError.message}`);
    }

    console.log('Videos created:', createdVideos);

    return new Response(JSON.stringify({ 
      course,
      modules: createdModules,
      videos: createdVideos
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-course function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});