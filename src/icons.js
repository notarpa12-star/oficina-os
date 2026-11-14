const paths = {
  wrench: 'M14.6 6.4a5 5 0 0 0-6.3 6.3l-5 5a1.8 1.8 0 0 0 2.6 2.6l5-5a5 5 0 0 0 6.3-6.3l-2.6 2.6-2.6-2.6 2.6-2.6Z',
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  clipboard: 'M8 4H5v17h14V4h-3 M8 2h8v5H8z M8 12h8 M8 16h6',
  columns: 'M3 4h18v16H3z M9 4v16 M15 4v16',
  cube: 'm12 2 9 5v10l-9 5-9-5V7l9-5Z M3 7l9 5 9-5 M12 12v10',
  menu: 'M4 6h16M4 12h16M4 18h16',
  search: 'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  plus: 'M12 5v14M5 12h14',
  clock: 'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  alert: 'M12 3 2 20h20L12 3Z M12 9v4 M12 16h.01',
  check: 'm5 12 4 4L19 6',
  activity: 'M2 12h5l3-7 4 14 3-7h5',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  close: 'm6 6 12 12M18 6 6 18',
  reset: 'M3 11a9 9 0 1 1 2 7 M3 4v7h7',
  left: 'm15 5-7 7 7 7',
  right: 'm9 5 7 7-7 7',
  calendar: 'M4 5h16v16H4z M7 3v4 M17 3v4 M4 10h16',
  pin: 'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  download: 'M12 3v12m-5-5 5 5 5-5 M4 16v5h16v-5'
};

export function icon(name) {
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || ''}"/></svg>`;
}
