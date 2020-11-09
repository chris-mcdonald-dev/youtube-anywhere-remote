timeoutFlag = true;
youtubeTabs = []

// Use current tab's info to get info of allTabs with "getAllInWindow"
function getAllTabs() {
    chrome.tabs.getCurrent(currentTab => {
        chrome.tabs.getAllInWindow(currentTab, allTabs => {
            // Locates the Youtube Tabs and filters them into new array of objects
            youtubeTabsExist = allTabs.filter(tab => tab.url.includes('youtube.com'));
            // Only updates tab array if YouTube tabs exist in the window.
            // Reduces times script is executed, keeping the browser as responsive as possible. Also allows user to refresh windows without youtube tabs and keeps from losing control over windows with videos playing.
            if (youtubeTabsExist.length != 0) {
                youtubeTabs = youtubeTabsExist
                // Injects foreground.js into first Youtube tab of youtubeTabs array.
                chrome.tabs.executeScript(youtubeTabs[0].id, { file: './foreground.js' });
                console.log('Script executed on:', '"' + youtubeTabs[0].title + '" ', '|  ID:', youtubeTabs[0].id);
            }
            else {
                console.log('No YouTube tabs were detected in this window.');
            };
            
        });
    });
};

function commandHandler() {
    // Sends command to first Youtube tab in the global tab list.
    chrome.commands.onCommand.addListener(listener = (command) => {
        // Commands will stack on top of each other if a timeoutFlag is not used
        // Previous Video command only gets sent when on a YouTube page with a video. (e.g. Not the homepage)
        if (command === "gPreviousVideo" && youtubeTabs[0].url.includes('youtube.com/watch')) {
            if (timeoutFlag) {
                chrome.tabs.goBack(youtubeTabs[0].id);
                timeoutFlag = false;
                setTimeout(() => { timeoutFlag = true }, 20);
            };
        };
        if (timeoutFlag) {
            // Next Video command sends goForward browser-tab command instead of YouTube video "next" key command when not on a YouTube page with a video. (e.g. The homepage)
            if (youtubeTabs[0].url.includes('youtube.com/watch')) {
                chrome.tabs.sendMessage(youtubeTabs[0].id, { message: command });
                console.log('You sent keydown', command, "to", youtubeTabs[0].id);
                timeoutFlag = false;
                setTimeout(() => { timeoutFlag = true }, 20);
            }
            else if (command === "fNextVideo"){
                chrome.tabs.goForward(youtubeTabs[0].id);
                timeoutFlag = false;
                setTimeout(() => { timeoutFlag = true }, 20);
            }
        };
    });
}

function start() {
    getAllTabs();
    commandHandler();
}

// Initiates sequence
start();

// Runs getAllTabs again when any tab is updated
chrome.tabs.onUpdated.addListener((id, updatedTab) => {
    // Checks if loading status is complete. This reduces CPU usage by ignoring things like SNS notifications and other minor state changes.
    if (updatedTab.status === "complete") {
        start();
    }
});

// Ensures the tab furthest to the left is first index in array when the user rearranges tabs.
chrome.tabs.onMoved.addListener(() => {
    start();
});