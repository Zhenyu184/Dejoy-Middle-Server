from queue import Queue
from threading import Thread
import time

# create a data producer 
def producer(output_queue):
    while True:
        data = 1
        print(output_queue)
        time.sleep(2)
        output_queue.put(data)

# create a consumer
def consumer(input_queue):
    while True:
        time.sleep(3)
        # retrieve data (blocking)
        data = input_queue.get()

        input_queue.task_done()

q = Queue()
t1 = Thread(target=consumer, args=(q,))
t2 = Thread(target=producer, args=(q,))
t1.start()
t2.start()