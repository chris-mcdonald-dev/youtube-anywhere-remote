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
            console.log('Volume:', video.volume);
        },
        'eVolumeDown': () => {
            if (video.volume > .1) {
                video.volume = video.volume - .1;
            }
            else {
                video.volume = 0;
            };
            console.log('Volume:', video.volume);
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
        },
        'iSpeedUp': () => {
            if (video.playbackRate < 2.4) {
                video.playbackRate = video.playbackRate + .1;
            } else {
                video.playbackRate = 2.5;
            }
            console.log(video.playbackRate);
        },
        'jSlowDown': () => {
            if (video.playbackRate > .4) {
                video.playbackRate = video.playbackRate - .1;
            } else {
                video.playbackRate = .3;
            }
            console.log(video.playbackRate);
        }};
    

    video = document.querySelector('video')
    nextButton = document.querySelector("[data-purpose = 'go-to-next']")
    previousButton = document.querySelector("[data-purpose = 'go-to-previous']")
    
    // MutationObserver doesn't seem to work for all of Udemy's video attributes. Registers clicks on video container and sends state of video paused attribute instead.
    video.parentElement.parentElement.addEventListener('click', () => {
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