document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('selectAreaBtn').addEventListener('click', function() {

        const tokenValue = document.getElementById('tokenInput').value;
        const selectedLanguage = document.getElementById('languageSelect').value;

        chrome.storage.local.set({ 'token': tokenValue, 'language': selectedLanguage });

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            let activeTab = tabs[0];
            chrome.tabs.sendMessage(activeTab.id, {"action": "startSelection"});   //select area
            chrome.runtime.sendMessage({action: "capture_screenshot"});    //download screenshot
        });

    });


    document.getElementById('xInput').addEventListener('change', function() {      // cambiamos eje x
        let xValue = parseInt(document.getElementById('xInput').value);
        chrome.storage.local.get('X', function(data) {
            let xValue1 = data.X ? parseInt(data.X) : 0; // Si el valor de X no existe en el almacenamiento, usamos 0 como valor predeterminado.
            xValue1 += xValue; // Incrementamos xValue.
            chrome.storage.local.set({ 'X': xValue1 }); // Guardamos el valor incrementado de nuevo en chrome.storage.local.
            document.getElementById('xInput').value = "0";
        });
        sendUpdateMessage('updatex', xValue);
    });



    // Para yInput:
    document.getElementById('yInput').addEventListener('change', function() {         // cambiamos eje y
        let yValue = parseInt(document.getElementById('yInput').value)*-1;
        chrome.storage.local.get('Y', function(data) {
            let yValue1 = data.Y ? parseInt(data.Y) : 0; // Si el valor de Y no existe, usamos 0 como valor predeterminado.
            yValue1 += yValue; // Incrementamos yValue.
            chrome.storage.local.set({ 'Y': yValue1 }); // Guardamos el valor incrementado en chrome.storage.local.
            document.getElementById('yInput').value = "0";
        });
        sendUpdateMessage('updatey', yValue);
    });

    // Para iInput:
    document.getElementById('iInput').addEventListener('change', function() {      // cambiamos background  con fondo blanco
        let iValue = parseInt(document.getElementById('iInput').value);
        chrome.storage.local.get('I', function(data) {
            let iValue1 = data.I ? parseInt(data.I) : 0;
            iValue1 += iValue;
            chrome.storage.local.set({ 'I': iValue1 });
            document.getElementById('iInput').value = "0";
        });
        sendUpdateMessage('updatei', iValue);
    });
    // Para sInput:
    document.getElementById('sInput').addEventListener('change', function() {       // cambiamos spaciado de palabras
        let sValue = parseInt(document.getElementById('sInput').value);
        chrome.storage.local.get('S', function(data) {
            let sValue1 = data.S ? parseInt(data.S) : 0;
            sValue1 += sValue;
            chrome.storage.local.set({ 'S': sValue1 });
            document.getElementById('sInput').value = "0";
        });
        sendUpdateMessage('updates', sValue);
    });
    // Para zInput:
    document.getElementById('zInput').addEventListener('change', function() {       // cambiamos tamano / size de palabras
        let zValue = parseInt(document.getElementById('zInput').value);
        chrome.storage.local.get('Z', function(data) {
            let zValue1 = data.Z ? parseInt(data.Z) : 12;
            zValue1 += zValue;
            chrome.storage.local.set({ 'Z': zValue1 });
            document.getElementById('zInput').value = "0";
        });
        sendUpdateMessage('updatez', zValue);
    });
    // Función para enviar un mensaje a la pestaña activa

    document.getElementById('qInput').addEventListener('change', function() {      //Cambiamos el interlineado
        let qValue = parseInt(document.getElementById('qInput').value);
        chrome.storage.local.get('Q', function(data) {
            let qValue1 = data.Q ? parseInt(data.Q) : 0;
            qValue1 += qValue;
            chrome.storage.local.set({ 'Q': qValue1 });
            document.getElementById('qInput').value = "0";
        });
        sendUpdateMessage('updateq', qValue);
    });


    function sendUpdateMessage(action, value) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            let activeTab = tabs[0];
            chrome.tabs.sendMessage(activeTab.id, {"action": action, Value: value});
        });
    }
    document.getElementById('reset').addEventListener('click', function() {
        chrome.storage.local.set({ 'X':0,'Y':0,'I':0,'S':0,'Z':12,'Q':0 });
    });


});