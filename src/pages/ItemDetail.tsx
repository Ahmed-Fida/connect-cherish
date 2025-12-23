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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, Calendar, User, Upload, X, Search } from 'lucide-react';
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

  // "I Found It" state
  const [foundDialogOpen, setFoundDialogOpen] = useState(false);
  const [foundLocation, setFoundLocation] = useState('');
  const [isSubmittingFound, setIsSubmittingFound] = useState(false);
  const [finder, setFinder] = useState<{ full_name: string } | null>(null);

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

    // Fetch finder info if item was found by someone
    if (itemData.found_by) {
      const { data: finderData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', itemData.found_by)
        .maybeSingle();
      setFinder(finderData);
    }

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

  const handleSubmitFound = async () => {
    if (!user || !item) return;

    setIsSubmittingFound(true);

    try {
      const { error } = await supabase
        .from('items')
        .update({
          status: 'found',
          found_by: user.id,
          found_location: foundLocation,
          found_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: 'Marked as Found!',
        description: 'The owner has been notified. They can now claim their item.',
      });

      setFoundDialogOpen(false);
      setFoundLocation('');
      fetchItem(); // Refresh the item data
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark as found.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingFound(false);
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
  const isFound = item.status === 'found';
  
  // For "found" type items, users can claim if not resolved
  const canClaim = item.type === 'found' && !isResolved && item.created_by !== user?.id;
  
  // For "lost" type items, other users can mark as found if status is "approved"
  const canMarkAsFound = item.type === 'lost' && item.status === 'approved' && user && item.created_by !== user.id;
  
  // Owner can claim their own lost item after someone found it
  const canClaimOwnLostItem = item.type === 'lost' && isFound && user && item.created_by === user.id;

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

              <div className="flex flex-wrap gap-2">
                {canClaim && (
                  <Button onClick={() => setClaimDialogOpen(true)} className="gradient-primary">
                    Claim This Item
                  </Button>
                )}
                
                {canMarkAsFound && (
                  <Button onClick={() => setFoundDialogOpen(true)} className="bg-found text-found-foreground hover:bg-found/90">
                    <Search className="mr-2 h-4 w-4" />
                    I Found It
                  </Button>
                )}
                
                {canClaimOwnLostItem && (
                  <Button onClick={async () => {
                    const { error } = await supabase
                      .from('items')
                      .update({ status: 'claimed' })
                      .eq('id', item.id);
                    
                    if (!error) {
                      toast({
                        title: 'Item Claimed!',
                        description: 'Your item has been marked as claimed.',
                      });
                      fetchItem();
                    }
                  }} className="gradient-primary">
                    Claim My Item
                  </Button>
                )}
              </div>
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

            {/* Show found info if someone found this lost item */}
            {isLost && isFound && item.found_location && (
              <div className="p-4 bg-found/10 border border-found/20 rounded-lg space-y-2">
                <h3 className="font-semibold text-found flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Good News! This item has been found
                </h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Found at:</strong> {item.found_location}</p>
                  {item.found_at && (
                    <p><strong>Found on:</strong> {format(new Date(item.found_at), 'MMMM d, yyyy')}</p>
                  )}
                  {finder && (
                    <p><strong>Found by:</strong> {finder.full_name}</p>
                  )}
                </div>
                {canClaimOwnLostItem && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Click "Claim My Item" above to mark this as claimed.
                  </p>
                )}
              </div>
            )}
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

      {/* I Found It Dialog */}
      <Dialog open={foundDialogOpen} onOpenChange={setFoundDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>I Found This Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You're marking: <strong>{item.title}</strong> as found
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="found-location">Where did you find it?</Label>
              <Input
                id="found-location"
                placeholder="e.g., Library 2nd floor, near the water fountain"
                value={foundLocation}
                onChange={(e) => setFoundLocation(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setFoundDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitFound}
                disabled={!foundLocation.trim() || isSubmittingFound}
                className="bg-found text-found-foreground hover:bg-found/90"
              >
                {isSubmittingFound ? 'Submitting...' : 'Mark as Found'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}