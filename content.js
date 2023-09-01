let isSelecting = false;
let myToken = null;
let myTarget = null;

function startSelectionProcess() {
    if (isSelecting) return;

    isSelecting = true;

    // Crear e inyectar la capa transparente
    let overlay = document.createElement('div');
    overlay.className = 'selection-area';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = '999'; // Un valor alto para asegurarte de que esté encima de todo
    overlay.style.cursor = 'crosshair';
    document.body.appendChild(overlay);

    let startX, startY, endX, endY;
    let selectionDiv = document.createElement('div');
    selectionDiv.className = 'selection-area';
    
    selectionDiv.style.position = 'absolute';
    selectionDiv.style.border = '2px dashed #000';
    selectionDiv.style.display = 'none';
    selectionDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.06)';
    overlay.appendChild(selectionDiv);



    // Escuchar el evento mousedown
    document.addEventListener('mousedown', function(event) {

        startX = event.clientX;

        startY = event.clientY;  

        selectionDiv.style.left = startX + 'px';
        selectionDiv.style.top = startY + 'px';
        selectionDiv.style.width = '0px';
        selectionDiv.style.height = '0px';

        selectionDiv.style.display = 'block';
    });


    // Escuchar el evento mousemove
    document.addEventListener('mousemove', function(event) {
        if (!isSelecting) return;

        endX = event.clientX;
        endY = event.clientY;

        let width = endX - startX;
        let height = endY - startY;

        selectionDiv.style.width = width + 'px';
        selectionDiv.style.height = height + 'px';
    });

    // Escuchar el evento mouseup
    document.addEventListener('mouseup', function() {
        if (!isSelecting) return;


        isSelecting = false;
        document.body.style.cursor = 'default';

        chrome.runtime.sendMessage({
            action: "crop_screenshot",
            startX: startX,
            startY: startY,
            endX: endX,
            endY: endY
        });
        // Eliminar el elemento div de selección
        removeSelectionDivs();
        // document.body.removeChild(selectionDiv);
    });
}

function removeSelectionDivs() {
    let selectionDivs = document.querySelectorAll('.selection-area');
    for (let div of selectionDivs) {
        div.parentNode.removeChild(div);
    }
}

function cropImage(dataUrl, startX, startY, endX, endY, callback) {
    // Crear una nueva imagen desde la URL de datos
    let img = new Image();
    img.src = dataUrl;

    img.onload = function() {
        // Crear un elemento canvas
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');

        // Establecer el tamaño del canvas al tamaño del recorte
        canvas.width = endX - startX;
        canvas.height = endY - startY;

        // Dibujar la imagen recortada en el canvas
        ctx.drawImage(img, startX, startY, endX - startX, endY - startY, 0, 0, endX - startX, endY - startY);

        // Convertir el canvas en una URL de datos y llamar al callback
        callback(canvas.toDataURL());
    };
}








function rearrangeTranslations(pairedTranslations) {
    // Extract sentences
    let englishPhrase = pairedTranslations.map(pair => pair.text).join(' ');
    let spanishPhrase = pairedTranslations.map(pair => pair.translation).join(' ');

    // Split sentences into words
    let englishWords = englishPhrase.split(' ').filter(word => word);
    let spanishWords = spanishPhrase.split(' ').filter(word => word);

    // Determine max length
    let maxLength = Math.max(englishWords.length, spanishWords.length);

    // Prepare lists
    let rearrangedEnglishWords = Array(maxLength).fill('');
    let rearrangedSpanishWords = Array(maxLength).fill('');

    // Rearrange words
    let englishIndex = 0;
    let spanishIndex = 0;
    while (englishWords.length > 0 || spanishWords.length > 0) {
        if (spanishWords.length > 0) {
            rearrangedSpanishWords[spanishIndex++] = spanishWords.shift();
        }
        if (spanishWords.length > 0) {
            rearrangedSpanishWords[maxLength - spanishIndex] = spanishWords.pop();
        }
        if (englishWords.length > 0) {
            rearrangedEnglishWords[englishIndex++] = englishWords.shift();
        }
        if (englishWords.length > 0) {
            rearrangedEnglishWords[maxLength - englishIndex] = englishWords.pop();
        }
    }

    // Create paired translations
    let rearrangedPairs = [];
    for (let i = 0; i < maxLength; i++) {
        rearrangedPairs.push({
            text: rearrangedEnglishWords[i],
            translation: rearrangedSpanishWords[i]
        });
    }

    return rearrangedPairs;
}

let DESPLAZAMIENTO=0;
// chrome.storage.local.get(['Z'], function(data) {
//     if (data && data.Z) {
//         DESPLAZAMIENTO = data.Z;
//     } else {
//         DESPLAZAMIENTO = 10;
//     }
// });

async function getTranslatedCoords(wordsAndCoords, token, target) {
    try {
        // Extraer palabras y traducirlas
        const palabras = wordsAndCoords.map(item => item.text);
        const textoCompleto = palabras.join(' ');

        let pairedTranslations;
        try {
            pairedTranslations = await translateText(textoCompleto, token, target);
        } catch (error) {
            alert("TOKEN INCORRECTO!");
            return; // Esto detendrá la ejecución del programa
        }

        // console.log(wordsAndCoords)
        // console.log(pairedTranslations)

        let rearranged = rearrangeTranslations(pairedTranslations);
        // console.log(rearranged);       //palabras acomodadas


        pairedTranslations = rearranged;

        
        let currentIndex = 0;
        const translatedWordsAndCoords = [];

        pairedTranslations.forEach(pair => {
            const originalWords = pair.text.split(' ');
            const translatedWords = pair.translation.split(' ');

            for (let i = 0; i < Math.max(originalWords.length, translatedWords.length); i++) {
                const originalWord = originalWords[i] || '';
                const translatedWord = translatedWords[i] || '';

                // Si la palabra original no está presente, usamos la última coordenada conocida y añadimos el desplazamiento
                const coords = originalWord 
                    ? wordsAndCoords[currentIndex].coords 
                    : [
                        translatedWordsAndCoords[translatedWordsAndCoords.length - 1].coords[0] + DESPLAZAMIENTO,
                        translatedWordsAndCoords[translatedWordsAndCoords.length - 1].coords[1]
                      ];

                if (translatedWord) {
                    translatedWordsAndCoords.push({
                        text: translatedWord,
                        coords: coords
                    });
                }

                if (originalWord) {
                    currentIndex++;
                }
            }
        });

        return translatedWordsAndCoords;

    } catch (error) {
        throw new Error("Token incorrecto.2");
    }    
}







let TAMANO_FUENTE=15;  //  // todo en el mismo renglon
// chrome.storage.local.get(['I'], function(data) {
//     if (data && data.I) {
//         TAMANO_FUENTE = data.I;
//     } else {
//         TAMANO_FUENTE = 12;
//     }
// });

let lastX=100;
// chrome.storage.local.get(['S'], function(data) {
//     if (data && data.S) {
//         lastX  = data.S;
//     } else {
//         lastX = 10;
//     }
// });

let lastY = null;
let currentLineDiv = null;





function addWordToOverlay(wordData, overlay) {
    chrome.storage.local.get(['X', 'Y', 'I', 'S', 'Z'], function(data) {
        let xValue = data.X ? parseInt(data.X) : 0;
        let yValue = data.Y ? parseInt(data.Y) : 0;
        let iValue = data.I ? parseInt(data.I) : 0;
        let sValue = data.S ? parseInt(data.S) : 0;
        let zValue = data.Z ? parseInt(data.Z) : 0;
        // currentLineDiv.style.left = (lastX - 25 + xValue) + "px";

        let wordDiv = document.createElement('div');
        wordDiv.className = "word";
        
        // Si es la primera palabra o hemos detectado un cambio de línea
        if (lastY === null || Math.abs(wordData.coords[1] - lastY) > TAMANO_FUENTE) {
            lastX = wordData.coords[0];
            lastY = wordData.coords[1];
    
            // Crear un nuevo div para la línea y hacerlo arrastrable
            currentLineDiv = document.createElement('div');
            currentLineDiv.className = "line";
            currentLineDiv.style.position = "absolute";
            currentLineDiv.style.left = lastX + "px";
            currentLineDiv.style.left = (lastX - 25 + xValue) + "px"; //x de cierre de linea------------------------------------------------------------------------------------------>------------------------------------------------------------------------------------------>
            currentLineDiv.style.top = (lastY+yValue) + "px";//// Dezplazamiento de x hacia arriba eje y------------------------------------------------------------------------------------------>------------------------------------------------------------------------------------------>
            currentLineDiv.innerHTML = '<span class="line-close">x</span>';
            overlay.appendChild(currentLineDiv);
            $(currentLineDiv).draggable();
            
            // Añadir evento de click al botón de cierre
            
            currentLineDiv.querySelector('.line-close').addEventListener('click', function() {
                this.parentNode.remove();
            });
    
    
        }
    
        wordDiv.style.left = (lastX - parseInt(currentLineDiv.style.left )+ xValue) +"px";   // Dezplazamiento de texto a la derecha de la x------------------------------------------------------------------------------------------>
        wordDiv.style.top = (lastY - parseInt(currentLineDiv.style.top)+yValue) + "px";     // Dezplazamiento de texto hacia arriba eje y------------------------------------------------------------------------------------------>
        wordDiv.innerHTML = wordData.text + " <span>x</span>";
    
        currentLineDiv.appendChild(wordDiv);
    
        // Incrementamos lastX con el ancho real del div + un pequeño espacio para separación
        lastX += wordDiv.offsetWidth + 0 + sValue;                                  // DEZPLAZAMIENTO ENTRE PALABRAS ------------------------------------------------------------------------------------------>
    
        // Evento para cerrar la palabra
        wordDiv.querySelector('span').addEventListener('click', function(event) {
            event.stopPropagation(); // Evitar que el evento se propague
        
            wordDiv.remove(); // Esto eliminará wordDiv sin importar cuál sea su nodo padre
            
            // Si la línea está vacía, elimínala
            if (!currentLineDiv.firstChild) {
                overlay.removeChild(currentLineDiv);
                currentLineDiv = null;
            }
        });


    });
}





//############ R E F A C T O R I Z A D O ####################################
function createStyles(paddingValue,sizeValue,lineValue) {
    let style = document.createElement('style');
    style.innerHTML = `

    .line {
        padding: 5px 0; 
        display: flex;
        align-items: center;
        transition: background-color 0.3s; 
        top:${lineValue};
    }
    
    .line:hover {
        background-color: rgba(200, 200, 200, 0.05); 
    }
    
    .line-close {
        display: inline-block;
        margin-right: 10px;
        margin-top: -10px; /* Hacer que la x se vea un poco más arriba */
        cursor: pointer;
        padding: 5px;
        font-size: 14px; 
        font-weight: bold; 
        color: rgba(100, 100, 100, 0.7); 
        border-radius: 50%; 
        background-color: rgba(200, 200, 200, 0.5); /* Color de fondo gris para el círculo */
    }
    
    .line-close:hover {
        color: rgba(50, 50, 50, 1); 
        background-color: rgba(150, 150, 150, 0.7); /* Color de fondo gris oscuro para el círculo */
    }
    

    #overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 1000;
        background-color: rgba(0, 0, 0, 0.1);
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    .word {
        position: absolute;   
        z-index: 1001;
        cursor: move;
        padding: 0 ${paddingValue}px; /* padding aumentado             pone    el     fondo blanco        */              
        background-color: rgba(255, 255, 255, 0.9); /* fondo blanco con opacidad para contraste */
        font-size: ${sizeValue}px; /* tamaño de fuente aumentado      tamano de letra consistente con el fondo y el espaciado */
        font-family: Arial, sans-serif; /* Fuente legible */
    }
    


    .word > span {
        position: absolute;
        top: -15px;
        right: 0;
        background-color: white;
        border: 1px solid black;
        border-radius: 50%;
        width: 15px;
        height: 15px;
        text-align: center;
        line-height: 15px;
        font-size: 12px;
        cursor: pointer;
        opacity: 0; /* invisible por defecto */
        transition: opacity 0.3s; /* transición suave al mostrar */
    }
    
    .word:hover > span {
        opacity: 1; /* visible al pasar el ratón */
    }
    
    #overlay-close-btn {
        position: absolute;
        top: 10px;
        width: 30px;
        height: 30px;
        background-color: #ff0000; /* color más neutro */
        color: white; /* color blanco por defecto */
        border-radius: 50%;
        text-align: center;
        line-height: 30px;
        font-size: 26px; /* tamaño de fuente inicial */
        cursor: pointer;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); /* sombra sutil */
        border: 2px solid transparent; /* borde inicial transparente */
        transition: background-color 0.2s, color 0.2s, font-size 0.2s, border 0.2s; /* transición agregada para el borde */
    }
    
    #overlay-close-btn:hover {
        background-color: #555; /* color un poco más claro al pasar el ratón */
        color: #ff0000; /* color rojo al pasar el ratón */
        font-size: 29px; /* tamaño de fuente aumentado al pasar el ratón */
        border: 3px solid #ff0000;
    }                    
    `;
    document.head.appendChild(style);
}

function createCloseButton(overlay) {
    let closeButton = document.createElement('div');
    closeButton.id = 'overlay-close-btn';
    closeButton.innerHTML = 'X';
    closeButton.addEventListener('click', function() {
        document.body.removeChild(overlay);
    });
    overlay.appendChild(closeButton);
}

function extractWordsAndCoords(data, startX, startY) {
    let wordsAndCoords = [];
    for (const block of data.blocks) {
        for (const paragraph of block.paragraphs) {
            for (const line of paragraph.lines) {
                for (const word of line.words) {
                    let adjustedX0 = word.bbox.x0 + startX;
                    let adjustedY0 = word.bbox.y0 + startY;
                    wordsAndCoords.push({
                        text: word.text,
                        coords: [adjustedX0, adjustedY0]
                    });
                }
            }
        }
    }
    return wordsAndCoords;
}

async function processImage(croppedDataUrl, startX, startY) {
    try {




        const worker = await Tesseract.createWorker();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        const { data } = await worker.recognize(croppedDataUrl);  
        
        let overlay = document.createElement('div');
        overlay.id = "overlay";
        document.body.appendChild(overlay);

        chrome.storage.local.get(['I','Z','Q'], function(data) {
            let paddingValue = data.I !== undefined ? data.I : 7; // Valor recuperado del almacenamiento
            let lineValue = data.Q !== undefined ? data.Q : 0; // Valor recuperado del almacenamiento
            let sizeValue = (data.Z === undefined || data.Z <= 9) ? 12 : data.Z; // Valor recuperado del almacenamiento
            createStyles(paddingValue, sizeValue,lineValue); // Llamar a la función y pasar el valor
            createCloseButton(overlay);
        });
        
        let wordsAndCoords = extractWordsAndCoords(data, startX, startY);

        chrome.storage.local.get(['token', 'language'], function(data) {
            const tokenValue = data.token;
            const selectedLanguage = data.language;
            getTranslatedCoords(wordsAndCoords, tokenValue, selectedLanguage).then(result => {
                for (const wordData of result) {
                    addWordToOverlay(wordData, overlay);
                }
            }).catch(error => {
                console.error("Error al obtener las coordenadas traducidas:", error);
            });
        });

        await worker.terminate();
    } catch (error) {
        console.error("Error al procesar la imagen 2:", error);
    }
}
// Función para actualizar la posición X de los elementos
function updateXPosition(value) {
        let shiftValue = value;  // Asumiendo que X es una cadena que representa un número.
        try {
            // Obteniendo todos los elementos con la clase específica
            let elementsToUpdate = document.querySelectorAll('.line.ui-draggable.ui-draggable-handle');
            // Si no hay elementos, lanzamos un error
            if (!elementsToUpdate.length) throw new Error("No elements found with the specified class.");
            // Iterando sobre todos los elementos y actualizando la posición left
            elementsToUpdate.forEach(function(element) {
                // Obteniendo el valor actual de left
                let currentLeftValue = parseInt(element.style.left, 10);
                // Actualizando el valor
                element.style.left = (currentLeftValue + shiftValue) + "px";
                // Si también quieres mover la 'x' que está en los comentarios
                let xElement = element.querySelector('.line-close');
                if (xElement) {
                    let currentXLeftValue = parseInt(xElement.style.left, 10);
                    xElement.style.left = (currentXLeftValue + shiftValue) + "px";
                }
            });
        } catch (error) {
            // Manejando el error y mostrando un mensaje en la consola
            console.log("Error updating elements:", error.message);
        }
}
function updateYPosition(value) {
    let shiftValue = value;  // Asumiendo que el valor es una cadena que representa un número.
    try {
        // Obteniendo todos los elementos con la clase específica
        let elementsToUpdate = document.querySelectorAll('.line.ui-draggable.ui-draggable-handle');
        // Si no hay elementos, lanzamos un error
        if (!elementsToUpdate.length) throw new Error("No elements found with the specified class.");
        // Iterando sobre todos los elementos y actualizando la posición top
        elementsToUpdate.forEach(function(element) {
            // Obteniendo el valor actual de top
            let currentTopValue = parseInt(element.style.top, 10);
            // Actualizando el valor
            element.style.top = (currentTopValue + shiftValue) + "px";
            // También quieres mover el 'x' que está en los comentarios
            let xElement = element.querySelector('.line-close');
            if (xElement) {
                let currentXTopValue = parseInt(xElement.style.top, 10);
                xElement.style.top = (currentXTopValue + shiftValue) + "px";
            }
        });
    } catch (error) {
        // Manejando el error y mostrando un mensaje en la consola
        console.log("Error updating elements:", error.message);
    }
}


function updateIPosition(value) {
    let shiftValue = value;  
    // Obteniendo todos los elementos con la clase "word"
    let elementsToUpdate = document.querySelectorAll('.word');
    if (!elementsToUpdate.length) throw new Error("No elements found with the specified class.");
    elementsToUpdate.forEach(function(element) {
        try {
            // Descomponiendo el padding actual en sus partes individuales

            let computedStyle = getComputedStyle(element);
            let paddingValues = computedStyle.padding.split(" ");;
            // Si hay dos valores en padding, el primero se aplica a top y bottom y el segundo a left y right

            if (paddingValues.length === 1) {
                let currentValue = parseInt(paddingValues[0], 10);
                element.style.padding = `${currentValue}px ${shiftValue}px ${currentValue}px ${currentValue}px`;
            }
            // Si hay dos valores en padding, el primero se aplica a top y bottom y el segundo a left y right
            else if (paddingValues.length === 2) {
                let currentValue = parseInt(paddingValues[1], 10);
                element.style.padding = `${paddingValues[0]} ${currentValue + shiftValue}px`;
            }
            // Si hay cuatro valores, cada uno se aplica a un lado específico (top, right, bottom, left)
            else if (paddingValues.length === 4) {
                let currentValue = parseInt(paddingValues[1], 10);
                element.style.padding = `${paddingValues[0]} ${currentValue + shiftValue}px ${paddingValues[2]} ${currentValue + shiftValue}px`;
            }
            // En otros casos, puedes manejar de manera especial o simplemente ignorar


        } catch (error) {
            // Manejando el error y mostrando un mensaje en la consola
            console.log("Error updating elements:", error.message);
        }
    });
}
function updateZPosition(value) {
    // Asegurándonos de que value sea un número
    let sizeIncrement = parseInt(value, 10);
    if (isNaN(sizeIncrement)) throw new Error("Invalid value provided. Expected a number.");

    // Obteniendo todos los elementos con la clase "word"
    let elementsToUpdate = document.querySelectorAll('.word');
    if (!elementsToUpdate.length) throw new Error("No elements found with the specified class.");
    elementsToUpdate.forEach(function(element) {
        try {
            // Obteniendo el tamaño de fuente actual del elemento
            let computedStyle = getComputedStyle(element);
            
            let currentFontSize = parseInt(computedStyle.fontSize, 10) || 12;
            // console.log("Incremento:",sizeIncrement)
            // Sumando el incremento al tamaño de fuente actual
            let newSize = currentFontSize + sizeIncrement;
            // console.log("final:",newSize)
            // Actualizando el tamaño de fuente del elemento
            element.style.fontSize = `${newSize}px`;

        } catch (error) {
            // Manejando el error y mostrando un mensaje en la consola
            console.log("Error updating elements:", error.message);
        }
    });
}

function updateSPosition(spacingValue) {
    chrome.storage.local.get('S', function(data) {

        let currentSpacing = data.S ? parseInt(data.S) : 0;


        currentSpacing += spacingValue;
        chrome.storage.local.set({ 'S': currentSpacing });


        let lines = document.querySelectorAll('.line');
        lines.forEach(function(line) {
            let words = line.querySelectorAll('.word');
    
            if (words.length) {
                let newLeftValue = parseInt(words[0].style.left, 10) || 0;
    
                for (let i = 0; i < words.length; i++) {
                    if (i > 0) {
                        newLeftValue += words[i - 1].offsetWidth + currentSpacing;
                    }
                    words[i].style.left = newLeftValue + "px";
                }
            }
        });


    });
}
function updateQPosition(spacingValue) {
    chrome.storage.local.get('Q', function(data) {

        let currentVerticalSpacing = data.Q ? parseInt(data.Q) : 0;
        currentVerticalSpacing += spacingValue;
        let lines = document.querySelectorAll('.line');
        
        if (lines.length) {
            let newTopValue = parseInt(lines[0].style.top, 10) || 0;

            for (let i = 0; i < lines.length; i++) {
                if (i > 0) {
                    newTopValue += lines[i - 1].offsetHeight + currentVerticalSpacing;
                }
                lines[i].style.top = newTopValue + "px";
            }
        }

    });

}



// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action == "startSelection") {
        let btn = document.getElementById('overlay-close-btn');
        if (btn) {
            btn.click();
        }
        startSelectionProcess();
        const myToken = request.token; 
        const myTarget = request.language;
    }
    else  if (request.action === "edit_image") { 
        let dataUrl = request.dataUrl;
        let startX = request.startX;
        let startY = request.startY;
        let endX = request.endX;
        let endY = request.endY;
    
        cropImage(dataUrl, startX, startY, endX, endY, function(croppedDataUrl) {
            processImage(croppedDataUrl, startX, startY);    
        });
    }
    else if(request.action === "updatex"){
        updateXPosition(request.Value);
    }
    else if(request.action === "updatey"){
        updateYPosition(request.Value);
        }
    else if(request.action === "updatei"){
        updateIPosition(request.Value)
    }
    else if(request.action === "updates"){
        updateSPosition(request.Value)
        }
    else if(request.action === "updatez"){
        updateZPosition(request.Value)
        }
    else if(request.action === "updateq"){
        updateQPosition(request.Value)
        }

});