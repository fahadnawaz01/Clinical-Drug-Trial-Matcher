export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  
  // Extract apiPath and httpMethod for OpenAPI response format
  const apiPath = event.apiPath || '/searchClinicalTrials';
  const httpMethod = event.httpMethod || 'POST';
  
  // 1. Initialize variables with default fallback values
  let condition = "diabetes";
  let term = "";
  let location = "";
  let age = null;
  let status = "RECRUITING";
  let pageSize = 5;

  // 2. Extract inputs from the Bedrock Action Group (OpenAPI format)
  if (event.requestBody && event.requestBody.content && event.requestBody.content['application/json']) {
    const properties = event.requestBody.content['application/json'].properties;
    
    const condProp = properties.find(p => p.name === 'condition');
    if (condProp) condition = condProp.value;
    
    const termProp = properties.find(p => p.name === 'term');
    if (termProp) term = termProp.value;
    
    const locationProp = properties.find(p => p.name === 'location');
    if (locationProp) location = locationProp.value;
    
    const ageProp = properties.find(p => p.name === 'age');
    if (ageProp) age = ageProp.value;
    
    const statusProp = properties.find(p => p.name === 'status');
    if (statusProp) status = statusProp.value;
    
    const pageSizeProp = properties.find(p => p.name === 'pageSize');
    if (pageSizeProp) pageSize = pageSizeProp.value;
  }
  // Check if Bedrock sent it via parameters (Function Details setup)
  else if (event.parameters && event.parameters.length > 0) {
    const condParam = event.parameters.find(p => p.name === 'condition');
    if (condParam) condition = condParam.value;
    
    const termParam = event.parameters.find(p => p.name === 'term');
    if (termParam) term = termParam.value;
    
    const locationParam = event.parameters.find(p => p.name === 'location');
    if (locationParam) location = locationParam.value;
    
    const ageParam = event.parameters.find(p => p.name === 'age');
    if (ageParam) age = ageParam.value;
    
    const statusParam = event.parameters.find(p => p.name === 'status');
    if (statusParam) status = statusParam.value;
    
    const pageSizeParam = event.parameters.find(p => p.name === 'pageSize');
    if (pageSizeParam) pageSize = pageSizeParam.value;
  }
  // Fallback for simple manual testing in the AWS Console
  else {
    if (event.condition) condition = event.condition;
    if (event.term) term = event.term;
    if (event.location) location = event.location;
    if (event.age) age = event.age;
    if (event.status) status = event.status;
    if (event.pageSize) pageSize = event.pageSize;
  }

  console.log('Extracted parameters:', { condition, term, location, age, status, pageSize });

  // 3. Build the ClinicalTrials API URL dynamically
  const baseUrl = "https://clinicaltrials.gov/api/v2/studies?";
  const queryParams = new URLSearchParams();
  
  if (condition) queryParams.append("query.cond", condition);
  if (term) queryParams.append("query.term", term);
  if (location) queryParams.append("query.locn", location);
  
  // Apply status filter
  if (status) {
    queryParams.append("filter.overallStatus", status);
    queryParams.append("postFilter.overallStatus", status);
  }
  
  if (pageSize) queryParams.append("pageSize", pageSize.toString());
  
  const apiUrl = baseUrl + queryParams.toString();
  console.log('ClinicalTrials.gov API URL:', apiUrl);

  let responseBody = {};
  let httpStatusCode = 200;

  try {
    // 4. Call the ClinicalTrials.gov API with the required headers
    const response = await fetch(apiUrl, {
      headers: {
        "accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }

    const data = await response.json();

    // Map out the nested data to keep the LLM context clean
    const trials = data.studies ? data.studies.map(study => ({
      nct_id: study.protocolSection?.identificationModule?.nctId || 'N/A',
      trial_name: study.protocolSection?.identificationModule?.officialTitle || 
                  study.protocolSection?.identificationModule?.briefTitle || 'Untitled',
      status: study.protocolSection?.statusModule?.overallStatus || 'UNKNOWN',
      summary: study.protocolSection?.descriptionModule?.briefSummary || 'No summary available',
      location: study.protocolSection?.contactsLocationsModule?.locations?.[0]?.city || 
                study.protocolSection?.contactsLocationsModule?.locations?.[0]?.facility || 
                'Not specified'
    })) : [];

    responseBody = {
      trials: trials,
      count: trials.length
    };

    console.log(`Successfully retrieved ${trials.length} trials`);

  } catch (error) {
    console.error("Fetch error:", error);
    httpStatusCode = 500;
    responseBody = {
      error: error.message,
      trials: [],
      count: 0
    };
  }

  // 5. Format the response for OpenAPI Action Group
  // CRITICAL: apiPath must match the input apiPath
  const response = {
    messageVersion: "1.0",
    response: {
      actionGroup: event.actionGroup,
      apiPath: apiPath,
      httpMethod: httpMethod,
      httpStatusCode: httpStatusCode,
      responseBody: {
        "application/json": {
          body: JSON.stringify(responseBody)
        }
      }
    }
  };
  
  console.log('Returning response:', JSON.stringify(response, null, 2));
  return response;
};
