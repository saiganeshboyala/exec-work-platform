import type {
  AuthTokens,
  LoginInput,
  SessionUserDto,
  SignUpInput,
  SignUpResultDto,
} from '@ewp/contracts';

import { apiRequest } from '@/shared/api/http-client';

interface SessionPayload {
  user: SessionUserDto;
  tokens: AuthTokens;
}

export const authApi = {
  signUp: (body: SignUpInput) =>
    apiRequest<SignUpResultDto>('/auth/sign-up', { method: 'POST', body }),
  login: (body: LoginInput) => apiRequest<SessionPayload>('/auth/login', { method: 'POST', body }),
  refresh: (refreshToken: string) =>
    apiRequest<AuthTokens>('/auth/refresh', { method: 'POST', body: { refreshToken } }),
  logout: (refreshToken: string) =>
    apiRequest<void>('/auth/logout', { method: 'POST', body: { refreshToken } }),
  me: () => apiRequest<SessionUserDto>('/auth/me'),
};
