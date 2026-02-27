export interface TrialMatch {
  trial_name: string;
  summary: string;
  nct_id?: string;
  status?: string;
}

export interface APIRequest {
  inputText: string;
}

export interface APIResponse {
  sessionId?: string;
  reply: string;
  trials?: TrialMatch[];
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  trials?: TrialMatch[];
  condition?: string; // The disease/condition from the user's query
  timestamp: Date;
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
