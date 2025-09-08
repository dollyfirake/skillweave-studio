import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, BookOpen, Play, Clock, Users, Loader2, TrendingUp, Award, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      // Search YouTube videos
      const { data: videoData, error: videoError } = await supabase.functions.invoke('search-youtube-videos', {
        body: { 
          query: searchQuery,
          maxResults: 12 
        }
      });

      if (videoError) throw videoError;

      // Create course with found videos
      const { data: courseData, error: courseError } = await supabase.functions.invoke('create-course', {
        body: { 
          topic: searchQuery,
          videos: videoData.videos || []
        }
      });

      if (courseError) throw courseError;

      toast({
        title: "Course Created!",
        description: `Successfully created course for "${searchQuery}"`,
      });

      // Refresh courses list
      await fetchCourses();
      
      // Navigate to the new course
      navigate(`/course/${courseData.course.id}`);
    } catch (error: any) {
      console.error('Error creating course:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create course",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Mock data for stats
  const stats = [
    { title: "Courses Completed", value: "12", icon: Award, color: "text-green-600" },
    { title: "Hours Learned", value: "48", icon: Clock, color: "text-blue-600" },
    { title: "Current Streak", value: "7", icon: TrendingUp, color: "text-purple-600" },
    { title: "Learning Goal", value: "85%", icon: Target, color: "text-orange-600" },
  ];

  // Mock courses for display
  const mockCourses = [
    {
      id: "mock-1",
      topic_name: "React Development",
      description: "Learn modern React with hooks and functional components",
      progress: 75,
      totalVideos: 12,
      completedVideos: 9,
    },
    {
      id: "mock-2", 
      topic_name: "Python Programming",
      description: "Master Python fundamentals and advanced concepts",
      progress: 45,
      totalVideos: 15,
      completedVideos: 7,
    },
    {
      id: "mock-3",
      topic_name: "Web Design",
      description: "Create beautiful and responsive web designs",
      progress: 20,
      totalVideos: 8,
      completedVideos: 2,
    },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-jewel-bg to-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-jewel mb-2">
            Welcome back, {user?.email?.split('@')[0] || 'Learner'}!
          </h1>
          <p className="text-muted-foreground text-lg">
            Continue your learning journey or discover something new
          </p>
        </div>

        {/* Course Generation Section */}
        <Card className="mb-8 border-2 border-jewel/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-jewel mb-2">
              What would you like to learn today?
            </CardTitle>
            <CardDescription className="text-lg">
              Generate a personalized course from the best YouTube content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
              <Input
                type="text"
                placeholder="e.g., Machine Learning, Web Development, Digital Marketing..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-32 h-14 text-lg"
              />
              <Button 
                type="submit" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-jewel hover:bg-jewel-light"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Generate Course"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Courses Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Your Courses</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.length > 0 ? courses.map((course) => (
              <Card 
                key={course.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={() => navigate(`/course/${course.id}`)}
              >
                <div className="aspect-video bg-gradient-to-br from-jewel-lighter to-jewel-bg rounded-t-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-white" />
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{course.topic_name}</CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Ready to Learn</Badge>
                      <Button size="sm" variant="outline">Start</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : mockCourses.map((course) => (
              <Card 
                key={course.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={() => navigate(`/course/${course.id}`)}
              >
                <div className="aspect-video bg-gradient-to-br from-jewel-lighter to-jewel-bg rounded-t-lg relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Play className="h-12 w-12 text-white" />
                  </div>
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {course.totalVideos} videos
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{course.topic_name}</CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>{course.completedVideos}/{course.totalVideos} completed</span>
                      <span>{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="h-2" />
                    <div className="flex justify-between items-center">
                      <Badge variant="secondary">{course.progress}% complete</Badge>
                      <Button size="sm" variant="outline">Continue</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;