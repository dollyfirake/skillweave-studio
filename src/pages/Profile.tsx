import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft } from "lucide-react";

// Extended profile type to match our database schema
type Profile = {
  id: string;
  user_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  google_sub?: string | null;
  created_at?: string;
  updated_at?: string | null;
  [key: string]: any; // Allow additional properties
};

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  // Define form data type
  type FormData = {
    first_name: string;
    last_name: string;
    email: string;
    display_name: string;
    [key: string]: any; // Allow additional properties
  };

  const [formData, setFormData] = useState<FormData>({
    first_name: "",
    last_name: "",
    email: "",
    display_name: ""
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // First, try to get the user's metadata from auth
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Check if we have a profile in the database
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (error) {
            console.error('Error fetching profile:', error);
            // If no profile exists, create one with auth user data
            // Create a new profile if one doesn't exist
            const newProfileData: Partial<Profile> = {
              user_id: user.id,
              email: user.email || '',
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
              display_name: user.user_metadata?.full_name || 
                `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() ||
                user.email?.split('@')[0] || 'User',
              created_at: new Date().toISOString()
            };

            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert([newProfileData])
              .select()
              .single();
            
            if (createError) throw createError;
            
            if (newProfile) {
              const profile = newProfile as Profile;
              setFormData({
                first_name: profile.first_name || user.user_metadata?.first_name || '',
                last_name: profile.last_name || user.user_metadata?.last_name || '',
                email: profile.email || user.email || '',
                display_name: profile.display_name || 
                  `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
                  user.email?.split('@')[0] || 'User'
              });
              return;
            }
          }
          
          if (profile) {
            // If we have a profile, use that data with proper type assertions
            const profileData = profile as Profile;
            const firstName = profileData.first_name || user?.user_metadata?.first_name || '';
            const lastName = profileData.last_name || user?.user_metadata?.last_name || '';
            const email = profileData.email || user?.email || '';
            
            setFormData({
              first_name: firstName,
              last_name: lastName,
              email: email,
              display_name: 
                profileData.display_name || 
                `${firstName} ${lastName}`.trim() ||
                email.split('@')[0] || 'User'
            });
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      // Create updated form data
      const updated = { ...prev, [name]: value };
      
      // Update display name if first or last name changes
      if (name === 'first_name' || name === 'last_name') {
        updated.display_name = `${updated.first_name || ''} ${updated.last_name || ''}`.trim();
      }
      
      return updated;
    });
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const updateData: Partial<Profile> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        display_name: formData.display_name,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-jewel"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Logo and Back Button */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="text-gray-600 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to home</span>
            </Button>
            <div className="flex items-center space-x-2">
              <img 
                src="/logo.svg" 
                alt="LearnFlow Logo" 
                className="h-8 w-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/150x40?text=LearnFlow';
                }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Profile Settings
                </CardTitle>
                <CardDescription>
                  Manage your account information and settings
                </CardDescription>
              </div>
              {editing ? (
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditing(false);
                      // Reset form data
                      if (user) {
                        setFormData(prev => ({
                          ...prev,
                          display_name: prev.display_name || ''
                        }));
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-col items-center">
              <div className="relative">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage 
                    src={user?.user_metadata?.avatar_url || ''} 
                    alt={formData.display_name || 'User'} 
                  />
                  <AvatarFallback className="text-2xl bg-jewel text-white">
                    {formData.first_name?.[0]?.toUpperCase() || formData.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                {formData.display_name || formData.email || 'User'}
              </h3>
              <p className="text-sm text-gray-500">{formData.email}</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    disabled={!editing}
                    className={!editing ? 'bg-gray-50' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    disabled={!editing}
                    className={!editing ? 'bg-gray-50' : ''}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleInputChange}
                  disabled={!editing}
                  className={!editing ? 'bg-gray-50' : ''}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
