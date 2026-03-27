import { STOREFRONT_CATEGORIES, getCategoryPath } from './productPresentation';

export const storefrontDetails = {
  brandName: 'SES ICT HUB',
  whatsappNumber: '254720480475',
  phone: '+254716253365',
  email: 'sales@sesicthub.co.ke',
  shortLocation: 'Moi Avenue Shop',
  fullLocation: 'Tembo Cooperative House, 3rd Floor, Room 1, Moi Avenue, Opposite Bihi Towers, Nairobi',
  hours: ['Mon - Fri: 09:00 - 19:00', 'Sat: 09:00 - 17:00', 'Sun: Closed'],
  topBarItems: ['2-hour Nairobi delivery', 'M-PESA', 'Pay on Delivery', 'Moi Avenue Shop'],
  paymentSummary: 'M-PESA, card transfer support, and pay on delivery where applicable.',
  deliverySummary: 'Same-day Nairobi options with pickup at the Moi Avenue shop.',
  warrantySummary: 'Tested devices with 3 to 12 month warranty support depending on the item.'
};

export const footerContactLinks = [
  { label: 'WhatsApp', href: buildWhatsAppLink('Hi SES ICT HUB, I would like help choosing a device.'), tone: 'whatsapp' },
  { label: 'Call', href: `tel:${storefrontDetails.phone.replace(/\s+/g, '')}`, tone: 'neutral' },
  { label: 'Email', href: `mailto:${storefrontDetails.email}`, tone: 'neutral' }
];

export const paymentMethods = ['M-PESA', 'Visa', 'Bank Transfer', 'Pay on Delivery'];

export const mainShopLinks = STOREFRONT_CATEGORIES.map((category) => ({
  label: category.label,
  href: getCategoryPath(category.slug)
}));

export const supportLinks = [
  { label: 'FAQ', href: '/faq' },
  { label: 'Track Order', href: '/track' },
  { label: 'Contact', href: '/contact' }
];

export function buildWhatsAppLink(message: string) {
  return `https://wa.me/${storefrontDetails.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
