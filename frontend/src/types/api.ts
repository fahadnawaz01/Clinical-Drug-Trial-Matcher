export interface TrialMatch {
  trial_name: string;
  summary: string;
}

export interface APIRequest {
  inputText: string;
}

export interface APIResponse {
  matches: TrialMatch[];
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  trialMatches?: TrialMatch[];
  timestamp: Date;
}
