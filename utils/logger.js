let io = null;

export function setSocketIo(_io) {
  io = _io;
}

function emitToClients(event, payload) {
  try {
    if (io) io.emit(event, payload);
  } catch (e) {
    // ignore socket errors
  }
}

export function info(...args) {
  console.info(...args);
  emitToClients("log:info", args.map(String).join(" "));
}
export function log(...args) {
  console.log(...args);
  emitToClients("log:log", args.map(String).join(" "));
}
export function warn(...args) {
  console.warn(...args);
  emitToClients("log:warn", args.map(String).join(" "));
}
export function error(...args) {
  console.error(...args);
  emitToClients("log:error", args.map(String).join(" "));
}

// send structured progress/events
export function progress(eventName, payload) {
  // payload should be serializable
  emitToClients(`progress:${eventName}`, payload);
  // also emit generic progress stream
  emitToClients("progress", { eventName, payload });
}

// optional: monkey-patch global console to forward to socket clients
export function patchConsole() {
  const original = { ...console };
  console.log = (...a) => { log(...a); original.log(...a); };
  console.info = (...a) => { info(...a); original.info(...a); };
  console.warn = (...a) => { warn(...a); original.warn(...a); };
  console.error = (...a) => { error(...a); original.error(...a); };
  return () => {
    console.log = original.log;
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
  };
}