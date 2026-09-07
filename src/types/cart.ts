export interface CartItem {
  id?: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variantId?: number;
  size?: string;
  color?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  description: string;
  features: string[];
  rating: string;
  reviews: string;
}

export interface Order {
  id: string;
  date: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
  };
  payment: {
    method: string;
    cardLast4: string;
    cardName: string;
  };
  items: CartItem[];
}
