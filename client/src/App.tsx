import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import { ContentGenerator } from '@/components/ContentGenerator';
import { ContentCalendar } from '@/components/ContentCalendar';
import { ContentLibrary } from '@/components/ContentLibrary';
import { ApprovalWorkflow } from '@/components/ApprovalWorkflow';
import { Analytics } from '@/components/Analytics';
import { UserManager } from '@/components/UserManager';
import { Toaster } from '@/components/ui/sonner';
import { Sparkles, Calendar, FolderOpen, CheckSquare, BarChart3, Users, Info } from 'lucide-react';
import type { User } from '../../server/src/schema';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      let result = await trpc.getUsers.query();
      
      // For demo purposes, add sample users if none exist
      if (result.length === 0) {
        result = [
          {
            id: 1,
            email: 'sarah@contentcreator.com',
            name: 'Sarah Johnson',
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            updated_at: new Date()
          },
          {
            id: 2,
            email: 'mike@brandagency.com', 
            name: 'Mike Chen',
            created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
            updated_at: new Date()
          }
        ];
      }
      
      setUsers(result);
      // Set the first user as current user for demo purposes
      if (result.length > 0 && !currentUser) {
        setCurrentUser(result[0]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      // Fallback sample data for demo
      const fallbackUsers = [
        {
          id: 1,
          email: 'demo@example.com',
          name: 'Demo User',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];
      setUsers(fallbackUsers);
      setCurrentUser(fallbackUsers[0]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center space-y-4">
              <Sparkles className="h-12 w-12 text-purple-500 animate-pulse mx-auto" />
              <p className="text-lg font-medium">Loading AI Content Studio...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
                <Sparkles className="h-10 w-10 text-purple-500" />
                AI Content Studio
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                Generate, manage, and schedule AI-powered social media content
              </p>
            </div>
            <div className="text-right">
              {currentUser ? (
                <div>
                  <p className="text-sm text-gray-500">Welcome back,</p>
                  <p className="text-lg font-semibold text-gray-800">{currentUser.name}</p>
                  <Badge variant="outline" className="mt-1">
                    {currentUser.email}
                  </Badge>
                </div>
              ) : (
                <Button onClick={() => window.location.reload()} variant="outline">
                  Select User
                </Button>
              )}
            </div>
          </div>
          <Separator className="mt-6" />
        </div>

        {/* Demo Notice */}
        <Alert className="mb-6 border-blue-200 bg-blue-50/50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Mode:</strong> This is a frontend demonstration of the AI Content Studio. 
            The backend uses stub implementations, so generated content and data are simulated. 
            All UI interactions and workflows are fully functional.
          </AlertDescription>
        </Alert>

        {!currentUser ? (
          <UserManager 
            users={users} 
            onUserSelect={setCurrentUser}
            onUserCreated={(newUser: User) => {
              setUsers(prev => [...prev, newUser]);
              setCurrentUser(newUser);
            }}
          />
        ) : (
          <Tabs defaultValue="generate" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6 bg-white/50 backdrop-blur-sm border shadow-sm">
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Generate
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="library" className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Library
              </TabsTrigger>
              <TabsTrigger value="approvals" className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Approvals
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-6">
              <ContentGenerator 
                userId={currentUser.id} 
                onContentGenerated={() => {
                  // Trigger refresh for other components if needed
                }}
              />
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6">
              <ContentCalendar userId={currentUser.id} />
            </TabsContent>

            <TabsContent value="library" className="space-y-6">
              <ContentLibrary userId={currentUser.id} />
            </TabsContent>

            <TabsContent value="approvals" className="space-y-6">
              <ApprovalWorkflow userId={currentUser.id} />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Analytics userId={currentUser.id} />
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <UserManager 
                users={users} 
                onUserSelect={setCurrentUser}
                onUserCreated={(newUser: User) => {
                  setUsers(prev => [...prev, newUser]);
                  setCurrentUser(newUser);
                }}
                currentUser={currentUser}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
      <Toaster />
    </div>
  );
}

export default App;