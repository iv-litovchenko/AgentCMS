import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("05-null");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
