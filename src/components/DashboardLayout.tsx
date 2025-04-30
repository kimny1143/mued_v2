import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { BellIcon, UserCircleIcon, HomeIcon, BookOpenIcon, MessageSquareIcon, SettingsIcon, MenuIcon, FolderIcon, XIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}

export function DashboardLayout({ children, title, actions }: DashboardLayoutProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const navigationItems = [
    { icon: HomeIcon, label: "Dashboard", path: "/dashboard" },
    { icon: FolderIcon, label: "Materials", path: "/materials" },
    { icon: BookOpenIcon, label: "My Lessons", path: "/my-lessons" },
    { icon: MessageSquareIcon, label: "Messages", path: "/messages" },
    { icon: SettingsIcon, label: "Settings", path: "/settings" }
  ];

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 fixed w-full z-20">
        <div className="max-w-[1440px] mx-auto px-6">
          <div className="flex justify-between h-16">
            {/* Left section */}
            <div className="flex items-center gap-8">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
                <MenuIcon className="h-6 w-6" />
              </Button>
              <div className="flex items-center gap-2">
                <img className="h-8 w-8" src="/logomark.svg" alt="MUED" />
                <span className="text-2xl font-bold hidden lg:block">MUED</span>
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <BellIcon className="h-6 w-6" />
                <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>
              <Button variant="ghost" size="icon">
                <UserCircleIcon className="h-6 w-6" />
              </Button>
              <Button 
                variant="ghost" 
                className="hidden lg:flex items-center gap-2"
                onClick={handleSignOut}
              >
                <span className="text-sm">Sign out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-40
        transition-all duration-300 ease-in-out
        lg:z-10
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        {/* Collapse toggle button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-4 top-24 hidden lg:flex h-8 w-8 rounded-full bg-white border shadow-md"
          onClick={toggleSidebarCollapse}
        >
          {isSidebarCollapsed ? (
            <ChevronRightIcon className="h-4 w-4" />
          ) : (
            <ChevronLeftIcon className="h-4 w-4" />
          )}
        </Button>

        {/* Close button for mobile */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-4 right-4 lg:hidden"
          onClick={toggleSidebar}
        >
          <XIcon className="h-6 w-6" />
        </Button>

        <div className={`p-6 ${isSidebarCollapsed ? 'lg:p-4' : ''}`}>
          {/* User Profile */}
          <div className="mb-8 mt-16 lg:mt-0">
            <div className={`flex items-center gap-4 mb-4 ${isSidebarCollapsed ? 'lg:justify-center' : ''}`}>
              <UserCircleIcon className="h-12 w-12" />
              {!isSidebarCollapsed && (
                <div className="hidden lg:block">
                  <h3 className="font-semibold">{user?.email}</h3>
                  <p className="text-sm text-gray-500">Free Plan</p>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <Button 
                className="w-full hidden lg:flex" 
                variant="outline"
                onClick={() => navigate('/plans')}
              >
                Upgrade Plan
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navigationItems.map((item, index) => (
              <Button
                key={index}
                variant={location.pathname === item.path ? "default" : "ghost"}
                className={`w-full justify-start ${
                  location.pathname === item.path ? 'bg-black text-white' : ''
                } ${isSidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                onClick={() => {
                  navigate(item.path);
                  setIsSidebarOpen(false);
                }}
              >
                <item.icon className={`h-5 w-5 ${isSidebarCollapsed ? '' : 'mr-3'}`} />
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </Button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className={`pt-16 transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <div className="max-w-[1440px] mx-auto p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
            <h1 className="text-2xl font-bold">{title}</h1>
            {actions}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}