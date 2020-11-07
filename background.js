tabIdArray = [];
timeoutFlag = true;
youtubeTabs = []

// Use current tab's info to get info of allTabs with "getAllInWindow"
function getAllTabs() {
    chrome.tabs.getCurrent(currentTab => {
        chrome.tabs.getAllInWindow(currentTab, allTabs => {
            // Locates the Youtube Tabs and filters them into new array of objects
            youtubeTabs = allTabs.filter(tab => tab.url.includes('youtube.com/watch'));

            // Injects foreground.js into first Youtube tab of tabIdArray.
            chrome.tabs.executeScript(youtubeTabs[0].id, { file: './foreground.js' });
            console.log('Script executed on', youtubeTabs[0].id);
        });
    });
};

function commandHandler() {
    // Sends command to first Youtube tab in the global tab list.
    chrome.commands.onCommand.addListener(listener = (command) => {
        // Commands will stack on top of each other if a timeoutFlag is not used
        if (timeoutFlag) {
            chrome.tabs.sendMessage(youtubeTabs[0].id, { message: command });
            console.log('You sent keydown', command, "to", youtubeTabs[0].id);
            timeoutFlag = false;
            setTimeout(() => { timeoutFlag = true }, 20);
        }
    });
}

function start() {
    getAllTabs();
    commandHandler();
}

// Initiates command listener
start();

// Runs getAllTabs again when any tab is updated
chrome.tabs.onUpdated.addListener((id, object) => {
    console.log("Here's the object:", object)
    // Checks if loading status is complete. This reduces CPU usage by ignoring things like SNS notifications and other minor state changes.
    if (object.status === "complete") {
        start();
    }
    // start();
});

chrome.tabs.onMoved.addListener(() => {
    // Resets tabIdArray before rerunning
    start();
});