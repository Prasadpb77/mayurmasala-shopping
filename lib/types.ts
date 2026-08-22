export type OrderStatus = "received" | "processing" | "out_for_delivery" | "delivered";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  qty: number;
  image_url?: string | null;
}

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  is_whatsapp: boolean;
  address: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  payment_received: boolean;
  bill_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Order Received",
  processing: "Processing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

export const STATUS_ORDER: OrderStatus[] = [
  "received",
  "processing",
  "out_for_delivery",
  "delivered",
];
