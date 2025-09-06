document.querySelectorAll('.tour-container').forEach(slide => {
  const link = slide.querySelector('.tour-container a');
  const container = slide.querySelector('.tour-img');

  if (link && container) {
    container.style.cursor = "pointer";
    container.addEventListener('click', () => {
      window.open(link.href, link.target || "_self");
    });
  }
});