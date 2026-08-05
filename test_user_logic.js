const D1 = 8;
const D2 = 2;
// If the user wants D1=8, D2=2 to be "Двоюрідний пра(4)дід"
// What does that imply for P?
// "Двоюрідний" means P = 2.
// In our math, M = 2, K = 6.
// If P = 2, then P = M.
// But wait, if M=2, K=0 (First Cousins), P = 2 -> Двоюрідний брат.
// If M=2, K=1 (First Cousin Once Removed), P = 2 -> Двоюрідний дядько.
// If M=2, K=2 (First Cousin Twice Removed), P = 2? Wait!
// Is "Троюрідний дід" (M=2, K=2) actually right?
// Let's check!
