import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Item, CATEGORY_LABELS, STATUS_LABELS } from '@/types/database';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, Calendar, User, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [item, setItem] = useState<Item | null>(null);
  const [poster, setPoster] = useState<{ full_name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [claimImages, setClaimImages] = useState<File[]>([]);
  const [claimImagePreviews, setClaimImagePreviews] = useState<string[]>([]);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  useEffect(() => {
    if (id) {
      fetchItem();
    }
  }, [id]);

  const fetchItem = async () => {
    setIsLoading(true);
    
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (itemError || !itemData) {
      navigate('/');
      return;
    }

    setItem(itemData);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', itemData.created_by)
      .maybeSingle();

    setPoster(profileData);
    setIsLoading(false);
  };

  const handleClaimImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + claimImages.length > 3) {
      toast({
        title: 'Too many images',
        description: 'You can upload a maximum of 3 proof images.',
        variant: 'destructive',
      });
      return;
    }

    const newImages = [...claimImages, ...files].slice(0, 3);
    setClaimImages(newImages);
    setClaimImagePreviews(newImages.map((file) => URL.createObjectURL(file)));
  };

  const removeClaimImage = (index: number) => {
    setClaimImages(claimImages.filter((_, i) => i !== index));
    setClaimImagePreviews(claimImagePreviews.filter((_, i) => i !== index));
  };

  const handleSubmitClaim = async () => {
    if (!user || !item) return;

    setIsSubmittingClaim(true);

    try {
      const proofUrls: string[] = [];
      
      for (const image of claimImages) {
        const fileExt = image.name.split('.').pop();
        const fileName = `claims/${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, image);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('item-images')
            .getPublicUrl(fileName);
          proofUrls.push(publicUrl);
        }
      }

      const { error } = await supabase.from('claims').insert({
        item_id: item.id,
        claimant_id: user.id,
        message: claimMessage,
        proof_image_urls: proofUrls,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Claim submitted!',
        description: 'Your claim has been sent for admin review.',
      });

      setClaimDialogOpen(false);
      setClaimMessage('');
      setClaimImages([]);
      setClaimImagePreviews([]);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit claim.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </main>
      </div>
    );
  }

  if (!item) return null;

  const isLost = item.type === 'lost';
  const isResolved = item.status === 'claimed' || item.status === 'resolved';
  const canClaim = item.type === 'found' && !isResolved && item.created_by !== user?.id;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      
      <main className="container py-6 max-w-4xl">
        <Button variant="ghost" className="mb-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="overflow-hidden">
          {item.image_urls && item.image_urls.length > 0 && (
            <div className="relative">
              <img
                src={selectedImage || item.image_urls[0]}
                alt={item.title}
                className="w-full h-64 sm:h-96 object-cover cursor-pointer"
                onClick={() => setSelectedImage(selectedImage || item.image_urls[0])}
              />
              {item.image_urls.length > 1 && (
                <div className="absolute bottom-4 left-4 right-4 flex gap-2 overflow-x-auto pb-2">
                  {item.image_urls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`${item.title} ${index + 1}`}
                      className={cn(
                        'w-16 h-16 object-cover rounded-lg cursor-pointer border-2 transition-all',
                        (selectedImage || item.image_urls[0]) === url
                          ? 'border-primary'
                          : 'border-transparent opacity-75 hover:opacity-100'
                      )}
                      onClick={() => setSelectedImage(url)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <CardContent className="p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{item.title}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge
                    className={cn(
                      isLost
                        ? 'bg-lost text-lost-foreground'
                        : 'bg-found text-found-foreground'
                    )}
                  >
                    {isLost ? 'Lost' : 'Found'}
                  </Badge>
                  <Badge variant={isResolved ? 'secondary' : 'outline'}>
                    {STATUS_LABELS[item.status]}
                  </Badge>
                  <Badge variant="outline">
                    {CATEGORY_LABELS[item.category]}
                  </Badge>
                </div>
              </div>

              {canClaim && (
                <Button onClick={() => setClaimDialogOpen(true)} className="gradient-primary">
                  Claim This Item
                </Button>
              )}
            </div>

            <p className="text-muted-foreground">{item.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{item.location}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(item.item_date), 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Posted by {poster?.full_name || 'Unknown'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <MobileNav />

      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Claim Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Claiming: <strong>{item.title}</strong>
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="claim-message">Why is this yours?</Label>
              <Textarea
                id="claim-message"
                placeholder="Describe how you can prove ownership..."
                value={claimMessage}
                onChange={(e) => setClaimMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Proof of Ownership (optional)</Label>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleClaimImageSelect}
              />
              
              {claimImagePreviews.length > 0 && (
                <div className="flex gap-2 mb-2">
                  {claimImagePreviews.map((url, index) => (
                    <div key={index} className="relative w-20 h-20">
                      <img
                        src={url}
                        alt={`Proof ${index + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                        onClick={() => removeClaimImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {claimImages.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-3 w-3" />
                  Add Proof Image
                </Button>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setClaimDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitClaim}
                disabled={!claimMessage.trim() || isSubmittingClaim}
              >
                {isSubmittingClaim ? 'Submitting...' : 'Submit Claim'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}