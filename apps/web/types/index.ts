import { User as FirebaseUser } from 'firebase/auth';
import { 
  User as SharedUser, 
  VendorStatus, 
  Vendor, 
  DiscountType, 
  Order, 
  OrderItem, 
  MenuItem, 
  Payment,
  Campus as SharedCampus,
  DeliveryPartner
} from '@campus-crave/shared-types';

// 1. Re-export all shared types
export * from '@campus-crave/shared-types';

// 2. Frontend-specific types
export interface DbUser extends SharedUser {
  vendor?: {
    id: string;
    status: VendorStatus;
    businessName: string;
  } | null;
}

export interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: DbUser | null;
  loading: boolean;
  logout: () => void;
}

export interface CartItem {
  id: string;
  name: string;
  price: string | number;
  quantity: number;
  isVeg: boolean;
  vendorId: string;
  imageUrl?: string | null;
}

export interface CartContextType {
  cartItems: CartItem[];
  vendorId: string | null;
  vendorName: string | null;
  addToCart: (item: any, vendorId: string, vendorName: string) => { success: boolean; conflict?: boolean };
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
}

export interface CampusContextType {
  selectedCampusId: string | null;
  selectedCampusName: string | null;
  deliveryAddress: string;
  setCampus: (id: string, name: string) => void;
  setDeliveryAddress: (address: string) => void;
  campuses: SharedCampus[];
  isLoading: boolean;
}

export interface RestaurantCard extends Vendor {
  menuCategories: {
    name: string;
  }[];
  coupons: {
    code: string;
    discountType: DiscountType;
    value: number;
  }[];
}

export interface OrderWithDetails extends Order {
  vendor: Vendor;
  items: (OrderItem & { menuItem: MenuItem })[];
  payment: Payment | null;
  user?: SharedUser;
  deliveryPartner?: (DeliveryPartner & { user: SharedUser }) | null;
}
