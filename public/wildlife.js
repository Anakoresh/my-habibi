const swiper = new Swiper(".swiper", {
  slidesPerView: 1,
  centeredSlides: true,
  spaceBetween: 30,
  loop: true,
  navigation: {
    nextEl: ".swiper-btn-next",
    prevEl: ".swiper-btn-prev",
  },
  allowTouchMove: true,
});
