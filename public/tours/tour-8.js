const tourDays = [
  { title: "1. KANDY", image: "/img/kandy.webp" },
  { title: "2. SIGIRIYA", image: "/img/sigiriya.webp" },
  { title: "3. ANURADHAPURA", image: "/img/anuradhapura.webp" },
  { title: "4. NUWARA ELLIYA", image: "/img/nuwaraelliya.webp" },
  { title: "5. ELLA", image: "/img/ella.webp" },
  { title: "6. GALLE", image: "/img/galle.webp" },
];

const dayTabs = document.querySelectorAll(".day-tab");
const dayImg = document.getElementById("day-img");
const dayTitle = document.getElementById("day-title");

const updateDayContent = (dayIndex) => {
  const selectedDay = tourDays[dayIndex];
  dayImg.style.backgroundImage = `url(${selectedDay.image})`;
  dayTitle.textContent = selectedDay.title;

  dayTabs.forEach((tab) => tab.classList.remove("active"));
  dayTabs[dayIndex].classList.add("active");
};

dayTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => updateDayContent(index));
});

updateDayContent(0);
