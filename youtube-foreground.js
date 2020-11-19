if (!window.scriptInjected) {
    window.scriptInjected = true; //Prevents script from being run multiple times per tab

    console.log('Script has been injected');
    chrome.runtime.sendMessage('Video loaded');

    video = document.querySelector('video');

    // Creates a MutationsObserver to monitor video DOM element
    const observer = new MutationObserver((mutations) => {
        // Mutations object used for debugging
        chrome.runtime.sendMessage(video.paused)
    });
    observer.observe(video, {
        attributes: true
    })

    // Chrome lists Keyboard shortcuts in alphabetical order.
    shortcuts = {
        aPausePlay: new KeyboardEvent('keydown', { 'keyCode': 75 }),
        bRewind: new KeyboardEvent('keydown', { 'keyCode': 37 }),
        cFastforward: new KeyboardEvent('keydown', { 'keyCode': 39 }),
        // dVolumeUp works by modifying a DOM element property
        // eVolumeDown works by modifying a DOM element property
        fNextVideo: new KeyboardEvent('keydown', { 'shiftKey': true, 'keyCode': 78 }),
        // gPreviousVideo works by using the browser tabs API command. Check commandHandler() in background.js
        // hLoopCurrentVideo works by modifying a DOM element property
        iSpeedUp: new KeyboardEvent('keydown', { 'shiftKey': true, 'keyCode': 190 }),
        jSlowDown: new KeyboardEvent('keydown', { 'shiftKey': true, 'keyCode': 188 }),
    }
    
    // All commands handled via the DOM
    domElementCommands = {
        'dVolumeUp': () => {
            if (video.volume < .9) {
                video.volume = video.volume + .1;
            }
            else {
                video.volume = 1
            };
            console.log('Volume:', video.volume);
        },
        'eVolumeDown': () => {
            if (video.volume > .1) {
                video.volume = video.volume - .1;
            }
            else {
                video.volume = 0
            };
            console.log('Volume:', video.volume);
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
        }
    };

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Uses incoming message as a dynamic key to dispatch keypress or call command function
        if (Object.keys(shortcuts).includes(request.message)) {
            console.log("Command received: ", request.message);
            document.dispatchEvent(shortcuts[request.message]);
        };
        if (Object.keys(domElementCommands).includes(request.message)) {
            console.log("Command received: ", request.message);
            domElementCommands[request.message]();
        };
    });
    
    // Prevents background.js from running scripts on other windows when video is still playing in current window.
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.message === "Is your tab's video playing?") {
            if (!video.paused) {
                sendResponse("Yes, don't run a script on the other window yet.")
            }
            else {
                sendResponse("No, you can run a script on the other window.")
            }
        }
    });
}