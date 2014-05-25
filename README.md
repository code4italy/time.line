Time.line #code4italy

https://github.com/code4italy/time.line

Visualizza il demo qui: http://code4italy.github.io/time.line/app/

![alt tag](https://raw.githubusercontent.com/code4italy/time.line/master/esempio1.png)
![alt tag](https://raw.githubusercontent.com/code4italy/time.line/master/esempio2.png)


AUTORI

Emanuele Decupis (@balanza)
Rigel Di Scala (@zedr_)
Nicola Ghirardi (@ghirardinicola)
Alessandro Pellegata (@alepelle81)
Alessio Ricco (@alessioricco)


DESCRIZIONE

Questo software è stato prodotto al hackaton #code4italy del 2014. Utilizza gli open data della Camera dei Deputati (dati.camera.it) per generare una timeline di eventi e stratistiche, in modo da favorire l'analisi temporale dell'attività parlamentare

Un'ulteriore feature e' la cronologia degli Atti, applicata alla mappa del nostro Paese.

STRUTTURA

/code4italy
|__/app         -->     front end statico web per la visualizzazione dei dati
|
|__/data        -->     contiene file statici di dati, generalmente csv estratti dagli open data
|
|__/doc         -->     documentazione
|
|__/dts         -->     applicazione node.js che si occupa di normalizzare e aggregare i dati proveniente da /data per  fornirli all'applicazione web tramite file json
|
|__/mobile      -->     applicazione per iPad e tablet Android, scritta in titanium
|
|__/scripts     -->     script che effettua query sugli Atti per citta'.


E’ disponibile la presentazione e le slides in vari formati nella cartella
/doc/presentazione


UTILIZZO

Scaricare il progetto.

Per il front-end web (requisiti: pyton):

avviare il server tramite il comando sh serve.sh (necessita pyton). Il sito web sarà disponibile all'indirizzo http://localhost:8000.

Per il dts (requisiti: node.js):

Lo script estrae  dati e salva i file json in /app/json. Avviare lo script tramite node index.js

Per l'app mobile (requisiti: Appcelerator Titanium):

Posizionarsi nella cartella /mobile, eseguire ti build -p ipad.

LICENZA
Il progetto viene rilasciato con licenze GPL + Creative Commons with Attribution (http://creativecommons.org/licenses/by/3.0/it/legalcode)
