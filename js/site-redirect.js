// Keep previously shared GitHub Pages links working, including the form anchor.
(() => {
  if (location.hostname !== 'onaoki0503-lgtm.github.io') return;
  const pages = {
    '/shiritsu-english/': '/',
    '/shiritsu-english/index.html': '/',
    '/shiritsu-english/sfc.html': '/sfc.html',
    '/shiritsu-english/dashboard.html': '/dashboard.html'
  };
  const destination = pages[location.pathname];
  if (destination) location.replace('https://tomoni-juku.web.app' + destination + location.search + location.hash);
})();
