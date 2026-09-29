import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("07-array-inline");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
