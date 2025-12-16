import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Item, ItemType, ItemCategory, CATEGORY_LABELS } from '@/types/database';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { ItemCard } from '@/components/items/ItemCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Filter, X, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';

export default function Feed() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ItemType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [claimMessage, setClaimMessage] = useState('');
  const [claimImages, setClaimImages] = useState<File[]>([]);
  const [claimImagePreviews, setClaimImagePreviews] = useState<string[]>([]);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchItems();
    }
  }, [user]);

  const fetchItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .in('status', ['approved', 'claimed', 'resolved'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching items:', error);
    } else {
      setItems(data || []);
    }
    setIsLoading(false);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  const handleClaimClick = (item: Item) => {
    setSelectedItem(item);
    setClaimDialogOpen(true);
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
    if (!user || !selectedItem) return;

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
        item_id: selectedItem.id,
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
      setSelectedItem(null);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      
      <main className="container py-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Lost & Found Feed</h1>
              <p className="text-muted-foreground">Browse items on campus</p>
            </div>
            <Button onClick={() => navigate('/create')} className="hidden md:flex gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden"
              >
                <Filter className="h-4 w-4" />
              </Button>
              
              <div className={`flex gap-2 ${showFilters ? 'flex' : 'hidden sm:flex'}`}>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ItemType | 'all')}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="found">Found</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ItemCategory | 'all')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-80 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No items found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onView={() => navigate(`/item/${item.id}`)}
                onClaim={() => handleClaimClick(item)}
                showClaimButton={item.type === 'found' && item.created_by !== user?.id}
              />
            ))}
          </div>
        )}

        {role === 'admin' && (
          <div className="mt-8 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm font-medium">
              You're an admin!{' '}
              <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/admin')}>
                Go to Admin Dashboard →
              </Button>
            </p>
          </div>
        )}
      </main>

      <MobileNav />

      <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Claim Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Claiming: <strong>{selectedItem?.title}</strong>
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