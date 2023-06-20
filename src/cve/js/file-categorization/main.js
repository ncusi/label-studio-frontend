import {createRatedFiles} from "./d2h-hook/main.js";

import {Diff2HtmlUI} from "diff2html/lib/ui/js/diff2html-ui.js";

function createGitDiffContainer(diff)
{
    let container = document.createElement("div");

    const diff2htmlUi = new Diff2HtmlUI(container, diff,
    {
        matching: "lines",
        outputFormat: "side-by-side"
    });
    
    diff2htmlUi.draw();
    
    return container;
}

function fillGitDiffsContainer(container, diffs, diffsCategorizedFiles)
{
    if(diffs.length !== diffsCategorizedFiles.length)
        throw new Error(`There must be one diff for each array of categorized files (got: ${diffs.length} diffs and: ${diffsCategorizedFiles.length} arrays)`);
    
    let diffsRatedFiles = diffs.map((diff, i) =>
    {
        let gitDiffContainer = createGitDiffContainer(diff);

        container.appendChild(gitDiffContainer);

        return createRatedFiles(gitDiffContainer, diffsCategorizedFiles[i]);
    });

    return diffsRatedFiles;
}

export {
    fillGitDiffsContainer
};