import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { 
  BarChart3, 
  TrendingUp, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  Clock,
  Calendar,
  Share2,
  Eye,
  RefreshCw
} from 'lucide-react';
import type { 
  ContentAnalytics, 
  ContentAnalyticsQuery,
  SocialMediaPlatform 
} from '../../../server/src/schema';

interface AnalyticsProps {
  userId: number;
}

export function Analytics({ userId }: AnalyticsProps) {
  const [analytics, setAnalytics] = useState<ContentAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<SocialMediaPlatform | 'all'>('all');

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const query: ContentAnalyticsQuery = {
        user_id: userId,
        platform: selectedPlatform === 'all' ? undefined : selectedPlatform
      };

      // Set date range based on selection
      if (dateRange === 'custom' && customStartDate && customEndDate) {
        query.start_date = new Date(customStartDate);
        query.end_date = new Date(customEndDate);
      } else if (dateRange !== 'custom') {
        const endDate = new Date();
        const startDate = new Date();
        
        switch (dateRange) {
          case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(endDate.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(endDate.getDate() - 90);
            break;
        }
        
        query.start_date = startDate;
        query.end_date = endDate;
      }

      const result = await trpc.getContentAnalytics.query(query);
      setAnalytics(result);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [userId, dateRange, customStartDate, customEndDate, selectedPlatform]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const getPlatformIcon = (platform: SocialMediaPlatform) => {
    const icons = {
      instagram: '📷',
      facebook: '📘',
      twitter: '🐦',
      linkedin: '💼'
    };
    return icons[platform];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <Share2 className="h-4 w-4 text-purple-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'scheduled':
        return <Calendar className="h-4 w-4 text-blue-500" />;
      case 'pending_approval':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'draft':
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case '7d':
        return 'Last 7 days';
      case '30d':
        return 'Last 30 days';
      case '90d':
        return 'Last 90 days';
      case 'custom':
        return customStartDate && customEndDate 
          ? `${new Date(customStartDate).toLocaleDateString()} - ${new Date(customEndDate).toLocaleDateString()}`
          : 'Custom range';
      default:
        return 'Last 30 days';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                Content Analytics
              </CardTitle>
              <CardDescription>
                Track your content performance and workflow metrics
              </CardDescription>
            </div>
            <Button
              onClick={loadAnalytics}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              <Select
                value={dateRange}
                onValueChange={(value: '7d' | '30d' | '90d' | 'custom') => setDateRange(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedPlatform}
                onValueChange={(value: SocialMediaPlatform | 'all') => setSelectedPlatform(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="instagram">📷 Instagram</SelectItem>
                  <SelectItem value="facebook">📘 Facebook</SelectItem>
                  <SelectItem value="twitter">🐦 Twitter</SelectItem>
                  <SelectItem value="linkedin">💼 LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <div className="flex gap-2 flex-1">
                <div>
                  <Label htmlFor="start-date" className="text-sm">From</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-sm">To</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomEndDate(e.target.value)}
                    className="w-full"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mt-4">
            Showing data for: <strong>{getDateRangeLabel()}</strong>
            {selectedPlatform !== 'all' && (
              <> • <strong>{selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}</strong></>
            )}
          </p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-3"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analytics ? (
        <>
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Total Content */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Content</p>
                    <p className="text-3xl font-bold text-blue-900">{analytics.total_content}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  All content pieces created
                </p>
              </CardContent>
            </Card>

            {/* AI Generated */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">AI Generated</p>
                    <p className="text-3xl font-bold text-purple-900">{analytics.ai_generated_content}</p>
                  </div>
                  <Sparkles className="h-8 w-8 text-purple-500" />
                </div>
                <div className="flex items-center mt-2">
                  <Progress 
                    value={calculatePercentage(analytics.ai_generated_content, analytics.total_content)} 
                    className="flex-1 h-2"
                  />
                  <span className="text-xs text-purple-600 ml-2 font-medium">
                    {calculatePercentage(analytics.ai_generated_content, analytics.total_content)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Approved */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Approved</p>
                    <p className="text-3xl font-bold text-green-900">{analytics.approved_content}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <div className="flex items-center mt-2">
                  <Progress 
                    value={calculatePercentage(analytics.approved_content, analytics.total_content)} 
                    className="flex-1 h-2"
                  />
                  <span className="text-xs text-green-600 ml-2 font-medium">
                    {calculatePercentage(analytics.approved_content, analytics.total_content)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Published */}
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-600">Published</p>
                    <p className="text-3xl font-bold text-indigo-900">{analytics.published_content}</p>
                  </div>
                  <Share2 className="h-8 w-8 text-indigo-500" />
                </div>
                <div className="flex items-center mt-2">
                  <Progress 
                    value={calculatePercentage(analytics.published_content, analytics.total_content)} 
                    className="flex-1 h-2"
                  />
                  <span className="text-xs text-indigo-600 ml-2 font-medium">
                    {calculatePercentage(analytics.published_content, analytics.total_content)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Platform Breakdown */}
            <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-blue-500" />
                  Content by Platform
                </CardTitle>
                <CardDescription>
                  Distribution of content across social media platforms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.by_platform).map(([platform, count]) => (
                    <div key={platform} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {getPlatformIcon(platform as SocialMediaPlatform)}
                          </span>
                          <span className="font-medium capitalize">
                            {platform}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{count}</Badge>
                          <span className="text-sm text-gray-500">
                            {calculatePercentage(count, analytics.total_content)}%
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={calculatePercentage(count, analytics.total_content)} 
                        className="h-2"
                      />
                    </div>
                  ))}
                  {Object.keys(analytics.by_platform).length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      No platform data available for the selected period
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status Breakdown */}
            <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Content by Status
                </CardTitle>
                <CardDescription>
                  Current workflow status of all content pieces
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.by_status).map(([status, count]) => (
                    <div key={status} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status)}
                          <span className="font-medium capitalize">
                            {status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{count}</Badge>
                          <span className="text-sm text-gray-500">
                            {calculatePercentage(count, analytics.total_content)}%
                          </span>
                        </div>
                      </div>
                      <Progress 
                        value={calculatePercentage(count, analytics.total_content)} 
                        className="h-2"
                      />
                    </div>
                  ))}
                  {Object.keys(analytics.by_status).length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      No status data available for the selected period
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Scheduled</p>
                    <p className="text-2xl font-bold text-yellow-800">
                      {analytics.scheduled_content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Rejected</p>
                    <p className="text-2xl font-bold text-red-800">
                      {analytics.rejected_content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-gray-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">AI Usage</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {calculatePercentage(analytics.ai_generated_content, analytics.total_content)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Success Rate</p>
                    <p className="text-2xl font-bold text-blue-800">
                      {calculatePercentage(
                        analytics.approved_content + analytics.published_content, 
                        analytics.total_content
                      )}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">No analytics data available</p>
            <p className="text-sm text-gray-400 mb-4">
              Create some content to see analytics insights
            </p>
            <Button onClick={loadAnalytics} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}