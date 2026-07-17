/* ═══════════════════════════════════════
   GLOBAL JS — MediScan AI
   Shared across all pages
═══════════════════════════════════════ */

// ── Navbar scroll effect ──
const navbar = document.getElementById("navbar");
if (navbar) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) navbar.classList.add("scrolled");
    else navbar.classList.remove("scrolled");
  });
}

// ── Mobile menu toggle ──
function toggleMenu() {
  const menu = document.getElementById("mobile-menu");
  if (menu) menu.classList.toggle("open");
}

// ── Animate elements on scroll ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animation = "fadeUp 0.55s ease forwards";
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll(".feat-card, .step, .sym-card, .tech-item").forEach(el => {
  el.style.opacity = "0";
  observer.observe(el);
});
