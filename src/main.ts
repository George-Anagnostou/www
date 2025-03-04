// wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  const intro = document.querySelector('.intro') as HTMLElement;

  if (intro) {
    // Fade in after a slight delay
    setTimeout(() => {
      intro.classList.add('visible');
    }, 200);
  }
});