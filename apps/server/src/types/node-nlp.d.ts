declare module 'node-nlp' {
    export interface NlpManagerConfig {
        languages: string[];
        forceNER?: boolean;
        nlu?: any;
        ner?: any;
    }

    export interface NerManagerConfig {
        threshold?: number;
    }

    export interface Entity {
        entity: string;
        sourceText: string;
        accuracy: number;
        start: number;
        end: number;
        len: number;
    }

    export interface ProcessResult {
        locale: string;
        utterance: string;
        languageGuessed: boolean;
        localeIso2: string;
        language: string;
        domain: string;
        classifications: any[];
        intent: string;
        score: number;
        entities: Entity[];
        sentiment: any;
        actions: any[];
        srcAnswer: string;
        answer: string;
    }

    export class NlpManager {
        constructor(config: NlpManagerConfig);
        addDocument(locale: string, utterance: string, intent: string): void;
        addAnswer(locale: string, intent: string, answer: string): void;
        train(): Promise<void>;
        process(locale: string, utterance: string): Promise<ProcessResult>;
        save(filename?: string): Promise<void>;
        load(filename?: string): Promise<void>;
    }

    export class NerManager {
        constructor(config?: NerManagerConfig);
        addNamedEntity(entityName: string, options?: any): void;
        addNamedEntityText(
            entityName: string,
            optionName: string,
            languages: string[],
            texts: string[]
        ): void;
        findEntities(utterance: string, language: string): Promise<Entity[]>;
    }

    export class Recognizer {
        constructor(config?: any);
    }

    export class Sentiment {
        constructor(config?: any);
    }
}
