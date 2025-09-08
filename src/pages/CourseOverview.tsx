import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Clock, BookOpen, CheckCircle, Circle, Users, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const CourseOverview = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percentage: 0 });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (courseId && user) {
      fetchCourseData();
    }
  }, [courseId, user]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      
      // Fetch course details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch modules with videos
      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select(`
          *,
          videos (*)
        `)
        .eq('course_id', courseId)
        .order('order_index');

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      // Calculate progress
      const allVideos = modulesData?.flatMap(module => module.videos) || [];
      const totalVideos = allVideos.length;
      
      if (totalVideos > 0) {
        // Fetch user progress
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user.id)
          .in('video_id', allVideos.map(v => v.id));

        const completedVideos = progressData?.filter(p => p.completed).length || 0;
        const percentage = Math.round((completedVideos / totalVideos) * 100);
        
        setProgress({
          completed: completedVideos,
          total: totalVideos,
          percentage
        });
      }
    } catch (error: any) {
      console.error('Error fetching course data:', error);
      toast({
        title: "Error",
        description: "Failed to load course data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (videoId: string) => {
    navigate(`/course/${courseId}/video/${videoId}`);
  };

  const handleContinueLearning = () => {
    // Find the first video
    const firstVideo = modules[0]?.videos?.[0];
    if (firstVideo) {
      navigate(`/course/${courseId}/video/${firstVideo.id}`);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-jewel mb-4">Course Not Found</h1>
            <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Course Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <Badge variant="secondary" className="mb-2">Learning Course</Badge>
              <h1 className="text-3xl font-bold text-jewel mb-4">{course.topic_name}</h1>
              <p className="text-lg text-muted-foreground mb-4">{course.description}</p>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>Curated Content</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{progress.total} videos</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <Card>
              <div className="aspect-video bg-gradient-to-br from-jewel-lighter to-jewel-bg rounded-t-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <BookOpen className="h-16 w-16 text-white" />
                </div>
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Button 
                    size="lg" 
                    className="bg-white text-jewel hover:bg-white/90"
                    onClick={handleContinueLearning}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start Learning
                  </Button>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress.percentage}%</span>
                    </div>
                    <Progress value={progress.percentage} className="h-3" />
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    {progress.completed} of {progress.total} videos completed
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Course Content */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-jewel">Course Content</h2>
          
          {modules.map((module) => (
            <Card key={module.id}>
              <CardHeader>
                <CardTitle className="text-lg">{module.title}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {module.videos?.map((video: any) => (
                    <div 
                      key={video.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => handleVideoClick(video.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Circle className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{video.title}</h4>
                          <p className="text-sm text-muted-foreground">{video.creator_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Play className="h-4 w-4" />
                        <span>Video</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default CourseOverview;