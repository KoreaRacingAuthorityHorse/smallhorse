package com.trackon.smallhorse.auth;

import java.io.IOException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

/** 소셜 로그인 성공 시 자체 JWT를 HttpOnly 쿠키로 내려주고 프론트로 redirect. */
@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    public static final String COOKIE_NAME = "access_token";

    private final JwtService jwtService;
    private final String frontendUrl;
    private final boolean secureCookie;

    public OAuth2SuccessHandler(JwtService jwtService,
                                @Value("${app.frontend-url}") String frontendUrl,
                                @Value("${app.jwt.cookie-secure}") boolean secureCookie) {
        this.jwtService = jwtService;
        this.frontendUrl = frontendUrl;
        this.secureCookie = secureCookie;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        // TODO: 회원 조회/생성(User 엔티티) 후 내부 user id를 subject로 사용
        String subject = token.getAuthorizedClientRegistrationId() + ":" + token.getName();
        String name = String.valueOf(token.getPrincipal().getAttributes().getOrDefault("name", ""));

        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, jwtService.issue(subject, name))
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Lax")
                .path("/")
                .maxAge(jwtService.getExpiration())
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        response.sendRedirect(frontendUrl);
    }
}
