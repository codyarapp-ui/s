/**
 * Shared application types for Codyar24
 */

export interface ErrorCode {
  id: string;
  code: string;
  brand: string;
  model?: string;
  category: string;
  title?: string;
  deviceType?: string;
  description: string;
  causes: string[];
  steps: string[];
  precautions?: string[];
  tools?: string[];
  costEstimate?: string;
  estimatedCost?: string;
  repairDifficulty?: 'easy' | 'medium' | 'hard';
  difficulty?: 'easy' | 'medium' | 'hard';
  relatedParts?: string[];
  related_parts?: string[];
  status?: 'approved' | 'pending' | 'rejected';
  created_at?: string;
  likes?: number;
  isApproved?: boolean;
  [key: string]: any;
}

export interface RepairOrder {
  id: string;
  user_id?: string;
  userId?: string;
  customer_name?: string;
  customerName?: string;
  customer_phone?: string;
  customerPhone?: string;
  appliance?: string;
  category?: string;
  brand?: string;
  model?: string;
  error_code?: string;
  errorCode?: string;
  problem_description?: string;
  problemDescription?: string;
  description?: string;
  city?: string;
  region?: string;
  district?: string;
  address?: string;
  date?: string;
  time_slot?: string;
  timeSlot?: string;
  status: 'pending' | 'waiting' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'accepted' | 'registered' | 'new' | 'open' | 'enroute' | 'repairing' | 'needs_part';
  technician_id?: string | null;
  technicianId?: string | null;
  technician_name?: string | null;
  technicianName?: string | null;
  technician_phone?: string | null;
  technicianPhone?: string | null;
  created_at?: string;
  createdAt?: string;
  total_cost?: number;
  totalCost?: number;
  estimatedCost?: number | string;
  labor_cost?: number;
  laborCost?: number;
  parts_cost?: number;
  partsCost?: number;
  tracking_code?: string;
  trackingCode?: string;
  notes?: string;
  parts_used?: any[];
  [key: string]: any;
}

export interface Technician {
  id: string;
  user_id?: string;
  userId?: string;
  name: string;
  full_name?: string;
  fullName?: string;
  phone: string;
  city?: string;
  region?: string;
  activeLocation?: string;
  active_location?: string;
  specialty: string[] | string;
  specialties?: string[];
  documents?: any;
  document_images?: any;
  avatarUrl?: string;
  avatar_url?: string;
  isVerified?: boolean;
  is_verified?: number | boolean;
  status?: any;
  rating?: number;
  ratingCount?: number;
  balance?: number;
  wallet_balance?: number;
  walletBalance?: number;
  commission_balance?: number;
  commission_debt?: number;
  debt_amount?: number;
  activeOrdersCount?: number;
  completed_orders?: number;
  completedOrders?: number;
  completed_orders_count?: number;
  completedOrdersCount?: number;
  created_at?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface SparePart {
  id: string;
  name: string;
  title?: string;
  category: string;
  device_category?: string;
  brand: string;
  model?: string;
  device_model?: string;
  price: number;
  stock: number;
  description?: string;
  short_description?: string;
  technical_description?: string;
  image_url?: string;
  imageUrl?: string;
  image?: string;
  part_number?: string;
  partNumber?: string;
  code?: string;
  slug?: string;
  compatibility?: string[];
  compatible_brands?: string[] | string;
  compatible_models?: string[] | string;
  compatibleModels?: string[] | string;
  models?: string[];
  is_original?: boolean;
  isOriginal?: boolean;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  text?: string;
  date?: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'sms' | string;
  created_at?: string;
  createdAt?: string;
  read?: boolean;
  link?: string;
  target_role?: string;
  targetRole?: string;
  [key: string]: any;
}

export interface CommonProblem {
  id: string;
  title: string;
  category: string;
  appliance?: string;
  brand?: string;
  model?: string;
  code?: string;
  description: string;
  symptoms?: string[];
  causes?: string[];
  steps?: string[];
  precautions?: string[];
  hazardLevel?: string;
  hazard_level?: string;
  solution?: string;
  solutions?: string[];
  likelyCauses?: string[];
  estimatedCost?: string;
  relatedParts?: string[];
  related_parts?: string[];
  video_url?: string;
  videoUrl?: string;
  views?: number;
  severity?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface PartPurchase {
  id: string;
  part_id?: string;
  partId?: string;
  part_name?: string;
  partName?: string;
  quantity: number;
  total_price?: number;
  totalPrice?: number;
  buyer_name?: string;
  buyerName?: string;
  buyer_phone?: string;
  buyerPhone?: string;
  buyer_address?: string;
  buyerAddress?: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  created_at?: string;
  tracking_number?: string;
}

export interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  priority: 'info' | 'warning' | 'urgent';
  targetRole?: 'client' | 'technician' | 'all' | 'guest';
  target_role?: string;
  actionType?: string;
  action_type?: string;
  actionUrl?: string;
  action_url?: string;
  createdAt?: string;
  created_at?: string;
  expiresAt?: string;
  expires_at?: string;
  active?: boolean;
}
