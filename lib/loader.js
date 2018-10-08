const { getOptions, parseQuery } = require('loader-utils')
const validateOptions = require('schema-utils')
const Module = require("module");

module.exports = function parentScopeLoader(source) {
  const options = getOptions(this);

  var hitindicator = '%'
  //var hitindicator = '//-%'

  var params = []

  if (this.resourceQuery) {
    params = parseQuery(this.resourceQuery)
  }

  mode = false
  modes = ['t3template', 'styleguide']
  modes.forEach(function(key) {
    if (key in params) {
      mode = key
    }
  })

  var that = this
  var callback = this.async()

  var lines = source.split('\n')
  var level = 0
  var result = []
  var match = false
  var templateFile = false
  var template = false
  var root = ''
  var styleguidecontentpos = []

  if (options && 'root' in options && options['root'] != false) {
    root = options['root']
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    var depth = line.search(/\S/)
    var indicatorfound = false
    var preventPush = false

    if (depth < level) {
      match = false
      level = 0
    }

    if (line.trim().startsWith(hitindicator)) {
      indicatorfound = true

      if (lines[i+1].search(/\S/) > depth) {
        level = lines[i+1].search(/\S/)
      }

      if (line.trim().replace(hitindicator, '') == mode) {
        match = true
      }

      var contentIndicator = 'styleguidecontent'
      if (line.trim().replace(hitindicator, '').startsWith(contentIndicator)) {
        if (!('keepStyleguideContentMarker' in options)) {
          preventPush = true
        }
      }

      var templateIndicator = 'styleguidetemplate'
      if (line.trim().replace(hitindicator, '').startsWith(templateIndicator)) {
        preventPush = true
        if ('styleguideTemplateInsert' in params) {
          templateFile = line.trim().replace(hitindicator + templateIndicator, '').trim()
        }
      }
    }

    if (level == 0) {
      if (!preventPush) {
        result.push(line)
      }
    } else if (match && !indicatorfound) {
      result.push(line.substring(2))
    }

  }

  function processModuleData(err, moduleSource, sourceMap, module){
    var templateSource = exec.call(that, module._source._value, root + '/' + templateFile)

    var lines = templateSource.split('\n')
    var templateResult = []
    var contentMarkerFound = false

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i]
      var depth = line.search(/\S/)
      var preventPush = false

      var contentIndicator = 'styleguidecontent'
      if (line.trim().replace(hitindicator, '').startsWith(contentIndicator)) {
        contentMarkerFound = true
        preventPush = true
        result.forEach(function(resultLine) {
          templateResult.push(' '.repeat(depth) + resultLine)
        })
      }

      if (!preventPush) {
        templateResult.push(line)
      }
    }

    console.log(templateResult)

    if (contentMarkerFound) {
      callback(null, templateResult.join('\n'))
    } else {
      callback(null, result.join('\n'))
    }

    return
  }

  function exec(code, filename) {
    const module = new Module(filename, this);
    module.paths = Module._nodeModulePaths(this.rootContext);
    module.filename = filename;
    module._compile(code, filename);
    return module.exports;
  }

  if (templateFile) {
    this.loadModule('!!raw-loader!pug-contentswitch-loader?keepStyleguideContentMarker!' + root + '/' + templateFile, processModuleData);
  } else {
    result = result.join('\n')
    callback(null, result)
  }

  return
}


