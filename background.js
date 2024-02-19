if (chrome) {
	browser = chrome;
}

// ----------------- MAIN GLOBAL VARIABLES ---------------
let timeoutFlag = false;
let updateTimeoutFlag = false;
let youtubeTabs = [];
let videoPausedFlag = false;
let backgroundLoadTimeoutFlag = false;

// ------------------- FUNCTIONS -----------------------

// Initializes the main script of the program.
function start() {
	getAllTabs();
}

function tabCheck(tab) {
	return tab.url.includes("youtube.com") || tab.url.includes("udemy.com") || tab.url.includes("amigoscode.com") || tab.url.includes("twitch.tv");
}

// Makes sure any YouTube tabs already open in any window are accounted for and executes main script when program first runs
function firstRun() {
	// Gets every tab open in every window
	browser.tabs.query({}, (tabsInAllWindows) => {
		// filters out Youtube Tabs
		allYoutubeTabs = tabsInAllWindows.filter(tabCheck);
		let windowIdArray = [];
		let windowsDetected = 0; // Used for debug purposes
		allYoutubeTabs.forEach((tab) => {
			// Pushes each tab's windowId into new array. Also helps to differentiate between which tabs have been worked on and which haven't
			windowIdArray.push(tab.windowId);
			for (i = 0; i < windowIdArray.length; i++) {
				// Here "window" is the BOM window object
				// Dynamically creates empty array variables named 'browserWindow(i)' for each window open
				if (!window["browserWindow" + i] && !window[tab.id + "PushedFlag"]) {
					window["browserWindow" + i] = [];
				}
				if (tab.windowId === windowIdArray[i]) {
					if (window["browserWindow" + i]) {
						window["browserWindow" + i].push(tab);
						// Dynamically creates temporary flag variable for each browser window pushed
						window[tab.id + "PushedFlag"] = true;
						// Only executes script on YouTube tabs open furthest to the left in their respective windows
						if (tab === window["browserWindow" + i][0]) {
							executeScript(tab);
							setTimeout(() => videoPausedCheck(tab), 100);
							windowsDetected++;
						}
					}
				}
			}
		});
		console.log("Number of windows with YouTube videos detected:", windowsDetected);
		youtubeTabs = allYoutubeTabs; // Temporarily fills youtubeTabs. Helpful to new users on first install. Doesn't require them to refresh any open YouTube tabs.
	});
}

function getAllInWindow() {
	browser.tabs.query({ currentWindow: true }, (allTabs) => {
		// Locates the Youtube Tabs and filters them into new array of objects
		youtubeTabsExist = allTabs.filter(tabCheck);
		// Only updates youtubeTabs array if YouTube tabs exist in the window.
		// Reduces times script is executed, keeping the browser as responsive as possible. Also allows user to refresh windows without youtube tabs and keeps from losing control over windows with videos playing.
		if (youtubeTabsExist.length != 0) {
			youtubeTabs = youtubeTabsExist;
			// Injects foreground.js into Youtube tab of youtubeTabs array furthest to the left.
			executeScript(youtubeTabs[0]);
			setTimeout(() => videoPausedCheck(youtubeTabs[0]), 100);
		} else {
			console.log("No YouTube tabs were detected in this window.");
		}
	});
}

// Use current tab's info to get info of allTabs with "getAllInWindow"
function getAllTabs() {
	browser.tabs.getCurrent((currentTab) => {
		getAllInWindow(currentTab);
	});
}

// Executes script on specified tab
function executeScript(tab) {
	if (tab.url.includes("twitch.tv")) {
		chrome.tabs.executeScript(tab.id, { file: "./twitch-foreground.js" });
		chrome.tabs.insertCSS(tab.id, { file: "./styles/info-overlay.css" });
		console.log("Script executed on:", '"' + tab.title + '" ', "|  ID:", tab.id);
	}

	if (tab.url.includes("udemy.com/course")) {
		browser.tabs.executeScript(tab.id, { file: "./udemy-foreground.js" });
		browser.tabs.insertCSS(tab.id, { file: "./styles/info-overlay.css" });
		console.log("Script executed on:", '"' + tab.title + '" ', "|  ID:", tab.id);
	}

	if (tab.url.includes("youtube.com")) {
		browser.tabs.executeScript(tab.id, { file: "./youtube-foreground.js" });
		browser.tabs.insertCSS(tab.id, { file: "./styles/info-overlay.css" });
		console.log("Script executed on:", '"' + tab.title + '" ', "|  ID:", tab.id);
	}

	if (tab.url.includes("amigoscode.com/courses") && tab.url.includes("lectures")) {
		browser.tabs.executeScript(tab.id, { file: "./amigoscode-foreground.js" });
		browser.tabs.insertCSS(tab.id, { file: "./styles/amigos-overlay.css" });
		console.log("Script executed on:", '"' + tab.title + '" ', "|  ID:", tab.id);
	}
}

// Sends message to tab to check if video is paused
function videoPausedCheck(tab) {
	browser.runtime.onMessage.addListener(videoLoadedHandler);
	// Waits to receive message that foreground sends on load
	function videoLoadedHandler(message, sender, sendResponse) {
		if (message === "Video loaded") {
			browser.runtime.onMessage.removeListener(videoLoadedHandler);
			browser.tabs.sendMessage(tab.id, { message: "Is your tab's video playing?" }, (response) => {
				if (response === "No, you can run a script on the other window.") {
					videoPausedFlag = true;
				}
			});
		}
	}
}

// Checks if the tab is a known video page
function VideoTabCheck(tab) {
	return tab.url.includes("youtube.com/watch") || tab.url.includes("udemy.com/course") || (tab.url.includes("amigoscode.com/courses") && tab.url.includes("lectures")) || tab.url.includes("twitch.tv");
}

// ------------------- EVENT LISTENERS -----------------------

// Sends command to first Youtube tab in the global tab list.
browser.commands.onCommand.addListener(
	(listener = (command) => {
		// Commands will stack on top of each other if a timeoutFlag is not used
		// Previous Video command only gets sent when on a YouTube page with a video (e.g. Not the homepage) or when on a Udemy quiz content page.
		if ((command === "gPreviousVideo" && youtubeTabs[0].url.includes("youtube.com/watch")) || (command === "gPreviousVideo" && youtubeTabs[0].url.includes("/learn/quiz/"))) {
			if (!timeoutFlag) {
				browser.tabs.goBack(youtubeTabs[0].id);
				timeoutFlag = true;
				setTimeout(() => {
					timeoutFlag = false;
				}, 20);
			}
		}
		if (!timeoutFlag) {
			// Next Video command sends goForward browser-tab command instead of YouTube video "next" key command when not on a YouTube page with a video. (e.g. The homepage)
			if (VideoTabCheck(youtubeTabs[0])) {
				browser.tabs.sendMessage(youtubeTabs[0].id, { message: command });
				console.log("You sent keydown", command, "to", youtubeTabs[0].id);
				timeoutFlag = true;
				setTimeout(() => {
					timeoutFlag = false;
				}, 20);
			} else if (command === "fNextVideo" && youtubeTabs[0].url.includes("youtube.com")) {
				browser.tabs.goForward(youtubeTabs[0].id);
				timeoutFlag = true;
				setTimeout(() => {
					timeoutFlag = false;
				}, 20);
			}
		}
	})
);

// Runs start() again when any tab is updated
browser.tabs.onUpdated.addListener((id, changeInfo, updatedTab) => {
	if (!updateTimeoutFlag) {
		// Ignores changes to tabs' audible property
		if (changeInfo.audible != undefined) return;
		if (changeInfo.status != "complete") return;

		if (updatedTab.url.includes("udemy.com/course")) {
			browser.tabs.sendMessage(youtubeTabs[0].id, { message: "Refreshing" });
			console.log("SENDING MESSAGE ON REFRESH");
		}

		// Doesn't update youtubeTabs array if user hasn't un-paused already open YouTube video in another window.
		// This allows users to have multiple windows with YouTube video tabs and have control over which window's YouTube video to send commands to. This keeps control focused on that video even while the user browses the internet in another window with YouTube tabs.

		try {
			if ((VideoTabCheck(updatedTab) && videoPausedFlag) || youtubeTabs.length === 0) {
				// Checks if loading status is complete. This reduces CPU usage by ignoring things like SNS notifications and other minor state changes.
				if (updatedTab.status === "complete") {
					start();
					updateTimeoutFlag = true;
					setTimeout(() => (updateTimeoutFlag = false), 1000);
					return;
				}
			}
			if (VideoTabCheck(updatedTab) && !videoPausedFlag) {
				if (updatedTab.status === "complete") {
					executeScript(updatedTab);
					backgroundLoadTimeoutFlag = true;
					setTimeout(() => (backgroundLoadTimeoutFlag = false), 1000);
				}
			}
		} catch (error) {
			// Ignores very specific error. If having trouble debugging you can try commenting it out. Note the console will be flooded with error whenever empty tab is opened.
			if (!error.message.includes("Cannot read property 'windowId' of undefined")) {
				throw error;
			}
		}
	}
});

// Ensures the tab furthest to the left is first index in array when the user rearranges tabs.
browser.tabs.onMoved.addListener((id, movedTab) => {
	// Needs timeoutFlag due to multiple tab moves being registered when a user rearranges tabs.
	if (!timeoutFlag) {
		browser.tabs.get(id, (movedTab) => {
			// Does the same thing as .onUpdated but when a tab is moved instead.
			try {
				if (movedTab.windowId === youtubeTabs[0].windowId || (VideoTabCheck(movedTab) && videoPausedFlag)) {
					start();
					timeoutFlag = true;
					setTimeout(() => (timeoutFlag = false), 20);
				}
			} catch (error) {
				// See similar error in .onUpdated
				if (!error.message.includes("Cannot read property 'windowId' of undefined")) {
					throw error;
				}
			}
		});
	}
});

// Runs start() when user un-pauses a video and changes videoPausedFlag accordingly.
browser.runtime.onMessage.addListener((videoPaused, sender, sendResponse) => {
	if (typeof videoPaused !== "boolean") {
		return;
	}
	if (!updateTimeoutFlag) {
		if (videoPaused) {
			console.log("Video on", sender.tab.id, "has been paused.");
			videoPausedFlag = true;
		}
		if (!videoPaused) {
			console.log("Video on", sender.tab.id, "has been un-paused and is now playing.");
			videoPausedFlag = false;
		}
		// Prevents control focus from changing to 2nd loaded YouTube video when another video is playing in another window
		if (backgroundLoadTimeoutFlag && sender.tab.id != youtubeTabs[0].id && youtubeTabs.length != 0) {
			return;
		}

		/* Prevents script from being re-injected on active tab */
		if (sender.tab.id == youtubeTabs[0].id) return;

		// Gets all tabs in window of the video the user last paused instead of video loaded and adds to youtubeTabs array.
		getAllInWindow(sender.tab.windowId);
	}
});

// ------------------ FUNCTION CALLS -------------------

// Calls initiation functions.
firstRun();
start();
