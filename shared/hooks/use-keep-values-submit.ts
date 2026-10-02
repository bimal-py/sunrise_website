"use client";

import { createContext, startTransition, type FormEvent } from "react";

/**
 * React 19 resets a <form action={fn}> after every submit, so a save that fails validation
 * would wipe what was typed. Submitting through onSubmit (preventDefault + our own
 * transition) skips that reset while React still tracks the pending state. Without
 * JavaScript the form posts to the same action as usual.
 */
export function keepValuesOnSubmit(dispatch: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => dispatch(formData));
  };
}

/** The form's own pending flag, for buttons that can't rely on useFormStatus alone. */
export const FormPendingContext = createContext(false);
