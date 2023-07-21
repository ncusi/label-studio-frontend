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
    ["data",          "lime"],
    ["documentation", "orange"],
    ["markup",        "yellow"],
    ["other",         "orchid"],
    ["programming",   "red"],
    ["project",       "pink"],
    ["tests",         "lightskyblue"]
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