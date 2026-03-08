// CTRI Scraper Lambda Handler
// Entry point for Bedrock Action Group invocations

import axios from 'axios';
import * as cheerio from 'cheerio';

// Master Mapping Dictionary - The "brain" of the scraper
const CTRI_MAP = {
  SUMMARY: {
    'Public Title of Study': { type: 'simple', field: 'publicTitle' },
    'Brief Summary': { type: 'simple', field: 'briefSummary' },
    'Health Condition / Problems Studied': { type: 'nested_list', field: 'conditions', nestedLabel: 'Condition' },
    'Intervention / Comparator Agent': { type: 'nested_object', field: 'intervention', nestedFields: ['Name', 'Details'] }
  },
  ELIGIBILITY: {
    'Inclusion Criteria': { type: 'nested_details', field: 'inclusion' },
    'Exclusion Criteria': { type: 'nested_details', field: 'exclusion' },  // Try with space first
    'Age From': { type: 'nested_simple', field: 'ageFrom', parentLabel: 'Inclusion Criteria' },
    'Age To': { type: 'nested_simple', field: 'ageTo', parentLabel: 'Inclusion Criteria' },
    'Gender': { type: 'nested_simple', field: 'gender', parentLabel: 'Inclusion Criteria' }
  },
  CONTACTS: {
    'Details of Principal Investigator': { 
      type: 'nested_contact', 
      field: 'principalInvestigator',
      nestedFields: ['Name', 'Affiliation', 'Email', 'Phone']
    },
    'Details of Contact Person': { 
      type: 'nested_contact', 
      field: 'scientificContact',
      nestedFields: ['Name', 'Email', 'Phone'],
      subLabel: 'Scientific Query'
    },
    'Details of Contact Person': { 
      type: 'nested_contact', 
      field: 'publicContact',
      nestedFields: ['Name', 'Email', 'Phone'],
      subLabel: 'Public Query'
    }
  },
  LOCATIONS: {
    'Sites of Study': { 
      type: 'nested_sites', 
      field: 'sites',
      nestedFields: ['Name of Site', 'Site Address']
    }
  },
  STUDY_SPECS: {
    'Phase of Trial': { type: 'simple', field: 'phase' },
    'Target Sample Size': { type: 'simple', field: 'targetSampleSize' },
    'Estimated Duration of Trial': { type: 'simple', field: 'estimatedDuration' },
    'Primary Outcome': { type: 'nested_list', field: 'primaryOutcome', nestedLabel: 'Outcome' }
  }
};

const VALID_MODULES = Object.keys(CTRI_MAP);

export const handler = async (event) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    // Extract parameters from Bedrock event
    const trialUrl = event.parameters?.find(p => p.name === 'trialUrl')?.value;
    const requestedModulesParam = event.parameters?.find(p => p.name === 'requestedModules')?.value;
    
    console.log('Extracted trialUrl:', trialUrl);
    console.log('Extracted requestedModulesParam:', requestedModulesParam);
    
    if (!trialUrl) {
      return buildBedrockResponse(event, { error: 'Missing trialUrl parameter' });
    }

    // Parse requestedModules (could be JSON string or array)
    let requestedModules = [];
    if (requestedModulesParam) {
      try {
        // If it's already an array, use it directly
        if (Array.isArray(requestedModulesParam)) {
          requestedModules = requestedModulesParam;
        } else if (typeof requestedModulesParam === 'string') {
          // Try to parse as JSON first
          try {
            requestedModules = JSON.parse(requestedModulesParam);
          } catch (jsonError) {
            // If JSON parse fails, check if it's a malformed array like "[ELIGIBILITY]"
            const cleaned = requestedModulesParam.trim();
            if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
              // Extract content between brackets and split by comma
              const content = cleaned.slice(1, -1).trim();
              requestedModules = content.split(',').map(m => m.trim()).filter(m => m.length > 0);
            } else {
              // Single module as string
              requestedModules = [requestedModulesParam];
            }
          }
        } else {
          requestedModules = [requestedModulesParam];
        }
      } catch (e) {
        console.error('Error parsing requestedModules:', e);
        requestedModules = [requestedModulesParam]; // Fallback: single module as string
      }
    }
    
    console.log('Parsed requestedModules:', requestedModules);

    // Validate requested modules
    if (!requestedModules || requestedModules.length === 0) {
      return buildBedrockResponse(event, {
        error: 'Incomplete request',
        hint: `Please specify one or more of these modules: ${VALID_MODULES.join(', ')}`
      });
    }

    // Check for invalid modules
    const invalidModules = requestedModules.filter(m => !VALID_MODULES.includes(m));
    if (invalidModules.length > 0) {
      return buildBedrockResponse(event, {
        error: 'Incomplete request',
        hint: `Please specify one or more of these modules: ${VALID_MODULES.join(', ')}`,
        invalidModules
      });
    }

    // Fetch HTML with resilience
    console.log('Fetching HTML from:', trialUrl);
    const html = await fetchCtriPage(trialUrl);
    console.log('HTML fetched, length:', html.length);
    
    // Parse HTML with cheerio
    const $ = cheerio.load(html);
    
    // Log all table labels found for debugging
    const allLabels = [];
    $('tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        allLabels.push($(cells[0]).text().trim());
      }
    });
    console.log('Found table labels:', allLabels.slice(0, 20)); // Log first 20 labels
    
    // Extract only requested modules
    const result = {};
    for (const moduleName of requestedModules) {
      console.log(`Extracting module: ${moduleName}`);
      result[moduleName] = extractModule(moduleName, $);
      console.log(`Module ${moduleName} result:`, JSON.stringify(result[moduleName], null, 2));
    }
    
    // Return extracted data
    return buildBedrockResponse(event, result);

  } catch (error) {
    console.error('Error in CTRI scraper:', error);
    console.error('Error stack:', error.stack);
    return buildBedrockResponse(event, { 
      error: 'Source currently unavailable',
      details: error.message
    });
  }
};

// Fetch CTRI page with timeout and User-Agent header
async function fetchCtriPage(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new Error('Request timeout');
    }
    throw new Error('Network error');
  }
}

// Extract label-value pairs from CTRI table structure
// The CTRI page uses tables where left <td> is label, right <td> is value
function extractLabelValue($, labelText) {
  let result = null;
  
  // Iterate through all table rows
  $('tr').each((i, row) => {
    const cells = $(row).find('td');
    
    // Check if this row has exactly 2 cells (label-value pair)
    if (cells.length === 2) {
      const label = $(cells[0]).text().trim();
      const value = $(cells[1]).text().trim();
      
      // Case-insensitive match for the label
      if (label.toLowerCase().includes(labelText.toLowerCase())) {
        result = value;
        return false; // Break the loop
      }
    }
  });
  
  return result || 'Not specified';
}

// Sanitize extracted text data
function sanitizeText(text) {
  if (!text || text === 'Not specified') return text;
  
  // Remove HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  
  // Remove tabs and newlines
  text = text.replace(/[\t\n]/g, ' ');
  
  // Collapse multiple spaces to single space
  text = text.replace(/\s\s+/g, ' ');
  
  // Remove "Modification(s)" and "Click here" artifacts
  text = text.replace(/Modification\(s\)/gi, '');
  text = text.replace(/Click here/gi, '');
  
  // Trim leading/trailing whitespace
  text = text.trim();
  
  return text;
}

// Extract a specific module based on CTRI_MAP
function extractModule(moduleName, $) {
  const moduleConfig = CTRI_MAP[moduleName];
  if (!moduleConfig) return null;
  
  const result = {};
  
  for (const [label, config] of Object.entries(moduleConfig)) {
    const value = extractField(label, config, $);
    if (value !== null && value !== undefined) {
      result[config.field] = value;
    }
  }
  
  return result;
}

// Extract a single field based on its configuration
function extractField(label, config, $) {
  switch (config.type) {
    case 'simple':
      return extractSimpleField(label, $);
    
    case 'nested_details':
      return extractNestedDetails(label, $);
    
    case 'nested_simple':
      return extractNestedSimple(label, config.parentLabel, $);
    
    case 'nested_contact':
      return extractNestedContact(label, config.nestedFields, $);
    
    case 'nested_sites':
      return extractNestedSites(label, config.nestedFields, $);
    
    case 'nested_list':
      return extractNestedList(label, config.nestedLabel, $);
    
    case 'nested_object':
      return extractNestedObject(label, config.nestedFields, $);
    
    default:
      return null;
  }
}

// Extract simple field (label -> sibling td)
function extractSimpleField(label, $) {
  console.log(`  Looking for simple field: "${label}"`);
  
  const targetRow = $('td').filter((i, el) => {
    return $(el).text().trim().toLowerCase().includes(label.toLowerCase());
  }).closest('tr');
  
  if (targetRow.length > 0) {
    const cells = targetRow.find('td');
    if (cells.length >= 2) {
      const value = sanitizeText($(cells[1]).text());
      console.log(`  Found: "${value}"`);
      return value;
    }
  }
  
  console.log(`  Not found, returning "Not specified"`);
  return 'Not specified';
}

// Extract nested details (for Inclusion/Exclusion Criteria)
function extractNestedDetails(label, $) {
  console.log(`  Looking for nested details: "${label}"`);
  
  // Try multiple label variations (with/without space for Exclusion Criteria)
  const labelVariations = [label];
  if (label.toLowerCase().includes('exclusion')) {
    labelVariations.push('ExclusionCriteria'); // No space version
    labelVariations.push('Exclusion Criteria'); // With space version
  }
  
  for (const labelVariant of labelVariations) {
    console.log(`  Trying label variant: "${labelVariant}"`);
    
    // Find the td containing the label - must be a short text (< 100 chars) to avoid matching script/style content
    const labelCell = $('td').filter((i, el) => {
      const text = $(el).text().trim();
      const textLength = text.length;
      const matches = text.toLowerCase().includes(labelVariant.toLowerCase()) && textLength < 100;
      if (matches) {
        console.log(`  Found matching label cell: "${text}" (length: ${textLength})`);
      }
      return matches;
    }).first();
    
    if (labelCell.length > 0) {
      // Get the next sibling td (the value cell)
      const valueCell = labelCell.next('td');
      console.log(`  Found ${valueCell.length} value cells`);
      
      if (valueCell.length > 0) {
        // Look for nested table in the value cell
        const nestedTable = valueCell.find('table');
        console.log(`  Found ${nestedTable.length} nested tables in value cell`);
        
        if (nestedTable.length > 0) {
          // Find "Details" row in nested table
          const detailsRow = nestedTable.find('td').filter((i, el) => {
            const text = $(el).text().trim();
            return text.toLowerCase().includes('details') && text.length < 50;
          }).closest('tr');
          
          console.log(`  Found ${detailsRow.length} "Details" rows`);
          
          if (detailsRow.length > 0) {
            const detailsCells = detailsRow.find('td');
            console.log(`  Details row has ${detailsCells.length} cells`);
            if (detailsCells.length >= 2) {
              const value = sanitizeText($(detailsCells[1]).text());
              console.log(`  Extracted value (first 100 chars): "${value.substring(0, 100)}..."`);
              return value;
            }
          }
        } else {
          // No nested table, try to get the value directly
          const directValue = sanitizeText(valueCell.text());
          console.log(`  No nested table, direct value (first 100 chars): "${directValue.substring(0, 100)}..."`);
          if (directValue && directValue !== 'Not specified') {
            return directValue;
          }
        }
      }
    }
  }
  
  console.log(`  Not found, returning "Not specified"`);
  return 'Not specified';
}

// Extract nested simple field (Age From/To, Gender inside Inclusion table)
function extractNestedSimple(label, parentLabel, $) {
  console.log(`  Looking for nested simple field: "${label}" inside "${parentLabel}"`);
  
  // Find the parent label cell (must be short text to avoid script/style content)
  const parentCell = $('td').filter((i, el) => {
    const text = $(el).text().trim();
    return text.toLowerCase().includes(parentLabel.toLowerCase()) && text.length < 100;
  }).first();
  
  if (parentCell.length > 0) {
    console.log(`  Found parent cell: "${parentCell.text().trim()}"`);
    
    // Get the next sibling td (the value cell)
    const valueCell = parentCell.next('td');
    
    if (valueCell.length > 0) {
      const nestedTable = valueCell.find('table');
      console.log(`  Found ${nestedTable.length} nested tables in parent value cell`);
      
      if (nestedTable.length > 0) {
        // Find the target field in the nested table
        const targetCell = nestedTable.find('td').filter((i, el) => {
          const text = $(el).text().trim();
          return text.toLowerCase().includes(label.toLowerCase()) && text.length < 100;
        }).first();
        
        console.log(`  Found ${targetCell.length} target cells for "${label}"`);
        
        if (targetCell.length > 0) {
          const targetValueCell = targetCell.next('td');
          if (targetValueCell.length > 0) {
            const value = sanitizeText(targetValueCell.text());
            console.log(`  Extracted value: "${value}"`);
            return value;
          }
        }
      }
    }
  }
  
  console.log(`  Not found, returning "Not specified"`);
  return 'Not specified';
}

// Extract nested contact information
function extractNestedContact(label, nestedFields, $) {
  const targetRow = $('td').filter((i, el) => {
    return $(el).text().trim().toLowerCase().includes(label.toLowerCase());
  }).closest('tr');
  
  if (targetRow.length > 0) {
    const cells = targetRow.find('td');
    if (cells.length >= 2) {
      const nestedTable = $(cells[1]).find('table');
      if (nestedTable.length > 0) {
        const contact = {};
        
        for (const field of nestedFields) {
          const fieldRow = nestedTable.find('td').filter((i, el) => {
            return $(el).text().trim().toLowerCase().includes(field.toLowerCase());
          }).closest('tr');
          
          if (fieldRow.length > 0) {
            const fieldCells = fieldRow.find('td');
            if (fieldCells.length >= 2) {
              contact[field.toLowerCase().replace(/\s+/g, '')] = sanitizeText($(fieldCells[1]).text());
            }
          }
        }
        
        return Object.keys(contact).length > 0 ? contact : null;
      }
    }
  }
  
  return null;
}

// Extract nested sites information
function extractNestedSites(label, nestedFields, $) {
  const targetRow = $('td').filter((i, el) => {
    return $(el).text().trim().toLowerCase().includes(label.toLowerCase());
  }).closest('tr');
  
  if (targetRow.length > 0) {
    const cells = targetRow.find('td');
    if (cells.length >= 2) {
      const nestedTable = $(cells[1]).find('table');
      if (nestedTable.length > 0) {
        const sites = [];
        
        nestedTable.find('tr').each((i, row) => {
          const rowCells = $(row).find('td');
          if (rowCells.length >= 2) {
            const label = $(rowCells[0]).text().trim();
            const value = sanitizeText($(rowCells[1]).text());
            
            // Check if this is a site field
            if (nestedFields.some(f => label.toLowerCase().includes(f.toLowerCase()))) {
              if (label.toLowerCase().includes('name')) {
                sites.push({ name: value, address: '' });
              } else if (label.toLowerCase().includes('address') && sites.length > 0) {
                sites[sites.length - 1].address = value;
              }
            }
          }
        });
        
        return sites.length > 0 ? sites : [];
      }
    }
  }
  
  return [];
}

// Extract nested list (conditions, outcomes)
function extractNestedList(label, nestedLabel, $) {
  const targetRow = $('td').filter((i, el) => {
    return $(el).text().trim().toLowerCase().includes(label.toLowerCase());
  }).closest('tr');
  
  if (targetRow.length > 0) {
    const cells = targetRow.find('td');
    if (cells.length >= 2) {
      const nestedTable = $(cells[1]).find('table');
      if (nestedTable.length > 0) {
        const items = [];
        
        nestedTable.find('tr').each((i, row) => {
          const rowCells = $(row).find('td');
          if (rowCells.length >= 2) {
            const cellLabel = $(rowCells[0]).text().trim();
            if (cellLabel.toLowerCase().includes(nestedLabel.toLowerCase())) {
              items.push(sanitizeText($(rowCells[1]).text()));
            }
          }
        });
        
        return items.length > 0 ? items : [];
      }
    }
  }
  
  return [];
}

// Extract nested object (intervention with Name and Details)
function extractNestedObject(label, nestedFields, $) {
  const targetRow = $('td').filter((i, el) => {
    return $(el).text().trim().toLowerCase().includes(label.toLowerCase());
  }).closest('tr');
  
  if (targetRow.length > 0) {
    const cells = targetRow.find('td');
    if (cells.length >= 2) {
      const nestedTable = $(cells[1]).find('table');
      if (nestedTable.length > 0) {
        const obj = {};
        
        for (const field of nestedFields) {
          const fieldRow = nestedTable.find('td').filter((i, el) => {
            return $(el).text().trim().toLowerCase().includes(field.toLowerCase());
          }).closest('tr');
          
          if (fieldRow.length > 0) {
            const fieldCells = fieldRow.find('td');
            if (fieldCells.length >= 2) {
              obj[field.toLowerCase()] = sanitizeText($(fieldCells[1]).text());
            }
          }
        }
        
        return Object.keys(obj).length > 0 ? obj : null;
      }
    }
  }
  
  return null;
}

// Build Bedrock Action Group response format
function buildBedrockResponse(event, responseBody) {
  // Check if this is a function-based invocation (old format) or API-based (new format)
  if (event.function) {
    // Old format with functionResponse
    return {
      messageVersion: '1.0',
      response: {
        actionGroup: event.actionGroup,
        function: event.function,
        functionResponse: {
          responseBody: {
            TEXT: {
              body: JSON.stringify(responseBody)
            }
          }
        }
      }
    };
  } else {
    // New format with API path
    return {
      messageVersion: '1.0',
      response: {
        actionGroup: event.actionGroup,
        apiPath: event.apiPath,
        httpMethod: event.httpMethod,
        httpStatusCode: 200,
        responseBody: {
          'application/json': {
            body: JSON.stringify(responseBody)
          }
        }
      }
    };
  }
}
