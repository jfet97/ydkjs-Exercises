/*
    Book: Async & Performance
    Chapter 4: Generators
    Generator Concurrency

    "So, as a good supplementary exercise for the reader, try your hand at evolving the code from run()
    to work like the imagined runAll()...it could take non-Promise values that are yielded and hand them off to the next generator...""
    
    Not the best code ever, but it can handle also generators' and promises' errors!
    
    How does it work? Ehm...good question XD
    Before transferring control from one generator to another, this code waits that all the not completed generators are paused.
    Then it decides which yielded value to use, who to give it to, and which generator to start.
    It returns an array of Promises, each of which is linked to one of the generators.
*/



function runAll(...args) {

    let iterators = [];
    let next = [];
    let resultPromises = [];
    let iteratorsData = [];
    let waitingIterators = 0;
    let totalIterators = args.length;

    for (let i = 0; i < args.length; i++) {
        iterators[i] = args[i]();
        try {
            iteratorsData[i] = {
                resolve: undefined,
                value: undefined,
                state: "running" //, "completed", "waiting"
            }
            next[i] = iterators[i].next();
            resultPromises[i] = handleIterator(next[i], iterators[i], i);
        } catch (err) {
            iteratorsData[i] = {
                resolve: undefined,
                value: undefined,
                state: "completed"
            }
            totalIterators--;
            resultPromises[i] = Promise.reject(err);
        }
    }


    function handleIterator(next, it, index) {

        function returnPreviousIndex(current) {
            if (current != 0) {
                return --current;
            } else {
                return args.length - 1;
            }
        }

        function transferControl() {

            if ((waitingIterators != 0) && (waitingIterators == totalIterators)) {

                itsfor: for (let i = 0; i < iterators.length; i++) {

                            if (iteratorsData[i].state == "completed") continue;

                            let previousIndex = returnPreviousIndex(i);
                            while (previousIndex != i) {

                                if (iteratorsData[previousIndex].state == "waiting") {
                                    iteratorsData[i].resolve(iteratorsData[previousIndex].value);
                                    iteratorsData[i].resolve = undefined;
                                    iteratorsData[previousIndex].value = undefined;
                                    continue itsfor;
                                }

                                if (iteratorsData[previousIndex].state == "completed") {
                                    previousIndex = returnPreviousIndex(previousIndex);
                                }
                            }

                            iteratorsData[i].resolve(iteratorsData[i].value);
                            iteratorsData[i].resolve = undefined;
                            waitingIterators--;
                            iteratorsData[i].state = "running";
                            iteratorsData[i].value = undefined;
                            return;
                        }

                for (let i = 0; i < iterators.length; i++) {
                    if (iteratorsData[i].state != "completed") iteratorsData[i].state = "running";
                    waitingIterators--;
                }
            }

            return;
        }

        function setStateWaitingAndCallNext(value) {
            let p = new Promise((resolve, reject) => {
                iteratorsData[index].resolve = resolve;
                iteratorsData[index].value = value;
                iteratorsData[index].state = "waiting";
            }).then(nextStep);

            waitingIterators++;
            transferControl();
            return p;
        }

        function setStateCompletedAndCallNext() {
            iteratorsData[index].state = "completed";
            totalIterators--;
            transferControl();
            return;
        }

        function handleErr(err) {
            try {
                return Promise.resolve(it.throw(err)).then(handleValue);
            } catch (err) {
                setStateCompletedAndCallNext();
                throw err;
            }
        }

        function handleValue(next) {
            if (!next.done) {
                if ((next.value) && (next.value.then)) {
                    return Promise.resolve(next.value).then(nextStep, handleErr);
                } else {
                    return setStateWaitingAndCallNext(next.value);
                }
            } else {
                setStateCompletedAndCallNext();
                return Promise.resolve(next.value);
            }
        }

        function nextStep(value) {
            try {
                next = it.next(value);
            } catch (err) {
                setStateCompletedAndCallNext();
                throw err;
            }
            return handleValue(next);
        }

        return handleValue(next);
    }


    // return Promise.all(resultPromises);
    return resultPromises;
}
