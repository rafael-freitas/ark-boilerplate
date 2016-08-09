function SocketWampError(err) {
    this.name = "SocketWampError";
    this.code = err && err.code ? err.code : "error0";
    this.message = err && err.message ? err.message : "unknown error";
}
SocketWampError.prototype = Error.prototype;

module.export = SocketWampError;
