const tourDays = [
  { title: "1. NUWARA ELLIYA", image: "/img/nuwaraelliya.webp" },
  { title: "2. NUWARA ELLIYA", image: "/img/nuwaraelliya2.webp" },
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
