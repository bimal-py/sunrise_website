import { useEffect } from "react";
import { doneProgress, startProgress } from "@/shared/components/navigation/progress-store";

/**
 * Runs the gold top bar while `busy`: a save, a delete, an upload, a reorder, a filter that
 * navigates in a transition. Link clicks start the bar on their own (NavProgress); anything
 * else that does server work reports here. Calls are counted, so overlapping work keeps one
 * bar running until the last piece finishes.
 */
export function useProgressWhile(busy: boolean) {
  useEffect(() => {
    if (!busy) return;
    startProgress();
    return doneProgress;
  }, [busy]);
}
