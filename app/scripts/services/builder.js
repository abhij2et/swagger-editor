'use strict';

PhonicsApp.service('Builder', function Builder($q) {
  var load = _.memoize(jsyaml.load);
  var v2 = SwaggerTools.specs.v2;

  /**
   * Build spec docs from a string value
   * @param {string} stringValue - the string to make the docs from
   * @returns {promise} - Returns a promise that resolves to spec document
   *  object or get rejected because of HTTP failures of external $refs
  */
  function buildDocs(stringValue) {
    var json;
    var deferred = $q.defer();

    // If stringVlue is empty, return emptyDocsError
    if (!stringValue) {
      deferred.reject({
        specs: null,
        error: {emptyDocsError: {message: 'Empty Document'}}
      });

      return deferred.promise;
    }

    // if jsyaml is unable to load the string value return yamlError
    try {
      json = load(stringValue);
    } catch (yamlError) {
      deferred.reject({
        error: { yamlError: yamlError },
        specs: null
      });

      return deferred.promise;
    }

    // Add `title` from object key to definitions
    // if they are missing title
    if (json && angular.isObject(json.definitions)) {
      for (var definition in json.definitions) {
        if (_.isEmpty(json.definitions[definition].title)) {
          json.definitions[definition].title = definition;
        }
      }
    }

    v2.resolve(json, undefined, function (resolveError, resolved) {
      if (resolveError) {
        return deferred.reject({
          error: {resolveError: resolveError},
          specs: json
        });
      }

      v2.validate(resolved, function (validationError) {
        if (validationError) {
          return deferred.reject({
            error: {swaggerError: validationError},
            specs: resolved
          });
        }

        deferred.resolve({specs: resolved, swaggerError: null});
      });
    });

    return deferred.promise;
  }

  /**
   * Gets a path JSON object and Specs, finds the path in the
   * specs JSON and updates it
   * @param {array} - path an array of keys to reach to an object in JSON
   *   structure
   * @param {string} - pathName
   * @param {object} - specs
  */
  function updatePath(path, pathName, specs) {
    var json;
    var error = null;

    try {
      json = load(path);
    } catch (e) {
      error = { yamlError: e };
    }

    if (!error) {
      specs.paths[pathName] = json[pathName];
    }

    return {
      specs: specs,
      error: error
    };
  }

  /*
   * Returns one path that matches pathName
   * Returns error object if there is schema incomparability issues
  */
  function getPath(specs, path) {
    return _.pick(specs.paths, path);
  }

  this.buildDocs = buildDocs;
  this.updatePath = updatePath;
  this.getPath = getPath;
});
