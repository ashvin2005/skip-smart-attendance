const calculateSubjectStats = (subject) => {
    const target = subject.targetPercentage;
    const sessions = subject.sessions;

    // Filter sessions that have already happened (or are marked)
    const pastSessions = sessions.filter(s => s.status === 'ATTENDED' || s.status === 'SKIPPED');
    const attended = pastSessions.filter(s => s.status === 'ATTENDED').length;
    const held = pastSessions.length;

    // Total classes in the semester (use provided total or calculate from sessions if fully populated)
    // Fallback to held if total not provided (which would be weird for planning, but safe for basic stats)
    const total = subject.totalPlannedSessions || sessions.length;

    const currentPercentage = held === 0 ? 0 : (attended / held) * 100;

    // Calculate Safe Skips
    // Max skips allowed to stay >= target% of TOTAL
    // Min Required = ceil(Total * Target%)
    const minRequired = Math.ceil(total * (target / 100));
    const maxSkipsAllowed = total - minRequired;
    const currentSkips = held - attended;
    const remainingSkips = Math.max(0, maxSkipsAllowed - currentSkips);

    // Calculate Must Attend (Recovery)
    // If current < target, how many consecutive classes must I attend?
    // (Attended + x) / (Held + x) >= Target%
    // This is for "Current" status recovery. 
    // But usually students care about "Can I reach the target by end of sem?"
    // If (Attended + Remaining Future Classes) < MinRequired, then it's impossible.

    const remainingFutureClasses = total - held;
    const maxPossibleAttendance = attended + remainingFutureClasses;
    const isImpossible = maxPossibleAttendance < minRequired;

    let mustAttend = 0;
    if (held > 0 && currentPercentage < target) {
        // Solve for x: (attended + x) / (held + x) >= target/100
        // attended + x >= (held + x) * p
        // attended + x >= held*p + x*p
        // x - x*p >= held*p - attended
        // x(1 - p) >= held*p - attended
        // x >= (held*p - attended) / (1 - p)
        const p = target / 100;
        if (p < 1) {
            mustAttend = Math.ceil((held * p - attended) / (1 - p));
        }
    }

    let status = 'SAFE';
    if (isImpossible) {
        status = 'DANGER'; // Cannot reach target even if attending everything
    } else if (held > 0 && currentPercentage < target) {
        status = 'WARNING';
    } else if (remainingSkips <= 2 && remainingSkips > 0) {
        status = 'WARNING'; // Getting close
    } else if (remainingSkips === 0) {
        status = 'DANGER'; // No margin for error
    }

    return {
        subjectId: subject.id,
        subjectName: subject.name,
        totalClasses: total,
        attendedClasses: attended,
        heldClasses: held,
        targetPercentage: target,
        currentPercentage: parseFloat(currentPercentage.toFixed(2)),
        canSkip: remainingSkips,
        mustAttend: mustAttend,
        status,
        isImpossible
    };
};

module.exports = { calculateSubjectStats };
