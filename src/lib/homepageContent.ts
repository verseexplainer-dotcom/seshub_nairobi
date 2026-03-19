export const techBrands = ['Apple', 'Samsung', 'HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Canon', 'Epson', 'Microsoft'];

export interface HomeTestimonial {
  id?: string;
  name: string;
  persona: string;
  rating: number;
  quote: string;
}

export const homeTestimonials = [
  {
    name: 'Anita Njeri',
    persona: 'student',
    rating: 5,
    quote: 'I was unsure about refurbished laptops, but their grading was clear and my Grade A MacBook feels excellent.'
  },
  {
    name: 'Brian Omondi',
    persona: 'student',
    rating: 5,
    quote: 'Got a Grade A HP EliteBook for campus work. Clean, affordable, and delivered fast in Nairobi.'
  },
  {
    name: 'David Kiprop',
    persona: 'business',
    rating: 5,
    quote: 'Reliable products, fast delivery, and helpful after-sales support. A solid choice for Nairobi businesses.'
  },
  {
    name: 'Kevin Mutua',
    persona: 'cyber_owner',
    rating: 5,
    quote: 'Bought refurbished monitors and printers for my cyber cafe. Great value and easy M-PESA payment on delivery.'
  },
  {
    name: 'Sarah Wambui',
    persona: 'business',
    rating: 5,
    quote: 'SES ICT HUB supplied a clean Dell workstation for my office. Professional service and very reliable.'
  }
] satisfies HomeTestimonial[];

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
    id: 'fast-delivery-buying-flow',
    category: 'Storefront Tips',
    date: 'March 5, 2026',
    title: 'How to confirm stock quickly and move from browse to delivery on the same day',
    excerpt: 'The fastest path from homepage browsing to WhatsApp confirmation when the order is time-sensitive.',
    href: '/blog#fast-delivery-buying-flow'
  }
];
