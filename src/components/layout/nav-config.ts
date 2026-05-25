export type NavItem = {
  to: string
  label: string
  icon: string
  shortLabel?: string
}

export type NavGroup = {
  group: string
  items: NavItem[]
}

const dashboardNav: NavItem = {
  to: '/dashboard',
  label: 'Dashboard',
  shortLabel: 'Home',
  icon: 'M3 12 12 4l9 8M5 10v10h14V10',
}

const invoicesNav: NavItem = {
  to: '/invoices',
  label: 'Invoices',
  icon: 'M6 3h9l4 4v14H6zM14 3v5h5M8 13h8M8 17h5',
}

const receiptsNav: NavItem = {
  to: '/receipts',
  label: 'Cash receipts',
  shortLabel: 'Receipts',
  icon: 'M4 6h16M4 12h16M4 18h10M19 18l3-3-3-3',
}

const servicesNav: NavItem = {
  to: '/services',
  label: 'Service products',
  shortLabel: 'Services',
  icon: 'M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7z',
}

const customersNav: NavItem = {
  to: '/customers',
  label: 'Customers',
  icon: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0',
}

const settingsNav: NavItem = {
  to: '/settings',
  label: 'Settings',
  icon: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
}

const mileageNav: NavItem = {
  to: '/mileage',
  label: 'Mileage',
  icon: 'M3 17h2l1-4h12l1 4h2M5 17v3h3v-3M16 17v3h3v-3M7 13l1-5h8l1 5',
}

const reportsNav: NavItem = {
  to: '/reports',
  label: 'Reports',
  icon: 'M4 19V5M9 19V11M14 19V8M19 19V14M3 19h18',
}

export const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Today',
    items: [dashboardNav],
  },
  {
    group: 'Money in',
    items: [invoicesNav, receiptsNav],
  },
  {
    group: 'Setup',
    items: [servicesNav, customersNav, settingsNav],
  },
  {
    group: 'Other',
    items: [mileageNav, reportsNav],
  },
]

export const BOTTOM_NAV: NavItem[] = [dashboardNav, invoicesNav, receiptsNav, mileageNav]

export const MORE_NAV: NavItem[] = [servicesNav, customersNav, settingsNav, reportsNav]

export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)
