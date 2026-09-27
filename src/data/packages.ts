import { BanquetPackage } from '../types/banquet';

export const BANQUET_PACKAGES: BanquetPackage[] = [
  {
    id: 'pkg-a',
    code: 'PACKAGE_A',
    name: 'Package A — Classic Wedding',
    category: 'Wedding',
    capacity: 300,
    foodSupported: ['Vegetarian'],
    dinnerPricePerGuest: 800,
    decorationPrice: 40000,
    roomPricePerRoom: 2000,
    maxRooms: 10,
    description: 'An elegant traditional wedding hall package featuring vegetarian culinary spreads and delicate floral styling.',
    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
    highlights: ['Pure Vegetarian Menu', 'Standard Stage & Floral Backdrop', 'Up to 10 Guest Rooms', 'Dedicated Service Staff']
  },
  {
    id: 'pkg-b',
    code: 'PACKAGE_B',
    name: 'Package B — Premium Wedding',
    category: 'Wedding',
    capacity: 500,
    foodSupported: ['Vegetarian', 'Jain'],
    dinnerPricePerGuest: 1100,
    decorationPrice: 65000,
    roomPricePerRoom: 2500,
    maxRooms: 20,
    description: 'Spacious banquet ballroom with dual Vegetarian and specialized Jain culinary counters, premium ambient lighting, and bridal suites.',
    imageUrl: 'https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=800&q=80',
    highlights: ['Vegetarian + Certified Jain Catering', 'Designer Stage & Entrance Arch', 'Up to 20 AC Deluxe Rooms', 'Acoustic Sound Rigging']
  },
  {
    id: 'pkg-c',
    code: 'PACKAGE_C',
    name: 'Package C — Royal Wedding',
    category: 'Wedding',
    capacity: 800,
    foodSupported: ['Vegetarian', 'Jain'],
    dinnerPricePerGuest: 1500,
    decorationPrice: 100000,
    roomPricePerRoom: 3000,
    maxRooms: 40,
    description: 'Palatial banquet grand hall designed for large-scale royal celebrations, multi-station gourmet feasts with Jain options, and expansive guest lodging.',
    imageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80',
    highlights: ['Grand Multi-Cuisine Veg & Jain Buffet', 'Lavish Royal Thematic Décor & Chandeliers', 'Up to 40 Luxury Rooms', 'Red Carpet Foyer & Valet Rigging']
  },
  {
    id: 'pkg-d',
    code: 'PACKAGE_D',
    name: 'Package D — Corporate Basic',
    category: 'Corporate',
    capacity: 200,
    foodSupported: ['Vegetarian'],
    dinnerPricePerGuest: 600,
    decorationPrice: 20000,
    roomPricePerRoom: 1500,
    maxRooms: 5,
    description: 'Streamlined corporate seminar and banquet space equipped for focused business meetings, dinners, and product launches.',
    imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
    highlights: ['Executive Vegetarian Dinner Buffet', 'Minimalist Corporate Stage & Podium', 'Up to 5 Business Rooms', 'High-Speed Wi-Fi & AV Integration']
  },
  {
    id: 'pkg-e',
    code: 'PACKAGE_E',
    name: 'Package E — Corporate Premium',
    category: 'Corporate',
    capacity: 500,
    foodSupported: ['Vegetarian', 'Jain'],
    dinnerPricePerGuest: 950,
    decorationPrice: 50000,
    roomPricePerRoom: 2500,
    maxRooms: 15,
    description: 'High-capacity corporate convention ballroom with multi-station Veg & Jain culinary service, digital presentation staging, and executive accommodation.',
    imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80',
    highlights: ['Executive Veg & Jain Dinner Experience', 'Premium Keynote Stage, LED Truss & Lighting', 'Up to 15 Executive Suites', 'Dedicated Conference Coordinator']
  }
];
