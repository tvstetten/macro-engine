// // This is a REPL playground
// function print(obj) {
//     for (const key in obj) {
//         console.log("before", key, obj[key])
//         obj[key] = obj[key] + "." + obj[key]
//         console.log("after", key, obj[key])
//     }
// }

// print(["a", "b", "c"])
// print({ a: "a", b: "b", c: "c" })

// arr = [1, 2]
// console.log(arr["hallo"])
// if (1 != "x") console.log("!=")

// let xx
// console.log("typeof xx", typeof xx)
// if (typeof xx == "object") console("xx is an Object")
class CM {
    constructor(
        key,
        _default = undefined,
        parentPropertyDependent = false,
        mandatory = false,
        _if = undefined,
        _if_value = undefined
    ) {
        if (typeof key == "object" && key["$$"]) {
            Object.assign(this, key)
        } else {
            this.$$ = parentPropertyDependent ? "?" + key : key
        }
        if (_default !== undefined) this.$default = true
        if (mandatory) this.$manatory = true
        if (_if !== undefined) this.$if = _if
        if (_if_value !== undefined) this.$if_value = _if_value
    }
    parentPropertyDependent(value) {
        const hasFlag = this.$$.startsWith("?")
        if (value && !hasFlag) {
            this.$$ = "?" + this.$$
        } else if (!value && hasFlag) {
            this.$$ = this.$$.substring(1)
        }
    }
    default(value) {
        this.$default = value
        return this
    }
    mandatory(value) {
        this.$mandatory = !!value // make it bool
        return this
    }
    if(value) {
        this.$if = value
        return this
    }
    if_value(value) {
        this.$if_value = value
        return this
    }

    // static check_cm(cm, cmValue) {}
}

cm = new CM("cm", "default")
// delete cm[$$$$1]
cm2 = new CM("cm2")
    .default("x")
    .mandatory(true)
    .if((cm_value, value) => {
        return true
    })
    .if_value("hello")

cm3 = new CM(cm2)

console.log("cm", cm)
console.log("cm2", cm2)
console.log("cm2.$default", cm2.$default)
console.log("cm2[$default", cm2["$default"])
console.log("")

f = (value) => {return value ? [value] : []}
f = () => {return [1]}
console.log(f(1))
console.log(f(0))
