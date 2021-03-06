// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Genie
//
// Copyright 2020 The Board of Trustees of the Leland Stanford Junior University
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Author: Silei Xu <silei@cs.stanford.edu>
"use strict";

const fs = require('fs');
const assert = require('assert');
const util = require('util');
const ThingTalk = require('thingtalk');

const StreamUtils = require('../../lib/utils/stream-utils');

const { parseConstantFile } = require('../lib/constant-file');

const AnnotationGenerator = require('./lib/annotation-generator');

async function loadClassDefs(thingpedia) {
    const library = ThingTalk.Grammar.parse(await util.promisify(fs.readFile)(thingpedia, { encoding: 'utf8' }));
    assert(library.isLibrary);
    return library.classes;
}

module.exports = {
    initArgparse(subparsers) {
        const parser = subparsers.add_parser('auto-annotate', {
            add_help: true,
            description: "Automatically generate annotations including canonicals"
        });
        parser.add_argument('--dataset', {
            required: true,
            choices: ['schemaorg', 'sgd', 'multiwoz', 'wikidata', 'custom'],
            help: 'The dataset to run autoQA on.'
        });
        parser.add_argument('-o', '--output', {
            required: true,
            type: fs.createWriteStream
        });
        parser.add_argument('-l', '--locale', {
            default: 'en-US',
            help: `BGP 47 locale tag of the natural language being processed (defaults to en-US).`
        });
        parser.add_argument('--constants', {
            required: true,
            help: 'TSV file containing constant values to use.'
        });
        parser.add_argument('--thingpedia', {
            required: true,
            help: 'Path to ThingTalk file containing class definitions.'
        });
        parser.add_argument('--functions', {
            required: false,
            default: null,
            help: `List of functions to include, split by comma (no space). Include all functions if not specified`,
        });
        parser.add_argument('--skip', {
            action: 'store_true',
            help: 'Skip the entire process.',
            default: false
        });
        parser.add_argument('--remove-existing-canonicals', {
            action: 'store_true',
            help: 'Remove all existing canonical annotations',
            default: false
        });
        parser.add_argument('--algorithm', {
            help: 'Different algorithms to generate canonicals including bert, bart, adj, split by comma (no space)',
            default: null
        });
        parser.add_argument('--batch-size', {
            required: false,
            type: Number,
            default: 64,
            help: `The batch size for auto paraphrase`
        });
        parser.add_argument('--pruning', {
            required: false,
            type: Number,
            default: 0.5,
            help: `The minimum fraction required for a candidate to be added`
        });
        parser.add_argument('--parameter-datasets', {
            required: true,
            help: `TSV file containing the paths to datasets for strings and entity types.`
        });
        parser.add_argument('--model', {
            required: false,
            default: 'bert-large-uncased',
            help: `A string specifying a model name recognizable by the Transformers package (e.g. bert-base-uncased), `
                + `or a path to the directory where the model is saved`
        });
        parser.add_argument('--is-paraphraser', {
            required: false,
            default: false,
            action: 'store_true',
            help: `Set to True if model_name_or_path was fine-tuned on a paraphrasing dataset`
        });
        parser.add_argument('--gpt2-ordering', {
            required: false,
            default: false,
            action: 'store_true',
            help: `Set to True to use gpt2 to decide where to put value`
        });
        parser.add_argument('--paraphraser-model', {
            required: false,
            help: `A path to the directory where the bart paraphraser model is saved`
        });
        parser.add_argument('--mask', {
            required: false,
            default: false,
            action: 'store_true',
            help: `mask token before predicting`
        });
        parser.add_argument('--debug', {
            required: false,
            default: false,
            action: 'store_true',
            help: `Enable debugging, which will output intermediate result into files.`
        });
    },

    async execute(args) {
        const classDefs = await loadClassDefs(args.thingpedia);

        if (args.skip) {
            for (let classDef of classDefs)
                args.output.write(classDef.prettyprint() + '\n');
            args.output.end();
        } else {
            const options = args;
            const constants = await parseConstantFile(args.locale, args.constants);
            const functions = args.functions ? args.functions.split(',') : null;

            for (let classDef of classDefs) {
                const generator = new AnnotationGenerator(classDef, constants, functions, args.parameter_datasets, options);
                const annotatedClassDef = await generator.generate();
                args.output.write(annotatedClassDef.prettyprint());
            }
            args.output.end();
        }

        StreamUtils.waitFinish(args.output);
    }
};
