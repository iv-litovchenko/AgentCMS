import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("02-text");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
