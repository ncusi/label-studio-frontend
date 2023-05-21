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

// task.data is a string here
const getTaskData = () => JSON.parse(currentLabelStudio.task.data);

// copy initial categorization so that the same reference isn't modified by multiple annotations
const getInitialCategorization = () => structuredClone(getTaskData().initialCategorization);

const isGitDiffTask = () => getTaskData().gitDiff;

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

        // if there's no git diff we assume it's a task unrelated to annotating
        // changed files so we skip doing any work here
        if(!isGitDiffTask())
            return;
        
        const labelStudio = currentLabelStudio;
        
        const annotation = labelStudio.annotationStore.selected;
        
        // sometimes (e.g. when creating viewing a prediction)
        // the annotation is displayed without being selected first so
        // it has to be set up here
        if(!annotation.cve)
            annotation.cve = {};

        // when creating a new annotation it's been selected (so annotation.cve is equal to {})
        // but it hasn't been serialized so it has to be set up here
        if(!annotation.cve.categorizedFiles)
            annotation.cve.categorizedFiles = getInitialCategorization();

        const cve = annotation.cve;

        let container = cve.gitDiffContainer;

        // when opening back the previously created annotation
        if(container)
        {
            gitDiffContainer.replaceWith(container);

            return;
        }

        // annotation is loaded for the first time
        // (it's supposed to contain either previously saved categorization
        // or initial categorization gained in some other way, e.g. using a heuristic)
        onGitDiffContainerCreated(annotation, gitDiffContainer, getTaskData().gitDiff, cve.categorizedFiles);
    });

    observer.observe(document.body,
    {
        childList: true,
        subtree: true
    });
}

// in production build the properties we need to modify are read-only
// so disable creating read-only properties before they're created
function disableCreatingReadOnlyProperties()
{
    const originalDefineProperty = Object.defineProperty;

    Object.defineProperty = (object, property, attributes) =>
    {
        if(attributes && attributes.writable === false)
            attributes.writable = true;

        return originalDefineProperty(object, property, attributes);
    };
}

function onHookFirstCall()
{
    createCategories();

    createMutationObserver();

    disableCreatingReadOnlyProperties();
}

function onLabelStudioConstructor(labelStudio)
{
    // create categories and mutation observer only the first time the hook code is called
    if(!currentLabelStudio)
        onHookFirstCall();
    
    labelStudio.options.interfaces = 
    [
        "panel",
        "topbar",
        "update",
        "submit",
        "controls",
        "instruction",
        "side-column",
        "edit-history",
        "topbar:prevnext",
        "annotations:menu",
        "predictions:menu",
        "predictions:tabs",
        "annotations:delete",
        "annotations:add-new"
    ];

    const events = labelStudio.events;

    // labelStudio obtained here is different than the one we already have
    // (the one whose constructor we hooked)
    // and we need this one
    events.on("labelStudioLoad", labelStudio =>
    {
        currentLabelStudio = labelStudio;

        // if there's no git diff we assume it's a task unrelated to annotating
        // changed files so we skip doing any work here
        if(!isGitDiffTask())
            return;
        
        events.on("selectAnnotation", annotation =>
        {
            // if this annotation has already been set up before then skip modifying its properties
            if(annotation.cve)
                return;

            annotation.cve = {};

            const originalDeserializeResults = annotation.deserializeResults.bind(annotation);

            annotation.deserializeResults = (results, options) =>
            {
                originalDeserializeResults(results, options);

                // find a git diff result (there's only 1 at most)
                let gitDiffResult = results.find(result => result.type === GIT_DIFF_ANNOTATION_TYPE_NAME);

                // if there's no git diff result then it's likely this annotation has been loaded from a prediction
                // (which contains only the error creation date), so we need to get categorization data from task data
                let categorizedFiles = gitDiffResult ? gitDiffResult.value.files : getInitialCategorization();
                
                annotation.cve.categorizedFiles = categorizedFiles;
            };
        });
    });
}

export {
    onLabelStudioConstructor
};
