const { expect, assert } = require("chai")

const { configUpdater, cu, CM, CuError } = require("../index")

describe("CU - Config-Updater-System", function () {
    this.timeout(500000) // For debugging purposes

    beforeEach(() => {
        // Completely fresh Config-Updater-object (can't recreate - it's const)
        configUpdater.reset()
    })
    it("configUpdater === cu (alias)", () => {
        assert(configUpdater === cu)
    })
    describe("Manage Repositories", function () {})
    describe("Manage Repositories", function () {
        it("Register repositories (at the end)", function () {
            cu.register("added1", { add1x: 11 })
            cu.register("added2", { add2x: 21 })

            assert.equal(
                cu.getRepositoryNames().toString(),
                "env,added1,added2"
            )
            assert.equal(cu.getValue("add1x"), 11)
            assert.equal(cu.getValue("add2x"), 21)
        })
        it("Register repositories (at the beginning and at position x)", function () {
            cu.register("added1", { add1x: 11 }, 0)
            cu.register("added2", { add2x: 21 }, 0)
            cu.register("added3", { add2x: 31 }, 3)

            assert.equal(
                cu.getRepositoryNames().toString(),
                "added2,added1,env,added3"
            )
            assert.equal(cu.getValue("add1x"), 11)
            assert.equal(cu.getValue("add2x"), 21)
        })
        it("UnRegister repositories", function () {
            cu.register("added1", { add1x: 11 })
            cu.register("added2", { add2x: 21 })

            assert.equal(
                cu.getRepositoryNames().toString(),
                "env,added1,added2"
            )
            assert.equal(cu.getValue("add1x"), 11)
            assert.equal(cu.getValue("add2x"), 21)
            cu.unregister("added1")
            assert.equal(cu.getValue("add1x"), undefined)
            assert.equal(cu.getValue("add2x"), 21)
            cu.unregister("added2")
            assert.equal(cu.getValue("add2x"), undefined)
            cu.unregister("env")
            assert.equal(cu.getRepositoryNames().toString(), "")
            assert.equal(cu.getValue("add1x"), undefined)
            assert.equal(cu.getValue("add2x"), undefined)
        })
        it("UnRegister unknown repositoryNames returns <false>", function () {
            cu.unregister("added2")
            assert.equal(cu.unregister("added2"), false)
        })
        it("resolve()", function () {
            cu.register("add1", { x: 11, y: 21, c: 31 })
            cu.register("add2", {
                a: 12,
                b: {
                    a: 122,
                    b: {
                        a: 1222,
                        b: { a: 12222, b: { a: 122222, b: 222222 } },
                    },
                },
            })
            cu.register("ins0", { a: 13, b: 23 }, 0)
            cu.register("ins1", { a: 14, b: 24 }, 0)
            cu.register("ins2", { a: 15, b: 25 }, 1)

            assert.notEqual(cu.getValue("PATH"), undefined) // only test that something was found
            assert.equal(cu.getValue("x"), 11)
            // resolve with "path"
            assert.equal(cu.getValue("b/a"), 122)
            assert.equal(cu.getValue("b/b/b/b/b"), 222222)
            assert.equal(cu.getValue("a/a/a/b/b"), undefined)
            assert.equal(cu.getValue("c"), 31)
            assert.equal(cu.getValue("cc"), undefined)
        })
        it("resolve() with no registered repository", function () {
            cu.unregister("env")
            assert.equal(cu.getValue("any"), undefined)
        })
        it("Repository with custom $resolve-function", function () {
            cu.unregister("env")
            testRepo = {
                value: "value",
            }
            // register a simple function that returns the namepath + the only property of the repository
            cu.register("custom", testRepo, 0, (repository, namePath) => {
                return namePath.toString() + ":" + repository.value
            })
            assert.equal(cu.getValue("any"), "any:value")
            assert.equal(cu.getValue("any/any"), "any,any:value")
        })
    })
    describe("CM()-Class", function () {
        describe("Constructor & properties", function () {
            it("Create CM, no default", function () {
                const cm = new CM("test")
                assert.equal(cm[CM.CM_KEY], "test")
                assert.equal(cm[CM.DEFAULT_KEY], undefined)
            })
            it("create CM, with default", function () {
                const cm = new CM("test", "_default")
                assert.equal(cm[CM.CM_KEY], "test")
                assert.equal(cm[CM.DEFAULT_KEY], "_default")
            })
            it("create CM with empty name", function () {
                expect(() => {
                    CM.cm("")
                }).to.throw()
            })
            it("create CM(template)", function () {
                cm1 = new CM("key", "default", true, true, (value) => {
                    return value
                })
                cm2 = CM.cm(cm1)
                assert.equal(cm1[CM.CM_KEY], cm2[CM.CM_KEY])
                assert.equal(cm1[CM.DEFAULT_KEY], cm2[CM.DEFAULT_KEY])
                assert.equal(cm1[CM.MANDATORY_KEY], cm2[CM.MANDATORY_KEY])
                assert.equal(cm1[CM.CALLBACK_KEY], cm2[CM.CALLBACK_KEY])
            })
            it("create CM with non-string name", function () {
                expect(() => {
                    new CM(false)
                }).to.throw("variableName")
            })
            it("create CM, parent-property-dependent", function () {
                const cm1 = new CM("test", undefined, true) // create with on
                assert(cm1[CM.CM_KEY].startsWith(CM.PARENT_DEPENDENT_INDICATOR))
                cm1.parentDependent(false) // switch off
                assert(
                    !cm1[CM.CM_KEY].startsWith(CM.PARENT_DEPENDENT_INDICATOR)
                )
                cm1.parentDependent(true) // switch on
                assert(cm1[CM.CM_KEY].startsWith(CM.PARENT_DEPENDENT_INDICATOR))

                const cm2 = new CM("test", undefined, false) // create with off
                assert(
                    !cm2[CM.CM_KEY].startsWith(CM.PARENT_DEPENDENT_INDICATOR)
                )

                const cm3 = new CM("test", undefined, "") // create with off
                assert(
                    !cm3[CM.CM_KEY].startsWith(CM.PARENT_DEPENDENT_INDICATOR)
                )
            })
            it("create CM, mandatory", function () {
                const cm1 = new CM("test", undefined, false, true)
                assert(cm1[CM.MANDATORY_KEY])
                cm1.mandatory(false)
                assert(!cm1.hasOwnProperty(CM.MANDATORY_KEY))
                cm1.mandatory(true)
                assert(cm1[CM.MANDATORY_KEY])

                const cm2 = new CM("test", undefined, false, false)
                assert(!cm2.hasOwnProperty(CM.MANDATORY_KEY))
            })
            it("create CM, callback", function () {
                const f = (value) => {
                    return value
                }
                const cm1 = new CM("test", undefined, false, false, f)
                assert(cm1[CM.CALLBACK_KEY])
                cm1.callback(false)
                assert(!cm1.hasOwnProperty(CM.CALLBACK_KEY))
                cm1.callback(f)
                assert(cm1[CM.CALLBACK_KEY])

                const cm2 = new CM("test", undefined, false, false, false)
                assert(!cm2.hasOwnProperty(CM.CALLBACK_KEY))
            })
        })
        describe("callback execution", function () {
            it("simple callback-call", function () {
                const f = (value) => {
                    return ">" + value.toString() + "<"
                }
                cu.register("test", { prop1: "propVal1", prop2: "propVal2" })
                const cm = CM.cm("prop1").callback(f)

                assert.equal(cu.getCmValue(cm, "test", ""), f("propVal1"))
            })
        })
    })
    describe("updateConfig()-Method", function () {
        let repComplex, repWithFallback, repSubArray
        beforeEach(() => {
            configUpdater.register(
                "testRepository",
                {
                    URL: "env-url",
                    branchEnvLookup_URL: "branchEnvLookup_URL",
                    branchList_URL: "branchList_URL",
                    subObj1_URL: "subObj1_URL", // spell: ignore SUBOBJ1
                },
                0
            ) // with highest priority

            repWithFallback = {
                _fallback_: {
                    prop: "1.2.3",
                    url: "http://localhost:1234",
                    onlyInFallback: "fromFallback",
                    onlyFallbackEnv: { $$: "URL" },
                    onlyFallbackBranchEnv: {
                        $$: "?_URL",
                        $default: "<undefined>",
                    },
                    onlyFallbackBranchEnvDefault: {
                        $$: "?_URLXX", // # spell: ignore URLXX
                        $default: "<undefined>",
                    },
                },
                branchEmpty: {
                    // no properties -> all properties taken from the _fallback_
                },
                branchWithValue: {
                    prop: "0.1.2.3",
                    // no URL
                },
                //
                branchEnvLookup: {
                    url: "http://127.0.0.1:1111/",
                    urlEnv: { $$: "URL" },
                    urlBranchEnv: { $$: "?_URL" },
                },
                branchList: {
                    listResult: [{ $$: "URL" }, "Hello", { $$: "?_URL" }],
                },
                branchWithDefaults: {
                    simpleDefault: { $$: "?_URL", $default: "<default>" },
                    nestedDefault: {
                        $$: "?_URL",
                        $default: {
                            $$: "unknownEnv",
                            $default: "<nestedDefault>",
                        },
                    },
                    nestedNestedDefault: {
                        $$: "?_URL",
                        $default: {
                            $$: "unknownEnv",
                            $default: {
                                $$: "unknownEnv",
                                $default: "<nestedNestedDefault>",
                            },
                        },
                    },
                },
            }

            repSubArray = [
                {
                    version: "0.8.7",
                    xxx: { $$: "Help" },
                    url: { $$: "URL" },
                },
                {
                    version: "0.4.24",
                    branch: {
                        _fallback_: {
                            url: "fallback-url",
                            urlEnv: { $$: "URL" },
                            urlBranchEnv: {
                                $$: "?_URL",
                                $default: "urlBranchEnv-default",
                            },
                        },
                        subObj1: {
                            url: "subObj-url/",
                            // _fallback_->urlBranchEnv: ?URL (subObj1:URL) is defined!,
                        },
                        subObj2: {
                            prop: "subObj-prop/",
                        },
                    },
                },
            ]

            repComplex = {
                prop: "1.0.0",
                url: { $$: "URL" },
                defaultNetwork: "hardhat",
                subObject: repWithFallback,
                subDataTypes: {
                    p_int: 123,
                    p_num: 123.123,
                    p_bool: true,
                    p_bool2: false,
                },
                noFallback: {
                    branch: {
                        // Empty and there is no _fallback_ branch
                    },
                },
                deep: {
                    deep: {
                        deep: {
                            branch: {
                                prop: "propValue",
                                urlEnv: { $$: "URL" },
                            },
                        },
                    },
                },
                subArray: repSubArray,
            }
        })
        it("Config-Object (no fallback)", () => {
            conf = configUpdater.updateConfig(
                repWithFallback["branchEnvLookup"],
                [],
                "branchEnvLookup"
            )

            assert.equal(conf["url"], "http://127.0.0.1:1111/")
            assert.equal(conf["urlEnv"], "env-url")
            assert.equal(conf["urlBranchEnv"], "branchEnvLookup_URL")
        })
        it("Config-Object with filter (no fallback)", () => {
            conf = configUpdater.updateConfig(
                repWithFallback["branchEnvLookup"],
                ["urlEnv"],
                "branchEnvLookup"
            )

            assert.equal(conf["url"], "http://127.0.0.1:1111/")
            assert.equal(conf["urlEnv"][CM.CM_KEY], "URL") // filtered
            assert.equal(conf["urlBranchEnv"], "branchEnvLookup_URL")
        })

        it("Config-Object with fallback", () => {
            const conf = configUpdater.updateConfig(repWithFallback)

            // All _fallback_ properties stay unchanged
            const bf = conf["_fallback_"]
            assert.equal(bf["onlyFallbackEnv"]["$$"], "URL") // unchanged
            assert.equal(bf["onlyFallbackBranchEnv"]["$$"], "?_URL") // unchanged
            assert.equal(bf["onlyFallbackBranchEnvDefault"]["$$"], "?_URLXX") // unchanged

            const b1 = conf["branchEnvLookup"]
            assert.equal(b1["url"], "http://127.0.0.1:1111/")
            assert.equal(b1["urlEnv"], "env-url")
            assert.equal(b1["urlBranchEnv"], "branchEnvLookup_URL")

            // Properties from the _fallback_ branch
            assert.equal(b1["prop"], "1.2.3")
            assert.equal(b1["onlyInFallback"], "fromFallback")
            assert.equal(b1["onlyFallbackEnv"], "env-url")
            assert.equal(b1["onlyFallbackBranchEnv"], "branchEnvLookup_URL")
            assert.equal(b1["onlyFallbackBranchEnvDefault"], "<undefined>")
        })

        it("Config-Object with defaults", () => {
            conf = configUpdater.updateConfig(
                repWithFallback["branchWithDefaults"],
                [],
                "branchWithDefaults"
            )

            assert.equal(conf["simpleDefault"], "<default>")
            assert.equal(conf["nestedDefault"], "<nestedDefault>") // filtered
            assert.equal(conf["nestedNestedDefault"], "<nestedNestedDefault>")
        })

        it("Handle properties with an Array-value (that optionally can include env-vars)", () => {
            const conf = configUpdater.updateConfig(
                repWithFallback["branchList"],
                [],
                "branchList"
            )

            const arr = conf["listResult"]
            assert.equal(arr[0], "env-url") // simple env
            assert.equal(arr[1], "Hello") // constant
            assert.equal(arr[2], "branchList_URL") // branch-sensitive
        })
        it("Handle Big object with deep hierarchy", () => {
            const conf = configUpdater.updateConfig(repComplex)

            const arr = conf["subObject"]["branchList"]["listResult"]
            assert.equal(arr[0], "env-url")
            assert.equal(arr[1], "Hello")
            assert.equal(arr[2], "branchList_URL")

            const b1 = conf["subObject"]["branchEnvLookup"]
            assert.equal(b1["url"], "http://127.0.0.1:1111/")
            assert.equal(b1["urlEnv"], "env-url")
            assert.equal(b1["urlBranchEnv"], "branchEnvLookup_URL")

            const b2 = conf["deep"]["deep"]["deep"]["branch"]
            // branch: { prop: "propValue", url: { $$: "?_URL" } },
            assert.equal(b2["prop"], "propValue")
            assert.equal(b2["urlEnv"], "env-url")

            const b3 = conf["subObject"]["branchWithValue"]
            assert.equal(b3["url"], "http://localhost:1234") // from Fallback
            assert.equal(b3["onlyFallbackBranchEnv"], "<undefined>")
        })
        it("Handle Array as root input)", () => {
            const conf = configUpdater.updateConfig(repSubArray)

            assert(conf === repSubArray) // object not changed

            const b1 = conf[0]
            assert.equal(b1["version"], "0.8.7")
            assert.equal(b1["url"], "env-url")

            const b2 = conf[1]["branch"]
            assert.equal(b2["subObj1"]["url"], "subObj-url/")
            assert.equal(b2["subObj1"]["urlEnv"], "env-url")
            assert.equal(b2["subObj1"]["urlBranchEnv"], "subObj1_URL")

            assert.equal(b2["subObj2"]["urlBranchEnv"], "urlBranchEnv-default")
        })
    })
})
