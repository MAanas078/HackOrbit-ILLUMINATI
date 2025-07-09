import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Enhanced analysis with structured output
const analyzeCode = async (code) => {
  try {
    const prompt = `Analyze the following Python code for potential security risks and malicious behavior. 

IMPORTANT: Your response MUST follow this exact JSON structure:
{
  "riskLevel": "LOW|MEDIUM|HIGH",
  "securityScore": <number 0-100>,
  "verdict": "SAFE|UNSAFE",
  "riskFactors": ["factor1", "factor2", ...],
  "recommendations": ["rec1", "rec2", ...],
  "summary": "Brief summary of analysis"
}

Look specifically for:
1. File system operations (reading/writing files) - MEDIUM to HIGH risk
2. Network requests (HTTP, sockets) - HIGH risk  
3. System command execution (subprocess, os.system) - HIGH risk
4. Resource exhaustion attempts (infinite loops, memory bombs) - HIGH risk
5. Data exfiltration patterns - HIGH risk
6. Unauthorized access attempts - HIGH risk
7. Cryptocurrency mining patterns - HIGH risk
8. Import of dangerous modules (os, subprocess, requests, socket) - MEDIUM to HIGH risk
9. Eval/exec statements - HIGH risk
10. Binary data manipulation - MEDIUM risk

Scoring guidelines:
- 90-100: Safe code with standard libraries only
- 70-89: Minor concerns, mostly safe
- 50-69: Moderate risk, needs review
- 30-49: High risk, dangerous operations
- 0-29: Extremely dangerous, likely malicious

Code to analyze:
\`\`\`python
${code}
\`\`\`

Respond ONLY with the JSON structure above, no additional text.`;

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          {
            role: "system",
            content: "You are a security expert analyzing code for potential threats. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1, // Lower temperature for more consistent JSON output
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Parse the JSON response
    let analysisResult;
    try {
      const rawResponse = response.data.choices[0].message.content;
      
      // Clean the response to extract JSON
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      
      analysisResult = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!analysisResult.riskLevel || !analysisResult.securityScore || !analysisResult.verdict) {
        throw new Error("Missing required fields in analysis");
      }
      
      // Ensure score is within valid range
      analysisResult.securityScore = Math.max(0, Math.min(100, analysisResult.securityScore));
      
    } catch (parseError) {
      console.error("Error parsing ML response:", parseError);
      
      // Fallback: Extract information from raw text
      const rawText = response.data.choices[0].message.content;
      analysisResult = parseTextAnalysis(rawText);
    }

    return {
      success: true,
      analysis: analysisResult,
      rawResponse: response.data.choices[0].message.content // Keep original for debugging
    };

  } catch (error) {
    console.error("Error analyzing code:", error);
    return {
      success: false,
      error: error.message,
      // Fallback analysis for when API fails
      analysis: {
        riskLevel: "MEDIUM",
        securityScore: 50,
        verdict: "UNSAFE",
        riskFactors: ["Analysis service unavailable"],
        recommendations: ["Manual review required"],
        summary: "Unable to perform automated analysis"
      }
    };
  }
};

// Fallback parser for when JSON parsing fails
const parseTextAnalysis = (text) => {
  const defaultResult = {
    riskLevel: "MEDIUM",
    securityScore: 50,
    verdict: "UNSAFE",
    riskFactors: [],
    recommendations: [],
    summary: "Analysis completed with limited parsing"
  };

  try {
    // Extract risk level
    const riskMatch = text.match(/(?:risk\s*level|risk):\s*(LOW|MEDIUM|HIGH)/i);
    if (riskMatch) {
      defaultResult.riskLevel = riskMatch[1].toUpperCase();
    }

    // Extract security score
    const scoreMatch = text.match(/(?:security\s*score|score):\s*(\d+)/i);
    if (scoreMatch) {
      defaultResult.securityScore = parseInt(scoreMatch[1]);
    }

    // Extract verdict
    const verdictMatch = text.match(/(?:verdict|overall\s*verdict):\s*(SAFE|UNSAFE)/i);
    if (verdictMatch) {
      defaultResult.verdict = verdictMatch[1].toUpperCase();
    }

    // Extract risk factors (look for bullet points or numbered lists)
    const riskFactorMatches = text.match(/(?:risk\s*factors?|concerns?|issues?)[\s\S]*?(?=recommendations|summary|$)/i);
    if (riskFactorMatches) {
      const factors = riskFactorMatches[0].match(/[-•*]\s*(.+)/g);
      if (factors) {
        defaultResult.riskFactors = factors.map(f => f.replace(/[-•*]\s*/, '').trim());
      }
    }

    // Extract recommendations
    const recMatches = text.match(/(?:recommendations?|suggestions?)[\s\S]*?(?=summary|$)/i);
    if (recMatches) {
      const recs = recMatches[0].match(/[-•*]\s*(.+)/g);
      if (recs) {
        defaultResult.recommendations = recs.map(r => r.replace(/[-•*]\s*/, '').trim());
      }
    }

    // Extract summary
    const summaryMatch = text.match(/(?:summary|conclusion):\s*(.+)/i);
    if (summaryMatch) {
      defaultResult.summary = summaryMatch[1].trim();
    }

    return defaultResult;
  } catch (error) {
    console.error("Error in fallback parsing:", error);
    return defaultResult;
  }
};

// Additional helper function to perform basic static analysis
const performBasicAnalysis = (code) => {
  const riskFactors = [];
  const recommendations = [];
  let score = 100;

  // Check for dangerous imports
  const dangerousImports = [
    'os', 'subprocess', 'sys', 'socket', 'requests', 'urllib', 
    'http', 'ftplib', 'smtplib', 'pickle', 'marshal', 'eval'
  ];
  
  for (const imp of dangerousImports) {
    if (code.includes(`import ${imp}`) || code.includes(`from ${imp}`)) {
      riskFactors.push(`Dangerous import detected: ${imp}`);
      score -= 15;
    }
  }

  // Check for system commands
  const systemCommands = ['os.system', 'subprocess.', 'exec(', 'eval('];
  for (const cmd of systemCommands) {
    if (code.includes(cmd)) {
      riskFactors.push(`System command usage: ${cmd}`);
      score -= 20;
    }
  }

  // Check for file operations
  const fileOps = ['open(', 'file(', 'read(', 'write(', 'remove(', 'delete('];
  for (const op of fileOps) {
    if (code.includes(op)) {
      riskFactors.push(`File operation detected: ${op}`);
      score -= 10;
    }
  }

  // Check for network operations
  const networkOps = ['requests.', 'urllib.', 'socket.', 'http.'];
  for (const op of networkOps) {
    if (code.includes(op)) {
      riskFactors.push(`Network operation detected: ${op}`);
      score -= 15;
    }
  }

  // Generate recommendations based on findings
  if (riskFactors.length > 0) {
    recommendations.push("Review and minimize use of system-level operations");
    recommendations.push("Consider using safer alternatives for identified operations");
    recommendations.push("Implement additional sandboxing measures");
  }

  score = Math.max(0, Math.min(100, score));
  
  let riskLevel = "LOW";
  let verdict = "SAFE";
  
  if (score < 30) {
    riskLevel = "HIGH";
    verdict = "UNSAFE";
  } else if (score < 70) {
    riskLevel = "MEDIUM";
    verdict = "UNSAFE";
  }

  return {
    riskLevel,
    securityScore: score,
    verdict,
    riskFactors,
    recommendations,
    summary: `Static analysis completed. Found ${riskFactors.length} potential security concerns.`
  };
};

// Enhanced analyze function that combines ML and static analysis
const analyzeCodeEnhanced = async (code) => {
  try {
    // First, try ML analysis
    const mlResult = await analyzeCode(code);
    
    if (mlResult.success) {
      return mlResult;
    }
    
    // If ML fails, fall back to static analysis
    console.log("ML analysis failed, using static analysis fallback");
    const staticResult = performBasicAnalysis(code);
    
    return {
      success: true,
      analysis: staticResult,
      rawResponse: "Static analysis used due to ML service unavailability"
    };
    
  } catch (error) {
    console.error("Error in enhanced analysis:", error);
    return {
      success: false,
      error: error.message,
      analysis: {
        riskLevel: "HIGH",
        securityScore: 0,
        verdict: "UNSAFE",
        riskFactors: ["Analysis system error"],
        recommendations: ["Manual security review required"],
        summary: "Unable to perform security analysis"
      }
    };
  }
};

export { analyzeCode, analyzeCodeEnhanced, performBasicAnalysis };