// 函数柯里化就是使用多个参数的一个函数转换成一系列使用一个参数的函数的技术


// function sums() {
//     // vm: 当前模型
//     const roleList = vm.getAllData().RoleList;
//     let res = roleList.reduce((pre, rec) => {
//         return pre + rec.number
//     }, 0)
//     vm.get("想设置的值").setValue(res)
// }

// 参数复用

function sayHi(name, age, sex) {
    return `${name}${age}${sex}`
}

const a1 = sayHi("xiaozhang", 12, "ss")
const a2 = sayHi("xiaozhang", 14, "ssss")
const a3 = sayHi("xiaozhang", 18, "ssssss")

// 复用 斗鱼 "xiaozhang"

function sayH(name) {
    return function (age, sex) {
        return `${name}${age}${sex}`
    }
};

const nameF = sayH("xiaozhang");

const q1 = nameF(12, "ss")
const q2 = nameF(14, "ss22")
const q3 = nameF(16, "ss33")
// 提前确认
const addEvent = (function () {
    if (window.addEventListener) {
        return function (element, type, listener, useCapture) {
            element.addEventListener(type, function (e) {
                listener.call(element, e)
            }, useCapture)
        }
    } else {
        return function (element, type, listener,) {
            element.attachEvent(`on${type}`, function (e) {
                listener.call(element, e)
            })
        }
    }
})()


function curry() {
    let args = [...arguments];
    const inner = function () {
        args = [...args, ...arguments];
        return inner
    }
    inner.toString = function () {
        return args.reduce((pre, rev) => pre + rev)
    }
    return inner
}


function curryT(fn) {
    const args = [...arguments].slice(1);
    function inner() {
        const ars = [...args, ...arguments];
        return curryT.call(null, fn, ...ars)
    };
    inner.toString = function () {
        return fn.apply(null, args)
    }
    return inner
}
function add() {
    return [...arguments].reduce((prev, curr) => {
        return prev + curr
    }, 0)
}
var add = curryT(add);
var res = add(1)(2)(3)(4)


// 数组扁平化
function bpf(arr) {
    let res = [];
    arr.map((item) => {
        if (!Array.isArray(item)) {
            res.push(item)
        } else {
            res.push(...bpf(item))
        }
    })
    return res
}