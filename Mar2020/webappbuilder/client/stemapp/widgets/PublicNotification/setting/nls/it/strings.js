﻿/*
 | Copyright 2017 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
define({
  "searchSourceSetting": {
    "title": "Impostazioni buffer e di ricerca",
    "mainHint": "È possibile abilitare ricerche di testo di indirizzi features, digitalizzazione della geometria e buffering."
  },
  "addressSourceSetting": {
    "title": "Address Layers",
    "mainHint": "È possibile specificare quali sono i layer di etichetta destinatari disponibili."
  },
  "notificationSetting": {
    "title": "Opzioni di notifica",
    "mainHint": "È possibile specificare quali tipi di notifica sono disponibili."
  },
  "groupingLabels": {
    "addressSources": "Layer da utilizzare per selezionare il layer di destinazione",
    "averyStickersDetails": "Avery(r) stickers",
    "csvDetails": "File (CSV) con valori separati da virgole",
    "drawingTools": "Strumenti di disegno per una specifica area",
    "featureLayerDetails": "Feature layer",
    "geocoderDetails": "Geocodificatore",
    "labelFormats": "Formati di etichetta disponibili",
    "printingOptions": "Opzioni per pagine di etichetta stampate",
    "searchSources": "Fonti di ricerca",
    "stickerFormatDetails": "Parametri pagina etichetta"
  },
  "hints": {
    "alignmentAids": "Segni aggiunti alla pagina etichetta per consentire di allineare la pagina con la stampante",
    "csvNameList": "Un elenco di nomi di campi sensibili alle maiuscole e minuscole separati da virgole",
    "horizontalGap": "Spazio tra due etichette in una riga",
    "insetToLabel": "Spazio tra lato di etichetta e inizio del testo",
    "labelFormatDescription": "In che modo lo stile dell'etichetta viene presentato nell’elenco di opzioni del formato widget",
    "labelFormatDescriptionHint": "Descrizione del comando per completare la descrizione nell'elenco delle opzioni del formato",
    "labelHeight": "Altezza di ciascuna etichetta nella pagina",
    "labelWidth": "Larghezza di ciascuna etichetta nella pagina",
    "localSearchRadius": "Specifica il raggio di un'area intorno al centro della mappa corrente che viene utilizzato per assegnare la priorità alla classificazione dei candidati geocodificati  in modo che i canditati più vicini alla posizione vengano restituiti per primi",
    "rasterResolution": "La risoluzione della schermata è di circa 100 pixel per pollice. Quanto più è alta la risoluzione,tanto più memoria del browser sarà necessaria. I browser differiscono nella loro capacità di gestire abilmente richieste di grossa memoria.",
    "selectionListOfOptionsToDisplay": "Le voci selezionate sono visualizzate come opzioni nel widget; cambiare l’ordine come desiderato",
    "verticalGap": "Spazio tra due etichette in una colonna"
  },
  "propertyLabels": {
    "bufferDefaultDistance": "Distanza predefinita del buffer",
    "bufferUnits": "Settare nel widget l'unità del buffer",
    "countryRegionCodes": "Codici paesi o regioni",
    "description": "Descrizione",
    "descriptionHint": "Suggerimento descrizione",
    "displayField": "Campo di visualizzazione",
    "drawingToolsFreehandPolygon": "poligono a mano libera",
    "drawingToolsLine": "linea",
    "drawingToolsPoint": "punto",
    "drawingToolsPolygon": "poligono",
    "drawingToolsPolyline": "polilinea",
    "enableLocalSearch": "Abilita ricerca locale",
    "exactMatch": "Corrispondenza esatta",
    "fontSizeAlignmentNote": "Dimensione del carattere della nota sui margini di stampa",
    "gridDarkness": "Grid darkness",
    "gridlineLeftInset": "Left gridline inset",
    "gridlineMajorTickMarksGap": "Major tick marks every",
    "gridlineMinorTickMarksGap": "Minor tick marks every",
    "gridlineRightInset": "Right gridline inset",
    "labelBorderDarkness": "Label border darkness",
    "labelBottomEdge": "Margine inferiore delle etichette sulla pagina",
    "labelFontSize": "Dimensione carattere",
    "labelHeight": "Altezza etichetta",
    "labelHorizontalGap": "Spazio orizzontale",
    "labelInitialInset": "Inserto per il testo dell'etichetta",
    "labelLeftEdge": "Margine sinistro delle etichette sulla pagina",
    "labelMaxLineCount": "Numero massimo di linee nell’etichetta",
    "labelPageHeight": "Altezza pagina",
    "labelPageWidth": "Larghezza pagina",
    "labelRightEdge": "Margine destro delle etichette sulla pagina",
    "labelsInAColumn": "Numero di etichette in una colonna",
    "labelsInARow": "Numero di etichette in una riga",
    "labelTopEdge": "Margine superiore delle etichette sulla pagina",
    "labelVerticalGap": "Spazio verticale",
    "labelWidth": "Larghezza etichetta",
    "limitSearchToMapExtent": "Esegui la ricerca nell'estensione mappa corrente",
    "maximumResults": "Risultati massimi",
    "maximumSuggestions": "Suggerimenti massimi",
    "minimumScale": "Scala minima",
    "name": "Nome",
    "percentBlack": "% nero",
    "pixels": "pixel",
    "pixelsPerInch": "pixel per pollice",
    "placeholderText": "Testo segnaposto",
    "placeholderTextForAllSources": "Testo segnaposto per la ricerca in tutte le origini",
    "radius": "Raggio",
    "rasterResolution": "Risoluzione raster",
    "searchFields": "Campi di ricerca",
    "showAlignmentAids": "Mostra strumenti di allineamento sulla pagina",
    "showGridTickMarks": "Mostra segni di spunta sulla griglia",
    "showLabelOutlines": "Mostra i contorni dell'etichetta",
    "showPopupForFoundItem": "Mostra il popup per la feature o per la posizione trovata",
    "tool": "Strumenti",
    "units": "Unità",
    "url": "URL",
    "urlToGeometryService": "URL per il geometry service",
    "useRelatedRecords": "Utilizza i record correlati",
    "useSecondarySearchLayer": "Utilizza il layer di selezione secondario",
    "useSelectionDrawTools": "Usare gli strumenti di disegno della selezione",
    "useVectorFonts": "Utilizza i font vettoriali (solo caratteri latini)",
    "zoomScale": "Scala zoom"
  },
  "buttons": {
    "addAddressSource": "Aggiungi un layer contenente le etichette degli indirizzi nel relativo popup",
    "addLabelFormat": "Aggiungi un formato etichetta",
    "addSearchSource": "Aggiungi una origine di ricerca",
    "set": "Imposta"
  },
  "placeholders": {
    "averyExample": "ad es., etichetta Avery(r) ${averyPartNumber}",
    "countryRegionCodes": "ad es., USA,CHN",
    "descriptionCSV": "Valori separati da virgola",
    "descriptionPDF": "Etichetta PDF ${heightLabelIn} x ${widthLabelIn} pollici; ${labelsPerPage} per pagina"
  },
  "tooltips": {
    "getWebmapFeatureLayer": "Ricevi feature layer dalla webmap",
    "openCountryCodes": "Clicca per ricevere maggiori informazioni sui codici",
    "openFieldSelector": "Clicca per aprire un selettore di campi",
    "setAndValidateURL": "Imposta e convalida URL"
  },
  "problems": {
    "noAddresseeLayers": "Specificare almeno un layer destinatario",
    "noBufferUnitsForDrawingTools": "Configurare almeno un’unità buffer per gli strumenti di disegno",
    "noBufferUnitsForSearchSource": "Configurare almeno un’unità buffer per l’origine di ricerca \"${sourceName}”",
    "noGeometryServiceURL": "Configurare l’URL per il Geometry Service",
    "noNotificationLabelFormats": "Specificare almeno un formato per l’etichetta di notifica",
    "noSearchSourceFields": "Configurare uno o più campi di ricerca per l’origine di ricerca \"${sourceName}\"",
    "noSearchSourceURL": "Configurare l’URL per l’origine di ricerca \"${sourceName}\""
  },
  "querySourceSetting": {
    "sourceSetting": "Cerca impostazioni origine",
    "instruction": "Aggiungere e configurare servizi di geocodifica o feature layer come fonti di ricerca. Queste fonti specificate determinano ciò che è possibile cercare nella casella di ricerca.",
    "add": "Aggiungi origine di ricerca",
    "addGeocoder": "Aggiungi geocodificatore",
    "geocoder": "Geocodificatore",
    "setLayerSource": "Imposta layer di origine",
    "setGeocoderURL": "Imposta URL geocodificatore",
    "searchableLayer": "Feature Layer",
    "name": "Nome",
    "countryCode": "Codici paesi o regioni",
    "countryCodeEg": "es. ",
    "countryCodeHint": "Se si lascia vuoto questo campo, la ricerca verrà effettuata in tutti i paesi e le regioni",
    "generalSetting": "Impostazioni generali",
    "allPlaceholder": "Testo segnaposto per la ricerca in tutti: ",
    "showInfoWindowOnSelect": "Mostra il popup per la feature o per la posizione trovata",
    "showInfoWindowOnSelect2": "Mostra il popup quando viene trovata la feature o la posizione.",
    "searchInCurrentMapExtent": "Esegui la ricerca nell'estensione mappa corrente",
    "zoomScale": "Scala zoom",
    "locatorUrl": "URL del geocodificatore",
    "locatorName": "Nome geocodificatore",
    "locatorExample": "Questa funzione è stata aggiunta a partire da 10.1.",
    "locatorWarning": "Questa versione del servizio di geocodifica non è supportata. Il widget supporta il servizio di geocodifica versione 10.1 e successiva.",
    "locatorTips": "I suggerimenti non sono disponibili perché il servizio di geocodifica non supporta tale funzionalità.",
    "layerSource": "Origine del layer",
    "searchLayerTips": "I suggerimenti non sono disponibili perché il feature service non supporta la funzionalità di paginazione.",
    "placeholder": "Testo segnaposto",
    "searchFields": "Campi di ricerca",
    "displayField": "Campo di visualizzazione",
    "exactMatch": "Corrispondenza esatta",
    "maxSuggestions": "Suggerimenti massimi",
    "maxResults": "Risultati massimi",
    "enableLocalSearch": "Abilita ricerca locale",
    "minScale": "Scala minima",
    "minScaleHint": "Quando la scala della mappa è più grande di questa scala, verrà applicata la ricerca locale",
    "radius": "Raggio",
    "radiusHint": "Specifica il raggio di un'area intorno al centro della mappa corrente che viene utilizzato per assegnare la priorità alla classificazione dei candidati di geocodifica in modo che i canditati più vicini alla posizione vengano restituiti per primi",
    "meters": "Metri",
    "setSearchFields": "Imposta campi di ricerca",
    "set": "Imposta",
    "fieldSearchable": "incluso nella ricerca",
    "fieldName": "Nome",
    "fieldAlias": "Alias",
    "ok": "OK",
    "cancel": "Cancella",
    "invalidUrlTip": "URL ${URL} non valida o non accessibile.",
    "locateResults": "Trova risultati",
    "panTo": "Effettua Zoom A",
    "zoomToScale": "Zoom scala",
    "locatorError": "Il locator deve supportare la localizzazione a riga singola."
  }
});