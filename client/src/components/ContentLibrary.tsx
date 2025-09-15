import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { 
  FolderOpen, 
  Search, 
  Eye, 
  Edit, 
  Calendar, 
  Copy,
  Sparkles
} from 'lucide-react';
import type { 
  Content, 
  SocialMediaPlatform, 
  ContentStatus, 
  ContentType,
  UpdateContentInput 
} from '../../../server/src/schema';

interface ContentLibraryProps {
  userId: number;
}

export function ContentLibrary({ userId }: ContentLibraryProps) {
  const [content, setContent] = useState<Content[]>([]);
  const [filteredContent, setFilteredContent] = useState<Content[]>([]);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{
    platform?: SocialMediaPlatform;
    status?: ContentStatus;
    contentType?: ContentType;
  }>({});

  const [editFormData, setEditFormData] = useState<Partial<UpdateContentInput>>({});

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getContent.query({ userId });
      setContent(result);
      setFilteredContent(result);
    } catch (error) {
      console.error('Failed to load content:', error);
      toast.error('Failed to load content');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Filter content based on search and filters
  useEffect(() => {
    let filtered = content.filter((item: Content) => {
      const matchesSearch = searchTerm === '' || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.caption.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.hashtags && item.hashtags.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPlatform = !filters.platform || item.platform === filters.platform;
      const matchesStatus = !filters.status || item.status === filters.status;
      const matchesContentType = !filters.contentType || item.content_type === filters.contentType;

      return matchesSearch && matchesPlatform && matchesStatus && matchesContentType;
    });

    // Sort by creation date (newest first)
    filtered = filtered.sort((a: Content, b: Content) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setFilteredContent(filtered);
  }, [content, searchTerm, filters]);

  const handleUpdateContent = async () => {
    if (!editingContent || !editFormData.id) return;

    setIsUpdating(true);
    try {
      await trpc.updateContent.mutate(editFormData as UpdateContentInput);
      toast.success('Content updated successfully! ✨');
      loadContent();
      setEditingContent(null);
      setEditFormData({});
    } catch (error) {
      console.error('Failed to update content:', error);
      toast.error('Failed to update content');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleScheduleContent = async (contentId: number, scheduledAt: Date) => {
    setIsScheduling(true);
    try {
      await trpc.scheduleContent.mutate({
        contentId,
        scheduledAt
      });
      toast.success('Content scheduled successfully! 📅');
      loadContent();
      setScheduleDateTime('');
    } catch (error) {
      console.error('Failed to schedule content:', error);
      toast.error('Failed to schedule content');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleCopyContent = async (content: Content) => {
    try {
      const textToCopy = `${content.title}\n\n${content.caption}${content.hashtags ? '\n\n' + content.hashtags : ''}`;
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Content copied to clipboard! 📋');
    } catch (error) {
      console.error('Failed to copy content:', error);
      toast.error('Failed to copy content');
    }
  };

  const getStatusColor = (status: ContentStatus) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800 border-gray-300',
      pending_approval: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
      scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
      published: 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colors[status];
  };

  const getPlatformIcon = (platform: SocialMediaPlatform) => {
    const icons = {
      instagram: '📷',
      facebook: '📘',
      twitter: '🐦',
      linkedin: '💼'
    };
    return icons[platform];
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Header and Search/Filter */}
      <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FolderOpen className="h-5 w-5 text-green-500" />
            Content Library
          </CardTitle>
          <CardDescription>
            Manage, edit, and organize all your content in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search content by title, caption, or hashtags..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filters */}
            <div className="flex gap-2">
              <Select
                value={filters.platform || 'all'}
                onValueChange={(value: string) =>
                  setFilters(prev => ({
                    ...prev,
                    platform: value === 'all' ? undefined : (value as SocialMediaPlatform)
                  }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="instagram">📷 Instagram</SelectItem>
                  <SelectItem value="facebook">📘 Facebook</SelectItem>
                  <SelectItem value="twitter">🐦 Twitter</SelectItem>
                  <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={filters.status || 'all'}
                onValueChange={(value: string) =>
                  setFilters(prev => ({
                    ...prev,
                    status: value === 'all' ? undefined : (value as ContentStatus)
                  }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex gap-4 mt-4 text-sm text-gray-600">
            <span>Total: {content.length}</span>
            <span>Filtered: {filteredContent.length}</span>
            <span>AI Generated: {content.filter((c: Content) => c.ai_generated).length}</span>
          </div>
        </CardContent>
      </Card>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-3"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredContent.length === 0 ? (
        <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">
              {searchTerm || Object.keys(filters).some(key => filters[key as keyof typeof filters]) 
                ? 'No content matches your search criteria' 
                : 'No content found'}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {searchTerm || Object.keys(filters).some(key => filters[key as keyof typeof filters])
                ? 'Try adjusting your filters or search terms'
                : 'Generate some content to get started'}
            </p>
            {(!searchTerm && !Object.keys(filters).some(key => filters[key as keyof typeof filters])) && (
              <Button onClick={() => toast.info('Use the Generate tab to create new content')}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Content
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredContent.map((item: Content) => (
            <Card key={item.id} className="bg-white/70 backdrop-blur-sm border shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {getPlatformIcon(item.platform)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(new Date(item.created_at))}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {item.content_type}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(item.status)}`}
                  >
                    {item.status.replace('_', ' ')}
                  </Badge>
                  {item.ai_generated && (
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI
                    </Badge>
                  )}
                </div>

                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                  {item.caption}
                </p>

                {item.scheduled_at && (
                  <div className="mb-4 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs text-blue-800">
                      📅 Scheduled: {formatDateTime(new Date(item.scheduled_at))}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedContent(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      {selectedContent && (
                        <>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              {getPlatformIcon(selectedContent.platform)}
                              {selectedContent.title}
                            </DialogTitle>
                            <DialogDescription>
                              {selectedContent.content_type} • Created {new Date(selectedContent.created_at).toLocaleDateString()}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">
                                {selectedContent.platform}
                              </Badge>
                              <Badge variant="outline">
                                {selectedContent.content_type}
                              </Badge>
                              <Badge variant="outline" className={getStatusColor(selectedContent.status)}>
                                {selectedContent.status.replace('_', ' ')}
                              </Badge>
                              {selectedContent.ai_generated && (
                                <Badge variant="secondary">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  AI Generated
                                </Badge>
                              )}
                            </div>

                            <Separator />

                            <div>
                              <Label className="font-medium">Caption</Label>
                              <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                                <p className="whitespace-pre-wrap">{selectedContent.caption}</p>
                              </div>
                            </div>

                            {selectedContent.hashtags && (
                              <div>
                                <Label className="font-medium">Hashtags</Label>
                                <div className="mt-1 p-3 bg-blue-50 rounded-md border border-blue-200">
                                  <p className="text-blue-800 font-mono text-sm">{selectedContent.hashtags}</p>
                                </div>
                              </div>
                            )}

                            {selectedContent.scheduled_at && (
                              <div>
                                <Label className="font-medium">Scheduled for</Label>
                                <div className="mt-1 p-3 bg-green-50 rounded-md border border-green-200">
                                  <p className="text-green-800">
                                    {formatDateTime(new Date(selectedContent.scheduled_at))}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2 pt-4">
                              <Button
                                onClick={() => handleCopyContent(selectedContent)}
                                variant="outline"
                                className="flex-1"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy
                              </Button>
                              {selectedContent.status === 'approved' && !selectedContent.scheduled_at && (
                                <div className="flex gap-2 flex-1">
                                  <Input
                                    type="datetime-local"
                                    value={scheduleDateTime}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                                      setScheduleDateTime(e.target.value)
                                    }
                                    className="flex-1"
                                    min={new Date().toISOString().slice(0, 16)}
                                  />
                                  <Button
                                    onClick={() => {
                                      if (scheduleDateTime) {
                                        handleScheduleContent(selectedContent.id, new Date(scheduleDateTime));
                                      }
                                    }}
                                    disabled={!scheduleDateTime || isScheduling}
                                  >
                                    <Calendar className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingContent(item);
                          setEditFormData({
                            id: item.id,
                            title: item.title,
                            caption: item.caption,
                            hashtags: item.hashtags,
                            platform: item.platform,
                            content_type: item.content_type,
                            status: item.status
                          });
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      {editingContent && (
                        <>
                          <DialogHeader>
                            <DialogTitle>Edit Content</DialogTitle>
                            <DialogDescription>
                              Make changes to your content
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="edit-title">Title</Label>
                              <Input
                                id="edit-title"
                                value={editFormData.title || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  setEditFormData(prev => ({ ...prev, title: e.target.value }))
                                }
                              />
                            </div>

                            <div>
                              <Label htmlFor="edit-caption">Caption</Label>
                              <Textarea
                                id="edit-caption"
                                value={editFormData.caption || ''}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                  setEditFormData(prev => ({ ...prev, caption: e.target.value }))
                                }
                                className="min-h-[100px]"
                              />
                            </div>

                            <div>
                              <Label htmlFor="edit-hashtags">Hashtags</Label>
                              <Input
                                id="edit-hashtags"
                                value={editFormData.hashtags || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  setEditFormData(prev => ({ ...prev, hashtags: e.target.value || null }))
                                }
                                placeholder="#hashtag1 #hashtag2"
                              />
                            </div>

                            <div className="flex gap-4">
                              <div className="flex-1">
                                <Label>Platform</Label>
                                <Select
                                  value={editFormData.platform}
                                  onValueChange={(value: SocialMediaPlatform) =>
                                    setEditFormData(prev => ({ ...prev, platform: value }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="instagram">📷 Instagram</SelectItem>
                                    <SelectItem value="facebook">📘 Facebook</SelectItem>
                                    <SelectItem value="twitter">🐦 Twitter</SelectItem>
                                    <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex-1">
                                <Label>Content Type</Label>
                                <Select
                                  value={editFormData.content_type}
                                  onValueChange={(value: ContentType) =>
                                    setEditFormData(prev => ({ ...prev, content_type: value }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="post">Post</SelectItem>
                                    <SelectItem value="story">Story</SelectItem>
                                    <SelectItem value="reel">Reel</SelectItem>
                                    <SelectItem value="tweet">Tweet</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditingContent(null);
                                  setEditFormData({});
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleUpdateContent}
                                disabled={isUpdating}
                              >
                                {isUpdating ? 'Updating...' : 'Update Content'}
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyContent(item)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}