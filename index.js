"use strict"

/** Config-Updater (CU) updates objects from any kind of repository like the environment.
 // CM = Config-Update-Macro
 *
 * Replace a kind of macros in any configuration-objects with values of 
 * different repositories
 * Defines functions that replace environment-variables in configuration-
 * objects. environment-variable-substitutions are indicated with a
 * Environment-Substitution-Definition (CU).
 *
 * @license MIT
 * @author Thomas von Stetten.
 */

/*
 * Ideas:
 * - include-path-xyz to avoid mandatory-errors (or any other) for unused branches
 * - decrypt-option for CM
 * - registerable extensions for CM class. Implemented in CU. Used at the end of
 *   getCmValue() (before testing `mandatory` by passing the whole-makro-definition
 *   and the resolved return-value
 */

// @ts-check   Enable TypeScript Type checking in VScode Editor
// cspell ignore syntax: // spell: ignore <word>
// ts-check type-hint: // @type {{a: number}}

/**
 * Error-Class for the Config-Helper-System
 */
class CuError extends Error {}

/**
 * Config-Macro (CM)
 *
 * The config-macro is the official way to create a macro that's used to retrieve
 * configuration macros at runtime.\
 * The Config-Helper system doesn't depend on instances of CM. configuration macros
 * can also be create manually with (e.g.) `{"$$": "my_password", $mandatory: true}`.
 * This class just simplifies the creation of such macros.\
 * CM supports chaining when defining additional options for the macro. \
 * For example: `cm = CM("key").default("any").parentDependent(true)`\
 *
 * A Config-Helper-Macro can contain the following keys:
 * - `$$:`\
 *   Represents the key-value that will be searched in the repositories.\
 *   If the first character of the key-value is a `?` the `?` will be replaced\ß
 *   by the name of the parent-key in a (multilevel) structure:\
 *   {networks: {\
 *      $defaults: {user: {$$="?_name"}, pw: {$$="?_pw"}}
 *      nw1: {pw: {$$="default_PW"}}
 *      nw2: {} // all pairs of $defaults get copied here. So the ? gets replaced with "nw2" => key = "nw2_name"\
 *   } }\
 *   This is especially useful in combination with the $defaults because all keys of
 * - `$default`:\
 *   A default-value that's used if no value was found for the key.value. The \
 *   default can also be a (nested) macro itself. So it's possible to define\
 *   a chain of default-values.
 * - `$mandatory`:\
 *   The value behind this element defines wether there must be a macro-result.\
 *   If so and the result is `undefined` an CuError gets thrown.
 * - `$callback`:\
 *   The value of that property ,must be a function. The function gets called \
 *   whenever the macro is resolved, after the standard handling for macros but \
 *   before the check for mandatory.\
 *   Function prototype: \
 *   `(<resolved-value>, <path-to-the-key>, <macro-itself>) => {... return <result>}`
 *      - `<resolved-value>` = the value as it could be resolved until the call of the callback.
 *      - `<path-to-the-key>` = an array with the complete path to the current macro. Useful especially for error-messages.
 *      - `<macro-itself>` = the complete macro. So it's possible to access the standard-keys as well as any custom property added to the macro.
 *      - `<result>` = the return-value of the function is used as the result of the macro.
 */
class CM {
    static KEY_KEY = "$$"
    static DEFAULT_KEY = "$default"
    static MANDATORY_KEY = "$mandatory"
    static CALLBACK_KEY = "$callback"
    static PARENT_DEPENDENT_INDICATOR = "?"

    /**
     * Builds a CM-object that can be used in a ConfigUpdater.
     *
     * @param {string}  key  A object that's consists of name-value-pairs.
     * @param {CU|any}  _default  An optional default-value in case `key` can't 
     * be resolved. The `_default` can also be an CM-object so that the 
     * default-value can be fetched from a repository.
     * @throws CuError  If the `key` is empty or no string.
     #*/
    constructor(key, _default = undefined) {
        if (typeof key == "object" && key[CM.KEY_KEY]) {
            // doesn't check the key-name but the getCmValue does :-)
            Object.assign(this, key)
        } else if (!key || typeof key !== "string")
            throw new CuError(
                `CM(): "key" must be a non-empty-string ("${key}")`
            )
        else this[CM.KEY_KEY] = key
        if (_default !== undefined) this[CM.DEFAULT_KEY] = _default
    }
    /**
     * Internal function that throws an exception if a callback is given but it's not a function.
     * @param {any} value
     * @returns {boolean} `false` if `value` is empty. Otherwise it throws an exception if `value' is not a function. Otherwise it returns false
     */
    static checkCallback(value) {
        if (!value) return false
        else if (typeof value !== "function")
            throw new CuError("The callback-property must be a function")
        else return true
    }
    /**
     * Deletes a property if it exists
     * @param {string} propertyKey name of the property to delete
     */
    #removeProp(propertyKey) {
        if (this.hasOwnProperty(propertyKey)) delete this[propertyKey]
    }
    /**
     * Sets/clears the flag that the key should be build from the parent-key + key.
     * @param {boolean} value set or remove the flag
     */
    parentDependent(value) {
        const hasFlag = this[CM.KEY_KEY].startsWith(
            CM.PARENT_DEPENDENT_INDICATOR
        )
        if (value && !hasFlag)
            this[CM.KEY_KEY] = CM.PARENT_DEPENDENT_INDICATOR + this[CM.KEY_KEY]
        else if (!value && hasFlag)
            this[CM.KEY_KEY] = this[CM.KEY_KEY].substring(
                CM.PARENT_DEPENDENT_INDICATOR.length
            )
    }
    /**
     * Set/remove the default-value for the macro
     * @param {CM|any} value
     * @returns
     */
    default(value) {
        if (value == undefined) this.#removeProp(CM.DEFAULT_KEY)
        else this[CM.DEFAULT_KEY] = value
        return this
    }
    /**
     * Set/Deletes the flag whether the macro must result in a value or not.
     * @param {boolean} value
     * @returns
     */
    mandatory(value) {
        if (!value) this.#removeProp(CM.MANDATORY_KEY)
        else this[CM.MANDATORY_KEY] = true
        return this
    }
    /**
     * Sets/Removes the macro-callback-function.
     * @param {function|undefined} value
     * @returns
     */
    callback(value) {
        if (CM.checkCallback(value)) this[CM.CALLBACK_KEY] = value
        else this.#removeProp(CM.CALLBACK_KEY)
        return this
    }

    // Access-functions that work with CM-instances an manually created macro-objects
    // They are independent of future changes of the statics
    static getKey(cm) {
        if (cm) return cm[CM.KEY_KEY]
    }
    static getDefault(cm) {
        if (cm) return cm[CM.DEFAULT_KEY]
    }
    static getMandatory(cm) {
        if (cm) return cm[CM.MANDATORY_KEY]
    }
    static getCallback(cm) {
        if (cm) return cm[CM.CALLBACK_KEY]
    }
    static getParentDependent(cm) {
        if (cm) return cm[CM.KEY_KEY].startsWith(CM.PARENT_DEPENDENT_INDICATOR)
    }
}

/**
 * Class to hold one or more dictionaries (Objects) whose values are used to
 * substitute property-values in configuration-dictionaries.\
 * When resolve() is called it will iterate through this repositories in their \
 * natural order. The first repositories that has a property with the searched
 * name will used as the result
 */
class ConfigUpdater {
    static FALLBACK_KEY = "$defaults"

    // List of the repositories attached.
    //                  0        1         2
    //  entry-format: [name, resolver, dictionary]
    #repositories = []

    constructor() {
        // automatically add the environment
        this.reset()
    }

    /**
     * Default-resolver for repositories that are registered without their own
     * resolver-function. The default-implementation iterates through the
     * `splitSearchKey` and grabs the corresponding entry in the provided
     * repository and uses this as the repository for the next element.
     *
     * The function is responsible for looking up the value
     * for a macro. If the macro-key can't be found the function has to return
     * `undefined`.
     * @param {object} repository the repository itself
     * @param {array} splitSearchKey array with the path of the key
     * @param {CM} the macro that's resolved at the moment
     * @param {array} path The path to the current property in the configuration
     * @returns {any|undefined} return either the resolved keyvalue or undefined
     * @see register()
     */
    #default_resolver(repository, splitSearchKey, macro, path) {
        // Iterate through the path (like a tree). Starting at the root of the repository
        for (const path of splitSearchKey) {
            repository = repository[path]
            // No sub-object with the partial pathname
            if (repository == undefined) return undefined
        }
        // After the for-loop node is either the the value
        return repository
    }

    /**
     * Resets the list of repositories to the initial state (only `process.env` is registered).
     * @returns {ConfigUpdater} reference to this
     */
    reset() {
        this.#repositories = []
        this.register("env", process.env)

        return this
    }
    /**
     * Register an additional repository.
     *
     * The function adds an additional repository with the given `name`. \
     * Optionally the `index` of the new repository can be defined. \
     * The position (`index`) is important because when searching for a property \
     * value, the repositories are taken from index 0 to the end of the list. The \
     * lower the index the higher the priority of the repository.
     * The `customResolver` is a function that's called whenever a value is searched \
     * The function has the following
     * @param {string}  name             Name of the new repository
     * @param {object}  repository       An Object (dictionary) that's used to resolve property-values
     * @param {number}  index = 9999999  An optional index for the new repository. If the index is >= the current amount of repositories, the new repository is added at the end (default)
     * @param {function} resolver        An optional function that handles the search-process. It's called for every macro that's evaluated. If not provided the CM.#default_resolver() is used.
     * @returns {ConfigUpdater} An instance of this
     * @see #default_resolver()
     */
    register(name, repository, index = 9999999, resolver = undefined) {
        // Add an array with [0] = the resolver-function an [1] = the resolver-data
        this.unregister(name)
        this.#repositories.splice(index, 0, [
            name,
            resolver || this.#default_resolver,
            repository,
        ])

        return this
    }

    /**
     * Remove a previously registered repository using it's name.
     * @param {string} name The name of the repository as it was given to the register-function
     * @example
     *     // Delete the process-environment repository/dictionary
     *     configUpdater.delete("env")
     * @returns {boolean} `true` if the repository could be deleted. `false` otherwise
     */
    unregister(name) {
        for (let i = 0; i < this.#repositories.length; i++) {
            if (this.#repositories[i][0] == name) {
                this.#repositories.splice(i, 1)
                return true
            }
        }
        return false
    }

    /**
     * Get the names of all registered repositories.
     * @returns {Array} Array with the namens of the registered
     */
    getRepositoryNames() {
        const result = []
        for (let item of this.#repositories) {
            result.push(item[0])
        }
        return result
    }

    /**
     * Retrieve the value of a property using registered repositories (environment,...)
     *
     * Function checks if `cm_or_any` is an object that contains CM-keywords \
     * (`{$$: [?]<propertyKey>[, $default: <CM>|<value>]}`).\
     * In this case the according environment variable gets returned. \
     * If the value of `propertyKey` starts with a '?' the ? will
     * be replaced with the `parentPropertyKey`
     *
     * For the following examples assume \
     *  `customProvider = {PROP: "prop-value", XX_PROP: "XX_prop-value"}`
     * @example
     * - parentPropertyKey="xx", property = "value" => "value"
     * - parentPropertyKey="xx", property = {$$: "PROP"} => "prop-value"
     * - parentPropertyKey="xx", property = {$$: "PROP1"} => undefined
     * - parentPropertyKey="xx", property = {$$: "PROP1",
     *      $default: "prop-undefined"} => "prop-undefined"
     * - parentPropertyKey="xx", property = {$$: "?_PROP"} => "XX_prop-value"
     * - parentPropertyKey="YYYYY", property = {$$: "?_PROP"} => undefined
     * - parentPropertyKey="yyyyy", property = {$$: "?_PROP",
     *      $default: "prop-undefined"} => "prop-undefined"
     * @access private
     * @param {CM|any}  cm_or_any  Any property-value. If the value is an object that represent a CM or has the CM-properties it's handled as a macro
     * @param {Array}   path       Represent the path to the property. Must be arn array!
     * @return {any} Either the original `cm_or_any`, the value retrieved from a repository, a default or `undefined`.
     * @throws CuError  If the value of the $$-property inside the CM-Object is empty or no string.
     * @see toCm
     * @see updateConfig
     */
    getCmValue(cm_or_any, path) {
        // Is it an object with an "$$" element
        if (cm_or_any && cm_or_any.hasOwnProperty(CM.KEY_KEY)) {
            let searchKey = cm_or_any[CM.KEY_KEY]
            // Only strings can be handled as keys in a repository
            if (!searchKey || typeof searchKey !== "string")
                throw new CuError(
                    `Invalid macro-key "${searchKey}" (path: ${path.join("/")})`
                )

            // Use the parent-key as a prefix?
            if (searchKey.startsWith(CM.PARENT_DEPENDENT_INDICATOR)) {
                // Find the first element in the path that's string (and not an array-index)
                let parent = ""
                let p = path.length - 1
                while (p >= 0) {
                    if (typeof path[p] == "string") {
                        // the first path is the key itself
                        if (p < path.length - 1) {
                            parent = path[p]
                            break
                        }
                        p--
                    } else {
                        // skip array-indices
                        while (p >= 0 && typeof path[p] == "number") {
                            p--
                        }
                        p-- // skip the array-name
                    }
                }
                // concat the parent-name and the rest of the search-key (after the indicator)
                searchKey =
                    parent +
                    searchKey.substring(CM.PARENT_DEPENDENT_INDICATOR.length)
            }

            // Iterate through all registered repositories and call their
            //  resolve-function until the function returns a value != undefined
            let result // declare here because it's needed outside the loop
            const searchKeySplit = searchKey.split("/") // split only once
            for (const repository of this.#repositories) {
                result = repository[1](
                    repository[2],
                    searchKeySplit,
                    cm_or_any,
                    path
                )
                // value found? => we're done
                if (result !== undefined) {
                    break
                }
            }

            // If no result and the definition has a "$default"-element
            if (
                result == undefined &&
                cm_or_any.hasOwnProperty(CM.DEFAULT_KEY)
            ) {
                // Recursive call for the default-value
                path.push("CM.DEFAULT_KEY")
                result = this.getCmValue(cm_or_any[CM.DEFAULT_KEY], path)
                path.pop()
            }

            // If we have a callback defined - call it now. the result of the
            //  callback becomes the result of getCmValue
            const callback = cm_or_any[CM.CALLBACK_KEY]
            if (callback) {
                CM.checkCallback(callback)
                result = callback(result, cm_or_any, path)
            }

            // Independent of how the result was retrieved, check mandatory if defined!
            if (result == undefined && cm_or_any[CM.MANDATORY_KEY]) {
                throw new CuError(`Property "${path.join("/")}" is mandatory.`)
            }
            return result
        }
        return cm_or_any
    }

    /**
     * Replace the value of `variableName` with a defined value in the repositories.
     *
     * It allows to retrieve simple values from the repositories \
     * It also allows the usage of the parent-key as a prefix of the key-name
     * @param {string} propertyKey               Name of the key that will be searched
     * @param {CM|any} defaultValue=undefined    Optional default-value
     * @param {Array|string} parentKeyOrPath=[]  Optional names of a parent-object (for error-messages)
     * @returns {any}  Either the substituted value or undefined
     * @access public
     */
    getValue(propertyKey, defaultValue = undefined, parentKeyOrPath = []) {
        return this.getCmValue(
            new CM(propertyKey, defaultValue),
            Array.isArray(parentKeyOrPath) ? parentKeyOrPath : [parentKeyOrPath]
        )
    }

    /**
     * Replace all macros with values from the `configUpdater`.
     *
     * The function traverses through the whole `config`-object-tree, determines \
     * existing config-macros (=CU, format `{$$, [$default]}`) and replaces their value with
     * values of the registered repositories.\
     * If the parent-property has a property '$defaults' all sub-properties of that \
     * fallback are copied to every sibling-object as far as they don't exist already.

     * So the values of `config` get changed!
     * @param {object|array} root                 Any Object whose properties should be updated with values of the configUpdater
     * @param {Array}        exclude=[]           Optional array of property-names that should not be handled (at any level)
     * @param {string}       initialParentKey=""  Optional name of the parent property. Used to add the branch-name for $$: "?..." replacements. This is *only* necessary if the function is called with a partial branch.
     * @returns {Object|Array} Returns the given `config`-parameter-object
     */
    updateConfig(root, exclude = [], initialParentKey = "") {
        const $this = this // needed to access the <this> inside of traverseConfig()
        const path = []

        // Need to check "typeof config == 'object'" _before_ calling!!!
        function traverseConfig(config) {
            const fallback = config[ConfigUpdater.FALLBACK_KEY]
            const keys = Array.isArray(config)
                ? config.keys()
                : Object.keys(config)
            // This works (and has to) for objects (dictionaries) and arrays
            for (const indexKey of keys) {
                const value = config[indexKey]
                if (
                    value &&
                    typeof value == "object" &&
                    indexKey != ConfigUpdater.FALLBACK_KEY &&
                    (!exclude || !exclude.includes(indexKey))
                ) {
                    path.push(indexKey)
                    // try to substitute the value
                    const result = $this.getCmValue(value, path)

                    // Value changed => replace the config-entry
                    if (result != value) {
                        config[indexKey] = result
                    }

                    if (result && typeof result == "object") {
                        // Copy all missing properties from the $defaults-object
                        // remark: This can't happen if config is an array!
                        if (fallback) {
                            const keys = Object.keys(result)
                            for (const key in fallback) {
                                if (!keys.includes(key)) {
                                    result[key] = fallback[key]
                                }
                            }
                        }
                        // Recursive call for all children of the current node
                        traverseConfig(result)
                    }
                    path.pop()
                }
            }
        }

        if (root && typeof root == "object") {
            if (initialParentKey) {
                path.push(initialParentKey)
            }
            traverseConfig(root)
        }
        // possible chaining
        return root
    }
}

/** Config-Macro-Factory is a factory to create a new CM
 * @see CM.Constructor for parameter description
 */
function cmf(key, _default = undefined) {
    return new CM(key, _default)
}

const configUpdater = new ConfigUpdater()

module.exports = {
    configUpdater,
    cu: configUpdater, // Alias
    CM,
    cmf, // CM-factory
    CuError,
}
