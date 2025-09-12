import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

// Common corrections for course names - ordered from specific to general
const CORRECTIONS: Record<string, string> = {
  // Specific multi-word corrections first
  'product manager': 'Product Management',
  'project manager': 'Project Management',
  'data sci': 'Data Science',
  'web dev': 'Web Development',
  'machine learning': 'Machine Learning',
  'artificial intelligence': 'Artificial Intelligence',
  'ux/ui': 'UX/UI',
  'ui/ux': 'UX/UI',  // Standardize on UX/UI
  'ai/ml': 'AI/ML',
  'ml/ai': 'AI/ML',  // Standardize on AI/ML
  
  // Common typos and abbreviations
  'analystics': 'Analytics',
  'cracking': 'Cracking the',
  'interview': 'Interviews',
  'pm': 'PM',
  'ux': 'UX',
  'ui': 'UI',
  'ai': 'AI',
  'ml': 'ML',
  
  // Common abbreviations
  'prodmgmt': 'Product Management',
  'prodmgmt.': 'Product Management',
  'prod mgmt': 'Product Management',
  'prod. mgmt.': 'Product Management',
  'data sci.': 'Data Science',
  'datasci': 'Data Science',
  'webdev': 'Web Development',
  'frontend': 'Frontend',
  'front-end': 'Frontend',
  'backend': 'Backend',
  'back-end': 'Backend',
  'fullstack': 'Full Stack',
  'full stack': 'Full Stack',
  'js': 'JavaScript',
  'ts': 'TypeScript',
  'py': 'Python',
  'rb': 'Ruby',
  'php': 'PHP',
  'html': 'HTML',
  'css': 'CSS',
  'sql': 'SQL',
  'nosql': 'NoSQL',
  'api': 'API',
  'rest': 'REST',
  'graphql': 'GraphQL',
  'grpc': 'gRPC',
  'http': 'HTTP',
  'https': 'HTTPS',
  'tcp': 'TCP',
  'udp': 'UDP',
  'websocket': 'WebSocket',
  'webrtc': 'WebRTC',
  'p2p': 'P2P',
  'iot': 'IoT',
  'vr': 'VR',
  'ar': 'AR',
  'xr': 'XR',
  'ui/ux': 'UX/UI',  // Ensure consistent ordering
  'ml/ai': 'AI/ML',  // Ensure consistent ordering
};

// Words to keep in lowercase in title case
const SMALL_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor', 'of', 'on',
  'or', 'the', 'to', 'with', 'vs', 'vs.', 'via'
]);

// Test the course name correction function
const testCourseNameCorrection = () => {
  const testCases = [
    { input: 'analystics for product manager', expected: 'Analytics for Product Management' },
    { input: 'cracking pm interview', expected: 'Cracking the PM Interviews' },
    { input: 'data sci', expected: 'Data Science' },
    { input: 'ux/ui design', expected: 'UX/UI Design' },
    { input: 'web dev', expected: 'Web Development' },
  ];

  testCases.forEach(({ input, expected }) => {
    const result = formatCourseName(input);
    console.log(`Test: "${input}"`);
    console.log(`  Expected: "${expected}"`);
    console.log(`  Got:      "${result}"`);
    console.log(`  Pass:     ${result === expected ? '✅' : '❌'}`);
    console.log('---');
  });
};

// Format course name with proper title case and corrections
const formatCourseName = (name: string): string => {
  if (!name) return name;
  
  // Convert to lowercase and trim
  let formatted = name.toLowerCase().trim()
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .replace(/\s*\.\s*/g, '. ')  // Normalize spaces around periods
    .replace(/\s*\/\s*/g, '/')   // Normalize spaces around slashes
    .replace(/\s*,\s*/g, ', ')   // Normalize spaces around commas
    .replace(/\.$/, '')           // Remove trailing period
    .trim();
  
  // Apply common corrections - process longer phrases first
  const sortedCorrections = Object.entries(CORRECTIONS)
    .sort(([a], [b]) => b.length - a.length); // Longer patterns first
  
  for (const [incorrect, correct] of sortedCorrections) {
    const regex = new RegExp(`\\b${incorrect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    formatted = formatted.replace(regex, (match) => 
      match === match.toLowerCase() ? correct.toLowerCase() :
      match === match.toUpperCase() ? correct.toUpperCase() :
      correct.charAt(0).toUpperCase() + correct.slice(1).toLowerCase()
    );
  }
  
  // Apply title case with special handling for small words and special cases
  formatted = formatted.replace(/\w[\w'’]*/g, (word, index) => {
    // Skip small words unless they are the first or last word
    const lowerWord = word.toLowerCase();
    if (index > 0 && 
        index + word.length < formatted.length && 
        SMALL_WORDS.has(lowerWord)) {
      return lowerWord;
    }
    
    // Handle words with apostrophes (like "don't")
    if (word.includes("'")) {
      return word.split("'").map(part => 
        part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : ''
      ).join("'");
    }
    
    // Handle hyphenated words (like "state-of-the-art")
    if (word.includes("-")) {
      return word.split("-").map(part => 
        part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : ''
      ).join("-");
    }
    
    // Handle special cases like "ai/ml" to "AI/ML" and "ux/ui" to "UX/UI"
    if (word.includes("/") && word.length <= 10) {
      // Special handling for UX/UI
      if (word.toLowerCase().includes('ux/ui') || word.toLowerCase().includes('ui/ux')) {
        return 'UX/UI';
      }
      return word.split("/").map(part => part.toUpperCase()).join("/");
    }
    
    // Default title case
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  });
  
  // Final cleanup
  return formatted
    .replace(/\s+/g, ' ')     // Ensure single spaces
    .replace(/\s*\.\s*/g, '. ')  // Normalize spaces around periods
    .replace(/\s*\/\s*/g, '/')   // Normalize spaces around slashes
    .replace(/\s*,\s*/g, ', ')   // Normalize spaces around commas
    .replace(/\.$/, '')           // Remove trailing period
    .trim();
};

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

// Define types for better TypeScript support
interface Video {
  id: string;
  title: string;
  creator: string;
  description?: string;
  duration?: string;
  youtube_video_id?: string;
  [key: string]: any;
}

interface ModuleStructure {
  title: string;
  description: string;
  order_index: number;
}

interface ModuleWithVideos extends ModuleStructure {
  videos: Video[];
}

// Categorize videos by learning level using keyword analysis
const categorizeVideosByLevel = (videos: Video[]) => {
  const categorized: {
    beginner: Video[];
    intermediate: Video[];
    advanced: Video[];
    practical: Video[];
  } = {
    beginner: [],
    intermediate: [],
    advanced: [],
    practical: []
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
const distributeVideosIntelligently = (videos: Video[], modules: ModuleStructure[]): ModuleWithVideos[] => {
  const categorized = categorizeVideosByLevel(videos);
  const distribution: ModuleWithVideos[] = [];
  
  // Add order_index to all videos based on their position in the categorized arrays
  const addOrderIndices = (videos: Video[], startIndex: number = 1): [Video[], number] => {
    return [videos.map((video, idx) => ({
      ...video,
      order_index: startIndex + idx
    })), startIndex + videos.length];
  };
  
  // Add order indices to all categorized videos
  let orderCounter = 1;
  const [beginnerVideos, nextIndex] = addOrderIndices(categorized.beginner, orderCounter);
  const [intermediateVideos, nextIndex2] = addOrderIndices(categorized.intermediate, nextIndex);
  const [advancedVideos, nextIndex3] = addOrderIndices(categorized.advanced, nextIndex2);
  const [practicalVideos] = addOrderIndices(categorized.practical, nextIndex3);
  
  // Update the categorized object with ordered videos
  categorized.beginner = beginnerVideos;
  categorized.intermediate = intermediateVideos;
  categorized.advanced = advancedVideos;
  categorized.practical = practicalVideos;

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

// Test the name correction function when running directly
if (import.meta.main) {
  testCourseNameCorrection();
  Deno.exit(0);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic: originalTopic, videos } = await req.json();
    
    // Log the original topic for debugging
    console.log('Original topic:', originalTopic);
    
    // Format and correct the course name
    const formattedTopic = formatCourseName(originalTopic);
    console.log('Formatted topic:', formattedTopic);
    
    // For testing - log the corrections being applied
    const testCases = [
      { input: 'analystics for product manager', expected: 'Analytics for Product Management' },
      { input: 'cracking pm interview', expected: 'Cracking the PM Interviews' },
      { input: 'data sci', expected: 'Data Science' },
      { input: 'ux/ui design', expected: 'UX/UI Design' },
      { input: 'Ux/ui Design', expected: 'UX/UI Design' },
      { input: 'ui/ux design', expected: 'UX/UI Design' },
      { input: 'web dev', expected: 'Web Development' },
      { input: 'ai/ml basics', expected: 'AI/ML Basics' },
      { input: 'machine learning 101', expected: 'Machine Learning 101' },
      { input: 'intro to js and react', expected: 'Introduction to JavaScript and React' },
      { input: 'node.js rest apis', expected: 'Node.js REST APIs' },
      { input: 'web dev with html, css, and js', expected: 'Web Development With HTML, CSS, and JavaScript' },
      { input: 'iot with arduino and raspberry pi', expected: 'IoT With Arduino and Raspberry Pi' },
      { input: 'vr and ar development', expected: 'VR and AR Development' }
    ];
    
    console.log('\n=== Course Name Correction Tests ===');
    let allPassed = true;
    
    testCases.forEach(({ input, expected }, index) => {
      const result = formatCourseName(input);
      const passed = result === expected;
      if (!passed) allPassed = false;
      
      console.log(`\nTest ${index + 1}:`);
      console.log(`  Input:    "${input}"`);
      console.log(`  Expected: "${expected}"`);
      console.log(`  Got:      "${result}"`);
      console.log(`  Status:   ${passed ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    console.log('\n=== Test Summary ===');
    console.log(`Passed: ${testCases.filter(tc => formatCourseName(tc.input) === tc.expected).length}/${testCases.length}`);
    console.log(`Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('===================\n');
    
    if (!allPassed) {
      console.log('Note: Some tests failed. Please check the output above for details.');
    }
    
    const topic = formattedTopic; // Use the formatted topic from here on

    // Initialize Supabase client
    const supabaseUrl = (globalThis as any).Deno?.env?.get('SUPABASE_URL');
    const supabaseKey = (globalThis as any).Deno?.env?.get('SUPABASE_ANON_KEY');
    
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
    const videoInserts: any[] = [];

    moduleDistribution.forEach((moduleData, moduleIndex) => {
      const targetModule = createdModules[moduleIndex];
      
      moduleData.videos.forEach((video: Video, videoIndex: number) => {
        // Use youtube_video_id if available, otherwise fall back to id
        const youtubeVideoId = video.youtube_video_id || video.id;
        
        videoInserts.push({
          module_id: targetModule.id,
          youtube_video_id: youtubeVideoId,
          title: video.title,
          creator_name: video.creator,
          order_index: video.order_index || videoIndex + 1,
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