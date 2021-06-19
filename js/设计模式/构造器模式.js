// ES6之前 一般函数就是一个构造器 

// 构造函数

function Person(name, age) {
    this.name = name;
    this.age = age;
}

// 原型属性上添加方法
Person.prototype.toCall = function () {
    return `${this.name} is ${this.age}`;
}

const person = new Person('小李', 18);


// ES6之后有 class 类

class Person {
    constructor(name, age) {
        this.name = name;
        this.age = age
    }
    toCall() {
        return `${this.name} is ${this.age}`
    }
}

const person1 = new Person('小王', 100)