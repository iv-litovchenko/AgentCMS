import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("10-datetime");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
