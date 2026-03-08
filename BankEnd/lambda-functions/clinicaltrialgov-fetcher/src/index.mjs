/**
 * ClinicalTrials.gov Fetcher Lambda
 * AWS Bedrock Action Group function to fetch and simplify clinical trial data
 */

export const handler = async (event) => {
  console.log('📥 Received event:', JSON.stringify(event, null, 2));
  
  try {
    // STEP 1: Parse Bedrock Agent event and extract nctId
    const nctId = extractNctId(event);
    
    if (!nctId) {
      return buildBedrockResponse(event, {
        error: 'Missing nctId parameter'
      });
    }
    
    // Validate nctId format (must start with "NCT")
    if (!isValidNctId(nctId)) {
      return buildBedrockResponse(event, {
        error: `Invalid nctId format: ${nctId}. Must start with "NCT" followed by digits.`
      });
    }
    
    console.log('✅ Valid nctId:', nctId);
    
    // STEP 2: Fetch from ClinicalTrials.gov V2 API
    const trialData = await fetchTrialFromAPI(nctId);
    
    if (!trialData.success) {
      return buildBedrockResponse(event, {
        error: trialData.error
      });
    }
    
    console.log('✅ Trial data fetched successfully');
    
    // STEP 3: Flatten the response into simplified schema
    const flattenedData = flattenTrialData(trialData.data);
    
    if (!flattenedData.success) {
      return buildBedrockResponse(event, {
        error: flattenedData.error
      });
    }
    
    console.log('✅ Trial data flattened successfully');
    
    // STEP 4: Return just the flattened data (no wrapper, no status messages)
    return buildBedrockResponse(event, flattenedData.data);
    
  } catch (error) {
    console.error('❌ Handler error:', error);
    return buildBedrockResponse(event, {
      error: error.message || 'Internal server error'
    });
  }
};

/**
 * Extract nctId from Bedrock Agent event
 * Bedrock sends parameters in different formats depending on the action group configuration
 */
function extractNctId(event) {
  // Try event.parameters (common format)
  if (event.parameters && Array.isArray(event.parameters)) {
    const nctIdParam = event.parameters.find(p => p.name === 'nctId');
    if (nctIdParam) {
      return nctIdParam.value;
    }
  }
  
  // Try event.requestBody (alternative format)
  if (event.requestBody && event.requestBody.content) {
    const contentType = Object.keys(event.requestBody.content)[0];
    const properties = event.requestBody.content[contentType]?.properties;
    
    if (properties && Array.isArray(properties)) {
      const nctIdProp = properties.find(p => p.name === 'nctId');
      if (nctIdProp) {
        return nctIdProp.value;
      }
    }
  }
  
  // Try direct property access (fallback)
  if (event.nctId) {
    return event.nctId;
  }
  
  return null;
}

/**
 * Validate nctId format
 * Valid format: NCT followed by 8 digits (e.g., NCT12345678)
 */
function isValidNctId(nctId) {
  if (typeof nctId !== 'string') {
    return false;
  }
  
  // Must start with "NCT"
  if (!nctId.startsWith('NCT')) {
    return false;
  }
  
  // Must have digits after NCT
  const digits = nctId.substring(3);
  if (digits.length === 0 || !/^\d+$/.test(digits)) {
    return false;
  }
  
  return true;
}

/**
 * Fetch trial data from ClinicalTrials.gov V2 API
 * URL: https://clinicaltrials.gov/api/v2/studies/{nctId}
 * Query: fields=protocolSection (limits payload to essential data)
 */
async function fetchTrialFromAPI(nctId) {
  const apiUrl = `https://clinicaltrials.gov/api/v2/studies/${nctId}`;
  const queryParams = 'fields=protocolSection';
  const fullUrl = `${apiUrl}?${queryParams}`;
  
  console.log('🌐 Fetching from ClinicalTrials.gov:', fullUrl);
  
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrialScout/1.0'
      }
    });
    
    console.log('📡 API Response Status:', response.status);
    
    // Handle 404 - Trial not found
    if (response.status === 404) {
      console.log('❌ Trial not found:', nctId);
      return {
        success: false,
        error: `Clinical trial ${nctId} not found in ClinicalTrials.gov database.`
      };
    }
    
    // Handle 500+ - Server errors
    if (response.status >= 500) {
      console.log('❌ ClinicalTrials.gov server error:', response.status);
      return {
        success: false,
        error: `ClinicalTrials.gov is temporarily unavailable (HTTP ${response.status}). Please try again later.`
      };
    }
    
    // Handle other non-200 responses
    if (!response.ok) {
      console.log('❌ API error:', response.status, response.statusText);
      return {
        success: false,
        error: `Failed to fetch trial data: ${response.statusText} (HTTP ${response.status})`
      };
    }
    
    // Parse JSON response
    const data = await response.json();
    console.log('✅ API data received, size:', JSON.stringify(data).length, 'bytes');
    
    // Validate response structure
    if (!data.protocolSection) {
      console.log('⚠️ Missing protocolSection in response');
      return {
        success: false,
        error: 'Invalid response structure from ClinicalTrials.gov API'
      };
    }
    
    return {
      success: true,
      data: data
    };
    
  } catch (error) {
    console.error('❌ Fetch error:', error);
    
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Network error: Unable to connect to ClinicalTrials.gov. Please check internet connectivity.'
      };
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: 'Invalid JSON response from ClinicalTrials.gov API'
      };
    }
    
    // Generic error
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Build Bedrock Agent response format
 * Required structure: actionGroup, function, functionResponse
 * CRITICAL: responseBody must be TEXT (plain string), not JSON object
 */
function buildBedrockResponse(event, responseBody) {
  return {
    messageVersion: '1.0',
    response: {
      actionGroup: event.actionGroup || 'ClinicalTrialsActionGroup',
      function: event.function || 'fetchTrialDetails',
      functionResponse: {
        responseBody: {
          'TEXT': {
            body: JSON.stringify(responseBody)
          }
        }
      }
    }
  };
}

/**
 * Flatten the massive nested API response into simplified schema
 * Extracts only essential fields for AI Agent analysis
 */
function flattenTrialData(apiResponse) {
  try {
    const protocolSection = apiResponse.protocolSection;
    
    if (!protocolSection) {
      return {
        success: false,
        error: 'Missing protocolSection in API response'
      };
    }
    
    // Extract modules
    const identificationModule = protocolSection.identificationModule || {};
    const statusModule = protocolSection.statusModule || {};
    const eligibilityModule = protocolSection.eligibilityModule || {};
    const contactsLocationsModule = protocolSection.contactsLocationsModule || {};
    
    // Build simplified schema
    const simplified = {
      trialId: identificationModule.nctId || 'Unknown',
      status: statusModule.overallStatus || 'Unknown',
      eligibility: eligibilityModule.eligibilityCriteria || 'No eligibility criteria available',
      locations: extractLocations(contactsLocationsModule.locations),
      contacts: extractContacts(contactsLocationsModule.centralContacts)
    };
    
    console.log('📋 Flattened data:', {
      trialId: simplified.trialId,
      status: simplified.status,
      locationsCount: simplified.locations.length,
      contactsCount: simplified.contacts.length,
      eligibilityLength: simplified.eligibility.length
    });
    
    return {
      success: true,
      data: simplified
    };
    
  } catch (error) {
    console.error('❌ Flattening error:', error);
    return {
      success: false,
      error: `Failed to flatten trial data: ${error.message}`
    };
  }
}

/**
 * Extract locations from contactsLocationsModule
 * Returns array of { facility, city, country }
 */
function extractLocations(locations) {
  if (!locations || !Array.isArray(locations)) {
    return [];
  }
  
  return locations.map(location => ({
    facility: location.facility || 'Unknown Facility',
    city: location.city || 'Unknown City',
    country: location.country || 'Unknown Country'
  }));
}

/**
 * Extract contacts from contactsLocationsModule
 * Returns array of { name, email, phone }
 */
function extractContacts(centralContacts) {
  if (!centralContacts || !Array.isArray(centralContacts)) {
    return [];
  }
  
  return centralContacts.map(contact => ({
    name: contact.name || 'Unknown',
    email: contact.email || null,
    phone: contact.phone || null
  }));
}
