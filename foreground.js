if (!window.scriptInjected) {
    window.scriptInjected = true;

    console.log('Script has been injected')

    console.log(player)
    // Chrome lists Keyboard shortcuts in alphabetical order.
    shortcuts = {
        aPausePlay: new KeyboardEvent('keydown', { 'keyCode': 75 }),
        bRewind: new KeyboardEvent('keydown', { 'keyCode': 37 }),
        cFastforward: new KeyboardEvent('keydown', { 'keyCode': 39 }),
        dVolumeUp: new KeyboardEvent('keydown', { 'keyCode': 38 }), // Not working yet
        eVolumeDown: new KeyboardEvent('keydown', { 'keyCode': 40 }), // Not working yet
        fNextVideo: new KeyboardEvent('keydown', { 'shiftKey': true, 'keyCode': 78 }),
        gPreviousVideo: new KeyboardEvent('keydown', { 'altKey': true, 'keyCode': 37 }), // Not working yet
        hSpeedUp: new KeyboardEvent('keydown', { 'shiftKey': true, 'keyCode': 190 }),
        iSlowDown: new KeyboardEvent('keydown', { 'shiftKey': true, 'keyCode': 188 }),
    }
    
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("Message received: ", request.message)
        // Uses incoming message as a dynamic key to dispatch keypress
        document.dispatchEvent(shortcuts[request.message]);
    })
}