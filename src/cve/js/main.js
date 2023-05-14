import {createCategories} from "./categories.js";
import {createRatedFiles} from "./d2h-hook/main.js";

import {Diff2HtmlUI} from "diff2html/lib/ui/js/diff2html-ui.js";

/* import styles for webpack MiniCssExtractPlugin plugin */
// highlight.js css must be imported before diff2html css
import "../css/highlight.js.css";
import "../css/diff2html.css";

import "../css/d2h-hook/file-rating.css";
import "../css/d2h-hook/line-rating.css";
import "../css/d2h-hook/global-styles.css";

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

const getSelectedCategory = dropDownList => dropDownList.value;

function serializeRatedLine(ratedLine)
{
    return {
        lineNumber: ratedLine.lineNumber,
        category: getSelectedCategory(ratedLine.dropDownList)
    };
}

function serializeRatedFile(ratedFile)
{
    return {
        fileName: ratedFile.fileName,
        category: getSelectedCategory(ratedFile.dropDownList),
        lines:
        {
            beforeChange: ratedFile.ratedLinesBeforeChange.map(serializeRatedLine),
            afterChange: ratedFile.ratedLinesAfterChange.map(serializeRatedLine)
        }
    };
}

const GIT_DIFF_ANNOTATION_TYPE_NAME = "gitdiff";

const GIT_DIFF_CONTAINER_ID = "git-diff-container";

function onGitDiffContainerCreated(annotation, gitDiffContainer, gitDiff, categorizedFiles)
{
    const originalSerializeAnnotation = annotation.serializeAnnotation.bind(annotation);

    annotation.serializeAnnotation = options =>
    {
        let serialized = originalSerializeAnnotation(options);

        // append serialized git diff annotation data
        let gitDiffResult =
        {
            type: GIT_DIFF_ANNOTATION_TYPE_NAME,
            value:
            {
                files: annotation.cve.ratedFiles.map(serializeRatedFile)
            }
        };

        serialized.push(gitDiffResult);

        return serialized;
    };

    let ratedFiles = fillGitDiffContainer(gitDiffContainer, gitDiff, categorizedFiles);

    annotation.cve =
    {
        ratedFiles: ratedFiles,
        gitDiffContainer: gitDiffContainer
    };
}

// before any label studio instance has been created it's set to null
// but there can be many subsequent instances (e.g. when joining and
// leaving annotation panel)
let currentLabelStudio = null;

function createMutationObserver()
{
    const observer = new MutationObserver(mutationList =>
    {
        // if the mutation wasn't about unfolding Collapse tag then skip it
        if(mutationList.length > 1)
            return;
        
        let target = mutationList[0].target;

        // same check as above
        if(!target.classList.contains("ant-collapse-item"))
            return;
        
        let gitDiffContainer = document.getElementById(GIT_DIFF_CONTAINER_ID);

        if(!gitDiffContainer)
            return;
        
        // if this unfolded Collapse tag didn't contain the git diff container
        // then it wasn't the tag we were waiting for
        if(!target.contains(gitDiffContainer))
            return;

        const labelStudio = currentLabelStudio;
        
        const annotation = labelStudio.annotationStore.selected;

        const cve = annotation.cve;

        let container = cve.gitDiffContainer;

        // when opening back the previously created annotation
        if(container)
        {
            gitDiffContainer.replaceWith(container);

            return;
        }

        // task.data is a string here
        const taskData = JSON.parse(labelStudio.task.data);

        // annotation is loaded for the first time
        // (it's supposed to contain either previously saved categorization
        // or initial categorization gained in some other way, e.g. using a heuristic)
        onGitDiffContainerCreated(annotation, gitDiffContainer, taskData.gitDiff, cve.categorizedFiles);
    });

    observer.observe(document.body,
    {
        childList: true,
        subtree: true
    });
}

function onLabelStudioConstructor(labelStudio)
{
    // create categories and mutation observer only the first time the code is called
    if(!currentLabelStudio)
    {
        createCategories();

        createMutationObserver();    
    }
    
    labelStudio.options.interfaces =
    [
        "update",
        "submit",
        "controls",
        "topbar",
        "annotations:tabs"
    ];

    const events = labelStudio.events;

    events.on("labelStudioLoad", labelStudio => currentLabelStudio = labelStudio);

    events.on("selectAnnotation", annotation =>
    {
        // if this annotation has already been selected before then skip modifying its properties
        if(annotation.cve)
            return;

        annotation.cve = {};

        const originalDeserializeResults = annotation.deserializeResults.bind(annotation);

        annotation.deserializeResults = (results, options) =>
        {
            originalDeserializeResults(results, options);
    
            // find a git diff result (there's only 1 at most)
            let gitDiffResult = results.find(result => result.type === GIT_DIFF_ANNOTATION_TYPE_NAME);
            
            if(!gitDiffResult)
                return;
            
            annotation.cve.categorizedFiles = gitDiffResult.value.files;
        };
    });
}

export {
    onLabelStudioConstructor
};
