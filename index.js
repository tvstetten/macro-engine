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

// @ts-check   Enable TypeScript Type checking in VScode Editor
// cspell ignore syntax: // spell: ignore <word>
// ts-check type-hint: // @type {{a: number}}

/**
 * Error-Class for the Config-Helper-System
 */
class CuError extends Error {}

/**
 * Builds a CM-object that can be used in a ConfigUpdater.
 *
 * @param {object}  variableName  A object that's consists of name-value-pairs.
 * @param {CM|any}  defaultValue  An optional default-value for the CM in \
 *      case there is no environment variable defined. It can either be a CM itself or any value.
 * @param {boolean} parentPropertyDependent  Optional flag that defines whether the property-name should be dependent of the name of the parent property of the config-object
 * @return an object that represents a CM
 * @see CM
 * @throws CuError  If the `variableName` is empty or no string.
 * @see substAllEnv
 * @access public
 #*/

/**
 * Config-Macro (CM)
 */
class CM {
    static CM_KEY = "$$"
    static DEFAULT_KEY = "$default"
    static MANDATORY_KEY = "$mandatory"
    static CALLBACK_KEY = "$callback"
    static PARENT_DEPENDENT_INDICATOR = "?"

    constructor(
        key,
        _default = undefined,
        parentPropertyDependent = false,
        mandatory = false,
        callback = undefined
    ) {
        if (typeof key == "object" && key[CM.CM_KEY]) Object.assign(this, key)
        else if (!key || typeof key !== "string")
            throw new CuError(
                `toCm(): Parameter variableName must be a non-empty-string ("${key}")`
            )
        else
            this[CM.CM_KEY] = parentPropertyDependent
                ? CM.PARENT_DEPENDENT_INDICATOR + key
                : key
        if (_default !== undefined) this[CM.DEFAULT_KEY] = _default
        if (mandatory) this[CM.MANDATORY_KEY] = true
        if (callback !== undefined) this.callback(callback)
    }
    // Factory
    static cm(key) {
        return new CM(key)
    }
    static checkCallback(value) {
        if (!value) return false
        else if (typeof value !== "function")
            throw new CuError(
                "The value of the callback-property must be a function"
            )
        else return true
    }
    #removeProp(propertyKey) {
        if (this.hasOwnProperty(propertyKey)) delete this[propertyKey]
    }
    parentDependent(value) {
        const hasFlag = this[CM.CM_KEY].startsWith(
            CM.PARENT_DEPENDENT_INDICATOR
        )
        if (value && !hasFlag)
            this[CM.CM_KEY] = CM.PARENT_DEPENDENT_INDICATOR + this[CM.CM_KEY]
        else if (!value && hasFlag)
            this[CM.CM_KEY] = this[CM.CM_KEY].substring(
                CM.PARENT_DEPENDENT_INDICATOR.length
            )
    }
    default(value) {
        if (value == undefined) this.#removeProp(CM.DEFAULT_KEY)
        else this[CM.DEFAULT_KEY] = value
        return this
    }
    mandatory(value) {
        if (!value) this.#removeProp(CM.MANDATORY_KEY)
        else this[CM.MANDATORY_KEY] = true
        return this
    }
    callback(value) {
        if (CM.checkCallback(value)) this[CM.CALLBACK_KEY] = value
        else this.#removeProp(CM.CALLBACK_KEY)
        return this
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
    static FALLBACK_KEY = "_fallback_"

    // List of the repositories attached.
    //                  0        1         2
    //  entry-format: [name, resolver, dictionary]
    #repositories = []

    constructor() {
        // automatically add the environment
        this.reset()
    }

    /**
     * Default-resolver for repositories that don't implement this function
     * @param {object} repository the repository itself
     * @param {array} namePath array with the path of the key
     * @returns {any|undefined} return either the resolved keyvalue or undefined
     */
    #default_resolver(repository, namePath) {
        // Iterate through the path (like a tree). Starting at the root of the repository
        for (const path of namePath) {
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
     * @param {string}  name             Name of the new repository
     * @param {object}  repository       An Object (dictionary) that's used to resolve property-values
     * @param {Number}  index = 9999999  An optional index for the new repository. If the index is >= the current amount of repositories, the new repository is added at the end (default)
     * @param {function} customResolver  An optional resolver-function (e.g. access a DB). If this function is undefined and the repository doesn't contain a function named REPOSITORY_RESOLVE_FUNCTION the default-resolver is used. A resolver receives two parameters: the resolver itself
     * @returns {ConfigUpdater} An instance of this
     */
    register(name, repository, index = 9999999, customResolver = undefined) {
        // Add an array with [0] = the resolver-function an [1] = the resolver-data
        this.unregister(name)
        this.#repositories.splice(index, 0, [
            name,
            customResolver || this.#default_resolver,
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
     * Function checks if `<property>` is an object that contains CM-keywords \
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
     * @param {CM|any}  cm_or_any           Any property-value. If the value is an object that's
     * @param {string}  propertyKey        The name of the current property. Used only for error-message
     * @param {string}  parentPropertyKey  Name of the property that contains `propertyKey`
     * @return {any} Either the original `cm_or_any`, the value retrieved from a repository, a default or `undefined`.
     * @throws CuError  If the value of the $$-property inside the CM-Object is empty or no string.
     * @see toCm
     * @see updateConfig
     */
    getCmValue(cm_or_any, propertyKey, parentPropertyKey) {
        // Is it an object with an "$$" element
        if (
            cm_or_any &&
            // @ts-expect-error  .hasOwn is undefined
            Object.hasOwn(cm_or_any, CM.CM_KEY)
        ) {
            let searchKey = cm_or_any[CM.CM_KEY]
            // Only strings can be handled as keys in a repository
            if (!searchKey || typeof searchKey !== "string")
                throw new CuError(
                    `Invalid ${CM.CM_KEY}-value for property '${parentPropertyKey}/${propertyKey}' (${searchKey}))`
                )

            // Do we have to set the parentPropertyKey as a prefix of the propertyKey
            if (searchKey.startsWith(CM.PARENT_DEPENDENT_INDICATOR))
                searchKey =
                    parentPropertyKey +
                    searchKey.substring(CM.PARENT_DEPENDENT_INDICATOR.length)

            // Iterate through all our repositories and call their resolve-function
            //  until a value at the given propertyKey-path/-name is found
            let result // declare because it's needed outside the loop
            const namePath = searchKey.split("/")
            for (const repository of this.#repositories) {
                // repository[0]=function; repository[1]=repository(-data?)
                result = repository[1](repository[2], namePath)
                // value found? => we're done
                if (result !== undefined) {
                    break
                }
            }

            // If result has an element "$default"
            if (result == undefined)
                if (
                    // @ts-expect-error: "Property 'hasOwn' does not exist on type 'ObjectConstructor'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2022' or later.",
                    Object.hasOwn(cm_or_any, CM.DEFAULT_KEY)
                ) {
                    // Recursive call for the default-value
                    result = this.getCmValue(
                        cm_or_any[CM.DEFAULT_KEY],
                        propertyKey + "-" + CM.DEFAULT_KEY,
                        parentPropertyKey
                    )
                }

            const callback = cm_or_any[CM.CALLBACK_KEY]
            if (callback) {
                CM.checkCallback(callback)
                result = callback(result)
            }

            // independent of how the result was built, check mandatory if defined!
            if (result == undefined && cm_or_any[CM.MANDATORY_KEY]) {
                // still undefined
                throw new CuError(
                    `Property '${parentPropertyKey}/${propertyKey}' is mandatory.))`
                )
            }
            return result
        }
        return cm_or_any
    }

    /**
     * Replace the value of `variableName` with a defined value in the repositories.
     *
     * It allows to (nested) use default-CM-definitions (or simple values)\
     * It also allows the usage of the Branch-Name as a prefix
     * @param {string} propertyKey            Name of the key that will be searched
     * @param {CM|any} defaultValue=undefined  Optional default-value
     * @param {string} parentPropertyKey=""   Optional name of a parent-object (for error-messages)
     * @returns {any}  Either the substituted value or undefined
     * @access public
     */
    getValue(propertyKey, defaultValue = undefined, parentPropertyKey = "") {
        return this.getCmValue(
            new CM(propertyKey, defaultValue),
            "substitute",
            parentPropertyKey
        )
    }

    /**
     * Replace all macros with values from the `configUpdater`.
     *
     * The function traverses through the whole `config`-object-tree, determines \
     * existing config-macros (=CU, format `{$$, [$default]}`) and replaces their value with
     * values of the registered repositories.\
     * If the parent-property has a property '_fallback_' all sub-properties of that \
     * fallback are copied to every sibling-object as far as they don't exist already.

     * So the values of `config` get changed!
     * @param {object|array} config                 Any Object whose properties should be updated with values of the configUpdater
     * @param {Array}        exclude=[]             Optional array of property-names that should not be handled (at any level)
     * @param {string}       initialParentpropertyKey=""  Optional name of the parent property. Used to add the branch-name for $$: "?..." replacements. This is *only* necessary if the function is called with a partial branch.
     * @returns {Object|Array} Returns the given `config`-parameter-object
     */
    updateConfig(config, exclude = [], initialParentpropertyKey = "") {
        const $this = this // needed to access the <this> inside of traverseConfig()

        function traverseConfig(
            config,
            parentPropertyKey,
            parentParentpropertyKey
        ) {
            const fallback = config[ConfigUpdater.FALLBACK_KEY]
            const isArray = Array.isArray(config)
            // This works for objects (dictionaries) and arrays!
            for (const indexKey of Object.keys(config)) {
                const value = config[indexKey]
                if (
                    value &&
                    typeof value == "object" &&
                    indexKey != ConfigUpdater.FALLBACK_KEY &&
                    // config.hasOwnProperty(key) &&
                    (!exclude || !exclude.includes(indexKey))
                ) {
                    // try to substitute the value
                    const result = $this.getCmValue(
                        value,
                        parentPropertyKey + "." + indexKey.toString(), // toString for array-indexKeys
                        isArray ? parentParentpropertyKey : parentPropertyKey
                    )

                    // Value changed => replace the config-entry
                    if (result != value) {
                        config[indexKey] = result
                    }

                    if (result && typeof result == "object") {
                        // Copy all missing properties from the _fallback_-object
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
                        if (isArray) {
                            traverseConfig(
                                result,
                                parentPropertyKey,
                                parentParentpropertyKey
                            )
                        } else {
                            traverseConfig(result, indexKey, parentPropertyKey)
                        }
                    }
                }
            }
        }

        if (config && typeof config == "object") {
            traverseConfig(
                config,
                initialParentpropertyKey,
                initialParentpropertyKey
            )
        }
        // possible chaining
        return config
    }
}

const configUpdater = new ConfigUpdater()

module.exports = {
    configUpdater,
    cu: configUpdater, // Alias
    CM,
    CuError,
}
