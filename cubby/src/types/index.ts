export type UserRole = 'traveller' | 'host' | 'both';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  role: UserRole;
  is_verified: boolean;
  created_at: string;
}

export interface Host {
  id: string;
  user_id: string;
  display_name: string;
  bio: string;
  avatar_url?: string;
  location_name: string;         // e.g. "Sea Point, Cape Town"
  latitude: number;
  longitude: number;
  business_type: 'cafe' | 'home' | 'shop' | 'guesthouse' | 'other';
  photos: string[];
  price_per_bag_per_day: number; // in ZAR
  max_bags: number;
  available_from: string;        // "08:00"
  available_until: string;       // "20:00"
  available_days: string[];      // ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
  rating: number;
  review_count: number;
  response_rate: number;         // 0-100
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  traveller_id: string;
  host_id: string;
  host: Host;
  drop_off_date: string;
  drop_off_time: string;
  pick_up_date: string;
  pick_up_time: string;
  bag_count: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  pin_code: string;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  host_id: string;
  reviewer_name: string;
  reviewer_avatar?: string;
  rating: number;
  comment: string;
  created_at: string;
}
