# Learning by Doing — classroom website

This is the Web Technologies learning site, restored from the earlier image-led homepage and extended for the course assignment. It is separate from the later AI Toolkit personal-project draft in `../ai-toolkit/`.

Pages: Home, Quotes, Projects, Reverse CAPTCHA Machine, and Contact. The navigation and footer are shared HTML fragments loaded by `parts.js`. The quotes page has 15 cards and a random featured quote. The Machine is the interactive class experiment.

To preview locally, open this folder in VS Code and use **Go Live**, or run `python3 -m http.server 5500` here and open `http://127.0.0.1:5500/`. The shared fragments need an HTTP server; opening an HTML file with `file://` prevents `fetch()` from loading them.

Original GitHub repository: https://github.com/zzzrh1123/Web
Live class site: https://zzzrh1123.github.io/Web/
