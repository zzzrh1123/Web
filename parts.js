function load(file, target) {
    return fetch(file)
        .then(response => response.text())
        .then(html => {
            document.getElementById(target).innerHTML = html;
        })
        .catch(error => {
            console.error(`Could not load ${file}:`, error);
        });
}

function preferredTheme() {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme) {
        return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
}

function setTheme(theme) {
    document.documentElement.dataset.theme = theme;

    const themeButton = document.getElementById("theme-toggle");

    if (themeButton) {
        const nextTheme = theme === "dark" ? "light" : "dark";
        const label = `Switch to ${nextTheme} mode`;

        themeButton.setAttribute("aria-label", label);
        themeButton.setAttribute("title", label);
    }
}

setTheme(preferredTheme());

load("nav.html", "site-header").then(() => {
    const themeButton = document.getElementById("theme-toggle");

    if (!themeButton) {
        return;
    }

    setTheme(document.documentElement.dataset.theme);

    themeButton.addEventListener("click", () => {
        const nextTheme = document.documentElement.dataset.theme === "dark"
            ? "light"
            : "dark";

        localStorage.setItem("theme", nextTheme);
        setTheme(nextTheme);
    });
});

load("footer.html", "site-footer");
