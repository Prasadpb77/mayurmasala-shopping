export type OrderStatus =
  | "received"
  | "processing"
  | "out_for_delivery"
  | "delivered"
  | "return_not_delivered";

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
  address_line1: string;
  address_line2: string | null;
  pincode: string;
  city: string;
  state: string;
  address: string | null; // legacy combined address, kept for old orders
  items: OrderItem[];
  subtotal: number | null; // items total, before delivery charge (null on pre-migration orders)
  delivery_charge: number; // resolved server-side from the customer's zone at order time
  delivery_zone: string | null; // zone key, e.g. "pune_local", "mumbai" — for reference/reporting
  total: number;
  status: OrderStatus;
  payment_received: boolean;
  bill_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function formatOrderAddress(order: Order): string {
  const parts = [
    order.address_line1,
    order.address_line2,
    order.city && order.pincode ? `${order.city} - ${order.pincode}` : order.city || order.pincode,
    order.state,
  ].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return order.address || "";
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Order Received",
  processing: "Processing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  return_not_delivered: "Return / Not Delivered",
};

export interface Review {
  id: string;
  author_name: string;
  rating: number;
  review_text: string;
  review_date: string | null;
  featured: boolean;
  sort_order: number;
  created_at?: string;
}

// Main forward-moving flow shown as the tracking timeline on the customer side.
export const STATUS_ORDER: OrderStatus[] = [
  "received",
  "processing",
  "out_for_delivery",
  "delivered",
];

// All statuses selectable from the admin dashboard, including the
// exception status for failed/returned deliveries.
export const ADMIN_STATUS_OPTIONS: OrderStatus[] = [
  "received",
  "processing",
  "out_for_delivery",
  "delivered",
  "return_not_delivered",
];
