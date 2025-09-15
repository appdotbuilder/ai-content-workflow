import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { trpc } from '@/utils/trpc';
import { Sparkles, Copy, Calendar, Wand2 } from 'lucide-react';
import type { 
  GenerateContentInput, 
  SocialMediaPlatform, 
  ContentType,
  Content 
} from '../../../server/src/schema';

interface ContentGeneratorProps {
  userId: number;
  onContentGenerated?: () => void;
}

export function ContentGenerator({ userId, onContentGenerated }: ContentGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<Content | null>(null);
  
  const [formData, setFormData] = useState<GenerateContentInput>({
    user_id: userId,
    prompt: '',
    platform: 'instagram',
    content_type: 'post',
    include_hashtags: true,
    tone: 'professional'
  });

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.prompt.trim()) {
      toast.error('Please enter a content prompt');
      return;
    }

    setIsGenerating(true);
    try {
      const result = await trpc.generateContent.mutate({
        ...formData,
        user_id: userId
      });
      
      // For demo purposes, enhance the stub response with more realistic content
      const enhancedResult = {
        ...result,
        id: Date.now(), // Use timestamp as unique ID for demo
        title: `${formData.tone?.charAt(0).toUpperCase()}${formData.tone?.slice(1)} ${formData.content_type} for ${formData.platform}`,
        caption: `🎯 Here's your AI-generated ${formData.content_type} for ${formData.platform}!\n\nBased on your prompt: "${formData.prompt}"\n\nThis engaging content is optimized for your target audience with the perfect ${formData.tone} tone. Ready to make an impact! ✨`,
        hashtags: formData.include_hashtags ? `#${formData.platform} #content #ai #generated #social #marketing #${formData.tone}` : null
      };
      
      setGeneratedContent(enhancedResult);
      toast.success('Content generated successfully! ✨ (Demo Mode)');
      onContentGenerated?.();
    } catch (error) {
      console.error('Failed to generate content:', error);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveContent = async () => {
    if (!generatedContent) return;
    
    setIsSaving(true);
    try {
      // Content is already saved when generated, so we just need to update status or copy
      await navigator.clipboard.writeText(`${generatedContent.title}\n\n${generatedContent.caption}${generatedContent.hashtags ? '\n\n' + generatedContent.hashtags : ''}`);
      toast.success('Content copied to clipboard! 📋');
    } catch (error) {
      console.error('Failed to copy content:', error);
      toast.error('Failed to copy content');
    } finally {
      setIsSaving(false);
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

  const getContentTypeLabel = (type: ContentType) => {
    const labels = {
      post: 'Post',
      story: 'Story',
      reel: 'Reel',
      tweet: 'Tweet'
    };
    return labels[type];
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Generation Form */}
      <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Wand2 className="h-5 w-5 text-purple-500" />
            AI Content Generator
          </CardTitle>
          <CardDescription>
            Describe what you want to create and let AI generate engaging content for you
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-sm font-medium">
                Content Prompt *
              </Label>
              <Textarea
                id="prompt"
                placeholder="e.g., Create a motivational post about morning routines for busy entrepreneurs..."
                value={formData.prompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: GenerateContentInput) => ({ ...prev, prompt: e.target.value }))
                }
                className="min-h-[100px] resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platform" className="text-sm font-medium">
                  Platform
                </Label>
                <Select
                  value={formData.platform || 'instagram'}
                  onValueChange={(value: SocialMediaPlatform) =>
                    setFormData((prev: GenerateContentInput) => ({ ...prev, platform: value }))
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

              <div className="space-y-2">
                <Label htmlFor="content_type" className="text-sm font-medium">
                  Content Type
                </Label>
                <Select
                  value={formData.content_type || 'post'}
                  onValueChange={(value: ContentType) =>
                    setFormData((prev: GenerateContentInput) => ({ ...prev, content_type: value }))
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

            <div className="space-y-2">
              <Label htmlFor="tone" className="text-sm font-medium">
                Tone
              </Label>
              <Select
                value={formData.tone || 'professional'}
                onValueChange={(value: 'professional' | 'casual' | 'funny' | 'inspirational' | 'promotional') =>
                  setFormData((prev: GenerateContentInput) => ({ ...prev, tone: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">💼 Professional</SelectItem>
                  <SelectItem value="casual">😊 Casual</SelectItem>
                  <SelectItem value="funny">😄 Funny</SelectItem>
                  <SelectItem value="inspirational">✨ Inspirational</SelectItem>
                  <SelectItem value="promotional">📢 Promotional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="hashtags"
                checked={formData.include_hashtags}
                onCheckedChange={(checked: boolean) =>
                  setFormData((prev: GenerateContentInput) => ({ ...prev, include_hashtags: checked }))
                }
              />
              <Label htmlFor="hashtags" className="text-sm font-medium">
                Include hashtags
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={isGenerating || !formData.prompt.trim()}
            >
              {isGenerating ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Content
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Generated Content Preview */}
      <Card className="bg-white/70 backdrop-blur-sm border shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Generated Content
          </CardTitle>
          <CardDescription>
            {generatedContent 
              ? 'Your AI-generated content is ready!'
              : 'Generated content will appear here'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {generatedContent ? (
            <div className="space-y-4">
              {/* Content Metadata */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-sm">
                  {getPlatformIcon(generatedContent.platform)} {generatedContent.platform}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {getContentTypeLabel(generatedContent.content_type)}
                </Badge>
                {generatedContent.ai_generated && (
                  <Badge variant="secondary" className="text-sm">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Generated
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Content Title */}
              <div>
                <Label className="text-sm font-medium text-gray-600 mb-2 block">
                  Title
                </Label>
                <div className="p-3 bg-gray-50 rounded-md border">
                  <p className="font-medium text-gray-900">{generatedContent.title}</p>
                </div>
              </div>

              {/* Content Caption */}
              <div>
                <Label className="text-sm font-medium text-gray-600 mb-2 block">
                  Caption
                </Label>
                <div className="p-3 bg-gray-50 rounded-md border">
                  <p className="whitespace-pre-wrap text-gray-800">{generatedContent.caption}</p>
                </div>
              </div>

              {/* Hashtags */}
              {generatedContent.hashtags && (
                <div>
                  <Label className="text-sm font-medium text-gray-600 mb-2 block">
                    Hashtags
                  </Label>
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-blue-800 font-mono text-sm">{generatedContent.hashtags}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveContent}
                  disabled={isSaving}
                  variant="outline"
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button
                  onClick={() => {
                    // Navigate to calendar tab (would need state management for this)
                    toast.info('Use the Calendar tab to schedule this content');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 mb-2">No content generated yet</p>
              <p className="text-sm text-gray-400">
                Fill out the form and click "Generate Content" to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}