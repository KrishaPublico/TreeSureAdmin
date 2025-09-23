import { Controller } from "mvc/controller.js";
import { checkLogin, logout } from "./script.js";

checkLogin();
document.getElementById("logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  logout();
});

document.addEventListener("DOMContentLoaded", () => {
  Controller.init({
    tableBodyId: "treesTableBody",
    collectionName: "trees",
    fields: ["species", "diameter", "height", "volume", "gpsLocation"]
  });
});
