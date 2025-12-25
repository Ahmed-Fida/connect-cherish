import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Item, Claim, CATEGORY_LABELS, STATUS_LABELS } from '@/types/database';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, Calendar, User, Upload, X, Search, CheckCircle, XCircle, Eye, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const foundImageInputRef = useRef<HTMLInputElement>(null);

  const [item, setItem] = useState<Item | null>(null);
  const [poster, setPoster] = useState<{ full_name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Claim dialog state (for found items)
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimMessage, setClaimMessage] = useState('');
  const [claimImages, setClaimImages] = useState<File[]>([]);
  const [claimImagePreviews, setClaimImagePreviews] = useState<string[]>([]);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // "I Found It" state (enhanced with photos)
  const [foundDialogOpen, setFoundDialogOpen] = useState(false);
  const [foundLocation, setFoundLocation] = useState('');
  const [foundMessage, setFoundMessage] = useState('');
  const [foundImages, setFoundImages] = useState<File[]>([]);
  const [foundImagePreviews, setFoundImagePreviews] = useState<string[]>([]);
  const [isSubmittingFound, setIsSubmittingFound] = useState(false);
  const [finder, setFinder] = useState<{ full_name: string } | null>(null);

  // Owner claim proof state
  const [ownerClaimDialogOpen, setOwnerClaimDialogOpen] = useState(false);
  const [ownerClaimMessage, setOwnerClaimMessage] = useState('');
  const [ownerClaimImages, setOwnerClaimImages] = useState<File[]>([]);
  const [ownerClaimImagePreviews, setOwnerClaimImagePreviews] = useState<string[]>([]);
  const [isSubmittingOwnerClaim, setIsSubmittingOwnerClaim] = useState(false);
  const ownerClaimInputRef = useRef<HTMLInputElement>(null);

  // Owner's claim on this item (if any)
  const [ownerClaim, setOwnerClaim] = useState<Claim | null>(null);

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

    setItem(itemData as Item);

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

    // Fetch owner's claim if item is in "found" status
    if (itemData.status === 'found' && itemData.type === 'lost') {
      const { data: claimData } = await supabase
        .from('claims')
        .select('*')
        .eq('item_id', itemData.id)
        .eq('claimant_id', itemData.created_by)
        .maybeSingle();
      
      setOwnerClaim(claimData as Claim | null);
    }

    setIsLoading(false);
  };

  // Handle found images selection
  const handleFoundImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + foundImages.length > 3) {
      toast({
        title: 'Too many images',
        description: 'You can upload a maximum of 3 images.',
        variant: 'destructive',
      });
      return;
    }

    const newImages = [...foundImages, ...files].slice(0, 3);
    setFoundImages(newImages);
    setFoundImagePreviews(newImages.map((file) => URL.createObjectURL(file)));
  };

  const removeFoundImage = (index: number) => {
    setFoundImages(foundImages.filter((_, i) => i !== index));
    setFoundImagePreviews(foundImagePreviews.filter((_, i) => i !== index));
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

  // Owner claim proof image handling
  const handleOwnerClaimImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + ownerClaimImages.length > 3) {
      toast({
        title: 'Too many images',
        description: 'You can upload a maximum of 3 proof images.',
        variant: 'destructive',
      });
      return;
    }

    const newImages = [...ownerClaimImages, ...files].slice(0, 3);
    setOwnerClaimImages(newImages);
    setOwnerClaimImagePreviews(newImages.map((file) => URL.createObjectURL(file)));
  };

  const removeOwnerClaimImage = (index: number) => {
    setOwnerClaimImages(ownerClaimImages.filter((_, i) => i !== index));
    setOwnerClaimImagePreviews(ownerClaimImagePreviews.filter((_, i) => i !== index));
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

  // Enhanced "I Found It" with photos - uses edge function to bypass RLS
  const handleSubmitFound = async () => {
    if (!user || !item) return;

    setIsSubmittingFound(true);

    try {
      // Upload finder's images
      const imageUrls: string[] = [];
      
      for (const image of foundImages) {
        const fileExt = image.name.split('.').pop();
        const fileName = `found/${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, image);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('item-images')
            .getPublicUrl(fileName);
          imageUrls.push(publicUrl);
        }
      }

      // Call edge function to update the item (bypasses RLS)
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mark-item-found`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
          body: JSON.stringify({
            itemId: item.id,
            foundLocation,
            foundMessage: foundMessage || null,
            foundImages: imageUrls,
          }),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to mark as found');
      }

      toast({
        title: 'Marked as Potentially Found!',
        description: 'The owner has been notified. They can now submit claim proof.',
      });

      setFoundDialogOpen(false);
      setFoundLocation('');
      setFoundMessage('');
      setFoundImages([]);
      setFoundImagePreviews([]);
      fetchItem();
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

  // Owner submits claim proof
  const handleSubmitOwnerClaim = async () => {
    if (!user || !item) return;

    setIsSubmittingOwnerClaim(true);

    try {
      const proofUrls: string[] = [];
      
      for (const image of ownerClaimImages) {
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
        message: ownerClaimMessage,
        proof_image_urls: proofUrls,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Claim proof submitted!',
        description: 'The finder will review your proof.',
      });

      setOwnerClaimDialogOpen(false);
      setOwnerClaimMessage('');
      setOwnerClaimImages([]);
      setOwnerClaimImagePreviews([]);
      fetchItem();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit claim proof.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingOwnerClaim(false);
    }
  };

  // These functions are removed - admin handles claim approval now via AdminDashboard

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
  const isOwner = user?.id === item.created_by;
  const isFinder = user?.id === item.found_by;
  
  // For "found" type items, users can claim if not resolved
  const canClaim = item.type === 'found' && !isResolved && item.created_by !== user?.id;
  
  // For "lost" type items, other users can mark as found if status is "approved"
  const canMarkAsFound = item.type === 'lost' && item.status === 'approved' && user && item.created_by !== user.id;
  
  // Owner can submit claim proof after someone found it (if no pending claim exists)
  const canSubmitClaimProof = isLost && isFound && isOwner && (!ownerClaim || ownerClaim.status === 'rejected');
  
  // Admin reviews claims, not finder

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
                  <Badge 
                    variant={isResolved ? 'secondary' : 'outline'}
                    className={cn(
                      isFound && 'bg-amber-500/20 text-amber-700 border-amber-500/30'
                    )}
                  >
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
                    I Found This Item
                  </Button>
                )}
                
                {canSubmitClaimProof && (
                  <Button onClick={() => setOwnerClaimDialogOpen(true)} className="gradient-primary">
                    <Eye className="mr-2 h-4 w-4" />
                    Submit Claim Proof
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

            {/* Show finder's submission to owner and finder */}
            {isLost && isFound && (isOwner || isFinder) && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-3">
                <h3 className="font-semibold text-amber-700 flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Item Potentially Found
                </h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  {finder && (
                    <p><strong>Found by:</strong> {finder.full_name}</p>
                  )}
                  <p><strong>Location:</strong> {item.found_location}</p>
                  {item.found_at && (
                    <p><strong>Date:</strong> {format(new Date(item.found_at), 'MMMM d, yyyy')}</p>
                  )}
                  {item.found_message && (
                    <p><strong>Message:</strong> {item.found_message}</p>
                  )}
                  
                  {/* Finder's photos */}
                  {item.found_images && item.found_images.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium mb-2">Finder's Photos:</p>
                      <div className="flex gap-2 flex-wrap">
                        {item.found_images.map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`Found item ${index + 1}`}
                            className="w-24 h-24 object-cover rounded-lg border"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Owner's claim proof (visible to both owner and finder) */}
                {ownerClaim && ownerClaim.status === 'pending' && (
                  <div className="mt-4 p-3 bg-background rounded-lg border">
                    <h4 className="font-medium mb-2">Owner's Claim Proof:</h4>
                    <p className="text-sm text-muted-foreground mb-2">{ownerClaim.message}</p>
                    {ownerClaim.proof_image_urls && ownerClaim.proof_image_urls.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-3">
                        {ownerClaim.proof_image_urls.map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`Proof ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Admin reviews claims now */}
                    <div className="mt-3 p-2 bg-primary/10 rounded-lg">
                      <p className="text-sm text-primary font-medium">
                        Claim pending admin approval
                      </p>
                    </div>
                  </div>
                )}

                {/* Show rejected claim status to owner */}
                {ownerClaim?.status === 'rejected' && isOwner && (
                  <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm text-destructive">
                      Your previous claim was rejected. You can submit new proof.
                    </p>
                  </div>
                )}

                {isOwner && !ownerClaim && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Click "Submit Claim Proof" to prove ownership and claim your item.
                  </p>
                )}
              </div>
            )}

            {/* Resolved status badge */}
            {isResolved && (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <h3 className="font-semibold text-green-700 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  This item has been resolved
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  The owner has successfully claimed this item.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <MobileNav />

      {/* Claim Dialog for Found Items */}
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

      {/* I Found This Item Dialog (Enhanced) */}
      <Dialog open={foundDialogOpen} onOpenChange={setFoundDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>I Found This Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You're marking: <strong>{item.title}</strong> as potentially found
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="found-location">Where did you find it? *</Label>
              <Input
                id="found-location"
                placeholder="e.g., Library 2nd floor, near the water fountain"
                value={foundLocation}
                onChange={(e) => setFoundLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="found-message">Message (optional)</Label>
              <Textarea
                id="found-message"
                placeholder="Any additional details about how/where you found it..."
                value={foundMessage}
                onChange={(e) => setFoundMessage(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Photos of the Found Item</Label>
              <input
                type="file"
                ref={foundImageInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFoundImageSelect}
              />
              
              {foundImagePreviews.length > 0 && (
                <div className="flex gap-2 mb-2">
                  {foundImagePreviews.map((url, index) => (
                    <div key={index} className="relative w-20 h-20">
                      <img
                        src={url}
                        alt={`Found item ${index + 1}`}
                        className="w-full h-full object-cover rounded"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                        onClick={() => removeFoundImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {foundImages.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => foundImageInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-3 w-3" />
                  Add Photo
                </Button>
              )}
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
                {isSubmittingFound ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Owner Submit Claim Proof Dialog */}
      <Dialog open={ownerClaimDialogOpen} onOpenChange={setOwnerClaimDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Claim Proof</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Prove that <strong>{item.title}</strong> belongs to you
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="owner-claim-message">Proof of Ownership *</Label>
              <Textarea
                id="owner-claim-message"
                placeholder="Describe identifying features, provide serial numbers, or explain how you can prove this is yours..."
                value={ownerClaimMessage}
                onChange={(e) => setOwnerClaimMessage(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Proof Images (e.g., original photo, receipt)</Label>
              <input
                type="file"
                ref={ownerClaimInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleOwnerClaimImageSelect}
              />
              
              {ownerClaimImagePreviews.length > 0 && (
                <div className="flex gap-2 mb-2">
                  {ownerClaimImagePreviews.map((url, index) => (
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
                        onClick={() => removeOwnerClaimImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {ownerClaimImages.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => ownerClaimInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-3 w-3" />
                  Add Proof Image
                </Button>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOwnerClaimDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitOwnerClaim}
                disabled={!ownerClaimMessage.trim() || isSubmittingOwnerClaim}
              >
                {isSubmittingOwnerClaim ? 'Submitting...' : 'Submit Proof'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
