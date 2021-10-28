const Util = {
    // 获取后端数据接口
    getApi: (type, url, params, loading = true, domainKey = process.env.__DOMAINKEY__) => {
        let proxy = cb.rest.DynamicProxy.create({
            ensure: {
                url,
                method: type,
                options: {
                    domainKey: domainKey,
                    mask: loading
                },
            },
        });
        return new Promise((resolve, reject) => {
            proxy.ensure(params, function (err, result) {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    },
    // 获取后端返回所需对象
    getDateOrLink: (obj) => {
        let res = [];
        const person = {
            outputType: null,
            outputType_name: null,
            planWorkHour: null,
            realWorkHour: null,
            principal: null,
            principalYht: null,
            grpMember: null,
            grpMember_name: null,
            checklistTplId: null,
            principalRole: null,
            principalRole_name: null,
            startWarning: null,
            startWarningRole: null,
            startWarningRole_name: null,
            endWarning: null,
            endWarningRole: null,
            endWarningRole_name: null
        }
        const newObj = { ...obj, ...person }
        Object.keys(newObj).map((item) => {
            res.push(item);
        });
        return res;
    },
    // 获取随机数
    getRandomString: (maxLength = 6) => {
        return `${Math.random().toString(36).substr(2, maxLength)}`;
    },
    // 保留2位小数
    keepTwoDecimalFull: (num) => {
        var result = parseFloat(num);
        if (isNaN(result)) {
            alert("传递参数错误，请检查！");
            return false;
        }
        result = Math.round(num * 100) / 100;
        var s_x = result.toString();
        var pos_decimal = s_x.indexOf(".");
        if (pos_decimal < 0) {
            pos_decimal = s_x.length;
            s_x += ".";
        }
        while (s_x.length <= pos_decimal + 2) {
            s_x += "0";
        }
        return s_x;
    },
    // 是否是空对象
    isEmptyObj: (obj) => {
        return Object.keys(obj).length === 0
    },
    // 时间
    adjustDate: (stringDate, stringNumber) => {
        let date = new Date(stringDate);
        date = date.setDate(date.getDate() + stringNumber);
        date = new Date(date);
        let y = date.getFullYear();
        let m = date.getMonth() + 1;
        let d = date.getDate();
        m = m < 10 ? ("0" + m) : m;
        d = d < 10 ? ("0" + d) : d;
        return `${d}-${m}-${y}`
    },
    // 根据ID获取
    byIdgetTask: (obj, id) => {
        for (let item of obj) {
            if (item.id == id) {
                return item;
            }
        }
    },
    // 分解遍历数据
    getTrueArr: (startId, list) => {
        let reorderArray = [];
        let $rIndex = 0;
        const getTrueArr = (id, arr) => {
            [id].forEach((i) => {
                arr.map((k) => {
                    if (i === k.startActiveId) {
                        if (!reorderArray.some((n) => n.id === k.id)) {
                            k.index = $rIndex;
                            reorderArray.push(k);
                            $rIndex++;
                        }
                        arr = arr.filter((m) => m.startActiveId !== i);
                        arr.length && getTrueArr(k.endActiveId, arr);
                    }
                });
            });
        };
        getTrueArr(startId, list);
        return reorderArray
    },
    getTrueArrT: (startId, list) => {
        let reorderArray = [];
        let newStartId = [startId];
        let s = [];
        const getT = (arr) => {
            arr.forEach((item) => {
                if (newStartId.some(id => id === item.startActiveId)) {
                    s.push(item.endActiveId);
                    if (!reorderArray.some(n => n.id === item.id)) {
                        reorderArray.push(item);
                    }
                }
            })
            newStartId = [...s];
            s = [];
            if (newStartId.length > 0) {
                getT(arr)
            }

        }
        getT(list);
        return reorderArray
    },
    //乘法
    mul(arg1, arg2) {
        arg1 = arg1 || 0;
        arg2 = arg2 || 0;
        var m = 0,
            s1 = arg1.toString(),
            s2 = arg2.toString();
        try {
            m += s1.split('.')[1].length;
        } catch (e) { }
        try {
            m += s2.split('.')[1].length;
        } catch (e) { }
        return (Number(s1.replace('.', '')) * Number(s2.replace('.', ''))) / Math.pow(10, m);
    },
    //除法
    div(arg1, arg2) {
        arg1 = arg1 || 0;
        arg2 = arg2 || 0;
        var t1 = 0,
            t2 = 0,
            r1,
            r2;
        try {
            t1 = arg1.toString().split('.')[1].length;
        } catch (e) { }
        try {
            t2 = arg2.toString().split('.')[1].length;
        } catch (e) { }
        r1 = Number(arg1.toString().replace('.', ''));
        r2 = Number(arg2.toString().replace('.', ''));
        return Util.mul(r1 / r2, Math.pow(10, t2 - t1));
    },
    // 对比两个数组，相同ID的开始时间或者结束时间不同的，返回ID
    getDifferentData(arr, newArr) {
        let result = [];
        for (let i = 0; i < arr.length; i++) {
            const s = newArr.find(
                (item) => item.id == arr[i].id
            )
            if (
                +s.start_date != +arr[i].start_date ||
                +s.end_date != +arr[i].end_date
            ) {
                result.push(s.id);
            }
        };
        return result
    },
    // 数组转换tree
    listToTree(data) {
        const map = {};
        const val = [];
        data.forEach((item) => {
            map[item.id] = item;
        });
        data.forEach((item) => {
            const parent = map[item.parent];
            if (parent) {
                (parent.children || (parent.children = [])).push(item);
            } else {
                val.push(item);
            }
        });
        return val
    },
    // base64字符串转换成Uint8Array
    base64ToUint8Array(base64String) {
        const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, "+")
            .replace(/_/g, "/");

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    },
    // Uint8Array转换成base64字符串
    arrayBufferToBase64(array) {
        var binary = "";
        var len = array.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(array[i]);
        }
        return window.btoa(binary);
    }
}

export default Util