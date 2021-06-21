/* 利用递归 */

function multiRequest(arr, max) {
    let newArr = Array.isArray(arr) ? arr : [arr];
    let len = newArr.length;
    // 储存结果；
    let result = new Array(len);
    let count = 0;
    return new Promise((resolve) => {
        while (count < max) {
            next()
        }
        function next() {
            let number = count++;
            if (count > len) {
                if (!result.some((item) => item == undefined)) {
                    resolve(result);
                    return
                }
            }
            let url = newArr[number];
            fetch(url).then((res) => res.json()).then((res) => {
                result[number] = res;
                next()
            }).catch((e) => {
                result[number] = e;
                next()
            })
        }
    })
}


/* 利用递归 promise.race */

class multiRequest {
    constructor(max = 2) {
        this.max = max
    }
    handle(fnArr) {
        let newFnArr = [...fnArr];
        if (newFnArr.length === 0) return;
        let maxArr = [];
        for (let i = 0; i < this.max; i++) {
            let fn = newFnArr.shift();
            maxArr.push(fn)
        }
        const fn = async () => {
            if (newFnArr.length) {
                const index = await Promise.race(maxArr);
                const nextFn = newFnArr.shift();
                maxArr.splice(index, 1, nextFn);
                fn()
            } else {
                Promise.all(maxArr)
            }
        }
        fn()
    }
}
