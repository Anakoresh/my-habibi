const swiper = new Swiper(".swiper", {
  slidesPerView: 1,
  centeredSlides: true,
  spaceBetween: 30,
  autoplay: {
    delay: 3000,
    disableOnInteraction: false,
  },
  loop: true,
  navigation: {
    nextEl: ".swiper-btn-next",
    prevEl: ".swiper-btn-prev",
  },
  allowTouchMove: true,
});

document.querySelectorAll('.swiper-slide').forEach(slide => {
  const link = slide.querySelector('.tour-title');
  const container = slide.querySelector('.tour-container');

  if (link && container) {
    container.style.cursor = "pointer";
    container.addEventListener('click', () => {
      window.open(link.href, link.target || "_self");
    });
  }
});
