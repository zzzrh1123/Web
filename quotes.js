const quoteCards = Array.from(document.querySelectorAll("#quote-grid .quote"));
const featuredQuote = document.getElementById("featured-quote");
const featuredAuthor = document.getElementById("featured-author");
const nextQuoteButton = document.getElementById("next-quote");
let previousQuote = -1;

function showRandomQuote() {
    if (!quoteCards.length) return;
    let index = Math.floor(Math.random() * quoteCards.length);
    if (quoteCards.length > 1 && index === previousQuote) {
        index = (index + 1) % quoteCards.length;
    }
    const card = quoteCards[index];
    featuredQuote.textContent = card.querySelector("blockquote p").textContent;
    featuredAuthor.textContent = card.querySelector(".quote-author").textContent;
    previousQuote = index;
}

nextQuoteButton.addEventListener("click", showRandomQuote);
showRandomQuote();
