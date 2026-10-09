const fs = require('fs');
let c = fs.readFileSync('C:/Users/saish/Downloads/BioENSO_Software_v1/bioenso-bti/src/engine.ts', 'utf8');

const splitPt = c.indexOf('  // 6. Explanation Generator');
const top = c.substring(0, splitPt);

const endLogic = `  // 6. Explanation Generator
  const explanation: string[] = [];
  if (C > 0.6) explanation.push("Regional climate context is elevated");
  if (E > 0.7) explanation.push(\`Farm \${hazard.toLowerCase()} exposure is high\`);
  if (B > 0.5) explanation.push("Multiple biological indicators deviate significantly from baseline");
  if (P > 0.5) explanation.push(\`Deviation persisted for \${environment.durationMinutes} minutes\`);
  if (explanation.length === 0) explanation.push("Conditions are within normal expected bounds");

  if (insufficientEvidence) {
    dataQuality = "INSUFFICIENT" as any;
    severity = "INSUFFICIENT" as any;
    trend = "UNKNOWN" as any;
    explanation.length = 0; // Clear the normal explanations
    explanation.push(...missingReasons.map(r => 'INSUFFICIENT EVIDENCE: ' + r));
  }

  return {
    score: insufficientEvidence ? null : score,
    components: {
      climateContext: Number(C.toFixed(2)),
      farmExposure: Number(E.toFixed(2)),
      biologicalResponse: Number(B.toFixed(2)),
      persistence: Number(P.toFixed(2))
    },
    confidence,
    residual: Number(overallSigma.toFixed(2)),
    persistenceMinutes: environment.durationMinutes,
    severity: severity as any,
    trend: trend as any,
    dataQuality,
    explanation
  };
}
`;

fs.writeFileSync('C:/Users/saish/Downloads/BioENSO_Software_v1/bioenso-bti/src/engine.ts', top + endLogic);
