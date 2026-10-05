import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("06-array-block");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
