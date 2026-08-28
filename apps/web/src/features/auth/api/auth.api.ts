import type {
  ClientAuthTokens,
  LoginInput,
  SessionUserDto,
  SignUpInput,
  SignUpResultDto,
} from '@ewp/contracts';

import { apiRequest } from '@/shared/api/http-client';

interface SessionPayload {
  user: SessionUserDto;
  tokens: ClientAuthTokens;
}

export const authApi = {
  signUp: (body: SignUpInput) =>
    apiRequest<SignUpResultDto>('/auth/sign-up', { method: 'POST', body }),
  login: (body: LoginInput) => apiRequest<SessionPayload>('/auth/login', { method: 'POST', body }),
  // No argument: the refresh token is an httpOnly cookie the browser attaches.
  refresh: () => apiRequest<ClientAuthTokens>('/auth/refresh', { method: 'POST', body: {} }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST', body: {} }),
  me: () => apiRequest<SessionUserDto>('/auth/me'),
};
