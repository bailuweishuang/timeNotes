// 重新定义函数

const { func } = require("prop-types");

function test() {
    const t = new Date().getTime();
    test = function () {
        return t
    }
    return test()
}   

const addEvent = function (element, type, handler) {
    if (window.addEventListener) {
        element.addEventListener(type, handler, false);
        addEvent = function (element, type, handler) {
            element.addEventListener(type, handler, false);
        }
    } else {
        element.attchEvent(`on${type}`, handler);
        addEvent = function (element, type, handler) {
            element.attchEvent(`on${type}`, handler);

        }
    }
}

function Foo() {
    getName = function () {
        console.log(1)
    }
    return this
}

Foo.getName = function () {
    console.log(2)
}

Foo.prototype.getName = function () {
    console.log(3)
}

var getName = function () {
    console.log(4)
}

function getName() {
    console.log(5)
}

Foo.getName(); // 2
getName() //4
Foo().getName() //1
getName() //1
new Foo.getName() //2
new Foo().getName() //3
new new Foo().getName() //3


async function async1() {
    console.log("async1 start");//2
    await async2();
    console.log("async1 end")
}

async function async2() {
    console.log("async2")//3
}

console.log("script start"); //1

setTimeout(function () { console.log("setTime") }, 0)

async1()

new Promise((resolve, reject) => {
    console.log("promise1")
    resolve();
}).then(() => {
    console.log("promise2")
})

console.log("script end")