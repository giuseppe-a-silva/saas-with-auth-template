"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckPermissions = exports.CHECK_PERMISSIONS_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.CHECK_PERMISSIONS_KEY = 'check_permissions';
const CheckPermissions = (...rules) => (0, common_1.SetMetadata)(exports.CHECK_PERMISSIONS_KEY, rules);
exports.CheckPermissions = CheckPermissions;
//# sourceMappingURL=check-permissions.decorator.js.map