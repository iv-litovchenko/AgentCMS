import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("11-url");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
