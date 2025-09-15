import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { Users, UserPlus, User, Mail, Calendar, CheckCircle } from 'lucide-react';
import type { User as UserType, CreateUserInput } from '../../../server/src/schema';

interface UserManagerProps {
  users: UserType[];
  onUserSelect: (user: UserType) => void;
  onUserCreated: (user: UserType) => void;
  currentUser?: UserType | null;
}

export function UserManager({ users, onUserSelect, onUserCreated, currentUser }: UserManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    name: ''
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.name.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const newUser = await trpc.createUser.mutate(formData);
      
      // For demo purposes, enhance the stub response
      const enhancedUser = {
        ...newUser,
        id: Date.now(), // Use timestamp as unique ID for demo
        email: formData.email,
        name: formData.name,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      toast.success(`Welcome ${enhancedUser.name}! 🎉 (Demo Mode)`);
      onUserCreated(enhancedUser);
      setShowCreateDialog(false);
      setFormData({ email: '', name: '' });
    } catch (error) {
      console.error('Failed to create user:', error);
      toast.error('Failed to create user. Email might already exist.');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-indigo-500" />
                User Management
              </CardTitle>
              <CardDescription>
                {currentUser 
                  ? 'Switch between users or create new accounts'
                  : 'Select a user account to get started with content management'
                }
              </CardDescription>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-indigo-500" />
                    Create New User
                  </DialogTitle>
                  <DialogDescription>
                    Add a new user account to the content management platform
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateDialog(false);
                        setFormData({ email: '', name: '' });
                      }}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating || !formData.email.trim() || !formData.name.trim()}
                    >
                      {isCreating ? 'Creating...' : 'Create User'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm text-gray-600">
            <span>Total Users: {users.length}</span>
            {currentUser && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Current: {currentUser.name}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Selection */}
      {!currentUser && users.length > 0 && (
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <CardHeader>
            <CardTitle className="text-lg text-indigo-900">
              👋 Welcome! Please select your account
            </CardTitle>
            <CardDescription className="text-indigo-700">
              Choose your user account to access the content management platform
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Users Grid */}
      {users.length === 0 ? (
        <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No users found</p>
            <p className="text-gray-500 mb-6">
              Create the first user account to get started with content management
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Create First User
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((user: UserType) => (
            <Card 
              key={user.id} 
              className={`bg-white/70 backdrop-blur-sm border shadow-lg hover:shadow-xl transition-all cursor-pointer ${
                currentUser?.id === user.id 
                  ? 'ring-2 ring-indigo-500 bg-indigo-50/70' 
                  : 'hover:border-indigo-300'
              }`}
              onClick={() => onUserSelect(user)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                      currentUser?.id === user.id 
                        ? 'bg-indigo-600' 
                        : 'bg-gray-400'
                    }`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.name}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </p>
                    </div>
                  </div>
                  {currentUser?.id === user.id && (
                    <Badge variant="default" className="bg-indigo-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDate(new Date(user.created_at))}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>User ID: {user.id}</span>
                  </div>
                </div>

                {currentUser?.id !== user.id && (
                  <Button
                    className="w-full mt-4"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUserSelect(user);
                    }}
                  >
                    Switch to {user.name.split(' ')[0]}
                  </Button>
                )}

                {currentUser?.id === user.id && (
                  <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="text-sm text-indigo-800 text-center font-medium">
                      ✨ You are currently signed in as this user
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Current User Info */}
      {currentUser && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold text-lg">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-900">
                    Signed in as {currentUser.name}
                  </h3>
                  <p className="text-green-700 flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {currentUser.email}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 mb-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active Account
                </Badge>
                <p className="text-sm text-green-600">
                  Member since {formatDate(new Date(currentUser.created_at))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {users.length > 0 && !currentUser && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Getting Started</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Click on any user card above to sign in</li>
                  <li>• Create a new user account if needed</li>
                  <li>• Once signed in, you can generate and manage content</li>
                  <li>• Switch between users anytime from the Users tab</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}