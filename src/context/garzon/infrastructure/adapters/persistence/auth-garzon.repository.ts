import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AuthGarzonRepository } from 'src/context/garzon/domain/ports/out/auth-garzon.repository';
import { AuthCredentials, AuthSession } from 'src/context/garzon/domain/entities/auth.entity';
import { SimpleCookieJar } from '../../utils/SimpleCookieJar';

@Injectable()
export class LaravelAuthAdapter implements AuthGarzonRepository {
    private readonly baseUrl = 'http://45.189.38.14:8881';

    constructor(private readonly httpService: HttpService) { }

    async login(credentials: AuthCredentials): Promise<AuthSession> {
        const jar = new SimpleCookieJar();

        try {
            console.log('[LaravelAdapter] 1. Obteniendo página de login...');
            const initResponse = await lastValueFrom(
                this.httpService.get(`${this.baseUrl}/login`, {
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                    },
                }),
            );

            jar.addFromHeaders(initResponse.headers['set-cookie']);

            const html = initResponse.data as string;
            const csrfMatch = html.match(/<meta name="csrf-token" content="([^"]+)">/);
            const csrfTokenHtml = csrfMatch ? csrfMatch[1] : null;

            if (!csrfTokenHtml) {
                throw new InternalServerErrorException('No se pudo extraer el CSRF token del HTML');
            }

            const rawXsrfCookie = jar.get('XSRF-TOKEN');
            if (!rawXsrfCookie) throw new InternalServerErrorException('Cookie XSRF-TOKEN no encontrada');

            const xsrfHeaderToken = decodeURIComponent(rawXsrfCookie);

            console.log('[LaravelAdapter] 2. Enviando credenciales...');

            const payload = {
                username: credentials.username,
                password: credentials.password,
                _token: csrfTokenHtml,
            };

            const loginResponse = await lastValueFrom(
                this.httpService.post(`${this.baseUrl}/auth/login`, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Origin': this.baseUrl,
                        'Referer': `${this.baseUrl}/login`,
                        'Cookie': jar.getCookieString(),
                        'X-XSRF-TOKEN': xsrfHeaderToken,
                        'X-Requested-With': 'XMLHttpRequest',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    },
                    maxRedirects: 0,
                    validateStatus: (status) => status < 400 || status === 302,
                }),
            );

            jar.addFromHeaders(loginResponse.headers['set-cookie']);

            if (loginResponse.status === 401 || loginResponse.status === 422) {
                throw new UnauthorizedException('Credenciales inválidas en sistema legado');
            }
            return {
                cookies: jar.getCookieString(),
                xsrfToken: decodeURIComponent(jar.get('XSRF-TOKEN') || ''),
                user: loginResponse.data,
            };

        } catch (error) {
            console.error("Error en LaravelAuthAdapter:", error);
            throw new UnauthorizedException('Error conectando con sistema interno');
        }
    }

    async getData(session: AuthSession): Promise<any> {
        try {
            const response = await lastValueFrom(
                this.httpService.get(`${this.baseUrl}/tu-ruta-interna-datos`, {
                    headers: {
                        'Cookie': session.cookies,
                        'X-XSRF-TOKEN': session.xsrfToken,
                        'Accept': 'application/json',
                        'Referer': this.baseUrl,
                    },
                }),
            );
            return response.data;
        } catch (error) {
            throw new UnauthorizedException('La sesión ha expirado');
        }
    }
}