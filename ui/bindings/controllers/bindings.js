/*
 * (C) Copyright 2017 o2r project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const debug = require('debug')('bindings');
const rscript = require('r-script');
const path = require('path');
const net = require('net');
const fn = require('./generalFunctions');
const processJson = require('./processJson');
const request = require('request');

let bindings = {};
let runningPorts = [];

bindings.start = (conf) => {
    return new Promise((resolve, reject) => {
        debug('Start bindings service');

        const app = express();
              app.use(bodyParser.json());
              app.use(bodyParser.urlencoded({extended: true}));

        app.post('/api/v1/bindings/extractR', function(req, res) {
            bindings.implementExtractR(req.body, res);
        });
   
        app.post('/api/v1/bindings/searchBinding', function ( req, res ) {
            bindings.searchBinding( req.body, res);
        });


        app.post('/api/v1/bindings/binding', function(req, res) {
            bindings.createBinding(req.body, res);
        });

        // wäre schön, binding als "sub-resource": https://o2r.uni-muenster.de/api/v1/compendium/abcde/binding/figure1?newValue0=42
        app.get('/api/v1/compendium/:compendium/binding/:binding', function(req, res) {
            let compendium = req.params.compendium;
            let binding = req.params.binding;
            debug('Getting image for %s from compendium: %s', binding, compendium)

            // query paramater auslesen mit req.query
            debug('Query parameters: %s', Object.keys(req.query).length);
            let queryParameters = '?';
            for ( let i = 0; i < Object.keys(req.query).length; i++ ) {
                queryParameters = queryParameters + "newValue" + i + "=" + req.query["newValue"+i];
                if ( i +1 < Object.keys(req.query).length ) {
                    queryParameters = queryParameters + "&";
                } 
            }
            debug('Created url: %s', queryParameters);
            
            // gucken ob schon ein container für (compendium,binding) existiert
            // wenn ja, den internen port in der container-Liste nachschlagen und den request weiter leiten
            debug('number of saved ports: %s', runningPorts.length)
            let running = runningPorts.find(function(elem) {
                return elem.result === compendium + binding;
            });
            debug('Port %s for result %s in compendium %s: %s', running.port, binding, compendium)

            var request_options = {
                url: "http://localhost:"+ running.port + "/" + binding + queryParameters,
            };
            debug('Created URL: %s', request_options.url)

            var req_pipe = request(request_options);
                req_pipe.pipe(res);
        
                req_pipe.on('error', function(e){
                    console.log(e);
                });
                //client quit normally
                req.on('end', function(){
                    console.log('end');
                    req_pipe.abort();
        
                });
                //client quit unexpectedly
                req.on('close', function(){
                    console.log('close');
                    req_pipe.abort();
    
                });

                // wenn nicht, dann plumber container starten, siehe /api/v1/bindings/runPlumberService
        });
        
        // allow clients to "prepare" a container for the binding by calling this POST endpoing
        app.post('/api/v1/compendium/:compendium/binding/:binding', function(req, res) {
            let compendium = req.params.compendium;
            let binding = req.params.binding;
            /*res.send({
                callback: 'ok',
                data: req.body});*/

            // gucken schon ein container für (compendium,binding) existiert, wenn nicht den service _auf einem neuen freien_
            let running = runningPorts.find(function(elem) {
                return elem.result === compendium + binding;
            });
            debug('Start running plumber service for compendium %s and result %s', req.body.id, req.body.computationalResult.result);
            runningPorts.push({
                result: compendium+binding,
                port: req.body.port
            });
            debug('Saved %s of compendium %s under port %s', binding, compendium, req.body.port);

            bindings.runR(req.body);

            // TODO port und binding intern speichern in container-Liste
            
            // wenn ja, dann garnichts machen
        });
        let bindingsListen = app.listen(conf.port, () => {
            debug('Bindings server listening on port %s', conf.port);
            resolve(bindingsListen);
        });
    });
};

// TODO: CRON job
/*var cron = require('node-cron');
 
cron.schedule('* 23 * * *', () => {
  console.log('cleaning up containers');

  // durch container-Liste durchgehen
    // alle container älter als 25 stunden stoppen und aus der container-Liste entfernen

});*/

bindings.createBinding = function(binding, response) {
    debug( 'Start creating binding for result: %s, compendium: %s', binding.computationalResult.result, binding.id );
    let fileContent = fn.readRmarkdown( binding.id, binding.sourcecode.file );
    let figureSize = fn.extractFigureSize(binding, fileContent);
    fn.modifyMainfile( fileContent, binding.computationalResult, binding.sourcecode.file, binding.id );
    let codelines = fn.handleCodeLines( binding.sourcecode.codelines );
    let extractedCode = fn.extractCode( fileContent, codelines );
        extractedCode = fn.replaceVariable( extractedCode, binding.sourcecode.parameter );
    let wrappedCode = fn.wrapCode( extractedCode, binding.computationalResult.result, binding.sourcecode.parameter, figureSize );
    fn.saveResult( wrappedCode, binding.id, binding.computationalResult.result.replace(/\s/g, '').toLowerCase() );
    fn.createRunFile( binding.id, binding.computationalResult.result.replace(/\s/g, '').toLowerCase(), binding.port );
    binding.codesnippet = binding.computationalResult.result.replace(/\s/g, '').toLowerCase() + '.R';
    response.send({
        callback: 'ok',
        data: binding});
};

bindings.implementExtractR = function (binding,response) {
    debug( 'Start to extract codelines for result: %s, compendium: %s', binding.computationalResult.result, binding.id );

    //Used for testing
    //let file = fn.readFile('test',binding);

    //Comment in if used with Service
    let file = fn.readRmarkdown(binding.id, binding.sourcecode.file);

    //Mock response TODO --> REPLACE CODED LINES
    // Codelines = {"start":30,"end":424} 
    binding.sourcecode.codelines = processJson.getCodeLines(file);
    console.log(binding.sourcecode.codelines)
    response.send({
        callback: 'ok',
        data: binding});
};

bindings.searchBinding = function ( req, res) {
    var searchTerm= req.term
    
    var metadata= req.metadata
    debug( 'Start searching for %s', searchTerm,);
    let figures = [];
    let newCode = '';
    for(var i in metadata.interaction){
        let fileContent = fn.readRmarkdown( metadata.interaction[i].id, metadata.interaction[i].sourcecode.file );
        let codelines = fn.handleCodeLines( metadata.interaction[i].sourcecode.codelines );
        let extractedCode = fn.extractCode( fileContent, codelines );
              
        if(extractedCode.indexOf(searchTerm) != -1)
        {
            figures.push(metadata.interaction[i].computationalResult.result);
            debug( 'Found ', searchTerm, ' in ', metadata.interaction[i].computationalResult.result)

        }
        else{
            debug( 'Not Found ', searchTerm, ' in ', metadata.interaction[i].computationalResult.result)
        }
    }

    debug( 'End searching for %s', searchTerm,);
    res.send({
        callback: 'ok',
        data:figures,
        code:newCode});
};

/*bindings.showFigureDataCode = function(binding) {
    debug('Start creating the binding %s for the result %s',
        binding.purpose, binding.figure);
    let fileContent = fn.readRmarkdown(binding.id, binding.mainfile);
    let codeLines = fn.handleCodeLines(binding.codeLines);
    let extractedCode = fn.extractCode(fileContent, codeLines);
    fn.saveResult(extractedCode, binding.id, binding.figure);
    let dataContent = fn.readCsv(binding.id, binding.dataset);
    let extractedData = fn.extractData(dataContent, bindings.dataset);
    fn.saveDatasets(extractedCode, binding.id,
        binding.figure.replace(/\s/g, '').toLowerCase());
    // fn.modifyMainfile(binding, fileContent);
};*/

bindings.runR = function ( binding ) {
    let server = net.createServer(function(socket) {
        socket.write('Echo server\r\n');
        socket.pipe(socket);
    });
    
        server.listen(binding.port, 'localhost');
        server.on('error', function (e) {
            debug("port %s is not free", binding.port);
            binding.port = binding.port+1;
            bindings.runR(binding);
        });
        server.on('listening', function ( e ) {
            server.close();
            debug("port %s is free", binding.port);
            let filepath = path.join('tmp', 'o2r', 'compendium', binding.id, binding.computationalResult.result.replace(/\s/g, '').toLowerCase() + 'run.R');
            let run = rscript(filepath)
                .call(function ( err, d ) {
                    if ( err ) { 
                        debug('error: %s', err.toString());
                    }
                    debug('Started service: %s', binding.computationalResult.result);
                });
            debug('Started rscript: %o', filepath);
        });
        server.close(function () {
            console.log('server stopped');
          });
};

module.exports = bindings;
