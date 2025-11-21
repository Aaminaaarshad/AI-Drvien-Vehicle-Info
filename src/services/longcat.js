import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export const summariseLeaseDoc = httpsCallable(functions, "summariseLeaseDoc");
export const tyreAdvice         = httpsCallable(functions, "tyreAdvice");
export const nextServiceHint    = httpsCallable(functions, "nextServiceHint");
export const knownFaults        = httpsCallable(functions, "knownFaults");