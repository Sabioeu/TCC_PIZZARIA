import React from 'react';

const paths = {
  pizza: ['M15 11h.01', 'M11 15h.01', 'M16 16h.01', 'M2.8 19.2 12 3l9.2 16.2A18.5 18.5 0 0 1 2.8 19.2Z', 'M5.3 14.8a13.4 13.4 0 0 0 13.4 0'],
  dashboard: ['M3 13h8V3H3v10Z', 'M13 21h8V11h-8v10Z', 'M3 21h8v-6H3v6Z', 'M13 9h8V3h-8v6Z'],
  orders: ['M6 2h12l2 4H4l2-4Z', 'M4 6v15h16V6', 'M8 10h8', 'M8 14h5'],
  receipt: ['M5 3v18l3-2 4 2 4-2 3 2V3l-3 2-4-2-4 2-3-2Z', 'M9 9h6', 'M9 13h6'],
  tables: ['M4 10h16', 'M6 10V6h12v4', 'M7 10v9', 'M17 10v9', 'M4 14h16'],
  finance: ['M4 5h16v14H4z', 'M4 9h16', 'M8 14h2', 'M14 14h2'],
  clients: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  products: ['M12 2 3 7l9 5 9-5-9-5Z', 'm3 12 9 5 9-5', 'm3 17 9 5 9-5', 'M3 7v10', 'M21 7v10'],
  ingredients: ['M7 3h10', 'M8 3l1 18h6l1-18', 'M9 8h6', 'M9.5 14h5'],
  inventory: ['M3 6h18', 'M5 6v15h14V6', 'M8 10h8', 'M10 14h4'],
  suppliers: ['M3 21h18', 'M5 21V7l7-4 7 4v14', 'M9 21v-5h6v5', 'M9 9h.01', 'M15 9h.01', 'M9 12h.01', 'M15 12h.01'],
  users: ['M20 21a8 8 0 0 0-16 0', 'M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z'],
  reports: ['M5 3h14v18H5z', 'M9 17v-3', 'M12 17V9', 'M15 17v-6'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  close: ['m6 6 12 12', 'm18 6-12 12'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  eyeOff: ['m3 3 18 18', 'M10.5 5.1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1', 'M6.5 6.5A18 18 0 0 0 2 12s3.5 7 10 7c1.7 0 3.2-.5 4.5-1.2', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
  lock: ['M5 10h14v11H5z', 'M8 10V7a4 4 0 0 1 8 0v3', 'M12 14v3'],
  mail: ['M3 5h18v14H3z', 'm3 6 9 7 9-7'],
  shield: ['M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z', 'm8 12 3 3 5-5'],
  calendar: ['M3 5h18v16H3z', 'M16 3v4', 'M8 3v4', 'M3 10h18'],
  plus: ['M12 5v14', 'M5 12h14'],
  arrow: ['M5 12h14', 'm13 6 6 6-6 6'],
  refresh: ['M20 6v5h-5', 'M4 18v-5h5', 'M18.5 9A7 7 0 0 0 6.2 6.2L4 11', 'M5.5 15A7 7 0 0 0 17.8 17.8L20 13'],
  wallet: ['M3 6h16v14H3z', 'M3 8a3 3 0 0 1 3-3h13v3', 'M15 12h6v5h-6z'],
  trend: ['m3 17 6-6 4 4 8-9', 'M16 6h5v5'],
  activity: ['M3 12h4l2-7 4 14 2-7h6'],
  alert: ['M12 3 2 7h6l-5 4 2 7-5-4-5 4 2-7-5-4h6l2-7Z'],
  edit: ['M4 20h4L19 9l-4-4L4 16v4Z', 'm13-13 4 4'],
  trash: ['M4 7h16', 'M9 7V4h6v3', 'm7 7 1 13h10l1-13', 'M10 11v5', 'M14 11v5'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'm21 21-4.35-4.35'],
  credit: ['M3 6h18v13H3z', 'M3 10h18', 'M7 15h2'],
  cash: ['M3 6h18v12H3z', 'M7 12h.01', 'M17 12h.01', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  check: ['m5 12 4 4L19 6'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 6v6l4 2'],
  store: ['M4 10v10h16V10', 'M3 4h18l-1 6a3 3 0 0 1-5 1 3 3 0 0 1-6 0 3 3 0 0 1-5-1L3 4Z', 'M9 20v-5h6v5'],
};

const Icon = ({ name, size = 20, className = '', ...props }) => (
  <svg
    aria-hidden="true"
    className={`icon ${className}`}
    height={size}
    viewBox="0 0 24 24"
    width={size}
    {...props}
  >
    {(paths[name] || paths.activity).map((path, index) => <path d={path} key={`${name}-${index}`} />)}
  </svg>
);

export default Icon;
