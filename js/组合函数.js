function commpay() {
    const args = [...arguments];
    return function (x) {
        let lenght = args.length;
        let result = x;
        while (lenght--) {
            result = args[lenght](x)
        }

        return result
    }
}