"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const error_messages_constants_1 = require("../constants/error-messages.constants");
exports.CurrentUser = (0, common_1.createParamDecorator)((data, context) => {
    let request;
    if (context.getType() === 'http') {
        request = context.switchToHttp().getRequest();
    }
    else if (context.getType() === 'graphql') {
        const ctx = graphql_1.GqlExecutionContext.create(context);
        request = ctx.getContext().req;
    }
    else {
        throw new common_1.InternalServerErrorException(error_messages_constants_1.ERROR_MESSAGES.UNSUPPORTED_CONTEXT);
    }
    const user = request?.user;
    if (!user) {
        console.error('CurrentUser decorator: Usuário não encontrado no contexto da requisição.');
        throw new common_1.InternalServerErrorException(error_messages_constants_1.ERROR_MESSAGES.USER_NOT_IN_CONTEXT);
    }
    return user;
});
//# sourceMappingURL=current-user.decorator.js.map