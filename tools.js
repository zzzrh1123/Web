const toolSearch = document.getElementById("tool-search");
const toolCards = Array.from(document.querySelectorAll(".ai-tool-card"));
const filterButtons = Array.from(document.querySelectorAll(".ai-filter"));
const resultCount = document.getElementById("tool-results-count");
const emptyResults = document.getElementById("tool-empty-results");

let selectedFilter = "all";

function showMatchingTools() {
    const query = toolSearch.value.trim().toLocaleLowerCase();
    let visibleCount = 0;

    toolCards.forEach(function filterCard(card) {
        const categories = card.dataset.categories.split(" ");
        const keywords = card.dataset.keywords.toLocaleLowerCase();
        const matchesCategory = selectedFilter === "all" || categories.includes(selectedFilter);
        const matchesSearch = !query || keywords.includes(query) || card.textContent.toLocaleLowerCase().includes(query);
        const shouldShow = matchesCategory && matchesSearch;

        card.hidden = !shouldShow;
        if (shouldShow) visibleCount += 1;
    });

    resultCount.textContent = `Showing ${visibleCount} ${visibleCount === 1 ? "tool" : "tools"}`;
    emptyResults.hidden = visibleCount !== 0;
}

function chooseFilter(filter) {
    selectedFilter = filter;
    filterButtons.forEach(function updateButton(button) {
        const isSelected = button.dataset.filter === filter;
        button.classList.toggle("is-active", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });
    showMatchingTools();
}

filterButtons.forEach(function prepareButton(button) {
    button.addEventListener("click", function filterTools() {
        chooseFilter(button.dataset.filter);
    });
});

toolSearch.addEventListener("input", showMatchingTools);

const requestedFilter = new URLSearchParams(window.location.search).get("category");
if (filterButtons.some(button => button.dataset.filter === requestedFilter)) {
    chooseFilter(requestedFilter);
}
