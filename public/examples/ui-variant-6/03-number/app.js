import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("03-number");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
