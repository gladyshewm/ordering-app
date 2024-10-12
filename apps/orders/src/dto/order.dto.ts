export type OrderItemDTO = {
  sku: string;
  quantity: number;
  price: number;
};

export type CreateOrderDTO = {
  items: OrderItemDTO[];
  address: string;
  phoneNumber: string;
};

export type OrderDTO = CreateOrderDTO & {
  _id: string;
  status: OrderStatus;
  totalPrice: number;
  statusHistory: StatusHistory[];
};

export type StatusHistory = {
  status: OrderStatus;
  date: Date;
  comment?: string;
};

export type CreatedOrderDTO = Omit<OrderDTO, 'status' | 'statusHistory'>;

export enum OrderStatus {
  CREATED = 'created',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}
