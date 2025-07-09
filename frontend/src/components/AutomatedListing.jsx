import React from 'react';

function AutomatedListing() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <iframe 
        src="http://127.0.0.1:5002" 
        width="100%" 
        height="100%" 
        allow="camera"
        style={{ border: 'none' }}
        title="Automated Listing"
      ></iframe>
    </div>
  );
}

export default AutomatedListing;