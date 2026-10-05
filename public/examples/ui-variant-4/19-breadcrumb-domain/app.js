import { mountBaseShell, bindNavInteractions, bindDemoActions } from "../shared-mock.js";

const root = document.getElementById("app");
const state = { domain: "memory", mode: "Внешняя память" };
mountBaseShell(root, {
  activeDomain: state.domain,
  activeMode: state.mode,
  variantClass: "variant-19-breadcrumb-domain"
});
const nav = bindNavInteractions(root, state);
const bc = root.querySelector(".breadcrumbs");
      if (bc) bc.innerHTML = '<button type="button" class="breadcrumb">05 Хобби</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb">Дальнобойщики-2</button><span class="breadcrumb-sep">/</span><button type="button" class="breadcrumb" data-domain="memory">🧠 Память</button><span class="breadcrumb-sep">/</span><span class="breadcrumb current">_Content / файл.md</span>';
bindDemoActions();
