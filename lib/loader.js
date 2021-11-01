const { getOptions, parseQuery }  = require('loader-utils')
const filedataStore               = require('./filedata-store')
const loremIpsum                  = require('lorem-ipsum')
const Module                      = require("module");
const validateOptions             = require('schema-utils')
const alea                        = require('alea')
const path                        = require('path')

module.exports = function parentScopeLoader(source) {
  var debug = false;
  var options = getOptions(this);
  var that = this
  var callback = this.async()
  var lines   = source.split('\n');
  var templateFile = false
  var root = ''
  var prefix  = '%';
  var params  = getParams(this);
  var modesLegacy = [
    't3template',
    'styleguide',
    'template'
  ];
  var modesNew = [
    'product',
    'styleguide',
    'vuetemplate'
  ];
  if (options && 'root' in options && options['root'] != false) {
    root = options['root']
  }
  var tabstop = calculateTabstop(lines);
  var mode    = getMode(params);
  var pushLinesOutsideModeblock = true;
  if (mode == 'vuetemplate') {
    var pushLinesOutsideModeblock = false;
  }
  var insideModeblock = false;
  var insideMatchingModeblock = false;
  var modeblockDepth = false;
  var modeblockEnd = false;
  var result = [];
  var title = ''

  if (debug) {
    console.log('='.repeat(120));
    console.log('MODE: ' + mode);
    console.log('='.repeat(120));
  }

  for (var i = 0; i < lines.length; i++) {

    var line = lines[i];
    var lineDepth = line.search(/\S/);
    var lineWithPrefix = false;
    var preventLinePush = false;

    if (insideModeblock) {
      if (i > modeblockEnd) {
        modeblockEnd = false;
        insideModeblock = false;
        insideMatchingModeblock = false;
      }
    }

    if (line.trim().startsWith(prefix)) {
      var lineTag = line.trim().replace(prefix, '');
      lineWithPrefix = true;
      preventLinePush = true;
      if (!insideModeblock) {
        if (modesNew.includes(lineTag)
          || modesLegacy.includes(lineTag)
        ) {
          insideModeblock = true;
          modeblockDepth = line.search(/\S/);
          modeblockEnd = getModeblockEnd(i, modeblockDepth);
        }
        if (lineTag == mode) {
          insideMatchingModeblock = true;
        }
        if (modesLegacy.indexOf(lineTag) >= 0
          && modesNew[modesLegacy.indexOf(lineTag)] == mode
        ) {
          insideMatchingModeblock = true;
        }
      }

      var tagMatch = 'styleguidetitle';
      if (lineTag.startsWith(tagMatch)) {
        if (root) {
          // Only include file in list if is directly included
          // root is not set if it is included via other file
          title = lineTag.replace(tagMatch, '').trim();
          file = path.relative(root, this.resourcePath).replace('.pug', '.html');
          filedataStore.setTitle(file, title);
        }
      }

      var tagMatch = 'styleguideblindtext';
      if (lineTag.startsWith(tagMatch)) {
        var blindtextParameters = lineTag.replace(tagMatch, '').trim();
        blindtextParameters = blindtextParameters.split(' ');
        if (Number.isInteger(parseInt(blindtextParameters[0]))) {
          var blindtextLength = parseInt(blindtextParameters[0]);
        } else {
          var blindtextLength = 8;
        }
        var possibleUnits = ['words', 'sentences', 'parahraphs'];
        if (possibleUnits.includes(blindtextParameters[1])) {
          var units = blindtextParameters[1];
        } else {
          var units = possibleUnits[0];
        }
        aleaRandom = alea(title + blindtextLength);
        var text = loremIpsum({
          count: blindtextLength,
          units: units,
          random: aleaRandom,
        });
        line = ' '.repeat(lineDepth) + '| ' + text;
        preventLinePush = false;
      }

      var tagMatch = 'styleguidecontent'
      if (lineTag.startsWith(tagMatch)) {
        if (('keepStyleguideContentMarker' in options)) {
          result.push(' '.repeat(lineDepth) +  prefix + tagMatch);
        }
      }

      var tagMatch = 'styleguidetemplate'
      if (lineTag.startsWith(tagMatch)) {
        if ('styleguideTemplateInsert' in params) {
          templateFile = lineTag.replace(tagMatch, '').trim() + '?styleguide'
        }
      }
    }

    if (!pushLinesOutsideModeblock && !insideMatchingModeblock) {
      preventLinePush = true;
    }

    if (pushLinesOutsideModeblock && insideModeblock && !insideMatchingModeblock) {
      preventLinePush = true;
    }

    if (!preventLinePush) {
      if (insideModeblock) {
        result.push(line.substring(tabstop));
      } else {
        result.push(line);
      }
    }

    if (debug) {
      console.log(line);
      console.log(' '.repeat(80) + 'lineWithPrefix: ' + lineWithPrefix);
      console.log(' '.repeat(80) + 'preventLinePush: ' + preventLinePush);
      console.log(' '.repeat(80) + 'insideModeblock: ' + insideModeblock);
      console.log(
        ' '.repeat(80) + 'insideMatchingModeblock: ' + insideMatchingModeblock
      );
      console.log(' '.repeat(80) + 'modeblockDepth: ' + modeblockDepth);
      console.log(' '.repeat(80) + 'modeblockEnd: ' + modeblockEnd);
      console.log('-'.repeat(120));
    }
  }

  if (mode == 'product') {
    // Remove head width content
    var lines = result;
    var result = [];
    var insideHeaderblock = false;
    var headerblockEnd = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var lineDepth = line.search(/\S/);
      if (i > headerblockEnd) {
        headerblockEnd = false;
        insideHeaderblock = false;
      }
      if (
        line.trimLeft().startsWith('head ')
        ||
        line.trimLeft().startsWith('head(')
        || (
          line.trimLeft().startsWith('head')
          &&
          line.trimLeft().lenght == 4
        )
      ) {
        insideHeaderblock = true;
        headerblockEnd = getModeblockEnd(i, lineDepth);
      }
      if (!insideHeaderblock) {
        result.push(line);
      }
    }

    // Remove html, body and doctype tags and two levels of indentation
    var lines = result
    var result = []
    var htmlTagPresent = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i]
      var depth = line.search(/\S/);
      var preventLinePush = false;
      if (line.trim().startsWith('doctype')) {
        preventLinePush = true
      }
      if (line.trim().startsWith('html')) {
        htmlTagPresent = true;
        preventLinePush = true;
      }
      if (line.trim().startsWith('body')) {
        preventLinePush = true
      }
      if (!preventLinePush) {
        if (htmlTagPresent) {
          result.push(line.substring(2 * tabstop));
        } else {
          result.push(line);
        }
      }
    }
  }

  if (templateFile) {
    this.loadModule(
      '!!raw-loader!pug-contentswitch-loader?keepStyleguideContentMarker!'
      + root
      + '/'
      + templateFile, processModuleData
    );
  } else {
    result = result.join('\n');
    callback(null, result);
  }

  function processModuleData(err, moduleSource, sourceMap, module){
    var templateSource = exec.call(
      that,
      module._source._value,
      root + '/' + templateFile
    );
    var lines = templateSource.split('\n');
    var templateResult = [];
    var contentMarkerFound = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var depth = line.search(/\S/);
      var preventLinePush = false;
      var lineTag = line.trim().replace(prefix, '');
      var tagMatch = 'styleguidecontent';
      if (tagMatch == lineTag) {
        contentMarkerFound = true;
        preventLinePush = true;
        result.forEach(function(resultLine) {
          templateResult.push(' '.repeat(depth) + resultLine)
        });
      }
      if (!preventLinePush) {
        templateResult.push(line);
      }
    }
    if (contentMarkerFound) {
      callback(null, templateResult.join('\n'));
    } else {
      callback(null, result.join('\n'));
    }
    return;
  }

  function exec(code, filename) {
    const module = new Module(filename, this);
    module.paths = Module._nodeModulePaths(this.rootContext);
    module.filename = filename;
    module._compile(code, filename);
    return module.exports;
  }

  function getModeblockEnd(lineNumber, depth) {
    var endResult = lines.length;
    for (var i = lineNumber; i < lines.length; i++) {
      var modeblockLine = lines[i];
      if (modeblockLine.trim() != '') {
        var currentDepth = modeblockLine.search(/\S/);
        if (i != lineNumber && currentDepth <= depth) {
          endResult = i - 1;
          break;
        }
      }
    }
    return endResult;
  }

  function getParams(context) {
    if (context.resourceQuery) {
      return parseQuery(context.resourceQuery);
    }
    return [];
  }

  function calculateTabstop(lines) {
    for (var i = 0; i < lines.length; i++) {
      var depth = lines[i].search(/\S/);
      if (depth > 0) {
        return depth;
      }
    }
    return false;
  }

  function getMode(params) {
    var mode = false
    modesNew.forEach(function(key) {
      if (key in params) {
        mode = key;
      }
    });
    if (mode) {
      return mode;
    }
    modesLegacy.forEach(function(key) {
      if (key in params) {
        var arrayPos = modesLegacy.indexOf(key);
        mode = modesNew[arrayPos];
      }
    });
    return mode;
  }

  return;
}
