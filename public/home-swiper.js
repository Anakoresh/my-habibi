const swiper = new Swiper(".mySwiper", {
  effect: window.innerWidth > 768 ? "cube" : "fade", 
  grabCursor: true,
  autoplay: {
    delay: 3000,
    disableOnInteraction: false,
  },
  cubeEffect: {
    shadow: false,
    slideShadows: true,
    shadowOffset: 20,
    shadowScale: 0.94,
  },
  pagination: {
    el: ".swiper-pagination",
    type: "progressbar", 
  },
  loop: true,
});
