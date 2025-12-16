export type ItemType = 'lost' | 'found';
export type ItemStatus = 'pending' | 'approved' | 'rejected' | 'claimed' | 'resolved';
export type ClaimStatus = 'pending' | 'approved' | 'rejected';
export type ItemCategory = 'stationery' | 'electronics' | 'clothing' | 'id_docs' | 'other';
export type AppRole = 'student' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  description: string;
  category: ItemCategory;
  location: string;
  item_date: string;
  image_urls: string[];
  created_by: string;
  status: ItemStatus;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Claim {
  id: string;
  item_id: string;
  claimant_id: string;
  message: string;
  proof_image_urls: string[];
  status: ClaimStatus;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
  items?: Item;
  profiles?: Profile;
}

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  stationery: 'Stationery',
  electronics: 'Electronics',
  clothing: 'Clothing',
  id_docs: 'ID/Docs',
  other: 'Other',
};

export const STATUS_LABELS: Record<ItemStatus, string> = {
  pending: 'Pending Review',
  approved: 'Open',
  rejected: 'Rejected',
  claimed: 'Claimed',
  resolved: 'Resolved',
};