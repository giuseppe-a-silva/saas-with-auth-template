"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const prisma_module_1 = require("../database/prisma.module");
const users_module_1 = require("../users/users.module");
const auth_service_1 = require("./auth.service");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const refresh_jwt_strategy_1 = require("./strategies/refresh-jwt.strategy");
const authentication_service_1 = require("./services/authentication.service");
const password_service_1 = require("./services/password.service");
const token_service_1 = require("./services/token.service");
const email_validator_1 = require("./validators/email.validator");
const strong_password_validator_1 = require("./validators/strong-password.validator");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            prisma_module_1.DatabaseModule,
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: () => ({}),
            }),
            config_1.ConfigModule,
        ],
        providers: [
            auth_service_1.AuthService,
            jwt_strategy_1.JwtStrategy,
            refresh_jwt_strategy_1.RefreshJwtStrategy,
            token_service_1.TokenService,
            password_service_1.PasswordService,
            authentication_service_1.AuthenticationService,
            strong_password_validator_1.IsStrongPasswordConstraint,
            email_validator_1.IsValidEmailConstraint,
        ],
        exports: [
            auth_service_1.AuthService,
            jwt_1.JwtModule,
            token_service_1.TokenService,
            password_service_1.PasswordService,
            authentication_service_1.AuthenticationService,
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map