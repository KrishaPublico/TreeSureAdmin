/**
 * Unified Sidebar Dropdown Handler
 * This file provides the global dropdown functionality
 * Loaded AFTER sidebar-loader.js which handles sidebar loading and page initialization
 */

// Global dropdown handler with event delegation (prevents stale references)
// Runs once when script loads - persists for all page interactions
(function setupGlobalDropdownHandler() {
  document.addEventListener("click", function(e) {
    const dropdownToggle = document.querySelector(".dropdown-toggle");
    const dropdownMenu = document.querySelector(".dropdown-menu");
    const dropdownIcon = document.querySelector(".dropdown-icon");

    // Skip if elements don't exist
    if (!dropdownToggle || !dropdownMenu || !dropdownIcon) return;

    // If clicking toggle button, toggle the dropdown
    if (dropdownToggle.contains(e.target)) {
      e.preventDefault();
      e.stopPropagation();

      const isOpen = dropdownMenu.style.maxHeight !== "0px" && dropdownMenu.style.maxHeight !== "";

      if (isOpen) {
        // Close dropdown
        dropdownMenu.style.maxHeight = "0px";
        dropdownMenu.style.opacity = "0";
        dropdownIcon.style.transform = "rotate(0deg)";
      } else {
        // Open dropdown - calculate height dynamically from actual content
        const contentHeight = dropdownMenu.scrollHeight;
        dropdownMenu.style.maxHeight = contentHeight + "px";
        dropdownMenu.style.opacity = "1";
        dropdownIcon.style.transform = "rotate(180deg)";
      }
    }
    // If clicking elsewhere (but not on app-type-btn submenu item), close dropdown
    else if (!dropdownMenu.contains(e.target) && !e.target.closest(".app-type-btn")) {
      dropdownMenu.style.maxHeight = "0px";
      dropdownMenu.style.opacity = "0";
      dropdownIcon.style.transform = "rotate(0deg)";
    }
  });
})();
