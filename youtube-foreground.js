if (!window.scriptInjected) {
	window.scriptInjected = true; //Prevents script from being run multiple times per tab

	console.log("Script has been injected");
	chrome.runtime.sendMessage("Video loaded");

	video = document.querySelector("video");
	videoParent = video.parentElement;

	/* Stores the Skip Ad button when available */
	let skipAdTimer = 0;
	skipAdInt = setInterval(getSkipButton, 500);
	function getSkipButton() {
		skipAdButton = document.querySelector(".ytp-ad-skip-button");
		skipAdTimer++;
		/* Continues to check for youtube ad to load for 15 seconds */
		if (skipAdButton !== null || skipAdTimer > 30) {
			clearInterval(skipAdInt);
			skipAdTimer = 0;
		}
	}
	/* ------------------------------ */

	// Creates a MutationsObserver to monitor video DOM element
	const observer = new MutationObserver((mutations) => {
		// Mutations object used for debugging
		chrome.runtime.sendMessage(video.paused);
	});
	observer.observe(video, {
		attributes: true,
	});

	// Creates another MutationsObserver to monitor when video reloads/changes
	const observerReload = new MutationObserver((mutations) => {
		// Restarts script if video 'src' changes
		if (mutations[0].attributeName === "src") {
			clearInterval(skipAdInt);
			skipAdTimer = 0;
			skipAdInt = setInterval(getSkipButton, 500);
		}
	});
	observerReload.observe(video.parentElement, {
		attributes: true,
		characterData: true,
		subtree: true,
		attributeFilter: ["src"],
	});

	// Chrome lists Keyboard shortcuts in alphabetical order.
	shortcuts = {
		aPausePlay: new KeyboardEvent("keydown", { keyCode: 75 }),
		bRewind: new KeyboardEvent("keydown", { keyCode: 37 }),
		cFastforward: new KeyboardEvent("keydown", { keyCode: 39 }),
		// dVolumeUp works by modifying a DOM element property
		// eVolumeDown works by modifying a DOM element property
		fNextVideo: new KeyboardEvent("keydown", { shiftKey: true, keyCode: 78 }),
		// gPreviousVideo works by using the browser tabs API command. Check commandHandler() in background.js
		// hLoopCurrentVideo works by modifying a DOM element property
		iSpeedUp: new KeyboardEvent("keydown", { shiftKey: true, keyCode: 190 }),
		jSlowDown: new KeyboardEvent("keydown", { shiftKey: true, keyCode: 188 }),
	};

	// All commands handled via the DOM
	domElementCommands = {
		dVolumeUp: () => {
			if (video.volume < 0.9) {
				video.volume = video.volume + 0.1;
			} else {
				video.volume = 1;
			}
			showInfoOverlay("volume");
		},
		eVolumeDown: () => {
			if (video.volume > 0.1) {
				video.volume = video.volume - 0.1;
			} else {
				video.volume = 0;
			}
			showInfoOverlay("volume");
		},
		hLoopCurrentVideo: () => {
			if (!video.loop) {
				video.loop = true;
			} else {
				video.loop = false;
			}
			showInfoOverlay("loop");
		},
		kSkipAd: () => {
			try {
				/* Only skips ad if "SkipAds" button is visible */
				if (window.getComputedStyle(skipAdButton.parentElement, null).display === "none") return;
				skipAdButton.click();
			} catch (error) {
				if (error.message.includes("parameter 1 is not of type 'Element'") || error.message.includes("Cannot read property 'parentElement' of null")) {
					console.log("Attempted to skip, but no ad was found.");
				} else {
					console.log(error);
				}
			}
		},
	};

	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		// Uses incoming message as a dynamic key to dispatch keypress or call command function
		if (Object.keys(shortcuts).includes(request.message)) {
			console.log("Command received: ", request.message);
			document.dispatchEvent(shortcuts[request.message]);
		}
		if (Object.keys(domElementCommands).includes(request.message)) {
			console.log("Command received: ", request.message);
			domElementCommands[request.message]();
		}
	});

	// Prevents background.js from running scripts on other windows when video is still playing in current window.
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		if (request.message === "Is your tab's video playing?") {
			if (!video.paused) {
				sendResponse("Yes, don't run a script on the other window yet.");
			} else {
				sendResponse("No, you can run a script on the other window.");
			}
		}
	});
}

function showInfoOverlay(command) {
	// Clears timeout so timeout for element staying on screen is restarted below
	if (window.overlayTimeout != undefined) {
		clearTimeout(window.overlayTimeout);
		clearTimeout(fadeTimeout);
		infoOverlay.classList.remove("fade");
		textTop.innerHTML = "";
		textBottom.innerHTML = "";
		textBottom.classList.remove("show");
	}

	if (!window.infoOverlay) {
		window.overlayTimeout = "temp"; // temporarily defines var
		window.infoOverlay = document.createElement("div");
		infoOverlay.className = "ytrInfoOverlay noclick";
		textTop = document.createElement("p");
		textBottom = document.createElement("p");
		textTop.className = "ytrText ytrTextTop noclick";
		textBottom.className = "ytrText ytrTextBottom noclick";
		container = document.createElement("div");
		container.className = "ytrInfoOverlayCont noclick";
	}

	// Set Inner Text of New Elements
	switch (command) {
		case "loop":
			if (video.loop) {
				textTop.innerText = "Video will now loop";
			} else {
				textTop.innerText = "Video will no longer loop";
			}
			break;
		case "volume":
			textTop.innerText = "Volume";
			textBottom.innerText = video.volume.toFixed(1).toString();
			textBottom.classList.add("show");
	}

	infoOverlay.appendChild(textTop);
	infoOverlay.appendChild(textBottom);
	container.appendChild(infoOverlay);
	videoParent.appendChild(container);

	// Element is removed
	window.fadeTimeout = setTimeout(() => {
		infoOverlay.classList.add("fade");
		window.overlayTimeout = setTimeout(() => {
			infoOverlay.remove();
		}, 1050);
	}, 2000);
}
