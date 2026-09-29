import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("08-enum");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
