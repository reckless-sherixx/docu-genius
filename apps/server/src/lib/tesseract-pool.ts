import { createWorker, Worker as TesseractWorker } from 'tesseract.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


class TesseractPool {
    private pool: TesseractWorker[] = [];
    private busy: Set<TesseractWorker> = new Set();
    private waiting: Array<(worker: TesseractWorker) => void> = [];
    private maxWorkers: number;
    private initialized = false;
    private langPath: string;
    private initPromise: Promise<void> | null = null;

    constructor(maxWorkers = 3) {
        this.maxWorkers = maxWorkers;
        const localTrainedData = path.resolve(__dirname, '../../eng.traineddata');
        this.langPath = localTrainedData;
    }

    async warmup(count?: number): Promise<void> {
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            const numToCreate = Math.min(count ?? 2, this.maxWorkers);
            const start = Date.now();

            const workerPromises = Array.from({ length: numToCreate }, () => this.createWorker());
            const workers = await Promise.all(workerPromises);
            this.pool.push(...workers);
            this.initialized = true;

        })();

        return this.initPromise;
    }

    private async createWorker(): Promise<TesseractWorker> {
        const worker = await createWorker('eng', 1, {
            gzip: false,
            cacheMethod: 'readOnly',
        });
        await worker.setParameters({
            preserve_interword_spaces: '1',
        });
        return worker;
    }

    /**
     * Acquire a worker from the pool. 
     */
    async acquire(): Promise<TesseractWorker> {
        // Check if there's an idle worker
        const idle = this.pool.find(w => !this.busy.has(w));
        if (idle) {
            this.busy.add(idle);
            return idle;
        }

        if (this.pool.length < this.maxWorkers) {
            const worker = await this.createWorker();
            this.pool.push(worker);
            this.busy.add(worker);
            return worker;
        }

        return new Promise<TesseractWorker>((resolve) => {
            this.waiting.push(resolve);
        });
    }

    /**
     * Release a worker back to the pool.
     */
    release(worker: TesseractWorker): void {
        this.busy.delete(worker);

        if (this.waiting.length > 0) {
            const resolve = this.waiting.shift()!;
            this.busy.add(worker);
            resolve(worker);
        }
    }

    async shutdown(): Promise<void> {
        await Promise.all(this.pool.map(w => w.terminate()));
        this.pool = [];
        this.busy.clear();
        this.waiting = [];
        this.initialized = false;
        this.initPromise = null;
    }

    get stats() {
        return {
            total: this.pool.length,
            busy: this.busy.size,
            idle: this.pool.length - this.busy.size,
            waiting: this.waiting.length,
        };
    }
}

export const tesseractPool = new TesseractPool(3);
