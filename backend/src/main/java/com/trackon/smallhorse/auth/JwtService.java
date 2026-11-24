package com.trackon.smallhorse.auth;

import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/** 우리 서버가 발급하는 access token(JWT) 생성. */
@Service
public class JwtService {

    private final JwtEncoder encoder;
    private final Duration expiration;

    public JwtService(JwtEncoder encoder,
                      @Value("${app.jwt.expiration-minutes}") long expirationMinutes) {
        this.encoder = encoder;
        this.expiration = Duration.ofMinutes(expirationMinutes);
    }

    public Duration getExpiration() {
        return expiration;
    }

    public String issue(String subject, String name) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("smallhorse")
                .subject(subject)
                .issuedAt(now)
                .expiresAt(now.plus(expiration))
                .claim("name", name)
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
