declare module 'node-nlp' {
    export interface NlpManagerSettings {
        languages?: string[];
        forceNER?: boolean;
        nlu?: {
            useNoneFeature?: boolean;
        };
        ner?: {
            useDuckling?: boolean;
        };
    }

    export interface NlpEntity {
        entity: string;
        option: string;
        sourceText: string;
        utteranceText: string;
        start: number;
        end: number;
        accuracy: number;
        len: number;
    }

    export interface NlpResult {
        locale: string;
        utterance: string;
        entities: NlpEntity[];
        intent: string;
        score: number;
        answer?: string;
    }

    export class NlpManager {
        constructor(settings?: NlpManagerSettings);
        addLanguage(language: string): void;
        addDocument(language: string, utterance: string, intent: string): void;
        addAnswer(language: string, intent: string, answer: string): void;
        addNamedEntityText(entity: string, option: string, languages: string[], texts: string[]): void;
        addRegexEntity(entity: string, language: string, regex: RegExp): void;
        train(): Promise<void>;
        process(language: string, text: string): Promise<NlpResult>;
        save(filename?: string): Promise<void>;
        load(filename?: string): Promise<void>;
    }
}
