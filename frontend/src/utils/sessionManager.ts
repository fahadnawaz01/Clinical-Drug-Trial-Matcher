/**
 * Session Manager
 * Generates and manages persistent IDs for the Dual-Brain state system:
 * - sessionId: Current conversation thread (for DynamoDB profile data)
 * - memoryId: Long-term patient identity (for Bedrock Agent Memory)
 */

import { v4 as uuidv4 } from 'uuid';

const SESSION_ID_KEY = 'trialScout_sessionId';
const MEMORY_ID_KEY = 'trialScout_memoryId';

/**
 * Get or create a persistent sessionId
 * This ID is used to link patient profiles in DynamoDB
 * Represents the current conversation thread
 */
export function getSessionId(): string {
  try {
    // Check if sessionId already exists in localStorage
    let sessionId = window.localStorage.getItem(SESSION_ID_KEY);
    
    if (!sessionId) {
      // Generate new UUID v4
      sessionId = uuidv4();
      window.localStorage.setItem(SESSION_ID_KEY, sessionId);
      console.log('🆔 New sessionId generated:', sessionId);
    } else {
      console.log('🆔 Existing sessionId retrieved:', sessionId);
    }
    
    return sessionId;
  } catch (error) {
    console.error('Error managing sessionId:', error);
    // Fallback: generate temporary sessionId (won't persist)
    return uuidv4();
  }
}

/**
 * Get or create a persistent memoryId
 * This ID is used for Bedrock Agent Memory (long-term patient identity)
 * Persists across multiple conversation threads
 */
export function getMemoryId(): string {
  try {
    // Check if memoryId already exists in localStorage
    let memoryId = window.localStorage.getItem(MEMORY_ID_KEY);
    
    if (!memoryId) {
      // Generate new UUID v4
      memoryId = uuidv4();
      window.localStorage.setItem(MEMORY_ID_KEY, memoryId);
      console.log('🧠 New memoryId generated:', memoryId);
    } else {
      console.log('🧠 Existing memoryId retrieved:', memoryId);
    }
    
    return memoryId;
  } catch (error) {
    console.error('Error managing memoryId:', error);
    // Fallback: generate temporary memoryId (won't persist)
    return uuidv4();
  }
}

/**
 * Clear the current sessionId (useful for starting a new conversation thread)
 */
export function clearSessionId(): void {
  try {
    window.localStorage.removeItem(SESSION_ID_KEY);
    console.log('🗑️ SessionId cleared');
  } catch (error) {
    console.error('Error clearing sessionId:', error);
  }
}

/**
 * Clear the current memoryId (useful for testing or complete logout)
 * WARNING: This will erase all Bedrock Agent Memory for this patient
 */
export function clearMemoryId(): void {
  try {
    window.localStorage.removeItem(MEMORY_ID_KEY);
    console.log('🗑️ MemoryId cleared');
  } catch (error) {
    console.error('Error clearing memoryId:', error);
  }
}

/**
 * Clear all session data (both sessionId and memoryId)
 */
export function clearAllSessionData(): void {
  clearSessionId();
  clearMemoryId();
  console.log('🗑️ All session data cleared');
}

/**
 * Get session info (for debugging)
 */
export function getSessionInfo(): { sessionId: string; memoryId: string } {
  return {
    sessionId: getSessionId(),
    memoryId: getMemoryId()
  };
}
