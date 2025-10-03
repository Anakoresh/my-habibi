const burgerMenu = document.querySelector(".burger-menu");
const menu = document.getElementById("menu");
const menuLinks = document.querySelectorAll(".menu a");

burgerMenu.addEventListener("click", () => {
  burgerMenu.classList.toggle("active");
  menu.classList.toggle("active");
});

function closeMenu(event) {
  const burgerMenu = document.querySelector(".burger-menu");
  const menu = document.getElementById("menu");

  if (
    !menu.contains(event.target) &&
    !burgerMenu.contains(event.target) &&
    menu.classList.contains("active")
  ) {
    menu.classList.remove("active");
    burgerMenu.classList.remove("active");
  }
}

window.addEventListener("click", closeMenu);
window.addEventListener("touchstart", closeMenu);

menuLinks.forEach((link) => {
  link.addEventListener("click", () => {
    menu.classList.remove("active");
    burgerMenu.classList.remove("active");
  });
});

const toggle = document.getElementById("theme-toggle");
const theme = localStorage.getItem("theme-mode")
if (theme) { 
  if (theme == "dark") {
    document.body.classList.toggle("dark");
  }
}

toggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme-mode", "dark")
  } else {
    localStorage.setItem("theme-mode", "light")
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Cache SW registered:", registration.scope);
    } catch (err) {
      console.error("SW registration failed:", err);
    }
  });
}
