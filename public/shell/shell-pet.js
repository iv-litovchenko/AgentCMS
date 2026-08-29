import { initShellCharacter } from "@shell/character";

const stage = document.getElementById("shell-pet-stage");
const closeBtn = document.getElementById("shell-pet-close");

void initShellCharacter(stage, null);

closeBtn?.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (window.shellApp?.setPetOverlay) {
    void window.shellApp.setPetOverlay(false);
    return;
  }
  window.close();
});

stage?.addEventListener("dblclick", (event) => {
  if (event.target.closest("#shell-pet-close")) return;
  if (window.shellApp?.showMainWindow) {
    void window.shellApp.showMainWindow();
    return;
  }
});
