const ALLOWED_TRANSITIONS = {
    'PENDING': ['AUTHORIZED', 'FAILED'],
    'AUTHORIZED': ['CAPTURED', 'FAILED'],
    'CAPTURED': [], // Terminal state
    'FAILED': []    // Terminal state
};
  
function canTransition(currentStatus, newStatus) {
    if (currentStatus === newStatus) return true; 
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    return allowed && allowed.includes(newStatus);
}
  
module.exports = { canTransition };