function* generator() {}

function isGenerator(fn) {
    return typeof fn === "function" && fn instanceof generator.constructor
}

function runner(gen, ...args) {
    if (!isGenerator(gen)) {
        throw TypeError(`${gen} is not a generator function`)
    }

    const it = gen(...args);

    let next;

    return Promise
        .resolve()
        .then(function nextStep(v, e) {

            if (e) {
                next = it.throw(e)
            } else {
                next = it.next(v);
            }

            if (next.done) {
                return Promise.resolve(next.value);
            } else {
                return Promise.resolve(next.value).then(nextStep, e => nextStep(null, e));
            }

        })
}
