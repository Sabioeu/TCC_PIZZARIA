package com.integrador.api.pizza.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.integrador.api.pizza.domain.AppUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class JwtService {
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();
    private final ObjectMapper mapper;
    private final byte[] secret;
    private final long tokenHours;

    public JwtService(ObjectMapper mapper,
                      @Value("${aurora.security.jwt-secret}") String secret,
                      @Value("${aurora.security.token-hours:8}") long tokenHours) {
        this.mapper = mapper;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.tokenHours = tokenHours;
    }

    public String issue(AppUser user) {
        try {
            String header = encode(mapper.writeValueAsBytes(Map.of("alg", "HS256", "typ", "JWT")));
            Map<String, Object> claims = new LinkedHashMap<>();
            claims.put("sub", user.getEmail());
            claims.put("uid", user.getId());
            claims.put("bid", user.getBranchId());
            claims.put("name", user.getName());
            claims.put("role", user.getRole().name());
            claims.put("iat", Instant.now().getEpochSecond());
            claims.put("exp", Instant.now().plus(tokenHours, ChronoUnit.HOURS).getEpochSecond());
            String payload = encode(mapper.writeValueAsBytes(claims));
            String unsigned = header + "." + payload;
            return unsigned + "." + sign(unsigned);
        } catch (Exception exception) {
            throw new IllegalStateException("Nao foi possivel criar o token", exception);
        }
    }

    public AppPrincipal parse(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3 || !constantTimeEquals(sign(parts[0] + "." + parts[1]), parts[2])) {
                throw new IllegalArgumentException("Token invalido");
            }
            Map<String, Object> claims = mapper.readValue(DECODER.decode(parts[1]), new TypeReference<>() { });
            if (((Number) claims.get("exp")).longValue() < Instant.now().getEpochSecond()) {
                throw new IllegalArgumentException("Sessao expirada");
            }
            return new AppPrincipal(
                    ((Number) claims.get("uid")).longValue(),
                    ((Number) claims.get("bid")).longValue(),
                    String.valueOf(claims.get("name")),
                    String.valueOf(claims.get("sub")),
                    AppUser.Role.valueOf(String.valueOf(claims.get("role"))));
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalArgumentException("Token invalido", exception);
        }
    }

    private String sign(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret, "HmacSHA256"));
        return encode(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    }

    private String encode(byte[] value) { return ENCODER.encodeToString(value); }

    private boolean constantTimeEquals(String expected, String actual) {
        return java.security.MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }
}
