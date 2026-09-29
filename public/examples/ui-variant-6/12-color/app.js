import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("12-color");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
