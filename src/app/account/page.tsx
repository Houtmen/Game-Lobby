'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AccountPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // State for edit profile modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    bio: '',
    avatar: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
    
    // Initialize profile data when user is loaded
    if (user) {
      setProfileData({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar: user.avatar || ''
      });
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleEditProfile = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage for now (in a real app, this would be an API call)
      const updatedUser = {
        ...user,
        bio: profileData.bio,
        avatar: profileData.avatar
      };
      
      localStorage.setItem('user_profile', JSON.stringify(updatedUser));
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveMessage('Profile updated successfully!');
      setTimeout(() => {
        setSaveMessage('');
        setIsEditModalOpen(false);
      }, 2000);
      
    } catch (error) {
      setSaveMessage('Failed to update profile. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real app, you'd upload to a server. For demo, we'll use FileReader
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileData(prev => ({
          ...prev,
          avatar: event.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getCurrentAvatar = () => {
    // Check if user has updated avatar in this session
    const savedProfile = localStorage.getItem('user_profile');
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      return parsed.avatar || user.avatar;
    }
    return user.avatar;
  };

  const getCurrentBio = () => {
    // Check if user has updated bio in this session
    const savedProfile = localStorage.getItem('user_profile');
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      return parsed.bio;
    }
    return user.bio || '';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-4">
              {getCurrentAvatar() ? (
                <img
                  src={getCurrentAvatar()}
                  alt={user.username}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{user.username}</h1>
                <p className="text-gray-400">{user.email}</p>
                {getCurrentBio() && (
                  <p className="text-gray-300 mt-2 italic">"{getCurrentBio()}"</p>
                )}
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-green-400">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Username
                </label>
                <div className="bg-gray-700 rounded-md px-3 py-2">
                  {user.username}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Email Address
                </label>
                <div className="bg-gray-700 rounded-md px-3 py-2">
                  {user.email}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Member Since
                </label>
                <div className="bg-gray-700 rounded-md px-3 py-2">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently joined'}
                </div>
              </div>
              {user.provider && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Authentication Provider
                  </label>
                  <div className="bg-gray-700 rounded-md px-3 py-2 capitalize">
                    {user.provider}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                onClick={handleEditProfile}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
              >
                Edit Profile
              </button>
              <button className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors">
                Change Password
              </button>
              <button className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors">
                Privacy Settings
              </button>
              <button 
                onClick={() => router.push('/games')}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors"
              >
                Game Library
              </button>
            </div>
          </div>

          {/* Edit Profile Modal */}
          {isEditModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-xl font-bold mb-4">Edit Profile</h3>
                
                <div className="space-y-4">
                  {/* Profile Picture Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Profile Picture
                    </label>
                    <div className="flex items-center space-x-4">
                      {profileData.avatar ? (
                        <img
                          src={profileData.avatar}
                          alt="Profile"
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                          id="avatar-upload"
                        />
                        <label
                          htmlFor="avatar-upload"
                          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm cursor-pointer transition-colors"
                        >
                          Choose Image
                        </label>
                        <p className="text-xs text-gray-400 mt-1">
                          JPG, PNG or GIF. Max 2MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bio Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Bio
                    </label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({...prev, bio: e.target.value}))}
                      placeholder="Tell us a bit about yourself..."
                      className="w-full bg-gray-700 text-white rounded-md px-3 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
                      rows={4}
                      maxLength={200}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {profileData.bio.length}/200 characters
                    </p>
                  </div>
                </div>

                {/* Save Message */}
                {saveMessage && (
                  <div className={`mt-4 text-sm ${saveMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                    {saveMessage}
                  </div>
                )}

                {/* Modal Actions */}
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={isSaving}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Profile</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}