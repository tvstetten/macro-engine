const { getPropertyEx } = require("../index")
const { assert } = require("chai")
const { sample, big } = require("../test/configParam.test")

/**
 * Get configuration-properties, optionally loded from the environment.
 *
 * (Description. (use period)
 * @param {Object} config
 * @param {any} branchName
 * @param {any} property
 * @returns {any}
 */
function getPropertyEx(config, branchName, property) {
    // Allow branchName to be a path (x/y) there y is the desired branch and x
    //  is the parent-object of the "_fallback_"
    const pathArray = branchName.split("/")
    branchName = pathArray.pop() // the last element
    // Walk down the path
    pathArray.forEach((subBranch) => {
        config = config[subBranch]
    })

    let result
    let branch = config
    // If we have a branch-name get the branch from the config
    if (branchName) {
        branch = config[branchName]
    }

    // if the branch exists and has the property it will be used. otherwise the fallback .
    //  It would be possible to simply us the value of the property against
    //  "undefined" but we don't want this. If a property exists the value is
    //  used, regardless of it's value
    if (branch && Object.hasOwn(branch, property)) {
        result = branch[property]
    } else if (this.FALLBACK_KEY && Object.hasOwn(config, this.FALLBACK_KEY)) {
        result = config[this.FALLBACK_KEY][property]
    }

    // For arrays evaluate every element wether it's an $$-variable
    if (Array.isArray(result)) {
        let tmp = []
        result.forEach((element) => {
            tmp.push(substValue(element, branchName))
        })
        return tmp
    } else {
        // Check if the property should be read from the environment
        // (It doesn't matter if it's "undefined" or not)
        return substValue(result, branchName)
    }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

describe("getProperty-Function", function () {
    this.timeout(500000) // For debugging purposes
    describe("Access simple property", () => {
        it("Read existing simple property", () => {
            value = getPropertyEx(sample, "branchWithValue", "prop")
            assert.equal(value, "0.1.2.3")
        })
        it("Access non existing property with fallback", () => {
            value = getPropertyEx(sample, "branchEmpty", "prop")
            assert.equal(value, "1.2.3")
        })
        it("Access non existing property without _fallback_ branch", () => {
            value = getPropertyEx(big, "noFallback/branch", "nonexistingProp")
            assert.equal(typeof value, "undefined")
        })
    })
    describe("test different branch-names", () => {
        it("Simple branch-name", () => {
            value = getPropertyEx(sample, "branchWithValue", "prop")
            assert.equal(value, "0.1.2.3")
        })
        it("No/empty branchname", () => {
            value = getPropertyEx(big, "", "prop")
            assert.equal(value, "1.0.0")

            value = getPropertyEx(big, "", "url")
            assert.equal(value, "env-url")
        })
        it("Branchname with full path", () => {
            value = getPropertyEx(big, "deep/deep/deep/branch", "prop")
            assert.equal(value, "propValue")
        })
    })
    describe("Test environment-substitution", () => {
        it("Environment substitution", () => {
            value = getPropertyEx(sample, "branchEnvLookup", "urlEnv")
            assert.equal(value, "env-url")
        })
        it("Environment substitution with branch-prefix", () => {
            value = getPropertyEx(sample, "branchEnvLookup", "urlBranchEnv")
            assert.equal(value, "branchEnvLookup_URL")
        })
        it("Environment substitution from _fallback_", () => {
            value = getPropertyEx(sample, "branchEnvLookup", "onlyFallbackEnv")
            assert.equal(value, "env-url")
        })
        // branchEnvLookup_URL
        // onlyFallbackEnv: { $$: "URL" }
    })
    // it("2. The surface area of the Cube", function (done) {
    //     let c2 = new Cube(5)
    //     expect(c2.getSurfaceArea()).to.equal(150)
    //     done()
    // })
    // it("3. The volume of the Cube", function (done) {
    //     let c3 = new Cube(7)
    //     expect(c3.getVolume()).to.equal(343)
    //     done()
    // })
})
