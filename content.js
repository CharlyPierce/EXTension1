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


const DESPLAZAMIENTO = 30;  // Ajusta este valor según lo que necesites
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



const TAMANO_FUENTE = 14;  // tamaño de fuente

let lastY = null;
let lastX = 0;
let currentLineDiv = null;

function addWordToOverlay(wordData, overlay) {
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
        currentLineDiv.style.left = lastX - 25 + "px"; 
        currentLineDiv.style.top = lastY + "px";
        currentLineDiv.innerHTML = '<span class="line-close">x</span>';
        overlay.appendChild(currentLineDiv);
        $(currentLineDiv).draggable();
        
        // Añadir evento de click al botón de cierre
        
        currentLineDiv.querySelector('.line-close').addEventListener('click', function() {
            this.parentNode.remove();
        });
    }

    wordDiv.style.left = (lastX - parseInt(currentLineDiv.style.left)) + "px"; 
    wordDiv.style.top = (lastY - parseInt(currentLineDiv.style.top)) + "px";
    wordDiv.innerHTML = wordData.text + " <span>x</span>";

    currentLineDiv.appendChild(wordDiv);

    // Incrementamos lastX con el ancho real del div + un pequeño espacio para separación
    lastX += wordDiv.offsetWidth + 10;

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
    
}


// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action == "startSelection") {
        startSelectionProcess();
        const myToken = request.token; 
        const myTarget = request.language;
    }
    else if (request.action === "edit_image") { 
        let dataUrl = request.dataUrl;
        let startX = request.startX;
        let startY = request.startY;
        let endX = request.endX;
        let endY = request.endY;
        // Uso de la función
        cropImage(dataUrl, startX, startY, endX, endY, function(croppedDataUrl) {
            // console.log(croppedDataUrl); // Esto imprimirá la nueva imagen recortada en base64
            // let imgElement = document.createElement('img');
            // imgElement.src = croppedDataUrl;
            // document.body.appendChild(imgElement);

            async function processImage(croppedDataUrl) {
                try {
                    const worker = await Tesseract.createWorker(
                        // {logger: m => console.log(m)}
                    );
                    await worker.loadLanguage('eng');
                    await worker.initialize('eng');
                    // const { data: { text } } = await worker.recognize(croppedDataUrl);   //Solo extrae el texto
                    const { data } = await worker.recognize(croppedDataUrl);  // Modificación aquí
                    // console.log(JSON.stringify(data, null, 2));  // Imprimirá la estructura de datos con un formato legible


                    // Iterar a través de los bloques, líneas y palabras para imprimir el texto y las coordenadas

                    let overlay = document.createElement('div');
                    overlay.id = "overlay";
                    document.body.appendChild(overlay);
                    
                    let style = document.createElement('style');
                    style.innerHTML = `

                    .line {
                        padding: 5px 0; 
                        display: flex;
                        align-items: center;
                        transition: background-color 0.3s; 
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
                        padding: 0 7px; /* padding aumentado */
                        background-color: rgba(255, 255, 255, 0.9); /* fondo blanco con opacidad para contraste */
                        font-size: 14px; /* tamaño de fuente aumentado */
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
                    
                    // Añadir el botón de cierre grande al overlay
                    let closeButton = document.createElement('div');
                    closeButton.id = 'overlay-close-btn';
                    closeButton.innerHTML = 'X';
                    closeButton.addEventListener('click', function() {
                        document.body.removeChild(overlay);
                    });
                    overlay.appendChild(closeButton);
                    


                    let wordsAndCoords = [];
                    for (const block of data.blocks) {
                        for (const paragraph of block.paragraphs) {
                            for (const line of paragraph.lines) {
                                for (const word of line.words) {
                                    // Ajustar las coordenadas para que sean relativas a la imagen original
                                    let adjustedX0 = word.bbox.x0 + startX;
                                    let adjustedY0 = word.bbox.y0 + startY;
                                    // console.log(`Texto: ${word.text}, Coordenadas: [${adjustedX0}, ${adjustedY0}], Confianza: ${word.confidence}`);
                                    wordsAndCoords.push({
                                        text: word.text,
                                        coords: [adjustedX0, adjustedY0]
                                    });
                                }
                            }
                        }
                    }


                    chrome.storage.local.get(['token', 'language'], function(data) {
                        const tokenValue = data.token;
                        const selectedLanguage = data.language;

                        // console.log(tokenValue)
                        // console.log(selectedLanguage)
                        getTranslatedCoords(wordsAndCoords, tokenValue, selectedLanguage).then(result => {
                            for (const wordData of result) {
                                addWordToOverlay(wordData, overlay);
                                
                            }
                        }).catch(error => {
                            // console.error("Error al obtener las coordenadas traducidas:", error);
                            // Aquí puedes manejar el error, por ejemplo, mostrando un mensaje al usuario o deteniendo otras acciones.
                        });

                    });

    

                    await worker.terminate();
                } catch (error) {
                    console.error("Error al procesar la imagen:", error);
                }
            }
            processImage(croppedDataUrl);    
        });


    }
});