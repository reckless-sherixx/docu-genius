
export enum EntityType {
    /** Names of people (for personalization) */
    PERSON = 'PERSON',
    /** Company/institution names (for business context) */
    ORGANIZATION = 'ORGANIZATION',
    /** Dates and time references (for scheduling) */
    DATE = 'DATE',
    /** Currency amounts (for financial documents) */
    MONEY = 'MONEY',
    /** Places and addresses (for shipping/location data) */
    LOCATION = 'LOCATION',
    /** Job titles (for professional documents) */
    ROLE = 'ROLE',
    /** Pronouns (for inclusive document generation) */
    GENDER_PRONOUN = 'GENDER_PRONOUN',
    /** IDs, account numbers (for tracking/reference) */
    IDENTIFIER = 'IDENTIFIER',
    /** Email addresses (for contact information) */
    EMAIL = 'EMAIL',
    /** Phone numbers (for contact information) */
    PHONE = 'PHONE',
    /** Duration/Period (for employment/contract terms) */
    DURATION = 'DURATION',
    /** Benefits and compensation items */
    BENEFIT = 'BENEFIT',
    /** Legal terms and clauses */
    LEGAL_TERM = 'LEGAL_TERM',
}

// PERSON ENTITY TRAINING DATA
export const FIRST_NAMES = [
    // Common English names
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Emma',
    'Robert', 'Olivia', 'William', 'Sophia', 'Richard', 'Isabella', 'Joseph',
    'Mia', 'Thomas', 'Charlotte', 'Christopher', 'Amelia', 'Daniel', 'Harper',
    'Matthew', 'Evelyn', 'Anthony', 'Abigail', 'Mark', 'Elizabeth', 'Donald',
    'Sofia', 'Steven', 'Avery', 'Paul', 'Ella', 'Andrew', 'Scarlett', 'Joshua',
    'Grace', 'Kenneth', 'Chloe', 'Kevin', 'Victoria', 'Brian', 'Riley',
    'George', 'Aria', 'Timothy', 'Lily', 'Ronald', 'Aubrey', 'Edward', 'Zoey',
    'Jason', 'Penelope', 'Jeffrey', 'Lillian', 'Ryan', 'Addison', 'Jacob',
    'Layla', 'Gary', 'Natalie', 'Nicholas', 'Camila', 'Eric', 'Hannah',
    'Jonathan', 'Brooklyn', 'Stephen', 'Zoe', 'Larry', 'Nora', 'Justin',
    'Alexander', 'Benjamin', 'Samuel', 'Henry', 'Sebastian', 'Jack', 'Aiden',
    'Owen', 'Gabriel', 'Carter', 'Jayden', 'John', 'Luke', 'Anthony', 'Isaac',
    'Dylan', 'Wyatt', 'Andrew', 'Joshua', 'Christopher', 'Grayson', 'Jack',
    'Julian', 'Ryan', 'Jaxon', 'Levi', 'Nathan', 'Caleb', 'Hunter', 'Christian',
    'Madison', 'Luna', 'Savannah', 'Audrey', 'Brooklyn', 'Bella', 'Claire',
    'Skylar', 'Lucy', 'Paisley', 'Everly', 'Anna', 'Caroline', 'Nova', 'Genesis',
    'Emilia', 'Kennedy', 'Samantha', 'Maya', 'Willow', 'Kinsley', 'Naomi',
    'Aaliyah', 'Elena', 'Sarah', 'Ariana', 'Allison', 'Gabriella', 'Alice',
    
    // International names
    'Muhammad', 'Wei', 'Ahmed', 'Priya', 'Raj', 'Carlos', 'Maria', 'Hans',
    'Yuki', 'Dmitri', 'Fatima', 'Omar', 'Aisha', 'Chen', 'Li', 'Kim',
    'Park', 'Hiroshi', 'Yuki', 'Sakura', 'Kenji', 'Takeshi', 'Akira',
    'Pierre', 'Marie', 'Jean', 'François', 'Sophie', 'Isabelle', 'Louis',
    'Giuseppe', 'Marco', 'Alessandro', 'Francesca', 'Giulia', 'Lorenzo',
    'Pablo', 'Diego', 'Alejandro', 'Sofia', 'Valentina', 'Camila', 'Lucia',
    'Hans', 'Friedrich', 'Klaus', 'Anna', 'Greta', 'Heidi', 'Wolfgang',
    'Sven', 'Erik', 'Lars', 'Ingrid', 'Astrid', 'Olaf', 'Magnus',
    'Ivan', 'Alexei', 'Natasha', 'Olga', 'Sergei', 'Vladimir', 'Katya',
    'Ravi', 'Arjun', 'Deepak', 'Priya', 'Sunita', 'Ananya', 'Vikram',
    'Kwame', 'Amara', 'Olu', 'Zara', 'Kofi', 'Ama', 'Chidi',
    

    "Aarav", "Vihaan", "Aditya", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan",
    "Shaurya", "Atharv", "Vivaan", "Advik", "Kabir", "Rohan", "Rahul", "Amit",
    "Suresh", "Ramesh", "Vijay", "Raj", "Sanjay", "Manoj", "Anil", "Sunil",
    "Vikram", "Deepak", "Prakash", "Ajay", "Nitin", "Varun", "Aryan", "Dhruv",
    "Karthik", "Vishal", "Abhishek", "Ravi", "Ganesh", "Mahesh", "Pradeep",
    "Rajesh", "Alok", "Sandeep", "Vivek", "Harsh", "Mayank", "Nikhil", "Pranav",
    "Siddharth", "Yash", "Mohammad", "Ibrahim", "Ahmed", "Ali", "Omar", "Yusuf",
    "Bilal", "Mustafa", "Hamza", "Abdullah", "David", "Joseph", "Anthony", "John",
    "Samuel", "Gurpreet", "Harpreet", "Manpreet", "Simran", "Jaskaran", "Rajinder",

    "Aadya", "Ananya", "Diya", "Saanvi", "Pari", "Kiara", "Myra", "Riya", "Anvi",
    "Aadhya", "Pihu", "Angel", "Avni", "Vanshika", "Saanvi", "Aarohi", "Priya",
    "Neha", "Sneha", "Aditi", "Pooja", "Anjali", "Kavita", "Sunita", "Anita",
    "Meena", "Suman", "Rekha", "Rani", "Aisha", "Fatima", "Zoya", "Zara", "Sana",
    "Maryam", "Iqra", "Amnah", "Sarah", "Grace", "Mary", "Esther", "Rachel",
    "Kaur", "Simran", "Harleen", "Jasleen", "Manjeet", "Preeti", "Swati",
    "Divya", "Ishita", "Nisha", "Roshni", "Tanvi", "Shruti", "Pallavi", "Sakshi",


    // Titles and honorifics
    'Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.', 'Sir', 'Madam', 'Miss', 'Mx.',
    'Rev.', 'Hon.', 'Capt.', 'Lt.', 'Sgt.', 'Gen.', 'Col.', 'Maj.',
];

export const LAST_NAMES = [
    // Common surnames
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
    'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
    'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
    'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts', 'Turner', 'Phillips', 'Evans', 'Parker', 'Edwards',
    'Collins', 'Stewart', 'Morris', 'Murphy', 'Cook', 'Rogers', 'Morgan',
    'Peterson', 'Cooper', 'Reed', 'Bailey', 'Bell', 'Gomez', 'Kelly',
    'Howard', 'Ward', 'Cox', 'Diaz', 'Richardson', 'Wood', 'Watson',
    'Brooks', 'Bennett', 'Gray', 'James', 'Reyes', 'Cruz', 'Hughes',
    'Price', 'Myers', 'Long', 'Foster', 'Sanders', 'Ross', 'Morales',
    'Powell', 'Sullivan', 'Russell', 'Ortiz', 'Jenkins', 'Gutierrez', 'Perry',
    'Butler', 'Barnes', 'Fisher', 'Henderson', 'Coleman', 'Simmons', 'Patterson',
    'Jordan', 'Reynolds', 'Hamilton', 'Graham', 'Kim', 'Gonzales', 'Alexander',
    
    // International surnames
    'O\'Brien', 'O\'Connor', 'O\'Neill', 'McDonald', 'MacDonald', 'McGregor',
    'Van Der Berg', 'Van Dyke', 'De La Cruz', 'De Los Santos', 'Del Rio',
    'Singh', 'Patel', 'Shah', 'Kumar', 'Sharma', 'Gupta', 'Mehta', 'Agarwal',
    'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu',
    'Tanaka', 'Yamamoto', 'Watanabe', 'Suzuki', 'Takahashi', 'Sato', 'Ito',
    'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner',
    'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo',
    'Dubois', 'Laurent', 'Bernard', 'Moreau', 'Petit', 'Durand', 'Leroy',

    "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Mishra", "Yadav", "Jain",
    "Saxena", "Pandey", "Tiwari", "Dubey", "Agrawal", "Joshi", "Bhatia", "Bansal",
    "Mehta", "Chopra", "Khanna", "Malhotra", "Kapoor", "Bedi", "Sethi", "Ahluwalia",
    "Garg", "Goel", "Kaushik", "Dixit", "Chauhan", "Rajput", "Rathore", "Reddy",
    "Rao", "Naidu", "Nair", "Menon", "Pillai", "Iyer", "Iyengar", "Subramaniam",
    "Venkatesh", "Balakrishnan", "Krishnan", "Patel", "Shah", "Desai", "Joshi",
    "Kulkarni", "Deshmukh", "Patil", "Pawar", "Shinde", "More", "Gaikwad", "Sawant",
    "Chavan", "Bhattacharya", "Banerjee", "Chatterjee", "Mukherjee", "Das", "Ghosh",
    "Bose", "Dutta", "Sarkar", "Roy", "Nandy", "Sen", "Biswas", "Mondal", "Khan",
    "Ali", "Ahmed", "Siddiqui", "Qureshi", "Ansari", "Pathan", "Shaikh", "Mirza",
    "Fernandes", "D'Souza", "Pereira", "Lobo", "Rodrigues", "Pinto", "Gomes"
];

// =============================================================================
// ORGANIZATION ENTITY TRAINING DATA
// =============================================================================

export const ORGANIZATIONS = [
    // Technology Companies
    'Google', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Facebook', 'Netflix',
    'Tesla', 'SpaceX', 'IBM', 'Oracle', 'Intel', 'AMD', 'NVIDIA', 'Cisco',
    'Adobe', 'Salesforce', 'VMware', 'Dell', 'HP', 'Hewlett-Packard', 'Samsung',
    'Sony', 'LG', 'Huawei', 'Alibaba', 'Tencent', 'Baidu', 'ByteDance', 'TikTok',
    'Twitter', 'X Corp', 'LinkedIn', 'Uber', 'Lyft', 'Airbnb', 'Stripe', 'Square',
    'PayPal', 'Zoom', 'Slack', 'Dropbox', 'Box', 'Spotify', 'Pinterest', 'Snap',
    'Reddit', 'Discord', 'Twitch', 'GitHub', 'GitLab', 'Atlassian', 'Shopify',
    'Snowflake', 'Databricks', 'Palantir', 'Splunk', 'ServiceNow', 'Workday',
    'DocuSign', 'Okta', 'CrowdStrike', 'Palo Alto Networks', 'Fortinet',
    'Qualcomm', 'Broadcom', 'Texas Instruments', 'Micron', 'Applied Materials',
    'SAP', 'Accenture', 'Infosys', 'Wipro', 'TCS', 'Cognizant', 'Capgemini',
    
    // Financial Institutions
    'JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'Citigroup',
    'Goldman Sachs', 'Morgan Stanley', 'HSBC', 'Barclays', 'Deutsche Bank',
    'Credit Suisse', 'UBS', 'BNP Paribas', 'Santander', 'ING', 'Royal Bank',
    'TD Bank', 'Capital One', 'American Express', 'Visa', 'Mastercard',
    'Discover', 'Charles Schwab', 'Fidelity', 'Vanguard', 'BlackRock',
    'State Street', 'Berkshire Hathaway', 'AIG', 'MetLife', 'Prudential',
    'Allstate', 'Progressive', 'Travelers', 'Liberty Mutual', 'Nationwide',
    
    // Universities and Educational Institutions
    'Harvard University', 'Stanford University', 'MIT', 'Massachusetts Institute of Technology',
    'Yale University', 'Princeton University', 'Columbia University',
    'University of Chicago', 'Duke University', 'Northwestern University',
    'Caltech', 'California Institute of Technology', 'Johns Hopkins University',
    'University of Pennsylvania', 'Cornell University', 'Brown University',
    'Dartmouth College', 'UCLA', 'UC Berkeley', 'University of California',
    'University of Michigan', 'University of Texas', 'Georgia Tech',
    'Carnegie Mellon University', 'NYU', 'New York University',
    'University of Washington', 'University of Illinois', 'Penn State',
    'Ohio State University', 'University of Florida', 'University of Virginia',
    'Oxford University', 'Cambridge University', 'Imperial College London',
    'London School of Economics', 'LSE', 'ETH Zurich', 'EPFL',
    'University of Toronto', 'McGill University', 'University of Tokyo',
    'Tsinghua University', 'Peking University', 'National University of Singapore',
    
    // Government and International Organizations
    'United Nations', 'UN', 'World Health Organization', 'WHO', 'NATO',
    'European Union', 'EU', 'World Bank', 'IMF', 'International Monetary Fund',
    'WTO', 'World Trade Organization', 'UNESCO', 'UNICEF', 'Red Cross',
    'FBI', 'Federal Bureau of Investigation', 'CIA', 'Central Intelligence Agency',
    'NSA', 'National Security Agency', 'IRS', 'Internal Revenue Service',
    'FDA', 'Food and Drug Administration', 'EPA', 'Environmental Protection Agency',
    'SEC', 'Securities and Exchange Commission', 'FTC', 'Federal Trade Commission',
    'Federal Reserve', 'Supreme Court', 'Congress', 'Senate', 'House of Representatives',
    'White House', 'Pentagon', 'State Department', 'Department of Justice', 'DOJ',
    'Department of Defense', 'DOD', 'Department of Education', 'Department of Energy',
    'NASA', 'NOAA', 'CDC', 'Centers for Disease Control', 'NIH', 'National Institutes of Health',
    
    // Healthcare and Pharmaceutical
    'Pfizer', 'Moderna', 'Johnson & Johnson', 'Merck', 'AstraZeneca',
    'GlaxoSmithKline', 'GSK', 'Novartis', 'Roche', 'Sanofi', 'AbbVie',
    'Bristol-Myers Squibb', 'Eli Lilly', 'Amgen', 'Gilead', 'Biogen',
    'Regeneron', 'Vertex', 'Illumina', 'Thermo Fisher', 'Danaher',
    'UnitedHealth', 'Anthem', 'Cigna', 'Humana', 'Aetna', 'Kaiser Permanente',
    'Cleveland Clinic', 'Mayo Clinic', 'Johns Hopkins Hospital', 'Mass General',
    
    // Retail and Consumer
    'Walmart', 'Target', 'Costco', 'Home Depot', 'Lowes', 'Best Buy',
    'CVS', 'Walgreens', 'Rite Aid', 'Kroger', 'Safeway', 'Albertsons',
    'Whole Foods', 'Trader Joe\'s', 'Aldi', 'Publix', 'Wegmans',
    'Starbucks', 'McDonald\'s', 'Subway', 'Chipotle', 'Dunkin',
    'Coca-Cola', 'PepsiCo', 'Nestlé', 'Unilever', 'Procter & Gamble', 'P&G',
    'Nike', 'Adidas', 'Under Armour', 'Lululemon', 'Gap', 'H&M', 'Zara',
    'LVMH', 'Gucci', 'Prada', 'Louis Vuitton', 'Chanel', 'Hermès',
    
    // Energy and Industrial
    'ExxonMobil', 'Chevron', 'Shell', 'BP', 'ConocoPhillips', 'TotalEnergies',
    'Saudi Aramco', 'Gazprom', 'Rosneft', 'Petrobras', 'PetroChina',
    'General Electric', 'GE', 'Siemens', 'Honeywell', '3M', 'Caterpillar',
    'John Deere', 'Deere & Company', 'Parker Hannifin', 'Emerson Electric',
    
    // Aerospace and Defense
    'Boeing', 'Airbus', 'Lockheed Martin', 'Raytheon', 'Northrop Grumman',
    'General Dynamics', 'BAE Systems', 'L3Harris', 'Leidos', 'SAIC',
    
    // Automotive
    'Ford', 'General Motors', 'GM', 'Chrysler', 'Stellantis', 'Toyota',
    'Honda', 'Nissan', 'Hyundai', 'Kia', 'BMW', 'Mercedes-Benz', 'Daimler',
    'Volkswagen', 'VW', 'Audi', 'Porsche', 'Ferrari', 'Lamborghini',
    'Rivian', 'Lucid', 'NIO', 'BYD', 'Geely', 'Volvo',
    
    // Media and Entertainment
    'Disney', 'Warner Bros', 'Universal', 'Paramount', 'Sony Pictures',
    'NBCUniversal', 'Comcast', 'AT&T', 'Verizon', 'T-Mobile',
    'Fox', 'CBS', 'ABC', 'NBC', 'CNN', 'BBC', 'Reuters', 'Associated Press',
    'New York Times', 'Washington Post', 'Wall Street Journal', 'Bloomberg',
    
    // Organization suffixes (help identify organizations)
    'Inc.', 'Inc', 'LLC', 'Ltd.', 'Ltd', 'Corp.', 'Corp', 'Corporation',
    'Company', 'Co.', 'Co', 'Group', 'Holdings', 'Partners', 'Associates',
    'Enterprises', 'Industries', 'International', 'Global', 'Worldwide',
    'Foundation', 'Institute', 'Association', 'Society', 'Council',
    'Board', 'Commission', 'Authority', 'Agency', 'Department', 'Ministry',
];

// =============================================================================
// JOB ROLES AND TITLES TRAINING DATA
// =============================================================================

export const JOB_ROLES = [
    // C-Level Executives
    'CEO', 'CFO', 'CTO', 'COO', 'CIO', 'CMO', 'CHRO', 'CLO', 'CSO', 'CPO',
    'Chief Executive Officer', 'Chief Financial Officer', 'Chief Technology Officer',
    'Chief Operating Officer', 'Chief Information Officer', 'Chief Marketing Officer',
    'Chief Human Resources Officer', 'Chief Legal Officer', 'Chief Security Officer',
    'Chief Product Officer', 'Chief Revenue Officer', 'Chief Data Officer',
    'Chief Digital Officer', 'Chief Strategy Officer', 'Chief Creative Officer',
    'Chief Compliance Officer', 'Chief Risk Officer', 'Chief Innovation Officer',
    
    // Executive and Senior Leadership
    'President', 'Vice President', 'VP', 'SVP', 'Senior Vice President',
    'EVP', 'Executive Vice President', 'AVP', 'Assistant Vice President',
    'Managing Director', 'MD', 'Executive Director', 'Director',
    'Partner', 'Senior Partner', 'Managing Partner', 'Principal',
    'Chairman', 'Chairwoman', 'Chairperson', 'Chair',
    'Board Member', 'Board Director', 'Trustee', 'Governor',
    'Founder', 'Co-Founder', 'Owner', 'Proprietor',
    
    // Management
    'Manager', 'Senior Manager', 'General Manager', 'Assistant Manager',
    'Project Manager', 'Product Manager', 'Program Manager', 'Portfolio Manager',
    'Operations Manager', 'Account Manager', 'Sales Manager', 'Regional Manager',
    'Marketing Manager', 'HR Manager', 'Human Resources Manager',
    'Finance Manager', 'Accounting Manager', 'Branch Manager', 'Store Manager',
    'Shift Manager', 'Office Manager', 'Facility Manager', 'Plant Manager',
    'Team Lead', 'Team Leader', 'Tech Lead', 'Engineering Lead',
    'Supervisor', 'Coordinator', 'Administrator', 'Head of', 'Lead',
    
    // Technology and Engineering
    'Engineer', 'Software Engineer', 'Senior Software Engineer', 'Staff Engineer',
    'Principal Engineer', 'Distinguished Engineer', 'Fellow',
    'Architect', 'Software Architect', 'Solutions Architect', 'Enterprise Architect',
    'Technical Architect', 'Cloud Architect', 'Security Architect', 'Data Architect',
    'Developer', 'Software Developer', 'Full Stack Developer', 'Frontend Developer',
    'Backend Developer', 'Mobile Developer', 'iOS Developer', 'Android Developer',
    'Web Developer', 'Application Developer', 'Game Developer',
    'DevOps Engineer', 'SRE', 'Site Reliability Engineer', 'Platform Engineer',
    'Infrastructure Engineer', 'Cloud Engineer', 'Systems Engineer',
    'Data Engineer', 'Data Scientist', 'Machine Learning Engineer', 'ML Engineer',
    'AI Engineer', 'AI Researcher', 'Research Scientist', 'Research Engineer',
    'Programmer', 'Coder', 'Hacker', 'Technologist',
    'QA Engineer', 'Quality Assurance Engineer', 'Test Engineer', 'SDET',
    'Software Development Engineer in Test', 'Automation Engineer',
    'Security Engineer', 'Cybersecurity Engineer', 'Information Security Analyst',
    'Network Engineer', 'Network Administrator', 'Systems Administrator',
    'Database Administrator', 'DBA', 'Database Engineer',
    'IT Specialist', 'IT Manager', 'IT Director', 'Technical Support',
    'Help Desk', 'Support Engineer', 'Support Specialist', 'Technician',
    
    // Data and Analytics
    'Analyst', 'Business Analyst', 'Data Analyst', 'Systems Analyst',
    'Financial Analyst', 'Investment Analyst', 'Risk Analyst', 'Credit Analyst',
    'Marketing Analyst', 'Operations Analyst', 'Product Analyst',
    'Quantitative Analyst', 'Quant', 'Research Analyst', 'Intelligence Analyst',
    'Statistician', 'Actuary', 'Economist', 'Data Modeler',
    
    // Design and Creative
    'Designer', 'UI Designer', 'UX Designer', 'UI/UX Designer', 'Product Designer',
    'Graphic Designer', 'Visual Designer', 'Motion Designer', 'Brand Designer',
    'Web Designer', 'Interaction Designer', 'Experience Designer',
    'Art Director', 'Creative Director', 'Design Director', 'Design Lead',
    'Illustrator', 'Animator', 'Video Editor', 'Photographer', 'Videographer',
    'Copywriter', 'Content Writer', 'Technical Writer', 'Editor',
    'Content Creator', 'Social Media Manager', 'Community Manager',
    
    // Sales and Marketing
    'Sales Representative', 'Sales Rep', 'Salesperson', 'Account Executive',
    'Business Development Representative', 'BDR', 'SDR', 'Sales Development Representative',
    'Sales Director', 'Sales Manager', 'Regional Sales Manager',
    'Marketing Specialist', 'Marketing Coordinator', 'Brand Manager',
    'Digital Marketing Manager', 'SEO Specialist', 'SEM Specialist',
    'Growth Manager', 'Growth Hacker', 'Demand Generation Manager',
    'Public Relations', 'PR Manager', 'Communications Manager',
    
    // Legal
    'Attorney', 'Lawyer', 'Counsel', 'General Counsel', 'Legal Counsel',
    'Associate', 'Partner', 'Of Counsel', 'Paralegal', 'Legal Assistant',
    'Judge', 'Justice', 'Magistrate', 'Clerk', 'Legal Secretary',
    'Compliance Officer', 'Compliance Manager', 'Regulatory Affairs',
    
    // Healthcare
    'Doctor', 'Physician', 'Surgeon', 'Specialist', 'Consultant',
    'Nurse', 'Registered Nurse', 'RN', 'LPN', 'Licensed Practical Nurse',
    'Nurse Practitioner', 'NP', 'Physician Assistant', 'PA',
    'Pharmacist', 'Pharmacy Technician', 'Dentist', 'Orthodontist',
    'Therapist', 'Physical Therapist', 'Occupational Therapist',
    'Psychologist', 'Psychiatrist', 'Counselor', 'Social Worker',
    'Radiologist', 'Anesthesiologist', 'Cardiologist', 'Neurologist',
    'Oncologist', 'Pediatrician', 'Dermatologist', 'Ophthalmologist',
    
    // Finance and Accounting
    'Accountant', 'CPA', 'Certified Public Accountant', 'Auditor',
    'Controller', 'Comptroller', 'Treasurer', 'Tax Specialist',
    'Bookkeeper', 'Accounts Payable', 'Accounts Receivable',
    'Financial Advisor', 'Financial Planner', 'Wealth Manager',
    'Investment Banker', 'Portfolio Manager', 'Fund Manager',
    'Trader', 'Broker', 'Underwriter', 'Claims Adjuster',
    
    // Human Resources
    'HR Specialist', 'HR Coordinator', 'HR Business Partner', 'HRBP',
    'Recruiter', 'Talent Acquisition', 'Headhunter', 'Staffing Specialist',
    'Benefits Administrator', 'Compensation Analyst', 'Payroll Specialist',
    'Training Specialist', 'Learning and Development', 'L&D Manager',
    
    // Academic and Research
    'Professor', 'Associate Professor', 'Assistant Professor', 'Adjunct Professor',
    'Lecturer', 'Instructor', 'Teacher', 'Educator', 'Tutor',
    'Dean', 'Provost', 'Chancellor', 'President', 'Principal', 'Headmaster',
    'Superintendent', 'Researcher', 'Postdoc', 'Postdoctoral Fellow',
    'PhD Candidate', 'Graduate Student', 'Research Assistant', 'Teaching Assistant',
    'Librarian', 'Archivist', 'Curator',
    
    // Operations and Support
    'Assistant', 'Executive Assistant', 'Administrative Assistant', 'Personal Assistant',
    'Secretary', 'Receptionist', 'Office Administrator', 'Office Coordinator',
    'Clerk', 'Filing Clerk', 'Data Entry Clerk', 'Mail Clerk',
    'Customer Service Representative', 'Customer Success Manager',
    'Call Center Agent', 'Support Agent', 'Client Services',
    
    // Other Common Roles
    'Consultant', 'Advisor', 'Specialist', 'Expert', 'Professional',
    'Officer', 'Agent', 'Representative', 'Associate',
    'Senior', 'Junior', 'Entry Level', 'Mid Level',
    'Intern', 'Trainee', 'Apprentice', 'Fellow',
    'Contractor', 'Freelancer', 'Consultant', 'Volunteer',
    'Temp', 'Temporary', 'Part-time', 'Full-time',
];

// Alias export for convenience
export const ROLES = JOB_ROLES;

// =============================================================================
// LOCATION TRAINING DATA
// =============================================================================

export const LOCATIONS = [
    // Countries
    'United States', 'USA', 'U.S.A.', 'US', 'U.S.', 'America', 'United States of America',
    'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Venezuela',
    'United Kingdom', 'UK', 'U.K.', 'Great Britain', 'Britain', 'England', 'Scotland', 'Wales', 'Northern Ireland',
    'Ireland', 'France', 'Germany', 'Italy', 'Spain', 'Portugal', 'Netherlands', 'Holland',
    'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland',
    'Poland', 'Czech Republic', 'Czechia', 'Hungary', 'Romania', 'Bulgaria', 'Greece',
    'Russia', 'Ukraine', 'Belarus', 'Kazakhstan', 'Georgia', 'Armenia', 'Azerbaijan',
    'China', 'Japan', 'South Korea', 'Korea', 'North Korea', 'Taiwan', 'Mongolia',
    'India', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Bhutan', 'Myanmar',
    'Thailand', 'Vietnam', 'Cambodia', 'Laos', 'Malaysia', 'Singapore', 'Indonesia',
    'Philippines', 'Brunei', 'East Timor', 'Australia', 'New Zealand', 'Fiji', 'Papua New Guinea',
    'Saudi Arabia', 'UAE', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
    'Israel', 'Palestine', 'Jordan', 'Lebanon', 'Syria', 'Iraq', 'Iran', 'Turkey',
    'Egypt', 'Libya', 'Tunisia', 'Algeria', 'Morocco', 'Sudan', 'South Sudan',
    'Ethiopia', 'Kenya', 'Tanzania', 'Uganda', 'Rwanda', 'Nigeria', 'Ghana', 'Senegal',
    'South Africa', 'Zimbabwe', 'Zambia', 'Botswana', 'Namibia', 'Angola', 'Mozambique',
    
    // US States
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
    'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia',
    'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
    'District of Columbia', 'D.C.', 'Puerto Rico', 'Guam', 'Virgin Islands',
    
    // US State Abbreviations
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID',
    'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS',
    'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
    'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    
    // Major US Cities
    'New York City', 'New York', 'NYC', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island',
    'Los Angeles', 'LA', 'Hollywood', 'Beverly Hills', 'Santa Monica', 'Pasadena',
    'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego',
    'Dallas', 'Fort Worth', 'San Jose', 'Austin', 'Jacksonville', 'Columbus',
    'Charlotte', 'San Francisco', 'SF', 'Indianapolis', 'Seattle', 'Denver',
    'Washington D.C.', 'Washington DC', 'DC', 'Boston', 'Nashville', 'Detroit',
    'Portland', 'Las Vegas', 'Vegas', 'Memphis', 'Louisville', 'Baltimore',
    'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Sacramento', 'Atlanta',
    'Miami', 'Orlando', 'Tampa', 'Pittsburgh', 'Cincinnati', 'Cleveland',
    'Minneapolis', 'St. Paul', 'New Orleans', 'Salt Lake City', 'Kansas City',
    'St. Louis', 'Honolulu', 'Anchorage', 'Oakland', 'Raleigh', 'Virginia Beach',
    

    // Indian States 
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
    "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
    "Chandigarh", "Dadra and Nagar Haveli", "Daman and Diu", "Delhi", "Ladakh",
    "Lakshadweep", "Jammu and Kashmir", "Puducherry",

    // Major Indian Cities
    "Mumbai", "Delhi", "Bangalore", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai",
    "Kolkata", "Surat", "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore",
    "Thane", "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad", "Patna", "Vadodara",
    "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot",
    "Kalyan-Dombivli", "Vasai-Virar", "Varanasi", "Srinagar", "Aurangabad", "Dhanbad",
    "Amritsar", "Navi Mumbai", "Allahabad", "Prayagraj", "Ranchi", "Howrah",
    "Coimbatore", "Jabalpur", "Gwalior", "Vijayawada", "Jodhpur", "Madurai",
    "Raipur", "Kota", "Guwahati", "Chandigarh", "Solapur", "Hubballi-Dharwad",
    "Mysore", "Mysuru", "Tiruchirappalli", "Bareilly", "Aligarh", "Tiruppur",
    "Gurgaon", "Gurugram", "Moradabad", "Jalandhar", "Bhubaneswar", "Salem",
    "Warangal", "Mira-Bhayandar", "Jalgaon", "Guntur", "Thiruvananthapuram",
    "Bhiwandi", "Saharanpur", "Gorakhpur", "Bikaner", "Amravati", "Noida",
    "Jamshedpur", "Bhilai", "Cuttack", "Firozabad", "Kochi", "Nellore", "Bhavnagar",
    "Dehradun", "Durgapur", "Asansol", "Rourkela", "Nanded", "Kolhapur", "Ajmer",
    "Akola", "Gulbarga", "Jamnagar", "Ujjain", "Loni", "Siliguri", "Jhansi",
    "Ulhasnagar", "Jammu", "Sangli-Miraj & Kupwad", "Mangalore", "Mangaluru",
    "Erode", "Belgaum", "Belagavi", "Ambattur", "Tirunelveli", "Malegaon", "Gaya",
    "Udaipur", "Kakinada", "Davanagere", "Kozhikode", "Maheshtala", "Rajpur Sonarpur",
    "Rajahmundry", "Bokaro", "South Dumdum", "Bellary", "Patiala", "Gopalpur",
    "Agartala", "Bhagalpur", "Muzaffarnagar", "Bhatpara", "Panihati", "Latur",
    "Dhule", "Tirupati", "Rohtak", "Sagar", "Korba", "Bhilwara", "Berhampur",
    "Muzaffarpur", "Ahmednagar", "Mathura", "Kollam", "Avadi", "Kadapa", "Kamarhati",
    "Sambalpur", "Bilaspur", "Shahjahanpur", "Satara", "Bijapur", "Rampur",
    "Shivamogga", "Chandrapur", "Junagadh", "Thrissur", "Alwar", "Bardhaman",
    "Kulti", "Nizamabad", "Parbhani", "Tumkur", "Khammam", "Ozhukarai", "Bihar Sharif",
    "Panipat", "Darbhanga", "Bally", "Aizawl", "Dewas", "Ichalkaranji", "Karnal",
    "Bathinda", "Jalna", "Eluru", "Barasat", "Kirari Suleman Nagar", "Purnia",
    "Satna", "Mau", "Sonipat", "Farrukhabad", "Durg", "Imphal", "Ratlam", "Hapur",
    "Arrah", "Karimnagar", "Anantapur", "Etawah", "Ambernath", "North Dumdum",
    "Bharatpur", "Begusarai", "New Delhi", "Gandhidham", "Baranagar", "Tiruvottiyur",
    "Pondicherry", "Sikar", "Thoothukudi", "Rewa", "Mirzapur", "Raichur", "Pali",
    "Ramagundam", "Silchar", "Haridwar", "Vijayanagaram", "Tenali", "Nagercoil",
    "Sri Ganganagar", "Karawal Nagar", "Mango", "Thanjavur", "Bulandshahr",
    "Uluberia", "Katni", "Sambhal", "Singrauli", "Nadiad", "Secunderabad", "Naihati",
    "Yamunanagar", "Bidhannagar", "Pallavaram", "Bidar", "Munger", "Panchkula",
    "Burhanpur", "Raurkela Industrial Township", "Kharagpur", "Dindigul", "Gandhinagar",
    "Hospet", "Nangloi Jat", "Malda", "Ongole", "Deoghar", "Chapra", "Haldia",
    "Khandwa", "Nandyal", "Morena", "Amroha", "Anand", "Bhiwani", "Bhind", "Bhalswa Jahangir Pur",
    "Madhyamgram", "Bhiwadi", "Raebareli", "Bahraich", "Chittoor", "Jaunpur",

    // Major International Cities
    'London', 'Paris', 'Berlin', 'Rome', 'Madrid', 'Barcelona', 'Amsterdam',
    'Brussels', 'Vienna', 'Munich', 'Frankfurt', 'Hamburg', 'Zurich', 'Geneva',
    'Milan', 'Venice', 'Florence', 'Naples', 'Athens', 'Istanbul', 'Moscow',
    'St. Petersburg', 'Kiev', 'Kyiv', 'Warsaw', 'Prague', 'Budapest', 'Bucharest',
    'Stockholm', 'Oslo', 'Copenhagen', 'Helsinki', 'Dublin', 'Edinburgh', 'Manchester',
    'Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Beijing', 'Shanghai', 'Shenzhen',
    'Guangzhou', 'Hong Kong', 'Macau', 'Taipei', 'Singapore', 'Seoul', 'Busan',
    'Bangkok', 'Ho Chi Minh City', 'Saigon', 'Hanoi', 'Jakarta', 'Manila', 'Kuala Lumpur',
    'Mumbai', 'Bombay', 'Delhi', 'New Delhi', 'Bangalore', 'Bengaluru', 'Chennai', 'Kolkata',
    'Hyderabad', 'Ahmedabad', 'Pune', 'Karachi', 'Lahore', 'Islamabad', 'Dhaka',
    'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Auckland', 'Wellington',
    'Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton',
    'Mexico City', 'Guadalajara', 'Monterrey', 'São Paulo', 'Rio de Janeiro',
    'Buenos Aires', 'Lima', 'Bogotá', 'Santiago', 'Caracas', 'Havana',
    'Dubai', 'Abu Dhabi', 'Doha', 'Riyadh', 'Jeddah', 'Tel Aviv', 'Jerusalem',
    'Cairo', 'Alexandria', 'Casablanca', 'Lagos', 'Nairobi', 'Johannesburg', 'Cape Town',
    
    // Address Components
    'Street', 'St.', 'St', 'Avenue', 'Ave.', 'Ave', 'Boulevard', 'Blvd.', 'Blvd',
    'Road', 'Rd.', 'Rd', 'Drive', 'Dr.', 'Dr', 'Lane', 'Ln.', 'Ln',
    'Court', 'Ct.', 'Ct', 'Place', 'Pl.', 'Pl', 'Way', 'Terrace', 'Ter.',
    'Highway', 'Hwy.', 'Hwy', 'Parkway', 'Pkwy.', 'Pkwy', 'Expressway', 'Expy.',
    'Circle', 'Cir.', 'Square', 'Sq.', 'Plaza', 'Plz.',
    'North', 'South', 'East', 'West', 'N.', 'S.', 'E.', 'W.',
    'Northeast', 'Northwest', 'Southeast', 'Southwest', 'NE', 'NW', 'SE', 'SW',
    'Building', 'Bldg.', 'Bldg', 'Suite', 'Ste.', 'Ste', 'Floor', 'Fl.', 'Fl',
    'Room', 'Rm.', 'Rm', 'Unit', 'Apt.', 'Apt', 'Apartment', '#',
    'Office', 'Ofc.', 'Tower', 'Center', 'Centre', 'Complex', 'Park',
    'P.O. Box', 'PO Box', 'Post Office Box', 'Mailbox',
];

// =============================================================================
// GENDER PRONOUNS TRAINING DATA
// =============================================================================

export const GENDER_PRONOUNS = [
    // Subject Pronouns
    'he', 'she', 'they', 'He', 'She', 'They',
    
    // Object Pronouns
    'him', 'her', 'them', 'Him', 'Her', 'Them',
    
    // Possessive Adjectives
    'his', 'her', 'their', 'His', 'Her', 'Their',
    
    // Possessive Pronouns
    'his', 'hers', 'theirs', 'His', 'Hers', 'Theirs',
    
    // Reflexive Pronouns
    'himself', 'herself', 'themselves', 'themself',
    'Himself', 'Herself', 'Themselves', 'Themself',
    
    // Neo-pronouns (for inclusivity)
    'ze', 'zir', 'zirs', 'zirself',
    'xe', 'xem', 'xyr', 'xyrs', 'xemself',
    'ey', 'em', 'eir', 'eirs', 'emself',
    've', 'ver', 'vis', 'verself',
    'per', 'pers', 'perself',
    'fae', 'faer', 'faers', 'faerself',
];

// =============================================================================
// DATE-RELATED TRAINING DATA
// =============================================================================

export const MONTHS = [
    // Full month names
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
    
    // Abbreviated month names
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec',
    'Jan.', 'Feb.', 'Mar.', 'Apr.', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Sept.', 'Oct.', 'Nov.', 'Dec.',
];

export const DAYS_OF_WEEK = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    'Mon', 'Tue', 'Tues', 'Wed', 'Thu', 'Thur', 'Thurs', 'Fri', 'Sat', 'Sun',
    'Mon.', 'Tue.', 'Wed.', 'Thu.', 'Fri.', 'Sat.', 'Sun.',
];

export const DATE_WORDS = [
    'today', 'tomorrow', 'yesterday', 'Tonight', 'morning', 'afternoon', 'evening',
    'day', 'week', 'month', 'year', 'decade', 'century',
    'daily', 'weekly', 'monthly', 'yearly', 'annually', 'quarterly', 'biweekly',
    'current', 'previous', 'next', 'last', 'this', 'upcoming', 'past', 'future',
    'beginning', 'end', 'start', 'finish', 'deadline', 'due date', 'expiration',
    'fiscal year', 'calendar year', 'academic year', 'quarter', 'semester',
    'Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2', 'FY', 'CY',
];

// =============================================================================
// HR/LEGAL DOCUMENT SPECIFIC TRAINING DATA
// =============================================================================

/**
 * HR Document Keywords - helps identify context for offer letters, employment contracts
 */
export const HR_DOCUMENT_KEYWORDS = [
    // Offer Letter Keywords
    'offer letter', 'job offer', 'employment offer', 'position of', 'role of',
    'we are pleased to offer', 'pleased to extend', 'pleased to confirm',
    'accept this offer', 'offer of employment', 'contingent upon',
    'start date', 'joining date', 'commencement date', 'effective date',
    'reporting to', 'reports to', 'report directly',
    
    // Salary & Compensation
    'annual salary', 'base salary', 'gross salary', 'net salary', 'monthly salary',
    'compensation package', 'total compensation', 'remuneration',
    'per annum', 'per month', 'per year', 'p.a.', 'CTC', 'cost to company',
    'signing bonus', 'joining bonus', 'performance bonus', 'annual bonus',
    'variable pay', 'incentive', 'commission', 'stock options', 'equity',
    'RSU', 'restricted stock units', 'ESOP', 'employee stock',
    
    // Benefits
    'health insurance', 'medical insurance', 'dental insurance', 'vision insurance',
    'life insurance', 'disability insurance', 'retirement plan', '401k', '401(k)',
    'pension', 'provident fund', 'PF', 'gratuity', 'leave encashment',
    'paid time off', 'PTO', 'vacation days', 'sick leave', 'personal leave',
    'maternity leave', 'paternity leave', 'parental leave', 'bereavement leave',
    'work from home', 'WFH', 'remote work', 'hybrid work', 'flexible hours',
    'relocation assistance', 'relocation bonus', 'housing allowance',
    'travel allowance', 'transport allowance', 'meal allowance', 'phone allowance',
    
    // Employment Terms
    'probation period', 'probationary period', 'notice period', 'termination',
    'at-will employment', 'employment at will', 'full-time', 'part-time',
    'permanent position', 'temporary position', 'contract position',
    'non-compete', 'non-disclosure', 'confidentiality', 'intellectual property',
    'background check', 'reference check', 'drug test', 'verification',
];

/**
 * Legal Document Keywords - for NDAs, service agreements, contracts
 */
export const LEGAL_DOCUMENT_KEYWORDS = [
    // NDA Keywords
    'non-disclosure agreement', 'NDA', 'confidentiality agreement',
    'confidential information', 'proprietary information', 'trade secrets',
    'disclosing party', 'receiving party', 'parties agree',
    'shall not disclose', 'agree to keep confidential', 'maintain confidentiality',
    
    // Contract Keywords
    'hereby agrees', 'hereinafter referred', 'herein', 'whereas', 'therefore',
    'terms and conditions', 'subject to', 'in accordance with', 'pursuant to',
    'governed by', 'jurisdiction', 'arbitration', 'dispute resolution',
    'indemnify', 'indemnification', 'liability', 'limitation of liability',
    'warranty', 'warranties', 'representations', 'force majeure',
    'termination clause', 'breach', 'remedy', 'remedies', 'damages',
    'binding agreement', 'legally binding', 'executed', 'duly authorized',
    
    // Service Agreement Keywords
    'scope of services', 'scope of work', 'deliverables', 'milestones',
    'service level agreement', 'SLA', 'statement of work', 'SOW',
    'consulting agreement', 'consulting services', 'professional services',
    'independent contractor', 'subcontractor', 'vendor', 'supplier',
    'payment terms', 'invoice', 'net 30', 'net 60', 'upon completion',
    'retainer', 'hourly rate', 'fixed fee', 'project fee',
    
    // Signature/Execution
    'signature', 'signed by', 'executed by', 'authorized signatory',
    'witness', 'witnessed by', 'notarized', 'notary public',
    'in witness whereof', 'by signing below', 'date of execution',
];

/**
 * Duration/Period patterns for employment terms
 */
export const DURATION_TERMS = [
    // Probation periods
    '3 months', '6 months', '90 days', '30 days', '60 days', '180 days',
    'three months', 'six months', 'ninety days', 'thirty days',
    
    // Notice periods  
    '1 month', '2 months', '2 weeks', '4 weeks', '1 week',
    'one month', 'two months', 'two weeks', 'four weeks', 'one week',
    
    // Contract durations
    '1 year', '2 years', '3 years', '5 years', '12 months', '24 months',
    'one year', 'two years', 'three years', 'five years',
    'annual', 'biannual', 'multi-year',
    
    // Time references
    'immediately', 'upon signing', 'upon execution', 'forthwith',
    'within', 'no later than', 'not exceeding', 'minimum of', 'maximum of',
];

/**
 * Benefits and compensation terms
 */
export const BENEFIT_TERMS = [
    'health insurance', 'medical coverage', 'dental plan', 'vision plan',
    'life insurance', '401k match', 'retirement benefits', 'pension plan',
    'stock options', 'equity grant', 'RSU', 'ESOP', 'profit sharing',
    'paid vacation', 'PTO', 'sick days', 'personal days', 'holidays',
    'maternity leave', 'paternity leave', 'family leave', 'FMLA',
    'tuition reimbursement', 'education assistance', 'training budget',
    'gym membership', 'wellness program', 'mental health support',
    'commuter benefits', 'parking', 'transit pass', 'company car',
    'meal stipend', 'phone allowance', 'internet allowance', 'home office stipend',
    'relocation package', 'signing bonus', 'annual bonus', 'performance bonus',
];

// =============================================================================
// REGEX PATTERNS FOR STRUCTURED DATA
// =============================================================================

/**
 * Regex patterns organized by entity type for the NLP service.
 * Each category contains an array of patterns to match against text.
 */
export const REGEX_PATTERNS = {
    // Date patterns - match various date formats
    DATE: [
        /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi,           // MM/DD/YYYY or M/D/YY
        /\b\d{1,2}-\d{1,2}-\d{2,4}\b/gi,             // MM-DD-YYYY
        /\b\d{4}-\d{1,2}-\d{1,2}\b/gi,               // YYYY-MM-DD (ISO format)
        /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/gi,           // DD.MM.YYYY (European)
        /\b\d{4}\/\d{1,2}\/\d{1,2}\b/gi,             // YYYY/MM/DD
    ],
    
    // Money patterns - match currency amounts
    MONEY: [
        /\$\s?[\d,]+(?:\.\d{2})?\b/gi,               // $1,234.56
        /USD\s?[\d,]+(?:\.\d{2})?\b/gi,              // USD 1234.56
        /€\s?[\d,]+(?:\.\d{2})?\b/gi,                // €1234.56
        /EUR\s?[\d,]+(?:\.\d{2})?\b/gi,              // EUR 1234.56
        /£\s?[\d,]+(?:\.\d{2})?\b/gi,                // £1234.56
        /GBP\s?[\d,]+(?:\.\d{2})?\b/gi,              // GBP 1234.56
        /¥\s?[\d,]+\b/gi,                            // ¥1234 (no decimals typically)
        /JPY\s?[\d,]+\b/gi,                          // JPY 1234
        /[\d,]+(?:\.\d{2})?\s*(dollars?|cents?|euros?|pounds?|yen)\b/gi,
    ],
    
    // Identifier patterns - match IDs, account numbers, SSNs, etc.
    IDENTIFIER: [
        /\b\d{3}-\d{2}-\d{4}\b/gi,                    // Social Security Number
        /\b\d{2}-\d{7}\b/gi,                          // Employer Identification Number
        /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/gi, // Credit card pattern
        /\b(Account|Acct|ID|Invoice|Order|Policy|Case|Ref|Reference|Ticket|Claim|No\.?|Number|#)[:.\s]*[A-Z0-9-]{4,20}\b/gi,
        /\b[A-Z]{2,4}[-#]?\d{4,12}\b/gi,             // ID codes like ABC-123456
        /\b[A-Z]{1,3}\d{6,10}\b/gi,                  // Passport-like patterns
    ],
    
    // Email patterns
    EMAIL: [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
    ],
    
    // Phone patterns - match various phone number formats
    PHONE: [
        /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/gi,           // US format
        /\b\+1[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/gi, // US with +1
        /\b\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{4,10}\b/gi,        // International
    ],
};

// =============================================================================
// TRAINING DATA EXPORT OBJECT
// =============================================================================

export const NLP_TRAINING_DATA = {
    person: {
        firstNames: FIRST_NAMES,
        lastNames: LAST_NAMES,
    },
    organization: ORGANIZATIONS,
    role: JOB_ROLES,
    location: LOCATIONS,
    genderPronoun: GENDER_PRONOUNS,
    date: {
        months: MONTHS,
        daysOfWeek: DAYS_OF_WEEK,
        dateWords: DATE_WORDS,
    },
    
    // HR/Legal document specific
    hrKeywords: HR_DOCUMENT_KEYWORDS,
    legalKeywords: LEGAL_DOCUMENT_KEYWORDS,
    durationTerms: DURATION_TERMS,
    benefitTerms: BENEFIT_TERMS,
    
    // Regex patterns
    patterns: REGEX_PATTERNS,
};

export default NLP_TRAINING_DATA;
