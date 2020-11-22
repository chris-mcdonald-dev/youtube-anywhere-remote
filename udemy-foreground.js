initiate();

function initiate() {
    if (!window.scriptInjected) { 
        window.scriptInjected = true; //Prevents script from being run multiple times per tab
        interval = setInterval(videoLoadedCheck, 500);
        videoLoadedCheck(); //Calls interval function immediately
        function videoLoadedCheck() {
            if (document.querySelector('video') === null) {
                console.log('Waiting for video to load...')
            } else {
                clearInterval(interval);
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
        infoOverlay.classList.remove('fade');
        textTop.innerHTML = "";
        textBottom.innerHTML = "";
        textBottom.classList.remove("show");
    }
    
    if (!window.infoOverlay) {
        window.overlayTimeout = 'temp'; // temporarily defines var
        window.infoOverlay = document.createElement("div");
        infoOverlay.className = "ytrInfoOverlay";
        textTop = document.createElement("p");
        textBottom = document.createElement("p");
        textTop.className = "ytrText ytrTextTop ytrText--nudgeDown";
        textBottom.className = "ytrText ytrTextBottom";
        container = document.createElement("div");
        container.className = "ytrInfoOverlayCont";
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
            }
            else {
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
        infoOverlay.classList.add('fade');
        window.overlayTimeout = setTimeout(() => {
            infoOverlay.remove();
        }, 1050);
    }, 2000);
}

function mainScript() {
    console.log('Script has been injected');
    chrome.runtime.sendMessage('Video loaded');

    // All commands handled via the DOM
    domElementCommands = {
        'aPausePlay': () => {
            if (video.paused) {
                video.play();
                chrome.runtime.sendMessage(video.paused);
            } else {
                video.pause();
                chrome.runtime.sendMessage(video.paused);
            }
        },
        'bRewind': () => {
            video.currentTime = video.currentTime - 5;
        },
        'cFastforward': () => {
            video.currentTime = video.currentTime + 5;
        },
        'dVolumeUp': () => {
            if (video.volume < .9) {
                video.volume = video.volume + .1;
            }
            else {
                video.volume = 1;
            };
            showInfoOverlay('volume');
        },
        'eVolumeDown': () => {
            if (video.volume > .1) {
                video.volume = video.volume - .1;
            }
            else {
                video.volume = 0;
            };
            showInfoOverlay('volume');
        },
        'fNextVideo': () => {
            if (nextButton !== null) {
                nextButton.click();
            }
        },
        'gPreviousVideo': () => {
            if (previousButton !== null) {
                previousButton.click();
            }
        },
        'hLoopCurrentVideo': () => {
            if (!video.loop) {
                video.loop = true;
                console.log('Video will now loop');
            }
            else {
                video.loop = false;
                console.log('Video will no longer loop');
            };
            showInfoOverlay('loop');
        },
        'iSpeedUp': () => {
            if (video.playbackRate < 2.4) {
                video.playbackRate = video.playbackRate + .1;
            } else {
                video.playbackRate = 2.5;
            }
            console.log(video.playbackRate);
            showInfoOverlay('speed');
        },
        'jSlowDown': () => {
            if (video.playbackRate > .4) {
                video.playbackRate = video.playbackRate - .1;
            } else {
                video.playbackRate = .3;
            }
            console.log(video.playbackRate);
            showInfoOverlay('speed');
        }};
    

    video = document.querySelector('video');
    videoParent = video.parentElement.parentElement;
    nextButton = document.querySelector("[data-purpose = 'go-to-next']");
    previousButton = document.querySelector("[data-purpose = 'go-to-previous']");
    
    // MutationObserver doesn't seem to work for all of Udemy's video attributes. Registers clicks on video container and sends state of video paused attribute instead.
    videoParent.addEventListener('click', () => {
        chrome.runtime.sendMessage(video.paused);
    })

    // Creates a MutationsObserver to monitor video DOM element
    const observer = new MutationObserver((mutations) => {
        // Restarts script if video 'src' changes
        if (mutations[0].attributeName === 'src') {
            chrome.runtime.onMessage.removeListener(commandHandler);
            chrome.runtime.onMessage.removeListener(videoPausedHandler);
            window.scriptInjected = false;
            initiate();
        }
        chrome.runtime.sendMessage(video.paused);
    });

    observer.observe(video, {
        attributes: true,
        attributeFilter: ['pause', 'src']
    });
    
    chrome.runtime.onMessage.addListener(commandHandler);

    function commandHandler(request, sender, sendResponse) {
        // Uses incoming message as a dynamic key to call command function
        if (Object.keys(domElementCommands).includes(request.message)) {
            console.log("Command received: ", request.message);
            domElementCommands[request.message]();
        };
    }
    
    // Prevents background.js from running scripts on other windows when video is still playing in current window.
    chrome.runtime.onMessage.addListener(videoPausedHandler);

    function videoPausedHandler(request, sender, sendResponse) {
        if (request.message === "Is your tab's video playing?") {
            if (!video.paused) {
                sendResponse("Yes, don't run a script on the other window yet.")
            }
            else {
                sendResponse("No, you can run a script on the other window.")
            }
        }
    }
}