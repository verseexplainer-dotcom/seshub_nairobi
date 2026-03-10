import type {
  FulfillmentStatus,
  OrderEventType,
  PaymentStatus
} from './app-types';

export const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = [
  'pending',
  'partially_paid',
  'paid',
  'refunded'
];

export const FULFILLMENT_STATUS_OPTIONS: FulfillmentStatus[] = [
  'new',
  'contacted',
  'processing',
  'ready',
  'shipped',
  'delivered',
  'cancelled'
];

export const ACTIVE_FULFILLMENT_STATUSES: FulfillmentStatus[] = [
  'new',
  'contacted',
  'processing',
  'ready',
  'shipped'
];

export function formatKes(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  return `KSh ${amount.toLocaleString('en-KE')}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export function formatDateOnly(value: string | null | undefined) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium'
  }).format(new Date(value));
}

export function titleCaseStatus(value: string | null | undefined) {
  if (!value) return 'Unknown';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getPaymentStatusTone(status: PaymentStatus | null | undefined) {
  switch (status) {
    case 'paid':
      return 'success';
    case 'partially_paid':
      return 'warning';
    case 'refunded':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function getFulfillmentStatusTone(status: FulfillmentStatus | null | undefined) {
  switch (status) {
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'danger';
    case 'processing':
    case 'ready':
    case 'shipped':
      return 'info';
    default:
      return 'warning';
  }
}

export function describeOrderEvent(eventType: OrderEventType) {
  switch (eventType) {
    case 'order_created':
      return 'Order created';
    case 'payment_status_updated':
      return 'Payment updated';
    case 'fulfillment_status_updated':
      return 'Fulfillment updated';
    case 'note_added':
      return 'Internal note added';
    case 'backfilled':
      return 'Imported from legacy checkout';
    default:
      return 'Order updated';
  }
}
