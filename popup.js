document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('selectAreaBtn').addEventListener('click', function() {

        const tokenValue = document.getElementById('tokenInput').value;
        const selectedLanguage = document.getElementById('languageSelect').value;

        chrome.storage.local.set({ 'token': tokenValue, 'language': selectedLanguage }, function() {
        });

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            let activeTab = tabs[0];
            chrome.tabs.sendMessage(activeTab.id, {"action": "startSelection"});   //select area
            chrome.runtime.sendMessage({action: "capture_screenshot"});    //download screenshot
        });

    });
});