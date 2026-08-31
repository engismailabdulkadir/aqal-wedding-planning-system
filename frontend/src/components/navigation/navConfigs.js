import {
  FiBarChart2,
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiCheckSquare,
  FiCreditCard,
  FiHeart,
  FiHome,
  FiMessageSquare,
  FiShoppingBag,
  FiUsers,
} from 'react-icons/fi';

export const adminNav = [
  { type: 'link', label: 'Dashboard', to: '/admin/dashboard', icon: FiHome, end: true },
  {
    type: 'group',
    id: 'admin-users',
    label: 'User Management',
    icon: FiUsers,
    children: [
      { label: 'Add User', to: '/admin/users/add' },
      { label: 'Manage Users', to: '/admin/users/manage' },
    ],
  },
  {
    type: 'group',
    id: 'admin-weddings',
    label: 'Wedding Management',
    icon: FiHeart,
    children: [
      { label: 'Weddings', to: '/admin/weddings' },
      { label: 'Venues', to: '/admin/venues' },
      { label: 'Wedding Services', to: '/admin/services' },
    ],
  },
  {
    type: 'group',
    id: 'admin-ops',
    label: 'Operations',
    icon: FiCalendar,
    children: [
      { label: 'Bookings', to: '/admin/bookings' },
      { label: 'Hall Quotes', to: '/admin/quotes' },
      { label: 'Orders', to: '/admin/orders' },
    ],
  },
  {
    type: 'group',
    id: 'admin-finance',
    label: 'Finance',
    icon: FiCreditCard,
    children: [
      { label: 'Payments', to: '/admin/payments' },
    ],
  },
  {
    type: 'group',
    id: 'admin-comms',
    label: 'Communication',
    icon: FiMessageSquare,
    children: [
      { label: 'Messages', to: '/admin/messages' },
    ],
  },
  {
    type: 'group',
    id: 'admin-notifications',
    label: 'Notifications',
    icon: FiBell,
    children: [
      { label: 'Send Notification', to: '/admin/notifications/send' },
      { label: 'Manage Notifications', to: '/admin/notifications', end: true },
      { label: 'Announcements', to: '/admin/notifications/announcements' },
    ],
  },
  {
    type: 'group',
    id: 'admin-reports',
    label: 'Reports / Analytics',
    icon: FiBarChart2,
    children: [
      { label: 'Overview Reports', to: '/admin/reports', end: true },
      { label: 'Financial Analytics', to: '/admin/reports/finance' },
      { label: 'Operations Analytics', to: '/admin/reports/operations' },
    ],
  },
];

export const coupleNav = [
  { type: 'link', label: 'Dashboard', to: '/dashboard', icon: FiHome, end: true },
  {
    type: 'group',
    id: 'couple-wedding',
    label: 'Our Wedding',
    icon: FiHeart,
    children: [
      { label: 'Wedding Profile', to: '/weddings', end: true },
      { label: 'Wedding Workspace', to: '/workspace' },
      { label: 'Tasks', to: '/tasks' },
      { label: 'Timeline', to: '/timeline' },
    ],
  },
  {
    type: 'group',
    id: 'customer-bookings',
    label: 'Bookings & Services',
    icon: FiShoppingBag,
    children: [
      { label: 'Marketplace', to: '/marketplace' },
      { label: 'Wedding Cart', to: '/wedding-cart' },
      { label: 'Booking Center', to: '/bookings/center' },
      { label: 'My Bookings', to: '/bookings', end: true },
      { label: 'Hall Quotes', to: '/quotes' },
      { label: 'Venues', to: '/venues' },
      { label: 'Wedding Services', to: '/services' },
      { label: 'My Selections', to: '/selections' },
    ],
  },
  {
    type: 'group',
    id: 'customer-guests',
    label: 'Guests & Invitations',
    icon: FiUsers,
    children: [
      { label: 'Guests', to: '/guests' },
      { label: 'Invitations', to: '/invitations' },
    ],
  },
  {
    type: 'group',
    id: 'customer-finance',
    label: 'Finance',
    icon: FiCreditCard,
    children: [
      { label: 'Budget', to: '/budget' },
      { label: 'Payments', to: '/payments' },
    ],
  },
  {
    type: 'group',
    id: 'customer-comms',
    label: 'Communication',
    icon: FiMessageSquare,
    children: [
      { label: 'Messages', to: '/messages' },
    ],
  },
  { type: 'link', label: 'Reports', to: '/reports', icon: FiBarChart2 },
];

export const customerNav = coupleNav;

export const plannerNav = [
  { type: 'link', label: 'Dashboard', to: '/planner/dashboard', icon: FiHome, end: true },
  {
    type: 'group',
    id: 'planner-weddings',
    label: 'Assigned Weddings',
    icon: FiBriefcase,
    children: [
      { label: 'All Assigned Weddings', to: '/planner/weddings', end: true },
      { label: 'Upcoming Weddings', to: '/planner/weddings?filter=upcoming' },
    ],
  },
  {
    type: 'group',
    id: 'planner-coord',
    label: 'Wedding Coordination',
    icon: FiCheckSquare,
    children: [
      { label: 'Tasks', to: '/planner/weddings?view=tasks' },
      { label: 'Timeline', to: '/planner/weddings?view=timeline' },
      { label: 'Guests Overview', to: '/planner/weddings?view=guests' },
      { label: 'Selected Services', to: '/planner/weddings?view=services' },
    ],
  },
  {
    type: 'group',
    id: 'planner-vendors',
    label: 'Vendors & Bookings',
    icon: FiShoppingBag,
    children: [
      { label: 'Vendors', to: '/planner/messages' },
      { label: 'Bookings / Orders', to: '/planner/weddings?view=bookings' },
    ],
  },
  {
    type: 'group',
    id: 'planner-comms',
    label: 'Communication',
    icon: FiMessageSquare,
    children: [
      { label: 'Messages', to: '/planner/messages' },
    ],
  },
  { type: 'link', label: 'Reports / Progress', to: '/planner/reports', icon: FiBarChart2 },
];

export const vendorNav = [
  { type: 'link', label: 'Dashboard', to: '/vendor/dashboard', icon: FiHome, end: true },
  {
    type: 'group',
    id: 'vendor-business',
    label: 'My Business',
    icon: FiBriefcase,
    children: [
      { label: 'Business Profile', to: '/vendor/profile' },
      { label: 'My Listings', to: '/vendor/listings' },
      { label: 'Availability', to: '/vendor/availability' },
    ],
  },
  {
    type: 'group',
    id: 'vendor-ops',
    label: 'Operations',
    icon: FiCalendar,
    children: [
      { label: 'Bookings', to: '/vendor/bookings' },
      { label: 'Hall Quotes', to: '/vendor/quotes' },
      { label: 'Orders', to: '/vendor/orders' },
    ],
  },
  {
    type: 'group',
    id: 'vendor-finance',
    label: 'Finance',
    icon: FiCreditCard,
    children: [
      { label: 'Payments', to: '/vendor/payments' },
    ],
  },
  {
    type: 'group',
    id: 'vendor-comms',
    label: 'Communication',
    icon: FiMessageSquare,
    children: [
      { label: 'Messages', to: '/vendor/messages' },
    ],
  },
  { type: 'link', label: 'Reports / Analytics', to: '/vendor/reports', icon: FiBarChart2 },
];
