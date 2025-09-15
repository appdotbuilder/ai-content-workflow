import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { Calendar as CalendarIcon, Clock, Eye, Trash2 } from 'lucide-react';
import type { 
  Content, 
  SocialMediaPlatform, 
  ContentStatus,
  ContentCalendarQuery 
} from '../../../server/src/schema';

interface ContentCalendarProps {
  userId: number;
}

export function ContentCalendar({ userId }: ContentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [calendarContent, setCalendarContent] = useState<Content[]>([]);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  
  const [filters, setFilters] = useState<{
    platform?: SocialMediaPlatform;
    status?: ContentStatus;
  }>({});

  const loadCalendarContent = useCallback(async () => {
    try {
      // Get content for the current month
      const startDate = new Date();
      startDate.setDate(1); // First day of current month
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0); // Last day of current month

      const query: ContentCalendarQuery = {
        user_id: userId,
        start_date: startDate,
        end_date: endDate,
        ...filters
      };

      const result = await trpc.getContentCalendar.query(query);
      setCalendarContent(result);
    } catch (error) {
      console.error('Failed to load calendar content:', error);
      toast.error('Failed to load calendar content');
    }
  }, [userId, filters]);

  useEffect(() => {
    loadCalendarContent();
  }, [loadCalendarContent]);

  const handleScheduleContent = async (contentId: number, scheduledAt: Date) => {
    setIsScheduling(true);
    try {
      await trpc.scheduleContent.mutate({
        contentId,
        scheduledAt
      });
      toast.success('Content scheduled successfully! 📅');
      loadCalendarContent();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to schedule content:', error);
      toast.error('Failed to schedule content');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleUnscheduleContent = async (contentId: number) => {
    try {
      await trpc.unscheduleContent.mutate({ contentId });
      toast.success('Content unscheduled successfully');
      loadCalendarContent();
    } catch (error) {
      console.error('Failed to unschedule content:', error);
      toast.error('Failed to unschedule content');
    }
  };

  const getContentForDate = (date: Date): Content[] => {
    return calendarContent.filter((content: Content) => {
      if (!content.scheduled_at) return false;
      const scheduledDate = new Date(content.scheduled_at);
      return scheduledDate.toDateString() === date.toDateString();
    });
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
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CalendarIcon className="h-5 w-5 text-blue-500" />
                Content Calendar
              </CardTitle>
              <CardDescription>
                Schedule and manage your content across all platforms
              </CardDescription>
            </div>
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
                  <SelectValue placeholder="All platforms" />
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
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Calendar View</CardTitle>
            <CardDescription>
              Click on a date to see scheduled content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                hasContent: (date: Date) => getContentForDate(date).length > 0
              }}
              modifiersStyles={{
                hasContent: {
                  backgroundColor: 'rgb(59 130 246 / 0.1)',
                  color: 'rgb(29 78 216)',
                  fontWeight: 'bold'
                }
              }}
            />
            
            {selectedDate && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-sm text-blue-700">
                  {getContentForDate(selectedDate).length} content pieces scheduled
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduled Content for Selected Date */}
        <div className="lg:col-span-2">
          <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                {selectedDate ? (
                  `Scheduled for ${selectedDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}`
                ) : (
                  'Select a Date'
                )}
              </CardTitle>
              <CardDescription>
                {selectedDate ? (
                  `${getContentForDate(selectedDate).length} content pieces scheduled`
                ) : (
                  'Choose a date from the calendar to view scheduled content'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                <div className="space-y-4">
                  {getContentForDate(selectedDate).length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-2">No content scheduled for this date</p>
                      <p className="text-sm text-gray-400">
                        Go to the Library tab to schedule existing content
                      </p>
                    </div>
                  ) : (
                    getContentForDate(selectedDate).map((content: Content) => (
                      <div
                        key={content.id}
                        className="border rounded-lg p-4 bg-white/50 hover:bg-white/70 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {getPlatformIcon(content.platform)}
                            </span>
                            <div>
                              <h3 className="font-medium text-gray-900 line-clamp-1">
                                {content.title}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {content.scheduled_at && formatDateTime(new Date(content.scheduled_at))}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={getStatusColor(content.status)}
                            >
                              {content.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {content.caption}
                        </p>

                        <div className="flex justify-between items-center">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedContent(content);
                                setIsDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {content.status === 'scheduled' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnscheduleContent(content.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-400">
                            ID: {content.id}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a date to view scheduled content</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                    <Badge variant="secondary">AI Generated</Badge>
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

                {selectedContent.status !== 'scheduled' && selectedContent.status === 'approved' && (
                  <div className="space-y-2">
                    <Label htmlFor="schedule-datetime" className="font-medium">
                      Schedule this content
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="schedule-datetime"
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
                        {isScheduling ? 'Scheduling...' : 'Schedule'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}