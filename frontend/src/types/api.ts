export interface TrialMatch {
  trial_name: string;
  summary: string;
  trial_id?: string; // Changed from nct_id to support both ClinicalTrials.gov and Indian trials
  nct_id?: string; // NCT ID for ClinicalTrials.gov trials
  trialUrl?: string; // CTRI URL for Indian trials
  status?: string;
  location?: string;
  details_url?: string;
}

export interface APIRequest {
  inputText: string;
}

export interface APIResponse {
  sessionId?: string;
  reply: string;
  trials?: TrialMatch[];
  suggestions?: string[];
  ui_form?: FormField[];
  fit_score_provisional?: number;
  final_assessment?: FinalAssessment;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'radio' | 'dropdown' | 'select' | 'textarea';
  placeholder?: string;
  options?: string[];
}

export interface FinalAssessment {
  fit_score: number;
  status: string;
  match_reasons: string[];
  barriers: string[];
  recommendations: string[];
}

export interface DocumentMetadata {
  filename: string;
  fileSize: number;
  fileType: string;
  viewUrl: string; // Presigned GET URL for viewing the document
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  trials?: TrialMatch[];
  suggestions?: string[]; // AI-suggested follow-up queries
  condition?: string; // The disease/condition from the user's query
  document?: DocumentMetadata; // Document upload metadata
  ui_form?: FormField[]; // Follow-up form fields
  fit_score_provisional?: number; // Provisional fit score
  final_assessment?: FinalAssessment; // Final eligibility assessment
  timestamp: Date;
  tokenUsage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface PatientProfile {
  name: string;
  age: string;
  sex: string;
  location: string;
  conditions: string[];
  medications: string[];
}

export interface SavedTrial extends TrialMatch {
  id: string;
  savedAt: Date;
  condition?: string; // The disease/condition this trial is for
}
