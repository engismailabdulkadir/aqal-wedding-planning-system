/** Customer marketplace filter buttons → API category group keys */
export const MARKETPLACE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'venue', label: 'Halls' },
  { key: 'groom', label: 'Groom' },
  { key: 'bride', label: 'Bride' },
  { key: 'cakes', label: 'Cakes' },
  { key: 'decoration', label: 'Decoration' },
  { key: 'photography', label: 'Photography' },
  { key: 'beauty', label: 'Beauty' },
  { key: 'other', label: 'Other' },
];

export function marketplaceEmptyMessage(categoryKey) {
  if (categoryKey === 'venue') {
    return 'No wedding halls available yet.';
  }
  if (!categoryKey || categoryKey === 'all') {
    return 'No wedding services available yet.';
  }
  return 'No services available in this category.';
}
