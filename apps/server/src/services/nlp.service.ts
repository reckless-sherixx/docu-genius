import pkg from 'node-nlp';
const { NlpManager, NerManager } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Entity types we want to extract
export enum EntityType {
    PERSON = 'PERSON',
    ORGANIZATION = 'ORGANIZATION',
    DATE = 'DATE',
    MONEY = 'MONEY',
    LOCATION = 'LOCATION',
    ROLE = 'ROLE',
    GENDER_PRONOUN = 'GENDER_PRONOUN',
    IDENTIFIER = 'IDENTIFIER',
    EXPLICIT_PLACEHOLDER = 'EXPLICIT_PLACEHOLDER'
}

export interface ExtractedEntity {
    type: EntityType;
    text: string;
    startIndex: number;
    endIndex: number;
    confidence?: number;
    variableName?: string; 
}

export interface NLPResult {
    entities: ExtractedEntity[];
    placeholders: ExtractedEntity[];
    suggestions: PlaceholderSuggestion[];
}

export interface PlaceholderSuggestion {
    originalText: string;
    variableName: string;
    type: EntityType;
    position: { startIndex: number; endIndex: number };
}

export class NLPService {
    
    private static manager: any = null;
    private static nerManager: any = null;
    private static isInitialized = false;
    
    // Common identifier patterns
    private static readonly IDENTIFIER_PATTERNS = [
        /\b[A-Z]{2,}\d{2,}\b/g, // ABC123
        /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
        /\b[A-Z0-9]{6,}\b/g, // ID codes
        /\b#\d+\b/g, // #12345
    ];

    /**
     * Initialize and train the NLP model
     */
    private static async initialize(): Promise<void> {
        if (this.isInitialized) return;

        console.log('🧠 Initializing NLP.js with training data...');

        // Initialize NLP Manager
        this.manager = new NlpManager({ languages: ['en'], forceNER: true });
        this.nerManager = new NerManager({ threshold: 0.7 });

        // Train NER for custom entities
        await this.trainCustomEntities();

        // Train intent recognition for placeholder detection
        await this.trainIntents();

        // Train the model
        await this.manager.train();

        this.isInitialized = true;
        console.log('✅ NLP model trained and ready');
    }

    /**
     * Train custom entity recognition
     */
    private static async trainCustomEntities(): Promise<void> {
        if (!this.nerManager) return;

        // Train PERSON names
        this.nerManager.addNamedEntityText('person', 'name', ['en'], [
            'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa',
            'John Doe', 'Jane Smith', 'Michael Johnson', 'Sarah Williams', 'David Brown'
        ]);

        // Train ORGANIZATION names
        this.nerManager.addNamedEntityText('organization', 'company', ['en'], [
            'Microsoft', 'Google', 'Apple', 'Amazon', 'Facebook', 'Tesla',
            'Acme Inc', 'TechCorp LLC', 'Global Solutions', 'Digital Innovations',
            'Acme Corporation', 'Smith & Associates', 'Johnson Enterprises'
        ]);

        // Train ROLE/JOB TITLES
        this.nerManager.addNamedEntityText('role', 'job_title', ['en'], [
            'Manager', 'Director', 'CEO', 'CTO', 'CFO', 'President', 'Vice President',
            'Engineer', 'Developer', 'Designer', 'Analyst', 'Consultant', 'Supervisor',
            'Administrator', 'Coordinator', 'Specialist', 'Assistant', 'Representative',
            'Senior Manager', 'Lead Developer', 'Chief Engineer', 'HR Manager'
        ]);

        // Train LOCATION names
        this.nerManager.addNamedEntityText('location', 'place', ['en'], [
            'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Francisco',
            'Main Street', 'Broadway', 'Park Avenue', 'Fifth Avenue',
            'United States', 'California', 'Texas', 'Florida', 'New York'
        ]);

        console.log('✅ Custom entities trained');
    }

    /**
     * Train intent recognition for placeholder patterns
     */
    private static async trainIntents(): Promise<void> {
        if (!this.manager) return;

        // Train to recognize placeholder patterns
        this.manager.addDocument('en', 'Please enter your {{name}}', 'placeholder.detection');
        this.manager.addDocument('en', 'Fill in [email] here', 'placeholder.detection');
        this.manager.addDocument('en', 'Your <<address>> goes here', 'placeholder.detection');
        this.manager.addDocument('en', 'Sign {{signature}} field', 'placeholder.detection');
        this.manager.addDocument('en', 'Date: [date]', 'placeholder.detection');

        console.log('✅ Intent patterns trained');
    }

    /**
     * Extract named entities and placeholders from text using NLP.js
     */
    static async extractEntities(text: string): Promise<NLPResult> {
        console.log('🔍 Starting NLP entity extraction with NLP.js...');

        const entities: ExtractedEntity[] = [];
        const placeholders: ExtractedEntity[] = [];
        const suggestions: PlaceholderSuggestion[] = [];

        try {
            // Initialize if not already done
            await this.initialize();

            // 1. Extract explicit placeholders (highest priority)
            this.extractExplicitPlaceholders(text, placeholders);

            // 2. Extract named entities using NLP.js
            await this.extractNamedEntities(text, entities);

            // 3. Generate placeholder suggestions
            this.generatePlaceholderSuggestions(entities, suggestions);

            console.log(`✅ Extracted ${entities.length} entities and ${placeholders.length} explicit placeholders`);
        } catch (error) {
            console.error('❌ Error during NLP extraction:', error);
            // Return empty results instead of throwing
            console.log('⚠️ Returning empty NLP results due to error');
        }

        return {
            entities,
            placeholders,
            suggestions
        };
    }

    /**
     * Extract explicit placeholders: [variable], {{variable}}, <<variable>>
     */
    private static extractExplicitPlaceholders(text: string, placeholders: ExtractedEntity[]): void {
        // Pattern 1: [variable]
        const bracketPattern = /\[([^\]]+)\]/g;
        let match: RegExpExecArray | null;

        while ((match = bracketPattern.exec(text)) !== null) {
            const varName = match[1];
            if (varName) {
                placeholders.push({
                    type: EntityType.EXPLICIT_PLACEHOLDER,
                    text: match[0],
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                    variableName: this.formatVariableName(varName),
                    confidence: 1.0
                });
            }
        }

        // Pattern 2: {{variable}}
        const doubleCurlyPattern = /\{\{([^}]+)\}\}/g;
        while ((match = doubleCurlyPattern.exec(text)) !== null) {
            const varName = match[1];
            if (varName) {
                placeholders.push({
                    type: EntityType.EXPLICIT_PLACEHOLDER,
                    text: match[0],
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                    variableName: this.formatVariableName(varName),
                    confidence: 1.0
                });
            }
        }

        // Pattern 3: <<variable>>
        const doubleAnglePattern = /<<([^>]+)>>/g;
        while ((match = doubleAnglePattern.exec(text)) !== null) {
            const varName = match[1];
            if (varName) {
                placeholders.push({
                    type: EntityType.EXPLICIT_PLACEHOLDER,
                    text: match[0],
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                    variableName: this.formatVariableName(varName),
                    confidence: 1.0
                });
            }
        }

        console.log(`📍 Found ${placeholders.length} explicit placeholders`);
    }

    /**
     * Extract named entities using NLP.js
     */
    private static async extractNamedEntities(text: string, entities: ExtractedEntity[]): Promise<void> {
        try {
            if (!this.manager || !this.nerManager) {
                console.warn('⚠️ NLP manager not initialized, using fallback extraction');
                this.extractWithPatterns(text, entities);
                return;
            }

            // Process text with NLP.js
            const result = await this.manager.process('en', text);

            // Extract entities from NER
            if (result.entities && result.entities.length > 0) {
                for (const entity of result.entities) {
                    const entityType = this.mapNlpEntityType(entity.entity);
                    const startIndex = text.indexOf(entity.sourceText);

                    if (startIndex !== -1) {
                        entities.push({
                            type: entityType,
                            text: entity.sourceText,
                            startIndex,
                            endIndex: startIndex + entity.sourceText.length,
                            variableName: this.formatVariableName(entity.sourceText) || this.getDefaultVariableName(entityType),
                            confidence: entity.accuracy || 0.8
                        });
                    }
                }
            }

            // Extract dates using regex patterns
            this.extractDates(text, entities);

            // Extract money using regex patterns
            this.extractMoney(text, entities);

            // Extract pronouns using regex patterns
            this.extractPronouns(text, entities);

            // Extract identifiers using regex patterns
            this.extractIdentifiers(text, entities);

            console.log(`✅ NLP.js extracted ${entities.length} entities`);
        } catch (error) {
            console.error('❌ Error extracting entities with NLP.js:', error);
            console.log('⚠️ Falling back to pattern-based extraction');
            this.extractWithPatterns(text, entities);
        }
    }

    /**
     * Map NLP.js entity types to our EntityType enum
     */
    private static mapNlpEntityType(nlpType: string): EntityType {
        const typeMap: { [key: string]: EntityType } = {
            'person': EntityType.PERSON,
            'organization': EntityType.ORGANIZATION,
            'company': EntityType.ORGANIZATION,
            'location': EntityType.LOCATION,
            'place': EntityType.LOCATION,
            'role': EntityType.ROLE,
            'job_title': EntityType.ROLE
        };

        return typeMap[nlpType.toLowerCase()] || EntityType.IDENTIFIER;
    }

    /**
     * Get default variable name for entity type
     */
    private static getDefaultVariableName(entityType: EntityType): string {
        const defaults: { [key: string]: string } = {
            [EntityType.PERSON]: 'FULL_NAME',
            [EntityType.ORGANIZATION]: 'COMPANY_NAME',
            [EntityType.LOCATION]: 'LOCATION',
            [EntityType.ROLE]: 'JOB_TITLE',
            [EntityType.DATE]: 'DATE',
            [EntityType.MONEY]: 'AMOUNT',
            [EntityType.GENDER_PRONOUN]: 'PRONOUN',
            [EntityType.IDENTIFIER]: 'ID'
        };

        return defaults[entityType] || 'FIELD';
    }

    /**
     * Fallback pattern-based extraction
     */
    private static extractWithPatterns(text: string, entities: ExtractedEntity[]): void {
        // Extract capitalized names (likely persons)
        const namePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
        let match: RegExpExecArray | null;

        while ((match = namePattern.exec(text)) !== null) {
            entities.push({
                type: EntityType.PERSON,
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                variableName: this.formatVariableName(match[0]) || 'FULL_NAME',
                confidence: 0.7
            });
        }

        // Extract organizations (with Inc., LLC, Corp., etc.)
        const orgPattern = /\b[A-Z][A-Za-z\s&]+(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Corporation|Company|Co\.?)\b/g;
        while ((match = orgPattern.exec(text)) !== null) {
            entities.push({
                type: EntityType.ORGANIZATION,
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                variableName: this.formatVariableName(match[0]) || 'COMPANY_NAME',
                confidence: 0.8
            });
        }

        // Extract dates
        this.extractDates(text, entities);

        // Extract money
        this.extractMoney(text, entities);

        // Extract roles
        this.extractRoles(text, entities);

        // Extract pronouns
        this.extractPronouns(text, entities);

        // Extract identifiers
        this.extractIdentifiers(text, entities);
    }

    /**
     * Extract date patterns
     */
    private static extractDates(text: string, entities: ExtractedEntity[]): void {
        const datePatterns = [
            /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, // MM/DD/YYYY
            /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g, // MM-DD-YYYY
            /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi, // Jan 1, 2024
            /\b\d{4}-\d{2}-\d{2}\b/g, // YYYY-MM-DD
        ];

        datePatterns.forEach(pattern => {
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    type: EntityType.DATE,
                    text: match[0],
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                    variableName: 'DATE',
                    confidence: 0.9
                });
            }
        });
    }

    /**
     * Extract money patterns
     */
    private static extractMoney(text: string, entities: ExtractedEntity[]): void {
        const moneyPattern = /\$[\d,]+(?:\.\d{2})?|\b\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|dollars?|euros?|pounds?)\b/gi;
        let match: RegExpExecArray | null;

        while ((match = moneyPattern.exec(text)) !== null) {
            entities.push({
                type: EntityType.MONEY,
                text: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                variableName: 'AMOUNT',
                confidence: 0.9
            });
        }
    }

    /**
     * Extract role/job title patterns
     */
    private static extractRoles(text: string, entities: ExtractedEntity[]): void {
        const roles = [
            'manager', 'director', 'ceo', 'cto', 'cfo', 'president', 'vice president',
            'employee', 'staff', 'contractor', 'consultant', 'supervisor', 'lead',
            'engineer', 'developer', 'designer', 'analyst', 'coordinator', 'specialist',
            'administrator', 'officer', 'assistant', 'representative', 'agent', 'chief'
        ];

        roles.forEach(role => {
            const pattern = new RegExp(`\\b${role}\\b`, 'gi');
            let match: RegExpExecArray | null;

            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    type: EntityType.ROLE,
                    text: match[0],
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                    variableName: 'JOB_TITLE',
                    confidence: 0.8
                });
            }
        });
    }

    /**
     * Extract gender pronouns
     */
    private static extractPronouns(text: string, entities: ExtractedEntity[]): void {
        const pronouns = ['he', 'she', 'they', 'him', 'her', 'them', 'his', 'hers', 'their'];

        pronouns.forEach(pronoun => {
            const pattern = new RegExp(`\\b${pronoun}\\b`, 'gi');
            let match: RegExpExecArray | null;

            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    type: EntityType.GENDER_PRONOUN,
                    text: match[0],
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                    variableName: 'PRONOUN',
                    confidence: 0.7
                });
            }
        });
    }

    /**
     * Extract identifier patterns
     */
    private static extractIdentifiers(text: string, entities: ExtractedEntity[]): void {
        this.IDENTIFIER_PATTERNS.forEach(pattern => {
            let match: RegExpExecArray | null;
            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    type: EntityType.IDENTIFIER,
                    text: match[0],
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                    variableName: 'ID',
                    confidence: 0.8
                });
            }
        });
    }

    /**
     * Generate placeholder suggestions from entities
     */
    private static generatePlaceholderSuggestions(
        entities: ExtractedEntity[],
        suggestions: PlaceholderSuggestion[]
    ): void {
        // Group similar entities and suggest placeholders
        const grouped = new Map<string, ExtractedEntity[]>();

        entities.forEach(entity => {
            const key = `${entity.type}-${entity.variableName || 'UNKNOWN'}`;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            const group = grouped.get(key);
            if (group) {
                group.push(entity);
            }
        });

        // Create suggestions for high-confidence entities
        grouped.forEach((group) => {
            if (group.length > 0 && group[0]) {
                const entity = group[0];
                const confidence = entity.confidence ?? 0;
                
                if (confidence >= 0.7 && entity.variableName) {
                    suggestions.push({
                        originalText: entity.text,
                        variableName: `{{${entity.variableName}}}`,
                        type: entity.type,
                        position: {
                            startIndex: entity.startIndex,
                            endIndex: entity.endIndex
                        }
                    });
                }
            }
        });

        console.log(`💡 Generated ${suggestions.length} placeholder suggestions`);
    }

    /**
     * Format variable name (convert to SCREAMING_SNAKE_CASE)
     */
    private static formatVariableName(text: string): string {
        return text
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    /**
     * Convert entity to variable format
     */
    static entityToVariable(entity: ExtractedEntity): string {
        return `{{${entity.variableName}}}`;
    }
}

export const nlpService = new NLPService();
