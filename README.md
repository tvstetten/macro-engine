# Update config-dictionaries from configurable repositories

## Brief Description
The core functionality of *Config-Updater* is to replace [macros](#macros) in configuration-objects. Therefor the macro-key is searched in registered [repositories](#repositories).
#### Basic example:
```js
const { configUpdater, CM, cmf } = require("config-updater")

config = {
    "url": new CM("URL").default("www.github.com"),  // new instance
    "username": {$$: "username", $mandatory: true},  // manually created
    "password": cmf("password").mandatory(true),     // use the factory
}
configUpdater.updateConfig(config)
```

## Features
- Update any configuration-object (dictionary)
- Multiple repositories as source for macro-value substitution.
- Custom function for every repository to handle the process of searching a macro-key.
- Macros can have default-values that can be a value or a macro itself that a option-chain can be build.
- Macros can have mandatory values that throw an exception when the value is 'undefined'.
- Macros can have callback-function to handle special needs.
- Config-Objects can define `$defaults`-element as a template for all sibling sub-entries. Every sibling of the `$defaults`-node is filled with all missing `$defaults`-entries.

### Repositories
The Repositories is a list of objects/dictionaries that can be registered by the user.
Any object can be used as a repository. In most cases they will be dictionary-like (name-value-pairs) structures. A repository can contain nested structures. To access nested properties the [macro-key](#macro-key) can be defined as a path ("path/to/the/key").\
The repositories are handled in the order the got when .register() was called. The first repository that delivers a result for a key that's not equal to `undefined` wins. This result is returned to the caller.\
With the call of the register-function a callback-function can be provided. This function is called whenever the macro-value is searched. the default-function walks trough the repository-tree to find the desired key-value. Custom function could search the value in a database or the internet.
### Macros
Macros are objects that have special properties. A macro can either be an instance of the CM-class or any object that's manually configured with the necessary property/-ies. Either way the possible/used structure of a macro is:
>{ [\$$](#macro-key): [\<macro-key>][, [$default](#default): \<default-value>][, [mandatory](#mandatory): true/false][, [$callback](#callback): \<function>] }

A macro must always have a [\$$-macro-key](#macro-key ($$)) property. All other properties are optional.
#### Macro-Key
Every macro must have at least a macro-key-element. The macro-key is the string that's 
used to be searched in the *Config-Updater*-Repositories.\
To access nested properties in the repositories the key can be written as a path. The "`/`" is used as the path-separator-character\
Can be set in the CM-constructor or, manually with `macro["$$"] = <key-name>`.
##### Example
```js
cmf("key")
// Value will be search in a nested dictionary tree.
cmf("path/to/the/key") 
// As far as it concerns the macro-handling the following
//  two objects are the same.
cmf("userName") = {$$: "userName"}
```
#### Default 
Macros can optionally have a default-value. The default-value is used if the macro-result is `undefined` after handling the macro-key. \
The default-value can also be a macro itself. With this it's possible to implement a chain of possible results for a property (key1 || key2 || key3 || key...).\
Can be set with the CM.default()-method (if it's a CM-instance) or manually with `macro["$default"] = <default>` 
##### Example
```js
cmf("key", "<default>")
cmf("key").default("<default>")
cmf("key").default(cmf("alt-key1", cmf("alt-key2", "<not found>")))
```
#### Mandatory
Macros can optionally be flagged as mandatory. If this flag is set and the final result of a macro is `undefined` a Error is thrown.\
Can be set with the CM.mandatory()-method (if it's an CM-instance) or manually with  `macro["$mandatory"] = true|false`
#### Callback
Can be set with the CM.callback()-method (if it's an CM-instance) or manually with  `macro["$callback"] = function()|undefined`
...
#### Parent-Dependent (?)
...

#### Example Macros
``` js
// create a macro via the CM-class
m = new CM("URL")
// create a macro using a factory-function with a default
m = cmf("URL", "www.github.com").parentDependent(true).mandatory(true)
// create a macro manually
m = {$$: "URL", $default: "www.github.com"}
// create a macro, set mandatory and a callback
m = cmf("URL").callback((value, cm, path) => {return value})

// or used in a config-structure
config = {
    "URL": cmf("url").mandatory(true),
    "username": {$$: "username", $mandatory: true},
    "password": m
}
```


## Why
Configuration-objects very often need to be updated at runtime with dynamic, environment-dependent, or secret values. A common way to achieve that is the usage of the environment (process.env). But that has a couple of drawbacks.
- To loaded the values often a .env file is used. To read that file a extension like dotenv is used.
- Environment-variables are not nested. Therefor grouped values often get a common prefix. Thats unhandy with bigger structures.

## Features
- Update any config-object (dictionary) with 