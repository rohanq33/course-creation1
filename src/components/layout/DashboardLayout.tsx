import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDemo } from '@/contexts/DemoContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sparkles, Home, User, Search, GraduationCap, BookOpen } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isInstructor } = useDemo();
  const location = useLocation();

  // Determine if current path is student-related
  const isStudentPath = location.pathname.startsWith('/student') ||
    location.pathname.startsWith('/student-dashboard') ||
    location.pathname.startsWith('/exam-time') ||
    location.pathname.startsWith('/student-time') ||
    location.pathname.startsWith('/course/');

  const isInstructorPath = location.pathname.startsWith('/instructor');

  const role = isInstructorPath ? 'instructor' : 'student';
  const displayName = isInstructorPath ? 'Demo Instructor' : 'Demo Student';
  const initials = isInstructorPath ? 'DI' : 'DS';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl hidden sm:inline">AI Course Developer</span>
            </Link>

            <div className="flex items-center gap-1">
              {/* Student-specific nav items */}
              {(isStudentPath || !isInstructorPath) && (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/student-dashboard">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Courses
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/exam-time">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Exam Time
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/student-time">
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Student Time
                    </Link>
                  </Button>
                </>
              )}

              <Button variant="ghost" size="sm" asChild>
                <Link to="/search">
                  <Search className="w-4 h-4 mr-2" />
                  AI Assistant
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="gradient-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{displayName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{role}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
<DropdownMenuItem asChild>
                    <Link to="/dashboard">
                      <User className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
