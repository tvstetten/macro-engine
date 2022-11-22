export const configUpdater: ConfigUpdater;
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
export class CM {
    static CM_KEY: string;
    static DEFAULT_KEY: string;
    static MANDATORY_KEY: string;
    static CALLBACK_KEY: string;
    static PARENT_DEPENDENT_INDICATOR: string;
    static cm(key: any): CM;
    static checkCallback(value: any): boolean;
    constructor(key: any, _default?: any, parentPropertyDependent?: boolean, mandatory?: boolean, callback?: any);
    parentDependent(value: any): void;
    default(value: any): CM;
    mandatory(value: any): CM;
    callback(value: any): CM;
    #private;
}
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
 * @version 0.1.0
 */
/**
 * Error-Class for the Config-Helper-System
 */
export class CuError extends Error {
}
/**
 * Class to hold one or more dictionaries (Objects) whose values are used to
 * substitute property-values in configuration-dictionaries.\
 * When resolve() is called it will iterate through this repositories in their \
 * natural order. The first repositories that has a property with the searched
 * name will used as the result
 */
declare class ConfigUpdater {
    static FALLBACK_KEY: string;
    /**
     * Resets the list of repositories to the initial state (only `process.env` is registered).
     * @returns {ConfigUpdater} reference to this
     */
    reset(): ConfigUpdater;
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
    register(name: string, repository: object, index?: number, customResolver?: Function): ConfigUpdater;
    /**
     * Remove a previously registered repository using it's name.
     * @param {string} name The name of the repository as it was given to the register-function
     * @example
     *     // Delete the process-environment repository/dictionary
     *     configUpdater.delete("env")
     * @returns {boolean} `true` if the repository could be deleted. `false` otherwise
     */
    unregister(name: string): boolean;
    /**
     * Get the names of all registered repositories.
     * @returns {Array} Array with the namens of the registered
     */
    getRepositoryNames(): any[];
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
    getCmValue(cm_or_any: CM | any, propertyKey: string, parentPropertyKey: string): any;
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
    getValue(propertyKey: string, defaultValue?: CM | any, parentPropertyKey?: string): any;
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
    updateConfig(config: object | any[], exclude?: any[], initialParentpropertyKey?: string): any | any[];
    #private;
}
export { configUpdater as cu };
