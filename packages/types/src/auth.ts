export interface AuthTokens {
  accessToken: string;
}

export interface UserAuthPayload {
  id: string;
  email: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}
