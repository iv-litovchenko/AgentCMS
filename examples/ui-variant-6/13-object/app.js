import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("13-object");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
