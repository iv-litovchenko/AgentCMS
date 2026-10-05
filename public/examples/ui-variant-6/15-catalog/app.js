import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("15-catalog");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
