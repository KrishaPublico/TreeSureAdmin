// sidebar-dropdown.js
document.addEventListener("DOMContentLoaded", () => {
  // Wait for sidebar to load (if loaded dynamically)
  const waitForSidebar = setInterval(() => {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return; // Sidebar not loaded yet
    clearInterval(waitForSidebar);

    const mainDropdown = sidebar.querySelector(".dropdown");
    const mainToggle = mainDropdown?.querySelector(".dropdown-toggle");
    const mainCaret = mainDropdown?.querySelector(".dropdown-icon");

    const subDropdown = sidebar.querySelector(".dropdown-sub");
    const subToggle = subDropdown?.querySelector(".sub-toggle");
    const subIcon = subDropdown?.querySelector(".sub-icon");

    if (!mainToggle || !subToggle) return; // Nothing to toggle yet

    // --- MAIN DROPDOWN (Applications) ---
    mainToggle.addEventListener("click", (e) => {
      e.preventDefault();
      mainDropdown.classList.toggle("open");

      // Rotate caret smoothly
      if (mainDropdown.classList.contains("open")) {
        mainCaret.style.transform = "rotate(180deg)";
      } else {
        mainCaret.style.transform = "rotate(0deg)";
      }
    });

    // --- SECOND LEVEL DROPDOWN (Cutting Permit) ---
    subToggle.addEventListener("click", (e) => {
      e.preventDefault();
      subDropdown.classList.toggle("sub-open");

      // Rotate sub-caret smoothly
      if (subDropdown.classList.contains("sub-open")) {
        subIcon.style.transform = "rotate(180deg)";
      } else {
        subIcon.style.transform = "rotate(0deg)";
      }
    });

    // --- CLOSE DROPDOWNS WHEN CLICKING OUTSIDE ---
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".sidebar")) {
        mainDropdown.classList.remove("open");
        subDropdown.classList.remove("sub-open");
        mainCaret.style.transform = "rotate(0deg)";
        subIcon.style.transform = "rotate(0deg)";
      }
    });

    // --- KEEP CARETS VISIBLE FOR OTHER LINKS ---
    sidebar.querySelectorAll("ul > li > a").forEach((link) => {
      if (link.closest(".dropdown")) return; // Skip dropdown parent
      link.addEventListener("click", () => {
        mainDropdown.classList.remove("open");
        subDropdown.classList.remove("sub-open");
        mainCaret.style.transform = "rotate(0deg)";
        subIcon.style.transform = "rotate(0deg)";
      });
    });
  }, 100);
});

