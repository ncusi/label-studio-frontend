import {createFileCategories} from "./d2h-hook/file-category.js";
import {createLineCategories} from "./d2h-hook/line-category.js";

let lineCategories =
[
    [["Bug(fix)",                "B/F"], "red"],
    [["Bug(fix) + refactoring", "BF+R"], "red"],
    [["Documentation",           "Doc"], "orange"],
    ["Test",                             "lightskyblue"],
    [["Test + refactoring",      "T+R"], "lightskyblue"],
    [["Refactoring",           "R-ing"], "yellow"],
    [["Other",                   "Oth"], "orchid"]
];

let fileCategories =
[
    ["Code",          "red"],
    ["Documentation", "orange"],
    ["Test",          "lightskyblue"],
    ["Other",         "orchid"]
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