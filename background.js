// Declaración de la variable global para almacenar el dataUrl de la captura de pantalla.
let screenshotDataUrl = null;
let activeTabId = null;


// Función modificada para almacenar el dataUrl en la variable global.
function saveScreenshot(dataUrl) {
    screenshotDataUrl = dataUrl;
}

function captureScreenshot() {
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
        saveScreenshot(dataUrl);
    });
}



chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "capture_screenshot") {
        captureScreenshot();
    }
    else if (request.action === "crop_screenshot") {
        // Aquí puedes acceder a startX, startY, endX, endY directamente desde el objeto request.
        let startX = request.startX;
        let startY = request.startY;
        let endX = request.endX;
        let endY = request.endY;

        // Envía los datos a content.js
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            activeTabId = tabs[0].id;

            chrome.tabs.sendMessage(activeTabId, {
                action: "edit_image",
                dataUrl: screenshotDataUrl,
                startX: startX,
                startY: startY,
                endX: endX,
                endY: endY
            });

        });
        
    }
});



chrome.contextMenus.removeAll(function() {
    // Una vez que todos los ítems han sido removidos, crea el nuevo ítem.
    chrome.contextMenus.create({
        id: "area",
        title: "translate",
        contexts: ["all"] // Esto aparecerá solo cuando se seleccione texto.
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "area") {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            let activeTab = tabs[0];
            
            // Envía un mensaje a la pestaña activa para iniciar la selección
            chrome.tabs.sendMessage(activeTab.id, {"action": "startSelection"});
            captureScreenshot();
        });
    }
});


