import {createRatedFiles} from "./d2h-hook/main.js";

import {Diff2HtmlUI} from "diff2html/lib/ui/js/diff2html-ui.js";

function fillGitDiffContainer(container, diff, categorizedFiles)
{
    const diff2htmlUi = new Diff2HtmlUI(container, diff,
    {
        matching: "lines",
        outputFormat: "side-by-side"
    });
    
    diff2htmlUi.draw();
    
    let ratedFiles = createRatedFiles(container, categorizedFiles);

    return ratedFiles;
}

export {
    fillGitDiffContainer
};