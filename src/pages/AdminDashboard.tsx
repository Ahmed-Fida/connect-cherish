import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Item, Claim, CATEGORY_LABELS, STATUS_LABELS } from '@/types/database';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, X, Eye, Clock, Package, Users } from 'lucide-react';
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
      toast({ title: 'Item approved', description: 'The item is now visible in the feed.' });
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
    toast({ title: 'Claim approved', description: 'The item has been marked as claimed.' });
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
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <Header />
      <main className="container py-6">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card><CardContent className="p-4 flex items-center gap-3"><Clock className="h-8 w-8 text-warning" /><div><p className="text-2xl font-bold">{pendingItems.length}</p><p className="text-sm text-muted-foreground">Pending Posts</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><Package className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{allItems.length}</p><p className="text-sm text-muted-foreground">Active Items</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><Users className="h-8 w-8 text-found" /><div><p className="text-2xl font-bold">{claims.length}</p><p className="text-sm text-muted-foreground">Pending Claims</p></div></CardContent></Card>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">Pending Posts ({pendingItems.length})</TabsTrigger>
            <TabsTrigger value="items">All Items ({allItems.length})</TabsTrigger>
            <TabsTrigger value="claims">Claims ({claims.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <Card key={item.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelectedItem(item)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    {item.image_urls?.[0] && <img src={item.image_urls[0]} className="w-16 h-16 object-cover rounded" />}
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.title}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge className={item.type === 'lost' ? 'bg-lost text-lost-foreground' : 'bg-found text-found-foreground'}>{item.type}</Badge>
                        <Badge variant="outline">{CATEGORY_LABELS[item.category]}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); handleApproveItem(item.id); }}><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}><X className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {pendingItems.length === 0 && <p className="text-center py-8 text-muted-foreground">No pending posts</p>}
            </div>
          </TabsContent>

          <TabsContent value="items">
            <div className="space-y-3">
              {allItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    {item.image_urls?.[0] && <img src={item.image_urls[0]} className="w-16 h-16 object-cover rounded" />}
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.title}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge className={item.type === 'lost' ? 'bg-lost text-lost-foreground' : 'bg-found text-found-foreground'}>{item.type}</Badge>
                        <Badge variant="secondary">{STATUS_LABELS[item.status]}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="claims">
            <div className="space-y-3">
              {claims.map((claim) => (
                <Card key={claim.id} className="cursor-pointer hover:shadow-md" onClick={() => setSelectedClaim(claim)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{claim.items?.title}</h3>
                        <p className="text-sm text-muted-foreground">Claimed by: {claim.profiles?.full_name}</p>
                        <p className="text-sm mt-1">{claim.message}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleApproveClaim(claim.id, claim.item_id); }}><Check className="h-4 w-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); setSelectedClaim(claim); }}><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {claims.length === 0 && <p className="text-center py-8 text-muted-foreground">No pending claims</p>}
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <MobileNav />

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Item</DialogTitle></DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {selectedItem.image_urls?.[0] && <img src={selectedItem.image_urls[0]} className="w-full h-48 object-cover rounded" />}
              <h3 className="font-semibold text-lg">{selectedItem.title}</h3>
              <p className="text-muted-foreground">{selectedItem.description}</p>
              <p className="text-sm">Location: {selectedItem.location}</p>
              <Textarea placeholder="Rejection note (optional)" value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={() => handleApproveItem(selectedItem.id)} className="flex-1">Approve</Button>
                <Button variant="destructive" onClick={() => handleRejectItem(selectedItem.id)} className="flex-1">Reject</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Claim</DialogTitle></DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              <p><strong>Item:</strong> {selectedClaim.items?.title}</p>
              <p><strong>Claimant:</strong> {selectedClaim.profiles?.full_name} ({selectedClaim.profiles?.email})</p>
              <p><strong>Message:</strong> {selectedClaim.message}</p>
              {selectedClaim.proof_image_urls?.length > 0 && (
                <div className="flex gap-2">{selectedClaim.proof_image_urls.map((url: string, i: number) => <img key={i} src={url} className="w-20 h-20 object-cover rounded" />)}</div>
              )}
              <Textarea placeholder="Rejection note (optional)" value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={() => handleApproveClaim(selectedClaim.id, selectedClaim.item_id)} className="flex-1">Approve</Button>
                <Button variant="destructive" onClick={() => handleRejectClaim(selectedClaim.id)} className="flex-1">Reject</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}