// users.js
import { Controller } from "./controller.js";
import { checkLogin, logout } from "./script.js";

// ✅ Check login on page load
checkLogin();

// ✅ Logout handler
document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  logout();
});

// ✅ Initialize Users CRUD
document.addEventListener("DOMContentLoaded", () => {
  Controller.initUsers({
    tableBodyId: "usersTableBody",
    collectionName: "users",
    fields: ["name", "username", "password", "ContactNumber", "address", "role", "active"]
  });
});
