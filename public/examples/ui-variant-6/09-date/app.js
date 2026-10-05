import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("09-date");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
