export const techBrands = ['Apple', 'Samsung', 'HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Canon', 'Epson', 'Microsoft'];

export interface HomeTestimonial {
  id?: string;
  name: string;
  persona: string;
  rating: number;
  quote: string;
}

export const blogPosts = [
  {
    id: 'refurbished-laptop-checklist',
    category: 'Buying Guide',
    date: 'March 18, 2026',
    title: 'What to verify before you buy a refurbished laptop in Nairobi',
    excerpt: 'A practical checklist for buyers comparing grade, battery condition, ports, warranty coverage, and delivery promises.',
    href: '/blog#refurbished-laptop-checklist'
  },
  {
    id: 'printer-setup-basics',
    category: 'Office Setup',
    date: 'March 12, 2026',
    title: 'Choosing the right printer for a small office without overspending',
    excerpt: 'Inkjet versus laser, network setup, consumables, and the questions worth asking before checkout.',
    href: '/blog#printer-setup-basics'
  },
  {
    id: 'same-day-delivery-help',
    category: 'Shop Tips',
    date: 'March 5, 2026',
    title: 'How to confirm stock quickly and arrange delivery the same day',
    excerpt: "Message us on WhatsApp and we'll help you confirm stock, price, and delivery before you buy.",
    href: '/blog#same-day-delivery-help'
  }
];
