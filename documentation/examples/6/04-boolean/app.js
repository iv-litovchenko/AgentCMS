import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("04-boolean");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
