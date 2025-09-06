import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

const articlesList = document.getElementById("articles-list");

async function loadArticles() {
  const articlesCol = collection(db, "articles");
  const articlesSnapshot = await getDocs(articlesCol);
  articlesList.innerHTML = "";

  const articlesArray = articlesSnapshot.docs;

  articlesArray.forEach((doc, index) => {
    const article = doc.data();
    const isLast = index === articlesArray.length - 1;
    const borderHTML = isLast ? "" : `<div class="border"></div>`;

    const articleHTML = `
      <div class="container d-flex flex-column align-items-center">
        <div class="article-container" onclick="location.href='article.html?slug=${article.slug}'">
            <div class="article-shadow"></div>
            <div class="article-img lazy-bg" style="background-image: url('${article.image}');"></div>
            <h3 class="article-name">${article.title}</h3>
            <a href="article.html?slug=${article.slug}">read more</a>
        </div>
      </div>
      ${borderHTML}
    `;
    articlesList.insertAdjacentHTML("beforeend", articleHTML);
  });

}

document.addEventListener("DOMContentLoaded", loadArticles);
