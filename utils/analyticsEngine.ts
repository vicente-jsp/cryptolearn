// utils/analyticsEngine.ts

export const calculateStudentStatus = (progress: number, avgGrade: number, lastLoginMs: number) => {
    const lastActive = lastLoginMs > 0 ? lastLoginMs : Date.now();
    const daysSinceLastActive = (Date.now() - lastActive) / (1000 * 60 * 60 * 24);
    
    // 1. Calculate Success Probability (Weighted)
    const successProbability = Math.round((avgGrade * 0.6) + (progress * 0.4));

    let academicStanding: 'Passed' | 'Fail' | 'Low Risk' | 'Medium Risk' | 'High Risk' = 'Low Risk';
    let standingReason = "";

    // 2. Updated Rule-Based Formula (As requested)
    if (progress >= 100) {
        // --- COMPLETED COURSE RULES ---
        if (avgGrade < 70) {
            academicStanding = 'Fail';
            standingReason = `Completed the course, but final average grade (${avgGrade}%) is below the 70% passing requirement.`;
        } else {
            academicStanding = 'Passed';
            standingReason = `Successfully completed the course with an average grade of ${avgGrade}%.`;
        }
    } else {
        // --- ACTIVE COURSE RULES (Based on Success Probability) ---
        if (successProbability < 50) {
            academicStanding = 'High Risk';
            standingReason = `High Risk: Critical engagement deficit. Projected success rate is currently low (${successProbability}%).`;
        } else if (successProbability >= 50 && successProbability < 75) {
            academicStanding = 'Medium Risk';
            standingReason = `Medium Risk: Student needs to improve assessment scores or complete more modules.`;
        } else {
            academicStanding = 'Low Risk';
            standingReason = `Low Risk: On track for success. High engagement and consistent performance.`;
        }

        // Inactivity trigger: If inactive for more than a week, escalate risk slightly
        if (daysSinceLastActive > 7 && academicStanding !== 'High Risk') {
            academicStanding = 'Medium Risk';
            standingReason += " (Note: Student has been inactive for more than 7 days).";
        }
    }

    return { successProbability, academicStanding, standingReason };
};