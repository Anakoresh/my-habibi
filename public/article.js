import { db } from "./firebase.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.0.2/firebase-firestore.js";

function getSlug() {
    return new URLSearchParams(window.location.search).get("slug");
}

function updateMetaTags(article) {
    document.title = `${article.title} | Habibi Hostel Blog`;

    const ogTags = {
        "og:title": article.title,
        "og:image": article.image,
        "og:type": "article",
        "og:url": window.location.href
    };

    Object.entries(ogTags).forEach(([property, content]) => {
        let tag = document.querySelector(`meta[property="${property}"]`);
        if (!tag) {
            tag = document.createElement("meta");
            tag.setAttribute("property", property);
            document.head.appendChild(tag);
        }
        tag.setAttribute("content", content);
    });
}

async function loadArticle() {
    const slug = getSlug();
    if (!slug) return;
    const articlesCol = collection(db, "articles");
    const q = query(articlesCol, where("slug", "==", slug));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const article = querySnapshot.docs[0].data();

        document.getElementById("article-title").textContent = article.title;
        document.getElementById("article-image").src = article.image;
        document.getElementById("article-content").innerHTML = article.content;

        updateMetaTags(article);
    } else {
        document.getElementById("article-content").innerHTML = "<p>Article not found.</p>";
    }
}

document.addEventListener("DOMContentLoaded", loadArticle);
