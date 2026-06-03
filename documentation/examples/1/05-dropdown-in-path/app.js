import { MOCK_TREE, renderModeSelectOptions, findMode, bindModeButtons } from "../shared-modes.js";

document.querySelector(".tree").innerHTML = MOCK_TREE;

const select = document.getElementById("mode-select");
select.innerHTML = renderModeSelectOptions();
select.value = "description";

const controller = bindModeButtons(document.getElementById("app"));

select.addEventListener("change", () => {
  const mode = findMode(select.value);
  if (mode && !mode.disabled) controller.setActive(select.value);
});

const origSetActive = controller.setActive;
controller.setActive = (modeId) => {
  origSetActive(modeId);
  select.value = modeId;
};
