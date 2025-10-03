const swiper = new Swiper(".mySwiper", {
  effect: window.innerWidth > 768 ? "cube" : "fade",
  grabCursor: true,
  autoplay: {
    delay: 3500,
    disableOnInteraction: false
  },
  cubeEffect: { shadow: false, slideShadows: true },
  pagination: { el: ".swiper-pagination", type: "progressbar" },
  loop: true,
  observer: true,
  observeParents: true
  // убираем on.init полностью
});

// Показываем Swiper только после полной загрузки всех изображений
function showSwiperAfterImages() {
  const swiperEl = document.querySelector(".mySwiper");
  const images = swiperEl.querySelectorAll("img");
  let loadedCount = 0;

  images.forEach(img => {
    if (img.complete) loadedCount++;
    else img.onload = () => {
      loadedCount++;
      if (loadedCount === images.length) displaySwiper();
    };
  });

  if (loadedCount === images.length) displaySwiper();
}

function displaySwiper() {
  const swiperEl = document.querySelector(".mySwiper");
  swiperEl.classList.add("ready");
  swiperEl.style.visibility = "visible"; // делаем видимым

  // форсируем правильный размер и позицию слайдов
  swiper.update();
  swiper.slideTo(swiper.activeIndex, 0);
}

// Для Android PWA/WebView
function fixAndroidSwiper() {
  if (!swiper) return;
  swiper.update();
  swiper.slideTo(swiper.activeIndex, 0);
  const el = document.querySelector(".mySwiper");
  if (el) {
    el.style.display = "none";
    void el.offsetHeight;
    el.style.display = "";
  }
  setTimeout(() => {
    swiper.update();
    swiper.slideTo(swiper.activeIndex, 0);
  }, 100);
}

window.addEventListener("load", () => {
  showSwiperAfterImages();
  fixAndroidSwiper();
});
window.addEventListener("pageshow", fixAndroidSwiper);
window.addEventListener("orientationchange", () => setTimeout(fixAndroidSwiper, 200));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") fixAndroidSwiper();
});
