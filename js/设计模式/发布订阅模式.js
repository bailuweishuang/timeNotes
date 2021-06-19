// 目标者类
class subJect {
    constructor() {
        // 观察者列表
        this.observers = {}
    }
    // add server
    add(key, server) {
        if (!this.observers[key]) {
            this.observers[key] = []
        }
        this.observers[key].push(server)
    }
    // 通知
    notify() {
        const key = [].shift.call(arguments);
        if (!this.observers[key] || this.observers[key].length === 0) return false
        this.observers[key].forEach((ser) => {
            ser.apply(this, arguments)
        })
    }
    // 删除
    remove(key, fn) {
        let fns = this.observers[key];
        if (!fns) return false;
        if (fn) {
            fns.forEach((cb, i) => {
                if (cb = fn) {
                    fns.splice(i, 1)
                }
            })
        } else {
            fns && (fns.length = 0)
        }
    }
}
const SubJect = new subJect();
SubJect.add('test', function (name, age) {
    let res = `my name is ${name}, I am ${age} years old`;
    console.log(res)
});
SubJect.notify('test', 'huahua', 12);