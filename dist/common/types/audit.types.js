"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogLevel = exports.AuditActionType = void 0;
var AuditActionType;
(function (AuditActionType) {
    AuditActionType["LOGIN"] = "LOGIN";
    AuditActionType["LOGOUT"] = "LOGOUT";
    AuditActionType["LOGIN_FAILED"] = "LOGIN_FAILED";
    AuditActionType["PASSWORD_CHANGE"] = "PASSWORD_CHANGE";
    AuditActionType["DATA_UPDATE"] = "DATA_UPDATE";
    AuditActionType["ACCESS_DENIED"] = "ACCESS_DENIED";
    AuditActionType["PERMISSION_CHECK"] = "PERMISSION_CHECK";
    AuditActionType["TOKEN_REFRESH"] = "TOKEN_REFRESH";
    AuditActionType["ACCOUNT_LOCKED"] = "ACCOUNT_LOCKED";
})(AuditActionType || (exports.AuditActionType = AuditActionType = {}));
var AuditLogLevel;
(function (AuditLogLevel) {
    AuditLogLevel["BASIC"] = "basic";
    AuditLogLevel["DETAILED"] = "detailed";
    AuditLogLevel["FULL"] = "full";
})(AuditLogLevel || (exports.AuditLogLevel = AuditLogLevel = {}));
//# sourceMappingURL=audit.types.js.map