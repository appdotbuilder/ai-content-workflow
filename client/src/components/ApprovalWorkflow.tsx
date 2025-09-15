import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { 
  CheckSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  MessageSquare
} from 'lucide-react';
import type { 
  Content, 
  SocialMediaPlatform,
  ApproveContentInput
} from '../../../server/src/schema';

interface ApprovalWorkflowProps {
  userId: number;
}

export function ApprovalWorkflow({ userId }: ApprovalWorkflowProps) {
  const [pendingContent, setPendingContent] = useState<Content[]>([]);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [contentToReject, setContentToReject] = useState<Content | null>(null);

  const loadPendingApprovals = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getPendingApprovals.query({ userId });
      setPendingContent(result);
    } catch (error) {
      console.error('Failed to load pending approvals:', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPendingApprovals();
  }, [loadPendingApprovals]);

  const handleApproval = async (contentId: number, approved: boolean, rejectionReason?: string) => {
    setIsApproving(true);
    try {
      const approvalInput: ApproveContentInput = {
        content_id: contentId,
        approved_by: userId,
        approved: approved,
        rejection_reason: rejectionReason
      };

      await trpc.approveContent.mutate(approvalInput);
      
      if (approved) {
        toast.success('Content approved successfully! ✅');
      } else {
        toast.success('Content rejected with feedback 🔄');
      }
      
      loadPendingApprovals();
      setShowRejectDialog(false);
      setRejectionReason('');
      setContentToReject(null);
    } catch (error) {
      console.error('Failed to process approval:', error);
      toast.error('Failed to process approval');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRejectClick = (content: Content) => {
    setContentToReject(content);
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = () => {
    if (contentToReject && rejectionReason.trim()) {
      handleApproval(contentToReject.id, false, rejectionReason);
    } else {
      toast.error('Please provide a reason for rejection');
    }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <CheckSquare className="h-5 w-5 text-yellow-500" />
            Approval Workflow
          </CardTitle>
          <CardDescription>
            Review and approve content before scheduling or publishing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{pendingContent.length}</span>
              <span className="text-gray-600">pending approval</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">
                {pendingContent.filter((c: Content) => c.status === 'approved').length}
              </span>
              <span className="text-gray-600">approved today</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-3"></div>
                <div className="h-3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pendingContent.length === 0 ? (
        <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">All caught up!</p>
            <p className="text-gray-500 mb-4">
              No content pending approval at the moment
            </p>
            <p className="text-sm text-gray-400">
              New content will appear here when it's ready for review
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pendingContent.map((content: Content) => (
            <Card key={content.id} className="bg-white/70 backdrop-blur-sm border shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {getPlatformIcon(content.platform)}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900 line-clamp-1">
                        {content.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(new Date(content.created_at))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(content.status)}
                    <Badge 
                      variant="outline"
                      className="bg-yellow-50 text-yellow-800 border-yellow-300"
                    >
                      {content.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Content Preview */}
                <div className="space-y-3 mb-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      Caption
                    </Label>
                    <p className="text-sm text-gray-800 line-clamp-3 mt-1">
                      {content.caption}
                    </p>
                  </div>
                  
                  {content.hashtags && (
                    <div>
                      <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                        Hashtags
                      </Label>
                      <p className="text-sm text-blue-600 font-mono mt-1 line-clamp-2">
                        {content.hashtags}
                      </p>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {content.platform}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {content.content_type}
                  </Badge>
                  {content.ai_generated && (
                    <Badge variant="secondary" className="text-xs">
                      🤖 AI Generated
                    </Badge>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {/* View Details */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedContent(content)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
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
                              Review this content for approval
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
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                                {selectedContent.status.replace('_', ' ')}
                              </Badge>
                              {selectedContent.ai_generated && (
                                <Badge variant="secondary">AI Generated</Badge>
                              )}
                            </div>

                            <Separator />

                            <div>
                              <Label className="font-medium">Full Caption</Label>
                              <div className="mt-1 p-4 bg-gray-50 rounded-lg border">
                                <p className="whitespace-pre-wrap text-gray-800">
                                  {selectedContent.caption}
                                </p>
                              </div>
                            </div>

                            {selectedContent.hashtags && (
                              <div>
                                <Label className="font-medium">Hashtags</Label>
                                <div className="mt-1 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <p className="text-blue-800 font-mono text-sm">
                                    {selectedContent.hashtags}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm text-gray-600">
                                <strong>Created:</strong> {formatDateTime(new Date(selectedContent.created_at))}
                              </p>
                              <p className="text-sm text-gray-600">
                                <strong>Content ID:</strong> {selectedContent.id}
                              </p>
                            </div>

                            {/* Approval Actions */}
                            <div className="flex gap-2 pt-4">
                              <Button
                                onClick={() => handleApproval(selectedContent.id, true)}
                                disabled={isApproving}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                              >
                                <ThumbsUp className="h-4 w-4 mr-2" />
                                {isApproving ? 'Processing...' : 'Approve'}
                              </Button>
                              <Button
                                onClick={() => handleRejectClick(selectedContent)}
                                disabled={isApproving}
                                variant="outline"
                                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <ThumbsDown className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>

                  {/* Quick Approve */}
                  <Button
                    size="sm"
                    onClick={() => handleApproval(content.id, true)}
                    disabled={isApproving}
                    className="bg-green-600 hover:bg-green-700 flex-1"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    {isApproving ? 'Processing...' : 'Approve'}
                  </Button>

                  {/* Quick Reject */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRejectClick(content)}
                    disabled={isApproving}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <ThumbsDown className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-red-500" />
              Reject Content
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this content. This will help the creator understand what needs to be improved.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Rejected content will be sent back to draft status with your feedback.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="rejection-reason" className="font-medium">
                Reason for rejection *
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="e.g., The tone doesn't match our brand voice, needs more engaging hashtags, caption is too long for the platform..."
                value={rejectionReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectionReason(e.target.value)}
                className="min-h-[100px] mt-2"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide specific, actionable feedback to help improve the content
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                  setContentToReject(null);
                }}
                disabled={isApproving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectConfirm}
                disabled={isApproving || !rejectionReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {isApproving ? 'Processing...' : 'Reject with Feedback'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}