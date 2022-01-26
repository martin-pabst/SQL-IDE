class WorkerTest {
    start(){
        let worker = new Worker('js/sqljs-worker/sqljsWorker.js');
        worker.postMessage(['one', 'two']);
    }
}


$(() => {
    new WorkerTest().start();
})