// Tracks when the API is slow to answer. On the free Render plan the server sleeps after
// 15 quiet minutes and takes up to a minute to wake, so the header says so instead of the
// page looking frozen.

type Listener = () => void;

let slow = 0;
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

export const serverStatus = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  isWaking: () => slow > 0,
  /** Call when a request starts; call the returned function when it ends. */
  track(): () => void {
    let counted = false;
    const timer = setTimeout(() => {
      counted = true;
      slow += 1;
      emit();
    }, 2500);
    return () => {
      clearTimeout(timer);
      if (counted) {
        slow -= 1;
        emit();
      }
    };
  },
};
