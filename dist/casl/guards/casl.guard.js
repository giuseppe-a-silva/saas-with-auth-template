"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaslGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const graphql_1 = require("@nestjs/graphql");
const error_messages_constants_1 = require("../../common/constants/error-messages.constants");
const casl_ability_factory_1 = require("../casl-ability.factory");
const check_permissions_decorator_1 = require("../decorators/check-permissions.decorator");
let CaslGuard = class CaslGuard {
    reflector;
    caslAbilityFactory;
    constructor(reflector, caslAbilityFactory) {
        this.reflector = reflector;
        this.caslAbilityFactory = caslAbilityFactory;
    }
    async canActivate(context) {
        const rules = this.reflector.get(check_permissions_decorator_1.CHECK_PERMISSIONS_KEY, context.getHandler()) || [];
        if (!rules || rules.length === 0) {
            return true;
        }
        const user = this.getUserFromContext(context);
        if (!user) {
            throw new common_1.ForbiddenException(error_messages_constants_1.ERROR_MESSAGES.USER_NOT_IN_CONTEXT);
        }
        const ability = await this.caslAbilityFactory.createForUser(user);
        try {
            const hasPermission = rules.every((rule) => {
                const subject = rule.subject;
                return ability.can(rule.action, subject);
            });
            if (!hasPermission) {
                throw new common_1.ForbiddenException(error_messages_constants_1.ERROR_MESSAGES.FORBIDDEN);
            }
            return true;
        }
        catch (error) {
            if (error instanceof common_1.ForbiddenException) {
                throw error;
            }
            console.error('Erro inesperado no CaslGuard:', error);
            throw new common_1.InternalServerErrorException(error_messages_constants_1.ERROR_MESSAGES.PERMISSION_CHECK_ERROR);
        }
    }
    getUserFromContext(context) {
        let request;
        if (context.getType() === 'http') {
            request = context.switchToHttp().getRequest();
        }
        else if (context.getType() === 'graphql') {
            const ctx = graphql_1.GqlExecutionContext.create(context);
            request = ctx.getContext().req;
        }
        else {
            return null;
        }
        return request?.user ?? null;
    }
};
exports.CaslGuard = CaslGuard;
exports.CaslGuard = CaslGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        casl_ability_factory_1.CaslAbilityFactory])
], CaslGuard);
//# sourceMappingURL=casl.guard.js.map