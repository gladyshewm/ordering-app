export enum OrderStatus {
  CREATED = 'created',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export class StatusHistory {
  status: OrderStatus;
  date: Date;
  comment?: string;
}

export class CreatedOrderDTO {
  _id: string;
  name: string;
  price: number;
  phoneNumber: string;
  status: OrderStatus;
  statusHistory: StatusHistory[];
}
