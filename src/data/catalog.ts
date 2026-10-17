export const services = [
  {
    id: 'weddings',
    name: 'Weddings',
    image: 1,
    description: 'The rituals, the laughter, the people you love.',
  },
  {
    id: 'pre-wedding',
    name: 'Pre-wedding shoots',
    image: 2,
    description: 'Just the two of you. Somewhere you love.',
  },
  {
    id: 'engagements',
    name: 'Engagements',
    image: 3,
    description: 'A new beginning, surrounded by family.',
  },
  {
    id: 'celebrations',
    name: 'Birthdays & celebrations',
    image: 4,
    description: 'Big milestones. Little moments. All worth keeping.',
  },
  {
    id: 'maternity',
    name: 'Maternity & baby',
    image: 5,
    description: 'Gentle portraits of your growing family.',
  },
  {
    id: 'commercial',
    name: 'Corporate & commercial',
    image: null,
    description: 'Your people, your business, your next chapter.',
  },
] as const;

// All rates and eligibility remain development samples, not studio-approved offers.
export const catalogueNotice =
  'Development sample rates. Services, inclusions and final pricing require studio confirmation. Travel, tax and delivery are not calculated.';
export const bookableServices = [
  { id: 'candid', name: 'Candid photography', price: 15000 },
  { id: 'traditional-photo', name: 'Traditional photography', price: 10000 },
  { id: 'cinematic', name: 'Cinematic video', price: 25000 },
  { id: 'traditional-video', name: 'Traditional video', price: 12000 },
  { id: 'drone', name: 'Drone coverage', price: 8000 },
  { id: 'audience-video', name: 'Audience video', price: 12000 },
  { id: 'outdoor', name: 'Outdoor shoot', price: 15000 },
  { id: 'album', name: 'Photo album', price: 10000 },
  { id: 'streaming', name: 'Live streaming', price: 7000 },
  { id: 'led-wall', name: 'LED wall', price: 15000 },
  { id: 'crane', name: 'Crane camera', price: 12000 },
] as const;
