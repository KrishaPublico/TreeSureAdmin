// sidebar-dropdown.js
// Safe toggle for the Applications dropdown — caret remains visible always

// sidebar-dropdown.js
document.addEventListener('DOMContentLoaded', () => {
  const mainDropdown = document.querySelector('.dropdown');
  const mainToggle = mainDropdown.querySelector('.dropdown-toggle');
  const mainCaret = mainDropdown.querySelector('.dropdown-icon');

  // MAIN DROPDOWN (Applications)
  mainToggle.addEventListener('click', (e) => {
    e.preventDefault();
    mainDropdown.classList.toggle('open');
    mainCaret.style.opacity = '1';
    mainCaret.style.visibility = 'visible';
  });

  // SECOND LEVEL DROPDOWN (Cutting Permit)
  const subDropdown = document.querySelector('.dropdown-sub');
  const subToggle = subDropdown.querySelector('.sub-toggle');
  const subIcon = subDropdown.querySelector('.sub-icon');

  subToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    subDropdown.classList.toggle('open');
    subIcon.style.opacity = '1';
    subIcon.style.visibility = 'visible';
  });

  // Close both dropdowns when clicking outside the sidebar
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.sidebar')) {
      mainDropdown.classList.remove('open');
      subDropdown.classList.remove('open');
      mainCaret.style.transform = 'translateY(-50%)';
      subIcon.style.transform = 'rotate(0deg)';
    }
  });

  // Keep caret visible when clicking other top-level sidebar links
  document.querySelectorAll('.sidebar > ul > li > a').forEach(link => {
    if (link.closest('.dropdown')) return;
    link.addEventListener('click', () => {
      mainDropdown.classList.remove('open');
      subDropdown.classList.remove('open');
      mainCaret.style.opacity = '1';
      subIcon.style.opacity = '1';
    });
  });
});
