import {createFileCategories} from "./d2h-hook/file-category.js";
import {createLineCategories} from "./d2h-hook/line-category.js";

let lineCategories =
[
    [["bug(fix)",                "B/F"], "red"],
    [["bug(fix) + refactoring", "BF+R"], "red"],
    [["documentation",           "doc"], "orange"],
    ["test",                             "lightskyblue"],
    [["test + refactoring",      "T+R"], "lightskyblue"],
    [["refactoring",           "R-ing"], "yellow"],
    [["other",                   "oth"], "orchid"]
];

let fileCategories =
[
    ["code",          "red"],
    ["documentation", "orange"],
    ["test",          "lightskyblue"],
    ["other",         "orchid"]
];

function createCategories()
{
    fileCategories = createFileCategories(fileCategories);
    lineCategories = createLineCategories(lineCategories);
}

export {
    fileCategories,
    lineCategories,
    createCategories
};