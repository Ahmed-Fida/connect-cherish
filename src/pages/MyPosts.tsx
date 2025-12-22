import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Item, STATUS_LABELS, CATEGORY_LABELS, Claim } from '@/types/database';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Calendar, Eye, ArrowLeft, Trash2, MessageSquare, Check, X, User } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ClaimWithDetails {
  id: string;
  item_id: string;
  claimant_id: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  proof_image_urls: string[] | null;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string; email: string } | null;
  items?: Item | null;
}

export default function MyPosts() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  
  const [items, setItems] = useState<Item[]>([]);
  const [claimsOnMyItems, setClaimsOnMyItems] = useState<ClaimWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithDetails | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMyItems();
      fetchClaimsOnMyItems();
    }
  }, [user]);

  const fetchMyItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('created_by', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching items:', error);
    } else {
      setItems(data || []);
    }
    setIsLoading(false);
  };

  const fetchClaimsOnMyItems = async () => {
    // Get claims on items I posted
    const { data: myItems } = await supabase
      .from('items')
      .select('id')
      .eq('created_by', user?.id);

    if (myItems && myItems.length > 0) {
      const itemIds = myItems.map(i => i.id);
      const { data: claims } = await supabase
        .from('claims')
        .select('*')
        .in('item_id', itemIds)
        .order('created_at', { ascending: false });
      
      if (claims) {
        // Fetch profiles and items separately
        const claimsWithDetails: ClaimWithDetails[] = await Promise.all(
          claims.map(async (claim) => {
            const [profileRes, itemRes] = await Promise.all([
              supabase.from('profiles').select('full_name, email').eq('id', claim.claimant_id).maybeSingle(),
              supabase.from('items').select('*').eq('id', claim.item_id).maybeSingle()
            ]);
            return {
              ...claim,
              profiles: profileRes.data,
              items: itemRes.data
            };
          })
        );
        setClaimsOnMyItems(claimsWithDetails);
      }
    }
  };

  const handleDelete = async (itemId: string) => {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete post.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Post deleted',
        description: 'Your post has been removed.',
      });
      fetchMyItems();
    }
  };

  const handleMarkAsReturned = async (itemId: string) => {
    const { error } = await supabase
      .from('items')
      .update({ status: 'resolved' })
      .eq('id', itemId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update item.', variant: 'destructive' });
    } else {
      toast({ title: '🎉 Item marked as returned!', description: 'Great job reuniting the item!' });
      fetchMyItems();
      fetchClaimsOnMyItems();
    }
  };

  const pendingItems = items.filter((i) => i.status === 'pending');
  const approvedItems = items.filter((i) => i.status === 'approved');
  const rejectedItems = items.filter((i) => i.status === 'rejected');
  const claimedItems = items.filter((i) => i.status === 'claimed');
  const resolvedItems = items.filter((i) => i.status === 'resolved');

  const pendingClaims = claimsOnMyItems.filter(c => c.status === 'pending');

  const ItemsList = ({ itemsList }: { itemsList: Item[] }) => (
    <div className="space-y-4">
      {itemsList.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground">No items in this category.</p>
      ) : (
        itemsList.map((item) => {
          const isLost = item.type === 'lost';
          const statusColor = {
            pending: 'bg-warning text-warning-foreground',
            approved: 'bg-success text-success-foreground',
            rejected: 'bg-destructive text-destructive-foreground',
            claimed: 'bg-primary text-primary-foreground',
            resolved: 'bg-muted text-muted-foreground',
          }[item.status];

          return (
            <Card key={item.id} className="overflow-hidden card-hover">
              <div className="flex flex-col sm:flex-row">
                {item.image_urls && item.image_urls.length > 0 ? (
                  <img
                    src={item.image_urls[0]}
                    alt={item.title}
                    className="w-full sm:w-32 h-32 object-cover"
                  />
                ) : (
                  <div className="w-full sm:w-32 h-32 bg-muted flex items-center justify-center">
                    <Eye className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
                
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold">{item.title}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge
                          className={cn(
                            isLost
                              ? 'bg-lost text-lost-foreground'
                              : 'bg-found text-found-foreground'
                          )}
                        >
                          {isLost ? 'Lost' : 'Found'}
                        </Badge>
                        <Badge className={statusColor}>
                          {STATUS_LABELS[item.status]}
                        </Badge>
                        <Badge variant="outline">
                          {CATEGORY_LABELS[item.category]}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {item.status === 'claimed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-success border-success hover:bg-success hover:text-success-foreground"
                          onClick={() => handleMarkAsReturned(item.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Mark Returned
                        </Button>
                      )}
                      {item.status === 'pending' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Post?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your post.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(item.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {item.description}
                  </p>

                  {item.rejection_note && (
                    <p className="text-sm text-destructive mb-2">
                      Rejection reason: {item.rejection_note}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{item.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(item.item_date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );

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
        <Button variant="ghost" className="mb-4" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Feed
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">My Posts</h1>
          <p className="text-muted-foreground">Manage your lost and found posts</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="claims" className="w-full">
            <TabsList className="w-full justify-start mb-4 overflow-x-auto flex-wrap h-auto gap-1">
              <TabsTrigger value="claims" className="relative">
                <MessageSquare className="w-4 h-4 mr-1" />
                Claims
                {pendingClaims.length > 0 && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {pendingClaims.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingItems.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({approvedItems.length})
              </TabsTrigger>
              <TabsTrigger value="claimed">
                Claimed ({claimedItems.length})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved ({resolvedItems.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="claims">
              <div className="space-y-4">
                {claimsOnMyItems.length === 0 ? (
                  <Card className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                    <p className="text-muted-foreground">No claims on your items yet</p>
                  </Card>
                ) : (
                  claimsOnMyItems.map((claim) => {
                    const statusColor = {
                      pending: 'bg-warning text-warning-foreground',
                      approved: 'bg-success text-success-foreground',
                      rejected: 'bg-destructive text-destructive-foreground',
                    }[claim.status];

                    return (
                      <Card 
                        key={claim.id} 
                        className="card-hover cursor-pointer"
                        onClick={() => setSelectedClaim(claim)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={statusColor}>
                                  {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(claim.created_at), 'MMM d, yyyy')}
                                </span>
                              </div>
                              <h3 className="font-semibold">{claim.items?.title}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <User className="h-3 w-3" />
                                <span>Claimed by: {claim.profiles?.full_name}</span>
                              </div>
                              <p className="text-sm mt-2 line-clamp-2">{claim.message}</p>
                              {claim.proof_image_urls && claim.proof_image_urls.length > 0 && (
                                <Badge variant="outline" className="mt-2">
                                  📷 {claim.proof_image_urls.length} proof image(s)
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="pending">
              <ItemsList itemsList={pendingItems} />
            </TabsContent>
            <TabsContent value="approved">
              <ItemsList itemsList={approvedItems} />
            </TabsContent>
            <TabsContent value="claimed">
              <ItemsList itemsList={claimedItems} />
            </TabsContent>
            <TabsContent value="resolved">
              <ItemsList itemsList={resolvedItems} />
            </TabsContent>
            <TabsContent value="rejected">
              <ItemsList itemsList={rejectedItems} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <MobileNav />

      {/* Claim Detail Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Claim Details</DialogTitle>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="font-semibold">{selectedClaim.items?.title}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedClaim.profiles?.full_name}</span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedClaim.profiles?.email}</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Message:</p>
                <p className="text-muted-foreground">{selectedClaim.message}</p>
              </div>

              {selectedClaim.proof_image_urls && selectedClaim.proof_image_urls.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Proof Images:</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedClaim.proof_image_urls.map((url, i) => (
                      <img key={i} src={url} className="w-24 h-24 object-cover rounded-lg" />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm">Status:</span>
                <Badge className={
                  selectedClaim.status === 'pending' ? 'bg-warning text-warning-foreground' :
                  selectedClaim.status === 'approved' ? 'bg-success text-success-foreground' :
                  'bg-destructive text-destructive-foreground'
                }>
                  {selectedClaim.status.charAt(0).toUpperCase() + selectedClaim.status.slice(1)}
                </Badge>
              </div>

              {selectedClaim.rejection_note && (
                <p className="text-sm text-destructive">
                  Rejection note: {selectedClaim.rejection_note}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}