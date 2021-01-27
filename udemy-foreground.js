initiate();

function initiate() {
	if (!window.scriptInjected) {
		window.scriptInjected = true; //Prevents script from being run multiple times per tab
		if (typeof window.interval !== "undefined") {
			clearInterval(window.interval);
		}
		window.interval = setInterval(videoLoadedCheck, 500);
		videoLoadedCheck(); //Calls interval function immediately
		function videoLoadedCheck() {
			if (document.querySelector("video") === null) {
				console.log("Waiting for video to load...");
				/* Separately loads text script when text content is detected */
				if (document.querySelector("[class^=text-viewer]") || document.querySelector("[class^=quiz-page]")) {
					clearInterval(window.interval);
					mainTextScript();
				}
			} else {
				clearInterval(window.interval);
				mainScript();
			}
		}
	}
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
		textTop.className = "ytrText ytrTextTop ytrText--nudgeDown noclick";
		textBottom.className = "ytrText ytrTextBottom noclick";
		container = document.createElement("div");
		container.className = "ytrInfoOverlayCont noclick";
	}

	// Set Inner Text of New Elements
	switch (command) {
		case "speed":
			textTop.innerText = "Playback Speed";
			textBottom.innerText = video.playbackRate.toFixed(1).toString();
			textBottom.classList.add("show");
			break;
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
			break;
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

function mainScript() {
	console.log("Script has been injected");
	chrome.runtime.sendMessage("Video loaded");

	// All commands handled via the DOM
	domElementCommands = {
		aPausePlay: () => {
			if (video.paused) {
				video.play();
				chrome.runtime.sendMessage(video.paused);
			} else {
				video.pause();
				chrome.runtime.sendMessage(video.paused);
			}
		},
		bRewind: () => {
			video.currentTime = video.currentTime - 5;
		},
		cFastforward: () => {
			video.currentTime = video.currentTime + 5;
		},
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
		fNextVideo: () => {
			if (nextButton !== null) {
				nextButton.click();
			}
		},
		gPreviousVideo: () => {
			if (previousButton !== null) {
				previousButton.click();
			}
		},
		hLoopCurrentVideo: () => {
			if (!video.loop) {
				video.loop = true;
			} else {
				video.loop = false;
			}
			showInfoOverlay("loop");
		},
		iSpeedUp: () => {
			if (video.playbackRate < 2.4) {
				video.playbackRate = video.playbackRate + 0.1;
			} else {
				video.playbackRate = 2.5;
			}
			playbackRateTemp = video.playbackRate;
			showInfoOverlay("speed");
		},
		jSlowDown: () => {
			if (video.playbackRate > 0.4) {
				video.playbackRate = video.playbackRate - 0.1;
			} else {
				video.playbackRate = 0.3;
			}
			playbackRateTemp = video.playbackRate;
			showInfoOverlay("speed");
		},
	};

	video = document.querySelector("video");
	source = video.src;

	/* Keep playbackRate from resetting on reload */
	video.playbackRate = typeof playbackRateTemp === "undefined" ? video.playbackRate : playbackRateTemp;

	videoParent = video.parentElement.parentElement;
	nextButton = document.querySelector("[data-purpose = 'go-to-next']");
	previousButton = document.querySelector("[data-purpose = 'go-to-previous']");

	/* Sends message to background.js on pause and play */
	video.addEventListener("pause", playPauseHandler);
	video.addEventListener("play", playPauseHandler);
	let playPauseTimeoutFlag = false;

	function playPauseHandler() {
		if (!playPauseTimeoutFlag) {
			console.log("VIDEO HAS BEEN PAUSED: ", video.paused);
			/* Overrides Udemy's playbackRate reset functionality and ensures playback rate is not reset when video is resumed */
			if (video.playbackRate != 1) {
				playbackRateTemp = video.playbackRate;
			}
			if (typeof playbackRateTemp != "undefined") {
				video.playbackRate = playbackRateTemp;
			}
			/* -------------------------------- */
			chrome.runtime.sendMessage(video.paused);
			playPauseTimeoutFlag = true;
			playPauseTimeout = setTimeout(() => {
				playPauseTimeoutFlag = false;
			}, 400);
		}
	}

	chrome.runtime.onMessage.addListener(commandHandler);
	chrome.runtime.onMessage.addListener(refreshHandler);

	function commandHandler(request, sender, sendResponse) {
		// Uses incoming message as a dynamic key to call command function
		if (Object.keys(domElementCommands).includes(request.message)) {
			console.log("Command received: ", request.message);
			domElementCommands[request.message]();
		}
	}

	function refreshHandler(request, sender, sendResponse) {
		if (request.message === "Refreshing") {
			chrome.runtime.onMessage.removeListener(commandHandler);
			window.scriptInjected = false;
			// initiate();
			chrome.runtime.onMessage.removeListener(refreshHandler);
		}
	}

	// Prevents background.js from running scripts on other windows when video is still playing in current window.
	chrome.runtime.onMessage.addListener(videoPausedHandler);

	function videoPausedHandler(request, sender, sendResponse) {
		if (request.message === "Is your tab's video playing?") {
			if (!video.paused) {
				sendResponse("Yes, don't run a script on the other window yet.");
			} else {
				sendResponse("No, you can run a script on the other window.");
			}
		}
	}
}

/* Main text that runs if text content is detected */
function mainTextScript() {
	console.log("Text content detected...\nScript injected");

	nextButton = document.querySelector("[data-purpose = 'go-to-next']");
	previousButton = document.querySelector("[data-purpose = 'go-to-previous']");

	domElementCommands = {
		fNextVideo: () => {
			if (nextButton !== null) {
				nextButton.click();
			}
		},
		gPreviousVideo: () => {
			if (previousButton !== null) {
				previousButton.click();
			}
		},
	};

	chrome.runtime.onMessage.addListener(commandHandler);
	chrome.runtime.onMessage.addListener(refreshHandler);

	function commandHandler(request, sender, sendResponse) {
		// Uses incoming message as a dynamic key to call command function
		if (Object.keys(domElementCommands).includes(request.message)) {
			console.log("Command received: ", request.message);
			domElementCommands[request.message]();
		}
	}

	function refreshHandler(request, sender, sendResponse) {
		if (request.message === "Refreshing") {
			chrome.runtime.onMessage.removeListener(commandHandler);
			window.scriptInjected = false;
			// initiate();
			chrome.runtime.onMessage.removeListener(refreshHandler);
		}
	}
}
