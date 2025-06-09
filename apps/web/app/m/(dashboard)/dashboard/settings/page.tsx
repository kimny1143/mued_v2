"use client";

export const dynamic = 'force-dynamic';

import { User } from "@supabase/supabase-js";
import { UserCircleIcon, ArrowLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SubscriptionStatus } from "@/app/components/SubscriptionStatus";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Button } from "@ui/button";
import { Card } from "@ui/card";
import { Separator } from "@ui/separator";

export default function MobileSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      setUser(data.session?.user || null);
      setLoading(false);
    };
    
    getUser();
    
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              className="p-2"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Settings</h1>
            <div className="w-8"></div>
          </div>
        </header>
        <main className="px-4 py-6">
          <div className="text-center">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
          <div className="w-8"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 space-y-4">
        
        {/* Subscription Status */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Subscription</h2>
          <SubscriptionStatus />
        </Card>
        
        {/* Profile Settings */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Profile Settings</h2>
          <div className="space-y-4">
            {/* Profile Picture */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserCircleIcon className="h-12 w-12 text-gray-400" />
                <div>
                  <p className="font-medium">Profile Picture</p>
                  <p className="text-sm text-gray-500">Change your photo</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            
            <Separator />
            
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm">
                {user?.email || ''}
              </div>
            </div>
            
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                placeholder="Enter your display name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black text-sm"
              />
            </div>
            
            <Button className="w-full">
              Save Changes
            </Button>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Notification Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Email Notifications</h3>
                <p className="text-sm text-gray-500">Receive email updates about your account</p>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Push Notifications</h3>
                <p className="text-sm text-gray-500">Receive push notifications about your lessons</p>
              </div>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
          </div>
        </Card>

        {/* Account Settings */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Account Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Change Password</h3>
                <p className="text-sm text-gray-500">Update your password regularly for security</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Privacy Settings</h3>
                <p className="text-sm text-gray-500">Manage your privacy and data settings</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Data Export</h3>
                <p className="text-sm text-gray-500">Download your data</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-4 border-red-200">
          <h2 className="text-lg font-semibold mb-4 text-red-600">Danger Zone</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-red-600">Delete Account</h3>
                <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
              </div>
              <Button variant="destructive" size="sm">Delete</Button>
            </div>
          </div>
        </Card>

        {/* App Information */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">App Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Version</span>
              <span>1.0.0</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-gray-600">Build</span>
              <span>2024.1.1</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Terms of Service</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Privacy Policy</span>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </Card>

        {/* Logout Button */}
        <div className="pb-safe-area-inset-bottom">
          <Button 
            variant="outline" 
            className="w-full border-red-300 text-red-600 hover:bg-red-50"
            onClick={() => {
              if (confirm('ログアウトしますか？')) {
                window.location.href = '/api/auth/logout';
              }
            }}
          >
            Logout
          </Button>
        </div>
      </main>
    </div>
  );
}