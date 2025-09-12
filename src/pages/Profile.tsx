import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Extended profile type to match our database schema
type Profile = {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  google_sub: string | null;
  created_at: string;
  updated_at: string | null;
};

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  // Define form data type
  type FormData = {
    first_name: string;
    last_name: string;
    email: string;
    display_name: string;
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
            if (error.code === 'PGRST116') {
              const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert([
                  { 
                    id: user.id,
                    user_id: user.id,
                    email: user.email || '',
                    first_name: user.user_metadata?.first_name || '',
                    last_name: user.user_metadata?.last_name || '',
                    display_name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email?.split('@')[0] || 'User',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }
                ])
                .select()
                .single();
              
              if (createError) throw createError;
              
              if (newProfile) {
                setFormData({
                  first_name: String(newProfile.first_name || ''),
                  last_name: String(newProfile.last_name || ''),
                  email: String(newProfile.email || user.email || ''),
                  display_name: String(
                    newProfile.display_name || 
                    `${newProfile.first_name || ''} ${newProfile.last_name || ''}`.trim() || 
                    user.email?.split('@')[0] || 'User'
                  )
                });
                return;
              }
            } else {
              throw error;
            }
          }
          
          if (profile) {
            // If we have a profile, use that data
            setFormData({
              first_name: String(profile.first_name || user.user_metadata?.first_name || ''),
              last_name: String(profile.last_name || user.user_metadata?.last_name || ''),
              email: String(profile.email || user.email || ''),
              display_name: String(
                profile.display_name || 
                `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
                user.email?.split('@')[0] || 'User'
              )
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

      const updateData = {
        first_name: formData.first_name.trim() || null,
        last_name: formData.last_name.trim() || null,
        email: formData.email.trim(),
        display_name: formData.display_name.trim() || 
          `${formData.first_name || ''} ${formData.last_name || ''}`.trim() || null,
        updated_at: new Date().toISOString()
      };

      // Update profile in the database using direct Supabase client
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);
      
      if (updateError) throw updateError;

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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col items-center mb-8">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src="/placeholder-avatar.png" alt="Profile" />
            <AvatarFallback className="text-2xl bg-jewel text-white">
              {formData.first_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold text-jewel">
            {formData.first_name} {formData.last_name}
          </h1>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your account's profile information and email address.
                </CardDescription>
              </div>
              {!editing ? (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <div className="space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditing(false);
                      // Reset form data
                      if (user) {
                        // Reset to current form data
                        setFormData(prev => ({
                          first_name: prev.first_name,
                          last_name: prev.last_name,
                          email: prev.email,
                          display_name: prev.display_name
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
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  disabled={!editing}
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
                disabled={!editing}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
