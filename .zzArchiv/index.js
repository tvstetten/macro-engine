"use strict"

/**
 * Substitute environment-variables in configuration-objects.
 // ESD = Environment-Substitution-Definition
 // CS = Configuration-Substitution[-definition]
 // CSH = Configuration-Substitution-Helper
 // CUH = Configuration-Updater[-Helper]
 // CU = Configuration-Updater
 // REV = Replace Environment Variables

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
 * @version 0.0.1
 */

// @type {{a: number}}
// @ts-check   Enable TypeScript Type checking in VScode Editor

/**
 * Error-Class for the Config-Helper-System
 */
class CuError extends Error {}

/**
 * Prototype on an Update-Helper-Macro (CM) (only for the TypeScript-checker)
 */
class CM {
    $$ = "<name>"
    $default = "<CM>" || "<any>"
}

/**
 * Class to hold one or more dictionaries (Objects) whose values are used to
 * substitute property-values in configuration-dictionaries.\
 * When resolve() is called it will iterate through this repositories in their \
 * natural order. The first repositories that has a property with the searched
 * name will used as the result
 */
class ConfigUpdater {
    /**
     *  Defined keywords for environment-substitution.
     */
    CM_IDENTIFIER = "$$" // "$$" is used in test/config-updater.test.js
    DEFAULT_IDENTIFIER = "$default" // "$$" is used in test/config-updater.test.js
    ADD_PARENT_PROPERTY_INDICATOR = "?"
    FALLBACK_KEY = "_fallback_"

    //
    // List of the repository-names attached to the configUpdater-instance
    #names = []
    // List of the repositories attached to the configUpdater-instance
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
            if (repository == undefined) return repository
        }
        // After the for-loop node is either the the value
        return repository
    }

    /**
     * Resets the list of repositories to the initial state (only `process.env` is registered).
     * @returns {ConfigUpdater} reference to this
     */
    reset() {
        this.#names = []
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
        this.#names.splice(index, 0, name)
        // Add an array with [0] = the resolver-function an [1] = the resolver-data
        this.#repositories.splice(index, 0, [
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
        const i = this.#names.indexOf(name)
        if (i >= 0) {
            this.#names.splice(i, 1)
            this.#repositories.splice(i, 1)
            return true
        }

        return false
    }

    /**
     * Get the names of all registered repositories.
     * @returns {Array} Array with the namens of the registered
     */
    getRepositoryNames() {
        return this.#names.slice() // return a copy
    }

    /**
     * returns either the <parameter>, environment-variable-value or a default.
     *
     * Function checks if `<property>` is an object that looks like a CM.
     * An CM has the format:\
     * `{$$: [?]<propertyName>[, $default: <CM>|<value>]}`.\
     * In this case the according environment variable gets returned. \
     * If the value of `propertyName` starts with a '?' the ? will
     * be replaced with the `parentPropertyName`
     *
     * For the following examples assume \
     *  `customProvider = {PROP: "prop-value", XX_PROP: "XX_prop-value"}`
     * @example
     * - parentPropertyName="xx", property = "value" => "value"
     * - parentPropertyName="xx", property = {$$: "PROP"} => "prop-value"
     * - parentPropertyName="xx", property = {$$: "PROP1"} => undefined
     * - parentPropertyName="xx", property = {$$: "PROP1",
     *      $default: "prop-undefined"} => "prop-undefined"
     * - parentPropertyName="xx", property = {$$: "?_PROP"} => "XX_prop-value"
     * - parentPropertyName="YYYYY", property = {$$: "?_PROP"} => undefined
     * - parentPropertyName="yyyyy", property = {$$: "?_PROP",
     *      $default: "prop-undefined"} => "prop-undefined"
     * @access private
     * @param {CM|any}  cm_or_any           Any property-value. If the value is an object that's
     * @param {string}  propertyName        The name of the current property. Used only for error-message
     * @param {string}  parentPropertyName  Name of the property that contains `propertyName`
     * @return {any} Either the original `cm_or_any`, the value retrieved from a repository, a default or `undefined`.
     * @throws CuError  If the value of the $$-property inside the CM-Object is empty or no string.
     * @see toCm
     * @see substAllEnv
     */
    substValue(cm_or_any, propertyName, parentPropertyName) {
        // Is it an object with an "$$" element
        if (
            cm_or_any &&
            // @ts-expect-error  .hasOwn is undefined
            Object.hasOwn(cm_or_any, this.CM_IDENTIFIER)
        ) {
            let searchKey = cm_or_any[this.CM_IDENTIFIER]
            // Only strings can be handled as keys in a repository
            if (!searchKey || typeof searchKey !== "string") {
                throw new CuError(
                    `Invalid ${this.CM_IDENTIFIER}-value for property '${propertyName}' (${searchKey}))`
                )
            }

            // Do we have to set the parentPropertyName as a prefix of the propertyname
            if (searchKey.startsWith(this.ADD_PARENT_PROPERTY_INDICATOR)) {
                searchKey = parentPropertyName + searchKey.substring(1)
            }

            // Iterate through all our repositories and call their resolve-function
            //  until a value at the given propertyName-path/-name is found
            let result
            const namePath = searchKey.split("/")
            for (const repository of this.#repositories) {
                // repository[0]=function; repository[1]=repository(-data?)
                result = repository[0](repository[1], namePath)
                // value found? => we're done
                if (result !== undefined) {
                    return result
                }
            }

            // If result has an element "$default"
            if (
                result == undefined &&
                // @ts-expect-error: "Property 'hasOwn' does not exist on type 'ObjectConstructor'. Do you need to change your target library? Try changing the 'lib' compiler option to 'es2022' or later.",
                Object.hasOwn(cm_or_any, this.DEFAULT_IDENTIFIER)
            ) {
                // Recursive call for the default-value
                return this.substValue(
                    cm_or_any[this.DEFAULT_IDENTIFIER],
                    propertyName + "-" + this.DEFAULT_IDENTIFIER,
                    parentPropertyName
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
     * @param {string} propertyName            Name of the key that will be searched
     * @param {CM|any} defaultValue=undefined  Optional default-value
     * @param {string} parentPropertyName=""   Optional name of a parent-object (for error-messages)
     * @returns {any}  Either the substituted value or undefined
     * @access public
     */
    getValue(propertyName, defaultValue = undefined, parentPropertyName = "") {
        return this.substValue(
            toCm(propertyName, defaultValue),
            "substitute",
            parentPropertyName
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
     * @returns {Object|Array} returns the given `config`-parameter-object
     */
    substAllEnv(config, exclude = []) {
        const $this = this // needed to access the <this> inside of evalConfig()

        function evalConfig(
            config,
            parentPropertyName,
            parentparentPropertyName
        ) {
            const fallback = config[$this.FALLBACK_KEY]
            const isArray = Array.isArray(config)
            // This works for objects (dictionaries) and arrays!
            for (const indexKey of Object.keys(config)) {
                const value = config[indexKey]
                if (
                    value &&
                    typeof value == "object" &&
                    indexKey != $this.FALLBACK_KEY &&
                    // config.hasOwnProperty(key) &&
                    (!exclude || !exclude.includes(indexKey))
                ) {
                    // try to substitute the value
                    const result = $this.substValue(
                        value,
                        parentPropertyName + "." + indexKey.toString(), // toString for array-indexKeys
                        isArray ? parentparentPropertyName : parentPropertyName
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
                            evalConfig(
                                result,
                                parentPropertyName,
                                parentparentPropertyName
                            )
                        } else {
                            evalConfig(result, indexKey, parentPropertyName)
                        }
                    }
                }
            }
        }

        if (config && typeof config == "object") {
            evalConfig(config, "", "")
        }
        // possible chaining
        return config
    }
}

const configUpdater = new ConfigUpdater()

/**
 * Builds an CM entry that will be handled as an environment-variable-substitution
 *
 * The function replaces the object that's internally used to substitute the
 * environment variables.
 * @param {object}  variableName  A object that's consists of name-value-pairs.
 * @param {CM|any}  defaultValue  An optional default-value for the CM in \
 *      case there is no environment variable defined. It can either be a CM itself or any value.
 * @param {boolean} parentPropertyDependant  Optional flag that defines whether the property-name should be dependant of the name of the parent property of the config-object
 * @return an object that represents a CM
 * @see CM
 * @throws CuError  If the `variableName` is empty or no string.
 * @see substAllEnv
 * @access public
 #*/
function toCm(
    variableName,
    defaultValue = undefined,
    parentPropertyDependant = false
) {
    if (!variableName || typeof variableName !== "string") {
        throw new CuError(
            `toCm(): Parameter variableName must be a non-empty-string ("${variableName}")`
        )
    }

    const result = {}
    let macroKey = variableName
    if (parentPropertyDependant) {
        macroKey =
            configUpdater.ADD_PARENT_PROPERTY_INDICATOR +
            parentPropertyDependant
    }
    result[configUpdater.CM_IDENTIFIER] = macroKey

    if (defaultValue !== undefined) {
        result[configUpdater.DEFAULT_IDENTIFIER] = defaultValue
    }
    return result
}

module.exports = {
    configUpdater,
    cu: configUpdater, // Alias
    toCm,
    CuError,
}

// class C0 {
//     pc0 = "_pc0"
//     $resolve(key) {
//         return key + "_" + key
//     }
// }

// class C1 extends C0 {
//     pc1 = "_pc1"
// }

// const test = (v) => {
//     console.log(v, Object.keys(v))
//     for (const [key, value] of Object.entries(v)) {
//         console.log(key, value)
//     }
// }

// let c0 = new C1()
// test(c0)
// console.log(c0.$resolve("Hallo"))
// console.log("")
