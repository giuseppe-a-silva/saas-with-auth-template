import { Field, ObjectType } from '@nestjs/graphql';
// import { User } from '../../users/entities/user.entity'; // Comentado pois não está sendo usado atualmente

@ObjectType({
  description: 'Resposta da autenticação, contendo o token de acesso',
})
export class AuthPayload {
  @Field(() => String, { description: 'Token de acesso JWT' })
  accessToken: string;

  // O refresh token é gerenciado via cookie HttpOnly e não é exposto aqui.

  // Opcionalmente, pode retornar o usuário logado
  // @Field(() => User, { description: 'Usuário autenticado' })
  // user: User;
}

@ObjectType({ description: 'Resposta simples para operações como logout' })
export class SimpleStatusPayload {
  @Field(() => Boolean, {
    description: 'Indica se a operação foi bem-sucedida',
  })
  success: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'Mensagem opcional de status',
  })
  message?: string;
}
