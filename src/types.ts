export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  price_hot: number | null;
  price_cold: number | null;
  price_fixed: number | null;
  description: string;
  available: number;
  image?: string;
  addons?: string; // JSON string of { name: string, price: number, available?: boolean }[]
}

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  name: string;
  price: number;
  quantity: number;
  type: 'hot' | 'cold' | 'fixed';
  selected_addons?: { name: string, price: number }[];
}

export interface Order {
  id: number;
  user_email: string;
  total: number;
  status: 'pending' | 'completed';
  is_paid: number;
  payment_method?: string;
  created_at: string;
  items: OrderItem[];
}

export interface Category {
  id: number;
  name: string;
  image?: string;
  items: MenuItem[];
}
