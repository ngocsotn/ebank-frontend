import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

import { TokenModel } from '../modules/models/token.model';
import { UserModel } from '../modules/models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {

  private refreshTokenTimeout;
  private currentUserSubject: BehaviorSubject<UserModel>;
  public currentUser: Observable<UserModel>;
  
  constructor(private http: HttpClient) {
    const user = new JwtHelperService().decodeToken(this.accessTokenValue);
    this.currentUserSubject = new BehaviorSubject<UserModel>(user);
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get accessTokenValue() {
    return JSON.parse(localStorage.getItem('token'));
  }

  public get currentUserValue(): UserModel {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: UserModel) {
    this.currentUserSubject.next(user);
  }

  register(registerData) {
    const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
    const body = new URLSearchParams();
    body.set('firstName', registerData.firstname);
    body.set('lastName', registerData.lastname);
    body.set('email', registerData.email);
    body.set('username', registerData.username);
    body.set('dateOfBirth', registerData.birth.format('DD/MM/YYYY'));
    body.set('phoneNumber', registerData.tel);
    body.set('address', registerData.address);
    body.set('password', registerData.password);
    body.set('confirmPassword', registerData.confirmpassword);
    return this.http.post(`${environment.apiUrl}/api/register`, body.toString(), { headers });
  }

  activate(token) {
    const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
    const body = new URLSearchParams();
    body.set('activeCode', token);
    return this.http.post(`${environment.apiUrl}/api/auth/active`, body.toString(), { headers });
  }

  passwordRecovery(recoveryData) {
    const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
    const body = new URLSearchParams();
    body.set('email', recoveryData.email);
    return this.http.post(`${environment.apiUrl}/api/forgotpassword`, body.toString(), { headers });
  }

  validatePasswordRecovery(token) {
    const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
    const body = new URLSearchParams();
    body.set('forgotCode', token);
    return this.http.post(`${environment.apiUrl}/api/verifyforgotcode`, body.toString(), { headers });
  }

  resetPassword(resetPasswordData, token) {
    const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
    const body = new URLSearchParams();
    body.set('newPassword', resetPasswordData.password);
    body.set('confirmPassword', resetPasswordData.confirmpassword);
    body.set('forgotCode', token);
    return this.http.post(`${environment.apiUrl}/api/updatenewpassword`, body.toString(), { headers });
  }

  refreshToken() {
    const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
    return this.http.post<TokenModel>(`${environment.apiUrl}/api/renew-token`, {}, { headers }).pipe(map(data => {
      localStorage.setItem('token', JSON.stringify(data.token));
      const user = new JwtHelperService().decodeToken(data.token);
      this.currentUserSubject.next(user);
      this.startRefreshTokenTimer();
      return data;
    }));
  }

  private startRefreshTokenTimer() {
    // Parse json object from base64 encoded jwt token
    const jwtToken = new JwtHelperService().decodeToken(this.accessTokenValue);
    // Set a timeout to refresh the token a minute before it expires
    const expires = new Date(jwtToken.exp * 1000);
    const timeout = expires.getTime() - Date.now() - (60 * 1000);
    this.refreshTokenTimeout = setTimeout(() => this.refreshToken().subscribe(), timeout);
  }

  private stopRefreshTokenTimer() {
    clearTimeout(this.refreshTokenTimeout);
  }

  twoFactorAuth(loginData) {
    const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
    const body = new URLSearchParams();
    body.set('verifyCode', loginData.code);
    return this.http.post<TokenModel>(`${environment.apiUrl}/api/auth/verify2fa`, body.toString(), { headers }).pipe(map(data => {
      localStorage.setItem('token', JSON.stringify(data.token));
      const user = new JwtHelperService().decodeToken(data.token);
      this.currentUserSubject.next(user);
      return data;
    }));
  }

  login(loginData) {
    const headers = new HttpHeaders({'Content-Type': 'application/x-www-form-urlencoded'});
    const body = new URLSearchParams();
    body.set('username', loginData.username);
    body.set('password', loginData.password);
    return this.http.post<TokenModel>(`${environment.apiUrl}/api/auth/login`, body.toString(), { headers }).pipe(map(data => {
      if (data.token) {
        localStorage.setItem('token', JSON.stringify(data.token));
        const user = new JwtHelperService().decodeToken(data.token);
        this.currentUserSubject.next(user);
      }
      return data;
    }));
  }

  logout() {
    // Remove user from local storage to log user out
    this.http.get(`${environment.apiUrl}/api/auth/logout`).subscribe();
    this.currentUserSubject.next(null);
    this.stopRefreshTokenTimer();
    localStorage.removeItem('token');
  }
}