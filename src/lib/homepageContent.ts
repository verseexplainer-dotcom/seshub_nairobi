export const techBrands = ['Apple', 'Samsung', 'HP', 'Dell', 'Lenovo', 'Asus', 'Acer', 'Canon', 'Epson', 'Microsoft'];

export interface HomeTestimonial {
  id?: string;
  name: string;
  persona: string;
  rating: number;
  quote: string;
}

export interface BlogSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface BlogPost {
  id: string;
  slug: string;
  category: string;
  date: string;
  title: string;
  excerpt: string;
  seoDescription: string;
  readingMinutes: number;
  href: string;
  heroSummary: string;
  takeaway: string;
  sections: BlogSection[];
}

export const blogPosts: BlogPost[] = [
  {
    id: 'refurbished-laptop-checklist',
    slug: 'refurbished-laptop-checklist',
    category: 'Buying Guide',
    date: 'March 18, 2026',
    title: 'What to verify before you buy a refurbished laptop in Nairobi',
    excerpt: 'A practical checklist for buyers comparing grade, battery condition, ports, warranty coverage, and delivery promises.',
    seoDescription:
      'Use this Nairobi refurbished laptop checklist to compare condition, battery health, ports, warranty, software, and delivery before you pay.',
    readingMinutes: 5,
    href: '/blog/refurbished-laptop-checklist',
    heroSummary:
      'A refurbished laptop can be excellent value when the condition, battery, ports, and warranty are checked clearly before payment.',
    takeaway:
      'Ask for the exact specs, inspect the physical condition, confirm battery behavior, and keep the warranty terms in writing.',
    sections: [
      {
        heading: 'Start with the exact model and specs',
        paragraphs: [
          'Do not rely only on the product title. Confirm the processor generation, RAM size, storage type, screen size, and operating system because two laptops with similar names can perform very differently.',
          'For everyday school, office, and browser work, a Core i5 laptop with 8GB RAM and SSD storage is usually a practical baseline. Heavier design or accounting workflows may need more RAM and a newer processor.'
        ],
        bullets: [
          'CPU model and generation',
          'RAM capacity and whether it can be upgraded',
          'SSD or HDD storage type',
          'Screen size and visible display condition'
        ]
      },
      {
        heading: 'Check the body, keyboard, ports, and charger',
        paragraphs: [
          'Cosmetic marks are common on refurbished machines, but broken hinges, missing keys, cracked bezels, or loose charging ports are different issues. Those can affect daily use and repair cost.',
          'Test the keyboard, touchpad, webcam, Wi-Fi, USB ports, HDMI, audio jack, and charger connection before leaving the shop or approving delivery.'
        ]
      },
      {
        heading: 'Ask direct questions about battery behavior',
        paragraphs: [
          'Battery life varies on refurbished laptops. A responsible seller should explain what they have tested and what you should expect under normal use.',
          'If you depend on long unplugged sessions, say that before buying. It helps the team recommend a machine that matches how you actually work.'
        ],
        bullets: [
          'Does it charge consistently?',
          'Does it drain unusually fast?',
          'Does the laptop shut down suddenly under load?'
        ]
      },
      {
        heading: 'Confirm warranty and after-sale support',
        paragraphs: [
          'A clear warranty is more useful than a vague promise. Ask what is covered, how long it lasts, and what happens if a fault appears after purchase.',
          'Keep your receipt, order message, or invoice. It makes support faster if you need help later.'
        ]
      }
    ]
  },
  {
    id: 'printer-setup-basics',
    slug: 'printer-setup-basics',
    category: 'Office Setup',
    date: 'March 12, 2026',
    title: 'Choosing the right printer for a small office without overspending',
    excerpt: 'Inkjet versus laser, network setup, consumables, and the questions worth asking before checkout.',
    seoDescription:
      'Compare inkjet, laser, multifunction, wireless, and consumable costs before buying a small office printer in Kenya.',
    readingMinutes: 4,
    href: '/blog/printer-setup-basics',
    heroSummary:
      'The best printer is not always the cheapest unit on the shelf. Running costs, speed, paper handling, and support matter more over time.',
    takeaway:
      'Match the printer to your monthly volume, document type, connection needs, and refill budget before comparing prices.',
    sections: [
      {
        heading: 'Choose by workload, not only price',
        paragraphs: [
          'A home printer used a few times each week has different needs from a school office, cyber cafe, or business counter. Start with the number of pages you expect to print and whether they are mostly black-and-white or color.',
          'Laser printers are often better for frequent text documents. Ink tank printers can make sense for color work and lower refill cost when print volume is steady.'
        ]
      },
      {
        heading: 'Check the real cost of consumables',
        paragraphs: [
          'The printer price is only one part of the budget. Toner, ink, drums, maintenance boxes, and paper handling can change the total cost significantly.',
          'Before checkout, ask how easy it is to find refills and whether the model has common consumables in Kenya.'
        ],
        bullets: [
          'Toner or ink refill price',
          'Expected page yield',
          'Availability of replacement parts',
          'Warranty and service options'
        ]
      },
      {
        heading: 'Decide which functions are actually needed',
        paragraphs: [
          'Print-only machines are simpler, but many offices need scan and copy features. Duplex printing, Wi-Fi, Ethernet, and automatic document feeders are useful only when the workflow calls for them.',
          'If several people will print from phones or laptops, wireless setup should be checked before purchase.'
        ]
      },
      {
        heading: 'Plan the setup before delivery',
        paragraphs: [
          'Printer problems often come from setup assumptions. Confirm the cable, network, operating system, paper size, and driver requirements early.',
          'For offices, decide where the printer will sit, who will refill it, and how users will connect.'
        ]
      }
    ]
  },
  {
    id: 'same-day-delivery-help',
    slug: 'same-day-delivery-help',
    category: 'Shop Tips',
    date: 'March 5, 2026',
    title: 'How to confirm stock quickly and arrange delivery the same day',
    excerpt: "Message us on WhatsApp and we'll help you confirm stock, price, and delivery before you buy.",
    seoDescription:
      'Learn how to confirm live stock, price, payment details, and same-day delivery options with SES ICT HUB before ordering.',
    readingMinutes: 3,
    href: '/blog/same-day-delivery-help',
    heroSummary:
      'Fast orders work best when the product, price, delivery location, and payment plan are confirmed in one clear conversation.',
    takeaway:
      'Share the product link, ask for live stock confirmation, give your delivery area, and wait for the final total before paying.',
    sections: [
      {
        heading: 'Send the exact product link or name',
        paragraphs: [
          'A screenshot can help, but a product link or exact product name is clearer. It prevents confusion when several items have similar titles or specs.',
          'If you are comparing two products, send both links and explain what matters most: price, performance, warranty, or delivery speed.'
        ]
      },
      {
        heading: 'Ask for live stock and final price',
        paragraphs: [
          'Stock can move quickly, especially for popular laptops, phones, and printers. Ask the team to confirm availability before you start arranging payment or delivery.',
          'The final amount should include the product price and any delivery cost so there are no surprises later.'
        ],
        bullets: [
          'Product availability',
          'Final price in KES',
          'Warranty period if available',
          'Expected delivery time'
        ]
      },
      {
        heading: 'Share a delivery area early',
        paragraphs: [
          'Same-day delivery depends on location, time, rider availability, and payment confirmation. Send your area or building landmark early so the team can estimate timing.',
          'If you prefer pickup, ask the team to reserve the item and confirm shop directions before you come.'
        ]
      },
      {
        heading: 'Keep the order conversation in one place',
        paragraphs: [
          'Keeping the order details in one WhatsApp thread makes it easier to verify what was agreed: product, price, delivery, warranty, and payment status.',
          'After delivery, keep the receipt or order message for support.'
        ]
      }
    ]
  }
];

export function getBlogPostBySlug(slug: string | undefined) {
  return blogPosts.find((post) => post.slug === slug) || null;
}
