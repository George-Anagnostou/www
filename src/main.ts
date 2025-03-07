// wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  const intro = document.querySelector('.intro') as HTMLElement;
  if (intro) setTimeout(() => { intro.classList.add('visible'); }, 200);
  
  const navLinks = document.querySelectorAll('.navbar a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href') || '/';
      const currentPath = window.location.pathname;

      // normalize pathname with leading slash
      const targetPath = href.startsWith('/') ? href : `/${href}`;
      if (targetPath === currentPath) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
});