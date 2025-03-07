// wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  const intro = document.querySelector('.intro') as HTMLElement;
  if (intro) setTimeout(() => { intro.classList.add('visible'); }, 200);
  
  const navLinks = document.querySelectorAll('.navbar a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // e.preventDefault();
      const targetId = (link.getAttribute('href') || '').slice(1);
      if (!targetId) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
});