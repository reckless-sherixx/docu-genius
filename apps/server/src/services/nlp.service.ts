import { NlpManager } from 'node-nlp';

// Import training data from dedicated file
import {
    EntityType,
    FIRST_NAMES,
    LAST_NAMES,
    ORGANIZATIONS,
    ROLES,
    LOCATIONS,
    GENDER_PRONOUNS,
    MONTHS,
    DATE_WORDS,
    REGEX_PATTERNS,
    HR_DOCUMENT_KEYWORDS,
    LEGAL_DOCUMENT_KEYWORDS,
    DURATION_TERMS,
    BENEFIT_TERMS,
} from '../lib/data/nlp-training-data.js';

// Re-export EntityType for external use
export { EntityType };

export interface ExtractedEntity {
    type: EntityType;
    text: string;
    start: number;
    end: number;
    confidence: number;
}

export interface NlpExtractionResult {
    entities: ExtractedEntity[];
    placeholders: ExtractedEntity[];
    rawText: string;
}

export class NlpService {
    private static manager: NlpManager | null = null;
    private static isTraining = false;
    private static isReady = false;

    /**
     * Initialize and train the NLP manager
     */
    private static async getManager(): Promise<NlpManager> {
        if (this.manager && this.isReady) {
            return this.manager;
        }

        if (this.isTraining) {
            // Wait for training to complete
            while (this.isTraining) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.manager!;
        }

        this.isTraining = true;
        console.log('🧠 Initializing NLP Manager and training model...');

        this.manager = new NlpManager({
            languages: ['en'],
            forceNER: true,
            nlu: { useNoneFeature: true },
            ner: { useDuckling: false },
        });

        await this.trainModel();
        this.isReady = true;
        this.isTraining = false;

        console.log('✅ NLP Model trained and ready');
        return this.manager;
    }

    private static async trainModel(): Promise<void> {
        if (!this.manager) return;

        console.log('📚 Loading training data...');

        // ============================================
        // PERSON NAMES - First and last names
        // ============================================
        FIRST_NAMES.forEach(name => {
            this.manager!.addNamedEntityText('PERSON', 'firstName', ['en'], [name]);
        });
        LAST_NAMES.forEach(name => {
            this.manager!.addNamedEntityText('PERSON', 'lastName', ['en'], [name]);
        });

        // ============================================
        // ORGANIZATIONS - Companies, institutions
        // ============================================
        ORGANIZATIONS.forEach(org => {
            this.manager!.addNamedEntityText('ORGANIZATION', 'company', ['en'], [org]);
        });

        // ============================================
        // JOB ROLES & TITLES
        // ============================================
        ROLES.forEach(role => {
            this.manager!.addNamedEntityText('ROLE', 'jobTitle', ['en'], [role]);
        });

        // ============================================
        // LOCATIONS - Countries, cities, states
        // ============================================
        LOCATIONS.forEach(loc => {
            this.manager!.addNamedEntityText('LOCATION', 'place', ['en'], [loc]);
        });

        // ============================================
        // GENDER PRONOUNS
        // ============================================
        GENDER_PRONOUNS.forEach(pronoun => {
            this.manager!.addNamedEntityText('GENDER_PRONOUN', 'pronoun', ['en'], [pronoun]);
        });

        // ============================================
        // MONTHS AND DATE WORDS
        // ============================================
        MONTHS.forEach(month => {
            this.manager!.addNamedEntityText('DATE', 'month', ['en'], [month]);
        });
        DATE_WORDS.forEach(word => {
            this.manager!.addNamedEntityText('DATE', 'dateWord', ['en'], [word]);
        });

        // ============================================
        // REGEX PATTERNS - Dates, Money, IDs, etc.
        // ============================================
        // Date patterns
        REGEX_PATTERNS.DATE.forEach(pattern => {
            this.manager!.addRegexEntity('DATE', 'en', pattern);
        });

        // Money patterns
        REGEX_PATTERNS.MONEY.forEach(pattern => {
            this.manager!.addRegexEntity('MONEY', 'en', pattern);
        });

        // Identifier patterns
        REGEX_PATTERNS.IDENTIFIER.forEach(pattern => {
            this.manager!.addRegexEntity('IDENTIFIER', 'en', pattern);
        });

        // Email patterns
        REGEX_PATTERNS.EMAIL.forEach(pattern => {
            this.manager!.addRegexEntity('EMAIL', 'en', pattern);
        });

        // Phone patterns
        REGEX_PATTERNS.PHONE.forEach(pattern => {
            this.manager!.addRegexEntity('PHONE', 'en', pattern);
        });

        // ============================================
        // TRAIN THE MODEL
        // ============================================
        console.log('📚 Training NLP model with entity data...');
        console.log(`   - ${FIRST_NAMES.length} first names`);
        console.log(`   - ${LAST_NAMES.length} last names`);
        console.log(`   - ${ORGANIZATIONS.length} organizations`);
        console.log(`   - ${ROLES.length} job roles`);
        console.log(`   - ${LOCATIONS.length} locations`);
        console.log(`   - ${GENDER_PRONOUNS.length} gender pronouns`);
        console.log(`   - ${MONTHS.length + DATE_WORDS.length} date-related words`);
        
        await this.manager!.train();
        console.log('✅ NLP model training complete');
    }

    /**
     * Main extraction method - detects all named entities
     */
    static async NLPExtraction(text: string): Promise<NlpExtractionResult> {
        console.log('\n🧠 ========== STARTING NLP ENTITY EXTRACTION ==========');
        console.log(`📝 Text length: ${text.length} characters`);

        if (!text || text.trim().length === 0) {
            console.log('⚠️ No text to analyze');
            return { entities: [], placeholders: [], rawText: text };
        }

        try {
            const manager = await this.getManager();
            const entities: ExtractedEntity[] = [];
            const placeholders: ExtractedEntity[] = [];

            // Process the text with node-nlp
            const result = await manager.process('en', text);

            // Extract entities from the NLP result
            if (result.entities && result.entities.length > 0) {
                for (const entity of result.entities) {
                    const mappedType = this.mapEntityType(entity.entity);
                    if (mappedType) {
                        entities.push({
                            type: mappedType,
                            text: entity.sourceText || entity.utteranceText || entity.option,
                            start: entity.start || 0,
                            end: entity.end || 0,
                            confidence: entity.accuracy || 0.9,
                        });
                    }
                }
            }

            // Also extract explicit placeholders like {{NAME}}, [DATE], etc.
            this.extractExplicitPlaceholders(text, placeholders);

            // Additional pattern-based extraction for things NLP might miss
            await this.extractWithPatterns(text, entities);

            // Deduplicate entities
            const uniqueEntities = this.deduplicateEntities(entities);

            // Log results
            this.logExtractionResults(uniqueEntities, placeholders);

            return {
                entities: uniqueEntities,
                placeholders,
                rawText: text,
            };
        } catch (error) {
            console.error('❌ NLP extraction failed:', error);
            return { entities: [], placeholders: [], rawText: text };
        }
    }

    /**
     * Map node-nlp entity types to our EntityType enum
     */
    private static mapEntityType(nlpEntity: string): EntityType | null {
        const mapping: Record<string, EntityType> = {
            'PERSON': EntityType.PERSON,
            'ORGANIZATION': EntityType.ORGANIZATION,
            'DATE': EntityType.DATE,
            'MONEY': EntityType.MONEY,
            'LOCATION': EntityType.LOCATION,
            'ROLE': EntityType.ROLE,
            'GENDER_PRONOUN': EntityType.GENDER_PRONOUN,
            'IDENTIFIER': EntityType.IDENTIFIER,
            'EMAIL': EntityType.EMAIL,
            'PHONE': EntityType.PHONE,
            'DURATION': EntityType.DURATION,
            'BENEFIT': EntityType.BENEFIT,
            'LEGAL_TERM': EntityType.LEGAL_TERM,
        };
        return mapping[nlpEntity] || null;
    }

    /**
     * Extract explicit placeholders like {{NAME}}, [DATE], etc.
     */
    private static extractExplicitPlaceholders(text: string, placeholders: ExtractedEntity[]): void {
        // Pattern: {{PLACEHOLDER}}
        const doubleBracePattern = /\{\{([A-Z_]+)\}\}/g;
        let match;
        while ((match = doubleBracePattern.exec(text)) !== null) {
            placeholders.push({
                type: this.inferTypeFromPlaceholder(match[1]!),
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
                confidence: 1.0,
            });
        }

        // Pattern: [PLACEHOLDER]
        const bracketPattern = /\[([A-Z_\s]+)\]/g;
        while ((match = bracketPattern.exec(text)) !== null) {
            placeholders.push({
                type: this.inferTypeFromPlaceholder(match[1]!),
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
                confidence: 1.0,
            });
        }

        // Pattern: <PLACEHOLDER>
        const angleBracketPattern = /<([A-Z_]+)>/g;
        while ((match = angleBracketPattern.exec(text)) !== null) {
            placeholders.push({
                type: this.inferTypeFromPlaceholder(match[1]!),
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
                confidence: 1.0,
            });
        }

        // Pattern: _____ (blank lines for filling in)
        const blankPattern = /_{3,}/g;
        while ((match = blankPattern.exec(text)) !== null) {
            // Try to infer type from surrounding context
            const contextBefore = text.substring(Math.max(0, match.index - 30), match.index);
            placeholders.push({
                type: this.inferTypeFromContext(contextBefore),
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
                confidence: 0.7,
            });
        }
    }

    /**
     * Infer entity type from placeholder name
     */
    private static inferTypeFromPlaceholder(placeholder: string): EntityType {
        const p = placeholder.toUpperCase();
        
        if (p.includes('NAME') || p.includes('PERSON') || p.includes('FIRST') || p.includes('LAST') || p.includes('FULL')) {
            return EntityType.PERSON;
        }
        if (p.includes('COMPANY') || p.includes('ORG') || p.includes('BUSINESS') || p.includes('EMPLOYER')) {
            return EntityType.ORGANIZATION;
        }
        if (p.includes('DATE') || p.includes('DOB') || p.includes('BIRTH') || p.includes('EXPIR')) {
            return EntityType.DATE;
        }
        if (p.includes('AMOUNT') || p.includes('PRICE') || p.includes('COST') || p.includes('SALARY') || p.includes('PAYMENT')) {
            return EntityType.MONEY;
        }
        if (p.includes('ADDRESS') || p.includes('CITY') || p.includes('STATE') || p.includes('ZIP') || p.includes('COUNTRY') || p.includes('LOCATION')) {
            return EntityType.LOCATION;
        }
        if (p.includes('TITLE') || p.includes('ROLE') || p.includes('POSITION') || p.includes('JOB')) {
            return EntityType.ROLE;
        }
        if (p.includes('EMAIL')) {
            return EntityType.EMAIL;
        }
        if (p.includes('PHONE') || p.includes('TEL') || p.includes('MOBILE') || p.includes('FAX')) {
            return EntityType.PHONE;
        }
        if (p.includes('ID') || p.includes('NUMBER') || p.includes('SSN') || p.includes('ACCOUNT') || p.includes('REFERENCE')) {
            return EntityType.IDENTIFIER;
        }
        
        return EntityType.IDENTIFIER; // Default
    }

    /**
     * Infer entity type from surrounding context
     */
    private static inferTypeFromContext(context: string): EntityType {
        const c = context.toLowerCase();
        
        if (c.includes('name') || c.includes('signed') || c.includes('by:')) {
            return EntityType.PERSON;
        }
        if (c.includes('date') || c.includes('on:') || c.includes('as of')) {
            return EntityType.DATE;
        }
        if (c.includes('amount') || c.includes('$') || c.includes('total') || c.includes('price')) {
            return EntityType.MONEY;
        }
        if (c.includes('address') || c.includes('location') || c.includes('city')) {
            return EntityType.LOCATION;
        }
        if (c.includes('phone') || c.includes('tel') || c.includes('call')) {
            return EntityType.PHONE;
        }
        if (c.includes('email') || c.includes('@')) {
            return EntityType.EMAIL;
        }
        if (c.includes('company') || c.includes('organization') || c.includes('employer')) {
            return EntityType.ORGANIZATION;
        }
        
        return EntityType.IDENTIFIER;
    }

    /**
     * Additional pattern-based extraction
     */
    private static async extractWithPatterns(text: string, entities: ExtractedEntity[]): Promise<void> {
        // Extract dates with month names (more robust than regex alone)
        this.extractDates(text, entities);

        // Extract money amounts
        this.extractMoney(text, entities);

        // Extract potential person names (Title + Name pattern)
        this.extractPersonNames(text, entities);

        // Extract job roles from context
        this.extractRoles(text, entities);

        // Extract gender pronouns
        this.extractPronouns(text, entities);

        // Extract identifiers
        this.extractIdentifiers(text, entities);
        
        // Extract HR/Legal document specific patterns
        this.extractDurations(text, entities);
        this.extractBenefits(text, entities);
        this.extractSalaryCompensation(text, entities);
        this.extractLegalTerms(text, entities);
    }

    /**
     * Extract duration/period patterns (for employment terms)
     */
    private static extractDurations(text: string, entities: ExtractedEntity[]): void {
        const durationPatterns = [
            // Numeric durations: "3 months", "90 days", "2 years"
            /\b(\d+)\s*(day|days|week|weeks|month|months|year|years)\b/gi,
            // Written durations: "three months", "ninety days"
            /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirty|sixty|ninety)\s*(day|days|week|weeks|month|months|year|years)\b/gi,
            // Probation/notice periods
            /\b(probation(?:ary)?\s+period|notice\s+period)\s+(?:of\s+)?(\d+\s*(?:day|days|week|weeks|month|months|year|years)|[a-z]+\s+(?:day|days|week|weeks|month|months|year|years))\b/gi,
        ];

        for (const pattern of durationPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    type: EntityType.DURATION,
                    text: match[0],
                    start: match.index,
                    end: match.index + match[0].length,
                    confidence: 0.9,
                });
            }
        }
    }

    /**
     * Extract benefits and compensation terms
     */
    private static extractBenefits(text: string, entities: ExtractedEntity[]): void {
        const benefitPatterns = [
            // Health benefits
            /\b(health|medical|dental|vision)\s+(insurance|coverage|plan|benefits?)\b/gi,
            // Life/disability insurance
            /\b(life|disability|accident)\s+insurance\b/gi,
            // Retirement benefits
            /\b(401\s*\(?k\)?|retirement|pension)\s*(plan|benefits?|match(?:ing)?)?\b/gi,
            // Stock/equity
            /\b(stock\s+options?|RSU|restricted\s+stock|ESOP|equity\s+grant)\b/gi,
            // Leave benefits
            /\b(paid\s+time\s+off|PTO|vacation\s+days?|sick\s+(?:leave|days?)|personal\s+(?:leave|days?))\b/gi,
            /\b(maternity|paternity|parental|family)\s+leave\b/gi,
            // Bonuses
            /\b(signing|joining|performance|annual|quarterly)\s+bonus\b/gi,
            // Allowances
            /\b(travel|transport|housing|meal|phone|internet)\s+allowance\b/gi,
            // Work arrangements
            /\b(remote\s+work|work\s+from\s+home|WFH|hybrid\s+work|flexible\s+hours?)\b/gi,
        ];

        for (const pattern of benefitPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    type: EntityType.BENEFIT,
                    text: match[0],
                    start: match.index,
                    end: match.index + match[0].length,
                    confidence: 0.9,
                });
            }
        }
    }

    /**
     * Extract salary and compensation amounts with context
     */
    private static extractSalaryCompensation(text: string, entities: ExtractedEntity[]): void {
        const salaryPatterns = [
            // Salary with currency and period
            /\b(annual|yearly|monthly|base)\s+salary\s+(?:of\s+)?(\$|₹|€|£|USD|INR|EUR|GBP)?\s?[\d,]+(?:\.\d{2})?\b/gi,
            // Per annum/month patterns
            /\b(\$|₹|€|£|USD|INR|EUR|GBP)\s?[\d,]+(?:\.\d{2})?\s*(per\s+(?:annum|month|year)|p\.?a\.?|p\.?m\.?)\b/gi,
            // CTC (Cost to Company - common in India)
            /\b(CTC|cost\s+to\s+company)\s+(?:of\s+)?(\$|₹|€|£|USD|INR|EUR|GBP)?\s?[\d,]+(?:\.\d{2})?\s*(LPA|lakh|lakhs?)?\b/gi,
            // Indian salary formats (lakhs, LPA)
            /\b(\$|₹|INR)?\s?[\d.]+\s*(lakh|lakhs?|LPA|lac)\s*(per\s+annum)?\b/gi,
        ];

        for (const pattern of salaryPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    type: EntityType.MONEY,
                    text: match[0],
                    start: match.index,
                    end: match.index + match[0].length,
                    confidence: 0.95,
                });
            }
        }
    }

    /**
     * Extract legal terms and clauses
     */
    private static extractLegalTerms(text: string, entities: ExtractedEntity[]): void {
        const legalPatterns = [
            // Agreement types
            /\b(non-disclosure\s+agreement|NDA|confidentiality\s+agreement)\b/gi,
            /\b(employment\s+agreement|employment\s+contract|offer\s+letter)\b/gi,
            /\b(service\s+agreement|consulting\s+agreement|contractor\s+agreement)\b/gi,
            /\b(non-compete\s+(?:agreement|clause)|non-solicitation)\b/gi,
            // Legal clauses
            /\b(intellectual\s+property|IP\s+rights?|confidential\s+information)\b/gi,
            /\b(termination\s+clause|indemnification|limitation\s+of\s+liability)\b/gi,
            /\b(governing\s+law|jurisdiction|arbitration|dispute\s+resolution)\b/gi,
            // Parties
            /\b(disclosing\s+party|receiving\s+party|first\s+party|second\s+party)\b/gi,
            // At-will employment
            /\b(at-will\s+employment|employment\s+at\s+will)\b/gi,
        ];

        for (const pattern of legalPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    type: EntityType.LEGAL_TERM,
                    text: match[0],
                    start: match.index,
                    end: match.index + match[0].length,
                    confidence: 0.9,
                });
            }
        }
    }

    /**
     * Extract date patterns
     */
    private static extractDates(text: string, entities: ExtractedEntity[]): void {
        // Month DD, YYYY or Month DD YYYY
        const datePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[.,]?\s+\d{1,2}[,]?\s+\d{4}\b/gi;
        let match;
        while ((match = datePattern.exec(text)) !== null) {
            entities.push({
                type: EntityType.DATE,
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
                confidence: 0.95,
            });
        }

        // DD Month YYYY
        const datePattern2 = /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[.,]?\s+\d{4}\b/gi;
        while ((match = datePattern2.exec(text)) !== null) {
            entities.push({
                type: EntityType.DATE,
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
                confidence: 0.95,
            });
        }
    }

    /**
     * Extract money patterns
     */
    private static extractMoney(text: string, entities: ExtractedEntity[]): void {
        const moneyPatterns = [
            /\$\s?[\d,]+(?:\.\d{2})?\b/gi,
            /USD\s?[\d,]+(?:\.\d{2})?\b/gi,
            /\€\s?[\d,]+(?:\.\d{2})?\b/gi,
            /\£\s?[\d,]+(?:\.\d{2})?\b/gi,
            /[\d,]+(?:\.\d{2})?\s?(?:dollars?|USD|euros?|EUR|pounds?|GBP)\b/gi,
        ];

        for (const pattern of moneyPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    type: EntityType.MONEY,
                    text: match[0],
                    start: match.index,
                    end: match.index + match[0].length,
                    confidence: 0.95,
                });
            }
        }
    }

    /**
     * Extract person names with titles
     */
    private static extractPersonNames(text: string, entities: ExtractedEntity[]): void {
        // Title + Name pattern
        const titlePattern = /\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Sir|Madam|Miss)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
        let match: RegExpExecArray | null;
        while ((match = titlePattern.exec(text)) !== null) {
            entities.push({
                type: EntityType.PERSON,
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
                confidence: 0.9,
            });
        }

        // Two or more capitalized words (potential name)
        const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g;
        let nameMatch: RegExpExecArray | null;
        while ((nameMatch = namePattern.exec(text)) !== null) {
            // Skip if it's likely a location, organization, or common phrase
            const potentialName = nameMatch[1];
            if (potentialName && !this.isLikelyNotAName(potentialName)) {
                // Check if not already captured
                const matchText = nameMatch[0];
                const matchIndex = nameMatch.index;
                const alreadyExists = entities.some(e => 
                    e.text === matchText && e.type === EntityType.PERSON
                );
                if (!alreadyExists) {
                    entities.push({
                        type: EntityType.PERSON,
                        text: matchText,
                        start: matchIndex,
                        end: matchIndex + matchText.length,
                        confidence: 0.6, // Lower confidence for pattern-only matches
                    });
                }
            }
        }
    }

    /**
     * Check if a capitalized phrase is likely NOT a person's name
     */
    private static isLikelyNotAName(text: string): boolean {
        const notNames = [
            'The', 'This', 'That', 'These', 'Those', 'Please', 'Thank', 'Dear',
            'Best', 'Regards', 'Sincerely', 'However', 'Therefore', 'Furthermore',
            'Additionally', 'Moreover', 'Subject', 'Reference', 'Attention',
            'Important', 'Urgent', 'Notice', 'Agreement', 'Contract', 'Terms',
        ];
        return notNames.some(n => text.startsWith(n));
    }

    /**
     * Extract job roles from text
     */
    private static extractRoles(text: string, entities: ExtractedEntity[]): void {
        const rolePatterns = [
            /\b(Chief\s+\w+\s+Officer|C[A-Z]O)\b/gi,
            /\b(Senior|Junior|Lead|Principal|Staff|Associate|Assistant)\s+\w+(?:\s+\w+)?\s*(Engineer|Developer|Manager|Analyst|Designer|Director|Specialist)\b/gi,
            /\b\w+\s+(Manager|Director|Engineer|Developer|Analyst|Specialist|Coordinator|Administrator)\b/gi,
        ];

        for (const pattern of rolePatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    type: EntityType.ROLE,
                    text: match[0],
                    start: match.index,
                    end: match.index + match[0].length,
                    confidence: 0.85,
                });
            }
        }
    }

    /**
     * Extract gender pronouns
     */
    private static extractPronouns(text: string, entities: ExtractedEntity[]): void {
        const pronounPattern = /\b(he|she|they|him|her|them|his|hers|theirs|himself|herself|themselves|themself)\b/gi;
        let match;
        while ((match = pronounPattern.exec(text)) !== null) {
            entities.push({
                type: EntityType.GENDER_PRONOUN,
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
                confidence: 1.0,
            });
        }
    }

    /**
     * Extract identifiers
     */
    private static extractIdentifiers(text: string, entities: ExtractedEntity[]): void {
        const idPatterns = [
            /\b(SSN|Social Security|SS#?)[:.\s]*\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/gi,
            /\b(Account|Acct|ID|Invoice|Order|Policy|Case|Ref|Reference|Ticket|Claim|No\.?|Number|#)[:.\s]*[A-Z0-9-]{4,20}\b/gi,
            /\b[A-Z]{2,4}-?\d{5,12}\b/g, // ID codes like ABC-123456
        ];

        for (const pattern of idPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    type: EntityType.IDENTIFIER,
                    text: match[0],
                    start: match.index,
                    end: match.index + match[0].length,
                    confidence: 0.9,
                });
            }
        }
    }

    /**
     * Deduplicate entities by text and type
     */
    private static deduplicateEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
        const seen = new Map<string, ExtractedEntity>();
        
        for (const entity of entities) {
            const key = `${entity.type}:${entity.text.toLowerCase()}`;
            const existing = seen.get(key);
            
            // Keep the one with higher confidence
            if (!existing || entity.confidence > existing.confidence) {
                seen.set(key, entity);
            }
        }
        
        return Array.from(seen.values());
    }

    /**
     * Log extraction results
     */
    private static logExtractionResults(entities: ExtractedEntity[], placeholders: ExtractedEntity[]): void {
        console.log('\n🏷️  ========== NLP EXTRACTION RESULTS ==========');
        
        if (entities.length === 0 && placeholders.length === 0) {
            console.log('ℹ️  No entities or placeholders found');
            return;
        }

        // Group entities by type
        const grouped = new Map<string, ExtractedEntity[]>();
        for (const entity of entities) {
            const list = grouped.get(entity.type) || [];
            list.push(entity);
            grouped.set(entity.type, list);
        }

        // Log entities by type
        for (const [type, typeEntities] of grouped) {
            console.log(`\n   📌 ${type} (${typeEntities.length} found):`);
            typeEntities.slice(0, 10).forEach((entity, idx) => {
                console.log(`      ${idx + 1}. "${entity.text}" [confidence: ${(entity.confidence * 100).toFixed(1)}%]`);
            });
            if (typeEntities.length > 10) {
                console.log(`      ... and ${typeEntities.length - 10} more`);
            }
        }

        // Log placeholders
        if (placeholders.length > 0) {
            console.log(`\n   📝 PLACEHOLDERS (${placeholders.length} found):`);
            placeholders.forEach((p, idx) => {
                console.log(`      ${idx + 1}. "${p.text}" -> ${p.type}`);
            });
        }

        console.log('\n   ─────────────────────────────────────────');
        console.log(`   📊 SUMMARY: ${entities.length} entities, ${placeholders.length} placeholders`);
        console.log('=================================================\n');
    }

    /**
     * Convert entity to variable name for document templates
     */
    static entityToVariable(entity: ExtractedEntity): string {
        const prefix = entity.type.toLowerCase();
        const cleanText = entity.text
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .trim()
            .split(/\s+/)
            .map((word, i) => i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        
        return `{{${prefix}_${cleanText}}}`;
    }
}