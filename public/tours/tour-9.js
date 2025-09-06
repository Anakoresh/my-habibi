const tourDays = [
  { title: "1. COLOMBO", image: "/img/colombo.webp" },
  { title: "2. KANDY", image: "/img/kandy.webp" },
  { title: "3. ANURADHAPURA", image: "/img/anuradhapura.webp" },
  { title: "4. POLONNARUWA", image: "/img/polonnaruwa.webp" },
  { title: "5. SIGIRIYA", image: "/img/sigiriya.webp" },
  { title: "6. PIDURANGALA", image: "/img/pidurangala.webp" },
  { title: "7. DAMBULLA", image: "/img/dambulla.webp" },
  { title: "8. MATALE", image: "/img/matale.webp" },
  { title: "9. NUWARA ELLIYA", image: "/img/nuwaraelliya.webp" },
  { title: "10. NUWARA ELLIYA", image: "/img/nuwaraelliya2.webp" },
  { title: "11. YALA", image: "/img/yala.webp" },
  { title: "12. ELLA", image: "/img/ella.webp" },
  { title: "13. GALLE", image: "/img/galle.webp" },
  { title: "14. GALLE", image: "/img/galle2.webp" },
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
