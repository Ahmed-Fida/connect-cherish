import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Item, STATUS_LABELS, CATEGORY_LABELS } from '@/types/database';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Calendar, Eye, ArrowLeft, Trash2 } from 'lucide-react';
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

export default function MyPosts() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMyItems();
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

  const pendingItems = items.filter((i) => i.status === 'pending');
  const approvedItems = items.filter((i) => i.status === 'approved');
  const rejectedItems = items.filter((i) => i.status === 'rejected');
  const resolvedItems = items.filter((i) => ['claimed', 'resolved'].includes(i.status));

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
            <Card key={item.id} className="overflow-hidden">
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
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="w-full justify-start mb-4 overflow-x-auto">
              <TabsTrigger value="pending">
                Pending ({pendingItems.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({approvedItems.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedItems.length})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved ({resolvedItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <ItemsList itemsList={pendingItems} />
            </TabsContent>
            <TabsContent value="approved">
              <ItemsList itemsList={approvedItems} />
            </TabsContent>
            <TabsContent value="rejected">
              <ItemsList itemsList={rejectedItems} />
            </TabsContent>
            <TabsContent value="resolved">
              <ItemsList itemsList={resolvedItems} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <MobileNav />
    </div>
  );
}