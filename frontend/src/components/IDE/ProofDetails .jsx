import React, { useState } from 'react';
import { FiShield, FiCheck, FiInfo, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const ProofDetails = ({ proof }) => {
  const [expanded, setExpanded] = useState(false);

  if (!proof) return null;

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 mb-4">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <FiShield className="text-green-400 mr-2 text-lg" />
          <span className="text-white font-medium">Zero-Knowledge Proof</span>
          <span className="ml-3 bg-green-900/50 text-green-300 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
            <FiCheck className="mr-1" /> Verified
          </span>
        </div>
        {expanded ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />}
      </div>
      
      {expanded && (
        <div className="border-t border-gray-700 p-4">
          <div className="grid gap-3">
            <div>
              <div className="text-gray-400 text-sm mb-1">Execution Hash:</div>
              <div className="bg-gray-900 p-2 rounded text-green-300 font-mono text-sm">{proof.codeHash}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm mb-1">Signature:</div>
              <div className="bg-gray-900 p-2 rounded text-green-300 font-mono text-sm">{proof.signature}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm mb-1">Verifier Public Key:</div>
              <div className="bg-gray-900 p-2 rounded text-green-300 font-mono text-sm">{proof.verifier}</div>
            </div>
            
            <div>
              <div className="text-gray-400 text-sm mb-1">Timestamp:</div>
              <div className="bg-gray-900 p-2 rounded text-green-300 font-mono text-sm">
                {new Date(proof.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="mt-4 bg-indigo-900/30 border border-indigo-800 p-3 rounded-lg">
            <div className="flex items-start">
              <FiInfo className="text-indigo-400 mr-2 mt-1" />
              <div className="text-indigo-200 text-sm">
                This zero-knowledge proof verifies that computation was performed correctly while preserving
                data privacy. The cryptographic signature ensures authenticity of the results.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProofDetails;