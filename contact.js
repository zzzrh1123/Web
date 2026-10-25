const contactForm = document.getElementById("contact-form");

contactForm.addEventListener("submit", event => {
    event.preventDefault();

    const fields = new FormData(contactForm);
    const name = String(fields.get("name") || "").trim();
    const email = String(fields.get("email") || "").trim();
    const message = String(fields.get("message") || "").trim();
    const subject = encodeURIComponent(`Message from ${name}`);
    const body = encodeURIComponent(`${message}\n\nFrom: ${name} <${email}>`);

    document.getElementById("contact-status").textContent =
        "Your email app is opening. Please send the message there to finish.";
    window.location.href = `mailto:X20250020@hibiuh.edu.cn?subject=${subject}&body=${body}`;
});
