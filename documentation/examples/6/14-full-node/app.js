import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("14-full-node");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
