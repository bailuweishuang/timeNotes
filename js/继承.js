// 最优继承 寄生组合继承

// 父类
function Parent(name) {
    this.name = name;
    this._six = 'girl';
}

Parent.prototype.sayB = function () {
    console.log(this._six)
}

// 子类
function Son(name, age) {
    Parent.call(this, name);
    this.age = age;
}

function Inher(p, s) {
    // 创造父类原型的副本
    const pPro = Object(p.prototype);
    // 把子类赋值给创建的副本，解决重写原型导致constructor丢失问题
    pPro.constructor = s;
    // 把创建的对象赋值给子类的原型
    s.prototype = pPro;
}

Son.prototype.sayA = function () {
    console.log(this.age)
}

const s = new Son('bao', 21)
