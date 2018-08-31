function run(gen, ...args) {

    let it = gen(...args);

    let next;

    try {
        next = it.next();
        return handleValue(next);
    } catch (err) {
        return Promise.reject(err);
    }


    function handleErr(err) {
        return Promise.resolve(it.throw(err)).then(handleValue);
    }


    function handleValue(next) {
        if (!next.done) {
            return Promise.resolve(next.value).then(nextStep, handleErr);
        } else {
            return Promise.resolve(next.value);
        }
    }

    function nextStep(value) {
        next = it.next(value);
        return handleValue(next);
    }
}