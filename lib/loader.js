const { getOptions, parseQuery } = require('loader-utils')
const validateOptions = require('schema-utils')

module.exports = function parentScopeLoader(source) {
  const options = getOptions(this);

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

  var lines = source.split('\n')
  var level = 0
  var result = []
  var hitindicator = '%'
  //var hitindicator = '//-%'
  var match = false

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i]
    var depth = line.search(/\S/)
    var indicatorfound = false

    //console.log('=====================================')
    //console.log(line)

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
    }

    //console.log(match)
    //console.log(level)

    if (level == 0) {
      result.push(line)
    } else if (match && !indicatorfound) {
      result.push(line.substring(2))
    }

  }

  result = result.join('\n')
  //console.log(result)
  return result
}


