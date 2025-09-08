import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Create modules based on Pareto principle (80/20 rule)
    const modules = [
      { title: 'Fundamentals', description: 'Core concepts and basics', order_index: 0 },
      { title: 'Intermediate Concepts', description: 'Building on the fundamentals', order_index: 1 },
      { title: 'Advanced Applications', description: 'Real-world applications', order_index: 2 },
    ];

    const { data: createdModules, error: modulesError } = await supabase
      .from('modules')
      .insert(
        modules.map(module => ({
          ...module,
          course_id: course.id
        }))
      )
      .select();

    if (modulesError) {
      throw new Error(`Failed to create modules: ${modulesError.message}`);
    }

    console.log('Modules created:', createdModules);

    // Distribute videos across modules using Pareto principle
    const videosPerModule = Math.ceil(videos.length / 3);
    const videoInserts = [];

    videos.forEach((video: any, index: number) => {
      const moduleIndex = Math.floor(index / videosPerModule);
      const targetModule = createdModules[Math.min(moduleIndex, createdModules.length - 1)];
      
      videoInserts.push({
        module_id: targetModule.id,
        youtube_video_id: video.id,
        title: video.title,
        creator_name: video.creator,
        order_index: index % videosPerModule
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