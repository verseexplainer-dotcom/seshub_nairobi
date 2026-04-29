export const CART_STORAGE_KEY = 'ses_cart';
export const CART_UPDATED_EVENT = 'cart-updated';
export const MAX_CART_ITEMS = 50;
export const MAX_ITEM_QTY = 20;

export type CartItem = {
  id: string;
  title: string;
  price_kes: number;
  slug: string | null;
  image: string;
  qty: number;
};

type CartItemInput = Omit<CartItem, 'qty'> & { qty?: number };

function encodeImagePath(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function normalizeCartValue(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .slice(0, MAX_CART_ITEMS)
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as Record<string, unknown>;
      const title = typeof record.title === 'string' ? record.title.trim().slice(0, 180) : '';
      const id = typeof record.id === 'string' ? record.id.trim().slice(0, 64) : '';
      const qty = Number(record.qty);
      const price = Number(record.price_kes);
      const slug = typeof record.slug === 'string' && record.slug.trim() ? record.slug.trim() : null;
      const image = typeof record.image === 'string' ? record.image.trim() : '';

      if (!id || !title || !Number.isFinite(price) || price <= 0 || !Number.isInteger(qty) || qty < 1) {
        return null;
      }

      return {
        id,
        title,
        price_kes: Math.round(price),
        slug,
        image,
        qty: Math.min(qty, MAX_ITEM_QTY)
      } satisfies CartItem;
    })
    .filter((item): item is CartItem => item !== null);
}

export function loadCartFromStorage() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    return normalizeCartValue(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || '[]'));
  } catch {
    return [];
  }
}

export function getCartCount(cart: CartItem[] = loadCartFromStorage()) {
  return cart.reduce((total, item) => total + item.qty, 0);
}

export function emitCartUpdated(cart: CartItem[] = loadCartFromStorage()) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(CART_UPDATED_EVENT, {
      detail: {
        count: getCartCount(cart)
      }
    })
  );
}

export function saveCartToStorage(cart: CartItem[]) {
  if (typeof window === 'undefined') {
    return [];
  }

  const normalizedCart = normalizeCartValue(cart);
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizedCart));
  emitCartUpdated(normalizedCart);
  return normalizedCart;
}

export function addCartItem(item: CartItemInput) {
  const cart = loadCartFromStorage();
  const normalizedQty = Number.isInteger(Number(item.qty)) && Number(item.qty) > 0 ? Number(item.qty) : 1;
  const nextItem: CartItem = {
    id: String(item.id || '').trim().slice(0, 64),
    title: String(item.title || '').trim().slice(0, 180),
    price_kes: Math.max(0, Math.round(Number(item.price_kes || 0))),
    slug: typeof item.slug === 'string' && item.slug.trim() ? item.slug.trim() : null,
    image: typeof item.image === 'string' ? item.image.trim() : '',
    qty: Math.min(normalizedQty, MAX_ITEM_QTY)
  };

  if (!nextItem.id || !nextItem.title || nextItem.price_kes <= 0) {
    return cart;
  }

  const existing = cart.find((entry) => entry.id === nextItem.id);
  if (existing) {
    existing.qty = Math.min(existing.qty + nextItem.qty, MAX_ITEM_QTY);
  } else if (cart.length < MAX_CART_ITEMS) {
    cart.push(nextItem);
  }

  return saveCartToStorage(cart);
}

export function safeCartImageSrc(raw: string) {
  if (!raw) {
    return '';
  }

  if (raw.startsWith('https://') || raw.startsWith('http://')) {
    return raw;
  }

  if (raw.startsWith('/storage/v1/object/public/product-images/')) {
    return raw;
  }

  if (raw.startsWith('storage/v1/object/public/product-images/')) {
    return `/${raw}`;
  }

  if (raw.startsWith('/') && !raw.startsWith('/product-images/')) {
    return raw;
  }

  const normalizedPath = raw.replace(/^\/?(product-images\/)?/, '').trim();
  return normalizedPath ? `/product-images/${encodeImagePath(normalizedPath)}` : '';
}
