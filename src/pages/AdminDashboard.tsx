import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Item, Claim, CATEGORY_LABELS, STATUS_LABELS } from '@/types/database';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X, Eye, Clock, Package, Users, Shield, Sparkles, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const { toast } = useToast();

  const [pendingItems, setPendingItems] = useState<Item[]>([]);
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      navigate('/');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchData();
    }
  }, [user, role]);

  const fetchData = async () => {
    setIsLoading(true);
    
    const [pendingRes, allRes, claimsRes] = await Promise.all([
      supabase.from('items').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('items').select('*').neq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('claims').select('*, items(*), profiles:claimant_id(full_name, email)').eq('status', 'pending').order('created_at', { ascending: false }),
    ]);

    setPendingItems(pendingRes.data || []);
    setAllItems(allRes.data || []);
    setClaims(claimsRes.data || []);
    setIsLoading(false);
  };

  const handleApproveItem = async (itemId: string) => {
    const { error } = await supabase.from('items').update({ status: 'approved' }).eq('id', itemId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to approve item.', variant: 'destructive' });
    } else {
      toast({ title: '✅ Item approved!', description: 'The item is now visible in the feed.' });
      fetchData();
    }
    setSelectedItem(null);
  };

  const handleRejectItem = async (itemId: string) => {
    const { error } = await supabase.from('items').update({ status: 'rejected', rejection_note: rejectionNote }).eq('id', itemId);
    if (error) {
      toast({ title: 'Error', description: 'Failed to reject item.', variant: 'destructive' });
    } else {
      toast({ title: 'Item rejected' });
      fetchData();
    }
    setSelectedItem(null);
    setRejectionNote('');
  };

  const handleApproveClaim = async (claimId: string, itemId: string) => {
    await supabase.from('claims').update({ status: 'approved' }).eq('id', claimId);
    await supabase.from('items').update({ status: 'claimed' }).eq('id', itemId);
    toast({ title: '🎉 Claim approved!', description: 'The item has been marked as claimed.' });
    fetchData();
    setSelectedClaim(null);
  };

  const handleRejectClaim = async (claimId: string) => {
    await supabase.from('claims').update({ status: 'rejected', rejection_note: rejectionNote }).eq('id', claimId);
    toast({ title: 'Claim rejected' });
    fetchData();
    setSelectedClaim(null);
    setRejectionNote('');
  };

  if (loading || role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="w-12 h-12 rounded-full gradient-primary animate-spin flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-background"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      <main className="container py-6">
        {/* Admin Hero */}
        <div className="relative mb-8 p-6 rounded-2xl gradient-primary text-primary-foreground overflow-hidden shadow-xl shadow-primary/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold">Admin Dashboard</h1>
              <p className="text-primary-foreground/80">Manage posts and claims</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card className="card-hover border-0 shadow-lg overflow-hidden">
            <div className="h-1 gradient-lost" />
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-3xl font-bold">{pendingItems.length}</p>
                <p className="text-sm text-muted-foreground">Pending Posts</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-hover border-0 shadow-lg overflow-hidden">
            <div className="h-1 gradient-primary" />
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold">{allItems.length}</p>
                <p className="text-sm text-muted-foreground">Active Items</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="card-hover border-0 shadow-lg overflow-hidden">
            <div className="h-1 gradient-found" />
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-found/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-found" />
              </div>
              <div>
                <p className="text-3xl font-bold">{claims.length}</p>
                <p className="text-sm text-muted-foreground">Pending Claims</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="pending" className="data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
              <AlertCircle className="w-4 h-4 mr-2" />
              Pending ({pendingItems.length})
            </TabsTrigger>
            <TabsTrigger value="items" className="data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
              <Package className="w-4 h-4 mr-2" />
              Items ({allItems.length})
            </TabsTrigger>
            <TabsTrigger value="claims" className="data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="w-4 h-4 mr-2" />
              Claims ({claims.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {pendingItems.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                  <Check className="w-8 h-8 text-success" />
                </div>
                <p className="text-lg font-semibold">All caught up!</p>
                <p className="text-muted-foreground">No pending posts to review</p>
              </Card>
            ) : (
              pendingItems.map((item, index) => (
                <Card 
                  key={item.id} 
                  className="card-hover cursor-pointer border-0 shadow-md animate-fade-in" 
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    {item.image_urls?.[0] ? (
                      <img src={item.image_urls[0]} className="w-16 h-16 object-cover rounded-xl" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                        <Eye className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold">{item.title}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge className={item.type === 'lost' ? 'gradient-lost text-white border-0' : 'gradient-found text-white border-0'}>
                          {item.type === 'lost' ? '🔍 Lost' : '✨ Found'}
                        </Badge>
                        <Badge variant="outline">{CATEGORY_LABELS[item.category]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{item.location}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="icon" 
                        className="gradient-found btn-bounce shadow-md"
                        onClick={(e) => { e.stopPropagation(); handleApproveItem(item.id); }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="destructive"
                        className="btn-bounce shadow-md"
                        onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="items" className="space-y-3">
            {allItems.map((item, index) => (
              <Card 
                key={item.id} 
                className="border-0 shadow-md animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  {item.image_urls?.[0] ? (
                    <img src={item.image_urls[0]} className="w-16 h-16 object-cover rounded-xl" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                      <Eye className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold">{item.title}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge className={item.type === 'lost' ? 'gradient-lost text-white border-0' : 'gradient-found text-white border-0'}>
                        {item.type === 'lost' ? '🔍 Lost' : '✨ Found'}
                      </Badge>
                      <Badge variant="secondary">{STATUS_LABELS[item.status]}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="claims" className="space-y-3">
            {claims.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold">No pending claims</p>
                <p className="text-muted-foreground">Claims will appear here when submitted</p>
              </Card>
            ) : (
              claims.map((claim, index) => (
                <Card 
                  key={claim.id} 
                  className="card-hover cursor-pointer border-0 shadow-md animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => setSelectedClaim(claim)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold">{claim.items?.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Claimed by: <span className="text-foreground">{claim.profiles?.full_name}</span>
                        </p>
                        <p className="text-sm mt-2 line-clamp-2">{claim.message}</p>
                        {claim.proof_image_urls?.length > 0 && (
                          <Badge variant="outline" className="mt-2">
                            📷 {claim.proof_image_urls.length} proof image(s)
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="icon"
                          className="gradient-found btn-bounce shadow-md"
                          onClick={(e) => { e.stopPropagation(); handleApproveClaim(claim.id, claim.item_id); }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="destructive"
                          className="btn-bounce shadow-md"
                          onClick={(e) => { e.stopPropagation(); setSelectedClaim(claim); }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
      <MobileNav />

      {/* Item Review Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => { setSelectedItem(null); setRejectionNote(''); }}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Review Item
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {selectedItem.image_urls?.[0] && (
                <img src={selectedItem.image_urls[0]} className="w-full h-48 object-cover rounded-xl" />
              )}
              <div>
                <h3 className="font-bold text-lg">{selectedItem.title}</h3>
                <div className="flex gap-2 mt-1">
                  <Badge className={selectedItem.type === 'lost' ? 'gradient-lost text-white border-0' : 'gradient-found text-white border-0'}>
                    {selectedItem.type === 'lost' ? '🔍 Lost' : '✨ Found'}
                  </Badge>
                  <Badge variant="outline">{CATEGORY_LABELS[selectedItem.category]}</Badge>
                </div>
              </div>
              <p className="text-muted-foreground">{selectedItem.description}</p>
              <p className="text-sm">📍 {selectedItem.location}</p>
              
              <Textarea 
                placeholder="Rejection note (optional)" 
                value={rejectionNote} 
                onChange={(e) => setRejectionNote(e.target.value)}
                className="bg-background/50"
              />
              
              <div className="flex gap-2">
                <Button onClick={() => handleApproveItem(selectedItem.id)} className="flex-1 gradient-found btn-bounce">
                  <Check className="mr-2 h-4 w-4" /> Approve
                </Button>
                <Button variant="destructive" onClick={() => handleRejectItem(selectedItem.id)} className="flex-1 btn-bounce">
                  <X className="mr-2 h-4 w-4" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Claim Review Dialog */}
      <Dialog open={!!selectedClaim} onOpenChange={() => { setSelectedClaim(null); setRejectionNote(''); }}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Review Claim
            </DialogTitle>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="font-semibold">{selectedClaim.items?.title}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Claimant</p>
                <p className="font-medium">{selectedClaim.profiles?.full_name}</p>
                <p className="text-sm text-muted-foreground">{selectedClaim.profiles?.email}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Message</p>
                <p>{selectedClaim.message}</p>
              </div>

              {selectedClaim.proof_image_urls?.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Proof Images</p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedClaim.proof_image_urls.map((url: string, i: number) => (
                      <img key={i} src={url} className="w-24 h-24 object-cover rounded-xl" />
                    ))}
                  </div>
                </div>
              )}
              
              <Textarea 
                placeholder="Rejection note (optional)" 
                value={rejectionNote} 
                onChange={(e) => setRejectionNote(e.target.value)}
                className="bg-background/50"
              />
              
              <div className="flex gap-2">
                <Button onClick={() => handleApproveClaim(selectedClaim.id, selectedClaim.item_id)} className="flex-1 gradient-found btn-bounce">
                  <Check className="mr-2 h-4 w-4" /> Approve
                </Button>
                <Button variant="destructive" onClick={() => handleRejectClaim(selectedClaim.id)} className="flex-1 btn-bounce">
                  <X className="mr-2 h-4 w-4" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}