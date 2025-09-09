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

interface CourseWithProgress {
  id: string;
  topic_name: string;
  description: string;
  created_at: string;
  totalVideos: number;
  completedVideos: number;
  progress: number;
  hasStarted: boolean;
}

interface UserStats {
  coursesCompleted: number;
  hoursLearned: number;
  currentStreak: number;
  learningGoal: number;
}

// Function to format course names for better UI display
const formatCourseName = (topicName: string): string => {
  // Simple typo correction and formatting
  const corrections: { [key: string]: string } = {
    'prodct': 'product',
    'mangmet': 'management',
    'developmet': 'development',
    'programing': 'programming',
    'machne': 'machine',
    'artifical': 'artificial',
    'inteligence': 'intelligence'
  };
  
  let formatted = topicName.toLowerCase();
  
  // Apply corrections
  Object.keys(corrections).forEach(typo => {
    formatted = formatted.replace(new RegExp(typo, 'g'), corrections[typo]);
  });
  
  // Capitalize each word
  return formatted.split(' ')
    .map(word => {
      if (word === 'ui') return 'UI';
      if (word === 'ux') return 'UX';
      if (word === 'seo') return 'SEO';
      if (word === 'ai') return 'AI';
      if (word === 'ml') return 'ML';
      
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};


const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    coursesCompleted: 0,
    hoursLearned: 0,
    currentStreak: 0,
    learningGoal: 0
  });
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
      fetchCoursesWithProgress();
      calculateUserStats();
    }
  }, [user]);

  const fetchCoursesWithProgress = async () => {
    try {
      console.log('Fetching courses for user:', user?.id);
      // Fetch courses with their videos and user progress - ONLY for current user
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          topic_name,
          description,
          created_at,
          created_by,
          modules (
            id,
            videos (
              id,
              duration,
              user_progress (
                completed,
                completion_date,
                user_id
              )
            )
          )
        `)
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        throw coursesError;
      }
      
      console.log('Fetched courses data:', coursesData);

      // Calculate progress for each course
      const coursesWithProgress: CourseWithProgress[] = (coursesData || []).map(course => {
        const allVideos = course.modules?.flatMap(module => module.videos) || [];
        const totalVideos = allVideos.length;
        const completedVideos = allVideos.filter(video => {
          const progress = video.user_progress;
          return progress && progress.length > 0 && 
                 progress.some((p: any) => p?.completed && p?.user_id === user?.id);
        }).length;
        
        const progress = totalVideos > 0 ? Math.round((completedVideos / totalVideos) * 100) : 0;
        const hasStarted = completedVideos > 0;

        return {
          id: course.id,
          topic_name: formatCourseName(course.topic_name), // Apply formatting
          description: course.description,
          created_at: course.created_at,
          totalVideos,
          completedVideos,
          progress,
          hasStarted
        };
      });

      setCourses(coursesWithProgress);
    } catch (error) {
      console.error('Error fetching courses with progress:', error);
    }
  };

  const calculateUserStats = async () => {
    try {
      // Fetch all user progress data
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select(`
          completed,
          completion_date,
          video_id,
          videos (
            duration,
            module_id,
            modules (
              course_id
            )
          )
        `)
        .eq('user_id', user?.id)
        .eq('completed', true);

      if (progressError) throw progressError;

      const completedVideos = progressData || [];
      
      // Calculate courses completed (100% progress)
      const courseProgress = new Map<string, { completed: number; total: number }>();
      
      // Get all courses and their video counts - ONLY for current user
      const { data: allCoursesData } = await supabase
        .from('courses')
        .select(`
          id,
          modules (
            videos (
              id
            )
          )
        `)
        .eq('created_by', user?.id);

      (allCoursesData || []).forEach(course => {
        const totalVideos = course.modules?.flatMap(m => m.videos).length || 0;
        courseProgress.set(course.id, { completed: 0, total: totalVideos });
      });

      // Count completed videos per course
      completedVideos.forEach(progress => {
        const courseId = progress.videos?.modules?.course_id;
        if (courseId && courseProgress.has(courseId)) {
          const current = courseProgress.get(courseId)!;
          courseProgress.set(courseId, { ...current, completed: current.completed + 1 });
        }
      });

      // Count fully completed courses
      const coursesCompleted = Array.from(courseProgress.values())
        .filter(({ completed, total }) => total > 0 && completed === total).length;

      // Calculate hours learned (assuming average 10 minutes per video)
      const hoursLearned = Math.round((completedVideos.length * 10) / 60);

      // Calculate current streak (consecutive days with completed videos)
      const completionDates = completedVideos
        .map(p => p.completion_date)
        .filter(date => date)
        .map(date => new Date(date).toDateString())
        .sort();

      const uniqueDates = [...new Set(completionDates)];
      let currentStreak = 0;
      const today = new Date().toDateString();
      
      if (uniqueDates.length > 0) {
        const lastDate = new Date(uniqueDates[uniqueDates.length - 1]);
        const todayDate = new Date(today);
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          // Count consecutive days from the end
          for (let i = uniqueDates.length - 1; i >= 0; i--) {
            const currentDate = new Date(uniqueDates[i]);
            const nextDate = i < uniqueDates.length - 1 ? new Date(uniqueDates[i + 1]) : new Date(today);
            const dayDiff = Math.ceil((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (dayDiff <= 1) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }

      // Learning goal (percentage of target - let's say 50 videos per month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyCompleted = completedVideos.filter(p => {
        if (!p.completion_date) return false;
        const date = new Date(p.completion_date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).length;
      
      const monthlyTarget = 50;
      const learningGoal = Math.min(100, Math.round((monthlyCompleted / monthlyTarget) * 100));

      setUserStats({
        coursesCompleted,
        hoursLearned,
        currentStreak,
        learningGoal
      });
    } catch (error) {
      console.error('Error calculating user stats:', error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      console.log('Starting course creation for:', searchQuery);
      
      // Search YouTube videos
      const { data: videoData, error: videoError } = await supabase.functions.invoke('search-youtube-videos', {
        body: { 
          query: searchQuery,
          maxResults: 12 
        }
      });

      if (videoError) {
        console.error('Video search error:', videoError);
        throw videoError;
      }
      
      console.log('Video search successful:', videoData);

      // Create course with found videos and formatted name
      const { data: courseData, error: courseError } = await supabase.functions.invoke('create-course', {
        body: { 
          topic: formatCourseName(searchQuery),
          videos: videoData.videos || []
        }
      });

      if (courseError) {
        console.error('Course creation error:', courseError);
        throw courseError;
      }
      
      console.log('Course creation successful:', courseData);

      toast({
        title: "Course Created!",
        description: `Successfully created course for "${searchQuery}"`,
      });

      // Refresh courses list and stats
      await fetchCoursesWithProgress();
      await calculateUserStats();
      
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

  // Dynamic stats based on real user data
  const stats = [
    { title: "Courses Completed", value: userStats.coursesCompleted.toString(), icon: Award, color: "text-green-600" },
    { title: "Hours Learned", value: userStats.hoursLearned.toString(), icon: Clock, color: "text-blue-600" },
    { title: "Current Streak", value: `${userStats.currentStreak} days`, icon: TrendingUp, color: "text-purple-600" },
    { title: "Learning Goal", value: `${userStats.learningGoal}%`, icon: Target, color: "text-orange-600" },
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-jewel mb-2">LearnFlow</h1>
              <p className="text-lg text-jewel-light font-medium mb-2">
                Master skills faster with structured, Pareto-powered learning journeys.
              </p>
              <p className="text-muted-foreground">
                Track your progress and continue your personalized learning experience
              </p>
            </div>
          </div>

          {/* Course Generation Section */}
          <Card className="mb-8 border-2 border-jewel/20">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-jewel mb-2">
                What would you like to learn today?
              </CardTitle>
              <CardDescription>
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
        </div>

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
                    {course.hasStarted ? (
                      <Play className="h-12 w-12 text-white" />
                    ) : (
                      <BookOpen className="h-12 w-12 text-white" />
                    )}
                  </div>
                  {course.totalVideos > 0 && (
                    <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {course.totalVideos} videos
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{course.topic_name}</CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {course.hasStarted ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>{course.completedVideos}/{course.totalVideos} completed</span>
                          <span>{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                        <div className="flex justify-between items-center">
                          <Badge variant="secondary">
                            {course.progress === 100 ? "Completed" : "In Progress"}
                          </Badge>
                          <Button size="sm" variant="outline">
                            {course.progress === 100 ? "Review" : "Resume"}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">Ready to Learn</Badge>
                        <Button size="sm" variant="outline">Start</Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-full text-center py-12">
                <div className="mx-auto w-24 h-24 rounded-full bg-jewel/10 flex items-center justify-center mb-4">
                  <BookOpen className="h-12 w-12 text-jewel" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
                <p className="text-gray-500 mb-6">Get started by creating your first course!</p>
                <div className="max-w-md mx-auto">
                  <form onSubmit={handleSearch} className="relative">
                    <Input
                      type="text"
                      placeholder="What would you like to learn? (e.g., Machine Learning, Web Development...)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-32 h-12 text-base"
                    />
                    <Button 
                      type="submit" 
                      className="absolute right-1 top-1 bg-jewel hover:bg-jewel/90"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Course"
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;