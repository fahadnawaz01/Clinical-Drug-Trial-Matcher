/**
 * Test Upload API Component
 * Debug tool to test the pre-signed URL API endpoint
 */

import React, { useState } from 'react';

const TestUploadAPI: React.FC = () => {
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const API_ENDPOINT = 'https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher';

  const testAPI = async () => {
    setLoading(true);
    setResponse('Testing...');

    try {
      const testPayload = {
        fileName: 'test-document.pdf',
        fileType: 'application/pdf',
        fileSize: 1024
      };

      console.log('Sending request to:', `${API_ENDPOINT}/presigned-url`);
      console.log('Payload:', JSON.stringify(testPayload, null, 2));

      const res = await fetch(`${API_ENDPOINT}/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', Object.fromEntries(res.headers.entries()));

      const data = await res.json();
      console.log('Response data:', data);

      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Test error:', error);
      setResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Test Pre-signed URL API</h2>
      <button 
        onClick={testAPI}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#1e3a8a',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px'
        }}
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>

      {response && (
        <div style={{ marginTop: '20px' }}>
          <h3>Response:</h3>
          <pre style={{
            backgroundColor: '#f5f5f5',
            padding: '15px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px',
            border: '1px solid #ddd'
          }}>
            {response}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <h4>Instructions:</h4>
        <ol>
          <li>Click "Test API" button</li>
          <li>Check the browser console for detailed logs</li>
          <li>Review the response structure below</li>
          <li>Verify the response contains "uploadUrl" field</li>
        </ol>
      </div>
    </div>
  );
};

export default TestUploadAPI;
