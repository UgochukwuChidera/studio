
"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000 // This is for removing from DOM after dismiss animation
const DEFAULT_TOAST_DURATION = 5000 // Default duration for a toast to be visible

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  duration?: number // Optional duration for this specific toast
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
const toastDismissTimeouts = new Map<string, ReturnType<typeof setTimeout>>() // For auto-dismiss

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

// Function to clear auto-dismiss timeout for a specific toast
const clearDismissTimeout = (toastId: string) => {
  if (toastDismissTimeouts.has(toastId)) {
    clearTimeout(toastDismissTimeouts.get(toastId));
    toastDismissTimeouts.delete(toastId);
  }
};


export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      // Clear any existing dismiss timeout for the toast being added (in case of update)
      clearDismissTimeout(action.toast.id);
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      // Clear any existing dismiss timeout for the toast being updated
      if (action.toast.id) {
         clearDismissTimeout(action.toast.id);
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      if (toastId) {
        clearDismissTimeout(toastId); // Clear auto-dismiss if manually dismissed
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          clearDismissTimeout(toast.id);
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id" | "open" | "onOpenChange"> & { duration?: number }


function toast({ duration = DEFAULT_TOAST_DURATION, ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) => {
     // When updating, also clear the old auto-dismiss timeout and set a new one if duration changes
    clearDismissTimeout(id);
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    });
    if (props.duration !== undefined && props.open) {
      const dismissTimeout = setTimeout(() => {
        dismiss();
      }, props.duration);
      toastDismissTimeouts.set(id, dismissTimeout);
    } else if (props.open) { // If no new duration, use default for open toasts
       const dismissTimeout = setTimeout(() => {
        dismiss();
      }, DEFAULT_TOAST_DURATION);
      toastDismissTimeouts.set(id, dismissTimeout);
    }
  }
  
  const dismiss = () => {
    clearDismissTimeout(id); // Ensure timeout is cleared if dismissed manually or by new toast
    dispatch({ type: "DISMISS_TOAST", toastId: id });
  }

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
      duration, // Pass duration to the toast state
    },
  })

  // Set the auto-dismiss timeout
  const dismissTimeout = setTimeout(() => {
    dismiss();
  }, duration)
  toastDismissTimeouts.set(id, dismissTimeout);


  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) clearDismissTimeout(toastId);
      else toastDismissTimeouts.forEach((_, id) => clearDismissTimeout(id)); // Clear all if no ID
      dispatch({ type: "DISMISS_TOAST", toastId });
    },
  }
}

export { useToast, toast }
