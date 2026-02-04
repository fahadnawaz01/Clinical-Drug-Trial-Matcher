# Requirements Document

## Introduction

Trial-Scout is a specialized LLM-based chat application designed to address the "Missing Indian" problem in global medicine, where Indians represent 18% of the world population but less than 2% of clinical trial participants. The system uses a multi-agent AI architecture to help Indian patients find life-saving clinical trials by parsing medical records and matching them against global trial databases.

## Glossary

- **Trial_Scout_System**: The complete multi-agent AI application for clinical trial matching
- **Scribe_Agent**: The ingestion agent responsible for intake and digitization
- **Doctor_Agent**: The supervisor agent responsible for safety validation
- **Scout_Agent**: The researcher agent responsible for trial discovery and matching
- **Patient_Profile**: Standardized JSON representation of patient medical information
- **Trial_Match**: A clinical trial that meets patient criteria with safety validation
- **Dynamic_UI_Action**: Context-triggered interface elements that appear based on conversation flow
- **Vernacular_Interface**: Multi-language support including major Indian languages (Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Punjabi, Odia) plus Hinglish and English
- **Medical_Record**: Any patient document including handwritten notes, PDFs, or digital files
- **Safety_Flag**: Pass/Fail validation result from medical reasoning checks
- **Inclusion_Criteria**: Medical requirements that patients must meet to participate in trials

## Requirements

### Requirement 1: Multi-Language Patient Intake

**User Story:** As an Indian patient, I want to communicate in my preferred language from major Indian languages, so that I can comfortably share my medical information without language barriers.

#### Acceptance Criteria

1. WHEN a user initiates a conversation, THE Scribe_Agent SHALL detect and respond in the user's preferred language from supported options (Hindi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Punjabi, Odia, Hinglish, English)
2. WHEN a user switches languages mid-conversation, THE Scribe_Agent SHALL adapt to the new language seamlessly
3. THE Scribe_Agent SHALL maintain medical terminology accuracy across all supported Indian languages
4. WHEN collecting medical information, THE Scribe_Agent SHALL use culturally appropriate communication patterns for each language

### Requirement 2: Document Processing and Digitization

**User Story:** As a patient with handwritten medical records, I want the system to extract information from my documents, so that I don't have to manually type all my medical details.

#### Acceptance Criteria

1. WHEN a user mentions having a document, THE Trial_Scout_System SHALL trigger a Dynamic_UI_Action button for document upload
2. WHEN a document is uploaded, THE Scribe_Agent SHALL use AWS Textract to extract text content
3. WHEN processing handwritten notes, THE Scribe_Agent SHALL convert extracted text into structured medical information
4. WHEN document processing is complete, THE Scribe_Agent SHALL integrate extracted information into the Patient_Profile
5. THE Scribe_Agent SHALL handle multiple document formats including PDFs, images, and scanned documents

### Requirement 3: Patient Profile Standardization

**User Story:** As a system component, I want patient information in a standardized format, so that downstream agents can process medical data consistently.

#### Acceptance Criteria

1. WHEN collecting patient information, THE Scribe_Agent SHALL create a standardized Patient_Profile in JSON format
2. THE Patient_Profile SHALL include medical conditions, current medications, treatment history, and demographic information
3. WHEN updating patient information, THE Scribe_Agent SHALL maintain data consistency across all profile fields
4. THE Patient_Profile SHALL validate against a defined medical data schema

### Requirement 4: Medical Validation and Information Gathering

**User Story:** As a patient seeking clinical trials, I want medical professionals to validate trial matches and gather additional information when needed, so that I receive accurate recommendations based on complete medical information.

#### Acceptance Criteria

1. WHEN a Trial_Match is identified, THE Doctor_Agent SHALL perform medical reasoning to check contraindications and match accuracy
2. WHEN evaluating trial safety, THE Doctor_Agent SHALL consider current medications, medical conditions, and treatment protocols
3. WHEN additional information is needed for accurate matching, THE Doctor_Agent SHALL check the existing Patient_Profile first
4. WHEN required information is not found in the Patient_Profile, THE Doctor_Agent SHALL request the Scribe_Agent to check its conversation context
5. WHEN information is not available in conversation context, THE Doctor_Agent SHALL direct the Scribe_Agent to ask the patient directly
6. WHEN contraindications are detected, THE Doctor_Agent SHALL provide a Safety_Flag of "Fail" with detailed reasoning
7. WHEN no contraindications exist and matching is accurate, THE Doctor_Agent SHALL provide a Safety_Flag of "Pass"
8. THE Doctor_Agent SHALL simulate human medical professional decision-making processes for both safety and information completeness

### Requirement 5: Clinical Trial Discovery and Matching

**User Story:** As a patient with a specific medical condition, I want to find the most medically effective clinical trials that I qualify for, so that I can access potentially life-saving treatments.

#### Acceptance Criteria

1. WHEN searching for trials, THE Scout_Agent SHALL query both AWS OpenSearch internal database and external clinical trial APIs
2. WHEN evaluating trials, THE Scout_Agent SHALL prioritize medical efficacy and match quality over geographical convenience
3. WHEN filtering results, THE Scout_Agent SHALL ensure patients meet strict Inclusion_Criteria for each trial
4. WHEN presenting results, THE Scout_Agent SHALL provide accessible trials with clear participation requirements
5. THE Scout_Agent SHALL perform real-time fetching from external trial databases for current information

### Requirement 6: Chat-Based User Interface

**User Story:** As a user familiar with modern chat applications, I want a simple conversational interface, so that I can interact naturally without learning complex medical software.

#### Acceptance Criteria

1. THE Trial_Scout_System SHALL provide a minimalist chat interface similar to ChatGPT or Claude
2. WHEN displaying the main screen, THE Trial_Scout_System SHALL show a large central chat window with text input
3. WHEN file upload is needed, THE Trial_Scout_System SHALL display a paperclip icon for manual uploads
4. WHEN agents request documents, THE Trial_Scout_System SHALL show Dynamic_UI_Action buttons for one-tap access
5. THE Trial_Scout_System SHALL include a collapsible left sidebar with chat history and settings

### Requirement 7: Session Management and History

**User Story:** As a patient with ongoing medical needs, I want to access my previous conversations and start new sessions, so that I can track my trial search progress over time.

#### Acceptance Criteria

1. THE Trial_Scout_System SHALL maintain conversation history across user sessions
2. WHEN starting a new conversation, THE Trial_Scout_System SHALL provide a "New Chat" button
3. WHEN accessing previous conversations, THE Trial_Scout_System SHALL display a list of past sessions in the sidebar
4. WHEN switching between conversations, THE Trial_Scout_System SHALL preserve context and conversation state
5. THE Trial_Scout_System SHALL provide language toggle settings accessible from the sidebar

### Requirement 8: Multi-Agent Coordination

**User Story:** As a system architect, I want clear coordination between the three AI agents, so that patient information flows seamlessly from intake to validated trial recommendations.

#### Acceptance Criteria

1. WHEN patient intake is complete, THE Scribe_Agent SHALL pass the Patient_Profile to downstream agents
2. WHEN trial matching is needed, THE Scout_Agent SHALL receive patient information and return potential Trial_Match results
3. WHEN safety validation is required, THE Doctor_Agent SHALL receive both Patient_Profile and Trial_Match data
4. WHEN all agents complete processing, THE Trial_Scout_System SHALL present integrated results to the user
5. THE Trial_Scout_System SHALL handle agent communication failures gracefully with appropriate error messages

### Requirement 9: Data Storage and Retrieval

**User Story:** As a system administrator, I want patient documents and profiles stored securely, so that the system can provide consistent service while protecting sensitive medical information.

#### Acceptance Criteria

1. WHEN documents are uploaded, THE Trial_Scout_System SHALL store them securely in Amazon S3
2. WHEN patient profiles are created, THE Trial_Scout_System SHALL persist them for future sessions
3. WHEN retrieving stored data, THE Trial_Scout_System SHALL maintain data integrity and access controls
4. THE Trial_Scout_System SHALL implement appropriate data retention and privacy policies
5. WHEN processing sensitive medical data, THE Trial_Scout_System SHALL comply with healthcare data protection standards

### Requirement 10: External API Integration

**User Story:** As a patient seeking the most current trial information, I want the system to access real-time clinical trial databases, so that I receive up-to-date opportunities.

#### Acceptance Criteria

1. WHEN searching for trials, THE Scout_Agent SHALL integrate with external clinical trial APIs
2. WHEN external APIs are unavailable, THE Scout_Agent SHALL gracefully fall back to internal OpenSearch database
3. WHEN API responses are received, THE Scout_Agent SHALL parse and normalize data into consistent formats
4. THE Scout_Agent SHALL handle API rate limits and authentication requirements appropriately
5. WHEN external data is stale, THE Scout_Agent SHALL prioritize real-time API results over cached data