/**
 * Test Upload Component - For debugging API responses
 */

import React, { useState } from 'react';

const TestUpload: React.FC = () => {
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 
    'https://rk1zsye504.execute-api.ap-south-1.amazonaws.com/drug-trial-matcher';

  const testAPI = async () => {
    setLoading(true);
    setResponse('Testing...');

    try {
      const url = `${API_ENDPOINT}/presigned-url`;
      console.log('Testing URL:', url);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileName: 'test.pdf',
          fileType: 'application/pdf',
          fileSize: 1024
        })
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', Object.fromEntries(res.headers.entries()));

      const text = await res.text();
      console.log('Response text:', text);

      let data;
      try {
        data = JSON.parse(text);
        console.log('Parsed response:', data);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        data = { error: 'Invalid JSON', raw: text };
      }

      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error:', error);
      setResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>API Test</h2>
      <p>Testing: {API_ENDPOINT}/presigned-url</p>
      
      <button 
        onClick={testAPI}
        disabled={loading}
        style={{
          padding: '10px 20px',
          background: '#1e3a8a',
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
            background: '#f3f4f6',
            padding: '15px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {response}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
        <p>Check browser console for detailed logs</p>
      </div>
    </div>
  );
};

export default TestUpload;
